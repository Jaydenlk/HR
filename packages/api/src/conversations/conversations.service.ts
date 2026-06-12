import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ChatService } from './chat.service';
import { CoachContextService } from './coach-context.service';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import { CreditService } from '../credit/credit.service';
import type { RewriteSuggestion } from '../common/types';

// SSE 事件:queue 排位变化 / token 增量 / done 完成(含落库 message + 余额)/ error 可读错误。
export type ChatStreamEvent =
  | { type: 'queue'; position: number }
  | { type: 'token'; text: string }
  | {
      type: 'done';
      user_message: Message;
      assistant_message: Message;
      credit_balance: number | null;
    }
  | { type: 'error'; message: string };

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation)
    private readonly evalRepo: Repository<OpportunityEvaluation>,
    private readonly chat: ChatService,
    private readonly coachContext: CoachContextService,
    private readonly limiter: ConcurrencyLimiter,
    private readonly credit: CreditService,
  ) {}

  async create(userId: string, dto: CreateConversationDto): Promise<Conversation> {
    const contextType = dto.context_type ?? 'free';
    // Reject binding a conversation to a context record the caller does not own.
    // Without this, user B could read user A's private diagnosis/opportunity by
    // supplying A's context_id (IDOR via the chat context loader).
    if (dto.context_id) {
      await this.assertContextOwnership(contextType, dto.context_id, userId);
    }
    const conv = this.convRepo.create({
      user_id: userId,
      title: dto.title ?? undefined,
      context_type: contextType,
      context_id: dto.context_id ?? undefined,
    } as Partial<Conversation>);
    return this.convRepo.save(conv) as Promise<Conversation>;
  }

  private async assertContextOwnership(
    contextType: string,
    contextId: string,
    userId: string,
  ): Promise<void> {
    // context_id only carries meaning for diagnosis/opportunity bindings; any
    // other context_type with a context_id — or a record not owned by the
    // caller — leaves `owned` null and is rejected by the single guard below.
    let owned: { id: string } | null = null;
    if (contextType === 'diagnosis') {
      owned = await this.diagnosisRepo.findOne({
        where: { id: contextId, user_id: userId },
        select: { id: true },
      });
    } else if (contextType === 'opportunity') {
      owned = await this.oppRepo.findOne({
        where: { id: contextId, user_id: userId },
        select: { id: true },
      });
    }
    if (!owned) throw new NotFoundException();
  }

  async findAllByUser(userId: string): Promise<Conversation[]> {
    const convs = await this.convRepo.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
    if (convs.length === 0) return convs;

    // 为每条会话附加最新一条消息预览,避免列表显示「暂无消息」。
    const convIds = convs.map((c) => c.id);
    const lastMsgs = await this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversation_id IN (:...ids)', { ids: convIds })
      .orderBy('msg.created_at', 'DESC')
      .getMany();

    // 按 conversation_id 取第一条(已按 DESC 排序,第一个即最新)。
    const latestByConv = new Map<string, Message>();
    for (const msg of lastMsgs) {
      if (!latestByConv.has(msg.conversation_id)) {
        latestByConv.set(msg.conversation_id, msg);
      }
    }

    for (const conv of convs) {
      const latest = latestByConv.get(conv.id);
      conv.messages = latest ? [latest] : [];
    }
    return convs;
  }

  async findOne(id: string, userId: string): Promise<Conversation> {
    const conv = await this.convRepo.findOne({
      where: { id, user_id: userId },
      relations: { messages: true },
      order: { messages: { created_at: 'ASC' } },
    });
    if (!conv) throw new NotFoundException();
    return conv;
  }

  async sendMessage(
    convId: string,
    userId: string,
    content: string,
  ): Promise<{ user_message: Message; assistant_message: Message }> {
    // Verify ownership and load messages
    const conv = await this.findOne(convId, userId);
    const history = conv.messages;

    // Save user message
    const userMsg = await this.persistUserMessage(convId, content);

    // Assemble context (binding + platform data + on-demand product full-text)
    const context = await this.buildBoundContext(conv, userId);
    const userContext = await this.buildUserContext(userId, content);

    // Get AI reply (non-streaming path — kept for clients that don't use SSE)
    const replyText = await this.chat.reply(history, content, context, userContext);

    // Save assistant message
    const assistantMsg = await this.persistAssistantMessage(convId, replyText);

    await this.finalizeConversation(conv, history, content);

    return { user_message: userMsg, assistant_message: assistantMsg };
  }

  /**
   * 流式回复(SSE)。先推 queue 排位事件 → token 增量 → done(落库 + 余额);任一步报错推 error。
   * 记账时机:仅在流正常完成(done)后扣 1 点;首 token 前/中途失败一律不扣(与 CreditInterceptor
   * 「成功才扣」语义对齐)。余额校验由 CreditGuard 前置,本方法只在成功路径调 credit.consume。
   */
  async *streamMessage(
    convId: string,
    userId: string,
    content: string,
    endpoint: string,
  ): AsyncGenerator<ChatStreamEvent, void, void> {
    const conv = await this.findOne(convId, userId);
    const history = conv.messages;
    const userMsg = await this.persistUserMessage(convId, content);

    // 排队可见化:进入生成前,若并发已满有积压,先推当前排位(前面还有几个请求)。
    // chat() 内部会真正占槽并排队;此处给前端一个进入生成前的初始排位提示。
    const backlog = this.limiter.status();
    if (backlog.queued > 0) {
      yield { type: 'queue', position: backlog.queued };
    }

    let context: { type: string; data: string } | undefined;
    let userContext: string;
    try {
      context = await this.buildBoundContext(conv, userId);
      userContext = await this.buildUserContext(userId, content);
    } catch (err) {
      yield { type: 'error', message: this.readableError(err) };
      return;
    }

    let reply = '';
    try {
      for await (const chunk of this.chat.stream(
        history,
        content,
        context,
        userContext,
      )) {
        reply += chunk;
        yield { type: 'token', text: chunk };
      }
    } catch (err) {
      // 流失败:不落 assistant 消息、不扣点。user 消息已落库(用户能看到自己发了什么)。
      yield { type: 'error', message: this.readableError(err) };
      return;
    }

    // 流正常完成:落 assistant 消息 → 收尾会话 → 扣 1 点 → 推 done(含落库消息 + 新余额)。
    const assistantMsg = await this.persistAssistantMessage(convId, reply);
    await this.finalizeConversation(conv, history, content);

    let creditBalance: number | null = null;
    try {
      creditBalance = await this.credit.consume(userId, endpoint);
    } catch {
      // 扣点失败不回滚已生成内容(与非流式拦截器一致:漏扣可见化交日志/对账,不阻断用户)。
      creditBalance = null;
    }

    yield {
      type: 'done',
      user_message: userMsg,
      assistant_message: assistantMsg,
      credit_balance: creditBalance,
    };
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private async persistUserMessage(
    convId: string,
    content: string,
  ): Promise<Message> {
    return this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'user',
        content,
      } as Partial<Message>),
    ) as Promise<Message>;
  }

  private async persistAssistantMessage(
    convId: string,
    content: string,
  ): Promise<Message> {
    return this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'assistant',
        content,
      } as Partial<Message>),
    ) as Promise<Message>;
  }

  private async finalizeConversation(
    conv: Conversation,
    history: Message[],
    content: string,
  ): Promise<void> {
    if (!conv.title && history.length === 0) {
      const shortTitle = content.length > 30 ? content.slice(0, 30) + '…' : content;
      await this.convRepo.update(conv.id, { title: shortTitle });
    }
    await this.convRepo.update(conv.id, { updated_at: new Date() });
  }

  // 绑定上下文:会话绑定的 diagnosis / opportunity 记录摘要(供 system prompt 的 context 段)。
  private async buildBoundContext(
    conv: Conversation,
    userId: string,
  ): Promise<{ type: string; data: string } | undefined> {
    if (conv.context_type === 'diagnosis' && conv.context_id) {
      const diagnosis = await this.diagnosisRepo.findOne({
        where: { id: conv.context_id, user_id: userId },
      });
      if (diagnosis) {
        return {
          type: '简历诊断结果',
          data: `公司: ${diagnosis.jd_company || '未知'}\n岗位: ${diagnosis.jd_role || '未知'}\n匹配分: ${diagnosis.score}/100\n命中关键词: ${(diagnosis.keywords_hit || []).join(', ')}\n缺失关键词: ${(diagnosis.keywords_miss || []).join(', ')}\n改写建议: ${(diagnosis.suggestions || []).map((s: RewriteSuggestion) => s.reason).join('; ')}`,
        };
      }
    } else if (conv.context_type === 'opportunity' && conv.context_id) {
      const opp = await this.oppRepo.findOne({
        where: { id: conv.context_id, user_id: userId },
      });
      if (opp) {
        const eval_ = await this.evalRepo.findOne({
          where: { opportunity_id: conv.context_id },
          order: { created_at: 'DESC' },
        });
        return {
          type: '机会评估结果',
          data: `公司: ${opp.company || '未知'}\n岗位: ${opp.role || '未知'}\n` +
            (eval_
              ? `匹配度: ${Math.round(eval_.match_score * 100)}%\n投递价值: ${Math.round(eval_.value_score * 100)}%\n可信度: ${Math.round(eval_.credibility_score * 100)}%\n建议: ${eval_.recommendation}\n风险: ${JSON.stringify(eval_.risk_flags)}\n优势: ${JSON.stringify(eval_.strengths)}\n差距: ${JSON.stringify(eval_.gaps)}`
              : '评估未完成'),
        };
      }
    }
    return undefined;
  }

  // 平台数据上下文 = 开场上下文(画像+主简历全文+最新诊断+产物目录)+ 本轮按需加载的旧产物全文。
  private async buildUserContext(
    userId: string,
    content: string,
  ): Promise<string> {
    const [opening, referenced] = await Promise.all([
      this.coachContext.buildContext(userId),
      this.coachContext.loadReferencedProducts(userId, content),
    ]);
    return referenced ? `${opening}\n\n${referenced}` : opening;
  }

  private readableError(err: unknown): string {
    // ServiceUnavailableException 等 Nest 异常的 message 已是中文可读串;其余兜底通用提示。
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message: unknown }).message;
      if (typeof m === 'string' && m.length > 0) return m;
    }
    return 'AI 服务暂时不可用，请稍后重试。';
  }

  async remove(id: string, userId: string): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { id, user_id: userId } });
    if (!conv) throw new NotFoundException();
    await this.convRepo.remove(conv);
  }
}

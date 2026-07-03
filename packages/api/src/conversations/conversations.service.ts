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
import { CoachHandoffsService } from '../coach-handoffs/coach-handoffs.service';
import { parseHandoff, StreamHandoffSplitter } from './handoff-parser';
import { DiagnosisEventStream } from '../diagnoses/diagnosis-event-stream';
import type { RewriteSuggestion } from '../common/types';

// SSE 事件:queue 排位变化 / token 增量 / done 完成(含落库 message + 余额)/ error 可读错误
//           / card 行动卡片(含 handoff id + target + payload 摘要)。
export type ChatStreamEvent =
  | { type: 'queue'; position: number }
  | { type: 'token'; text: string }
  | {
      type: 'done';
      user_message: Message;
      assistant_message: Message;
      credit_balance: number | null;
    }
  | { type: 'error'; message: string }
  | {
      type: 'card';
      handoff_id: string;
      target: string;
      payload: Record<string, unknown>;
      message_id: string;
    };

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
    private readonly handoffs: CoachHandoffsService,
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

    const convIds = convs.map((c) => c.id);
    const lastMsgs = await this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversation_id IN (:...ids)', { ids: convIds })
      .orderBy('msg.created_at', 'DESC')
      .getMany();

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
    const conv = await this.findOne(convId, userId);
    const history = conv.messages;
    const userMsg = await this.persistUserMessage(convId, content);

    const context = await this.buildBoundContext(conv, userId);
    const userContext = await this.buildUserContext(userId, content);

    const rawReply = await this.chat.reply(history, content, context, userContext);

    // 非流式路径同样剥离标记(同一 parseHandoff 函数)。
    const { clean, card } = parseHandoff(rawReply);
    let richCard: Record<string, unknown> | null = null;

    const assistantMsg = await this.persistAssistantMessage(convId, clean, richCard);

    if (card && ConversationsService.isPayloadWithinLimit(card.payload)) {
      const handoff = await this.handoffs.create({
        user_id: userId,
        conversation_id: convId,
        message_id: assistantMsg.id,
        target: card.target,
        payload: card.payload,
      });
      richCard = { handoff_id: handoff.id, target: card.target, payload: card.payload };
      assistantMsg.rich_card = richCard;
      await this.msgRepo.save(assistantMsg);
    }

    await this.finalizeConversation(conv, history, content);

    return { user_message: userMsg, assistant_message: assistantMsg };
  }

  /**
   * 流式回复(SSE)。先推 queue 排位事件 → token 增量 → [card 行动卡片] → done(落库 + 余额)。
   * 流式剥离:检测到 <handoff 起始即停止向客户端转发增量并入缓冲;流结束解析缓冲:
   *   合法 → 建 coach_handoffs 记录 + 写 rich_card + SSE 推 card 事件;
   *   非法 → 把缓冲文本原样补发(正文无损降级)。
   * 存库的 message content 已剥离标记。
   *
   * 解耦(对齐诊断哲学「断开只停转发,不取消生成、照常落库」):真正的生成/落库/扣费在后台任务里
   * push 到一个 {@link DiagnosisEventStream} 实例,本生成器只是 `yield*` 消费它。控制器停止迭代
   * (客户端断开)只是不再消费缓冲事件,后台任务继续把 AI 流【完整消费到自然结束】并落库/扣费——
   * 故不再接收「客户端断开」信号,也就不会像旧实现那样在 for-await 中途因 abort 抛错而丢掉整条回复。
   * 用户回来重开会话即见完整回复。
   */
  streamMessage(
    convId: string,
    userId: string,
    content: string,
    endpoint: string,
  ): AsyncGenerator<ChatStreamEvent, void, void> {
    const out = new DiagnosisEventStream<ChatStreamEvent>();

    // 后台任务:独立于消费者(SSE 连接)运行。不 await,launch 后立即返回可消费的生成器。
    void (async () => {
      try {
        const conv = await this.findOne(convId, userId);
        const history = conv.messages;
        const userMsg = await this.persistUserMessage(convId, content);

        const backlog = this.limiter.status();
        if (backlog.queued > 0) {
          out.push({ type: 'queue', position: backlog.queued });
        }

        let context: { type: string; data: string } | undefined;
        let userContext: string;
        try {
          context = await this.buildBoundContext(conv, userId);
          userContext = await this.buildUserContext(userId, content);
        } catch (err) {
          out.push({ type: 'error', message: this.readableError(err) });
          return;
        }

        const splitter = new StreamHandoffSplitter();
        let cleanText = ''; // 已确认无标记的正文增量(剥离前)
        try {
          // 不传 signal:上游 AI 流式请求完整消费到自然结束才落库(客户端断开只停转发、不中止生成)。
          for await (const chunk of this.chat.stream(history, content, context, userContext)) {
            const emit = splitter.feed(chunk);
            if (emit) {
              cleanText += emit;
              out.push({ type: 'token', text: emit });
            }
          }
        } catch (err) {
          // 流中途出错:先把 splitter pending/缓冲中的内容 flush 给客户端,再发 error 事件。
          const { extra: pendingFlush } = splitter.finish();
          if (pendingFlush) {
            out.push({ type: 'token', text: pendingFlush });
          }
          out.push({ type: 'error', message: this.readableError(err) });
          return;
        }

        // 流正常完成:处理缓冲区(含可能的 handoff 标记)。
        const { extra, card } = splitter.finish();
        if (extra) {
          // 缓冲区解析失败时的降级补发:把缓冲文本推给客户端并追加到正文。
          cleanText += extra;
          out.push({ type: 'token', text: extra });
        }

        // 落 assistant 消息(存库内容已剥离标记)。
        const assistantMsg = await this.persistAssistantMessage(convId, cleanText, null);

        // 若有合法卡片且 payload 在限额内:建 handoff 记录 → 更新 message rich_card → 推 card SSE 事件。
        if (card && ConversationsService.isPayloadWithinLimit(card.payload)) {
          try {
            const handoff = await this.handoffs.create({
              user_id: userId,
              conversation_id: convId,
              message_id: assistantMsg.id,
              target: card.target,
              payload: card.payload,
            });
            const richCard: Record<string, unknown> = {
              handoff_id: handoff.id,
              target: card.target,
              payload: card.payload,
            };
            assistantMsg.rich_card = richCard;
            await this.msgRepo.save(assistantMsg);
            out.push({
              type: 'card',
              handoff_id: handoff.id,
              target: card.target,
              payload: card.payload,
              message_id: assistantMsg.id,
            });
          } catch {
            // 卡片落库失败不中断整个流程,正文已完整推送。
          }
        }

        await this.finalizeConversation(conv, history, content);

        let creditBalance: number | null = null;
        try {
          creditBalance = await this.credit.consume(userId, endpoint);
        } catch {
          creditBalance = null;
        }

        out.push({
          type: 'done',
          user_message: userMsg,
          assistant_message: assistantMsg,
          credit_balance: creditBalance,
        });
      } catch (err) {
        // findOne 越权/不存在(或落库/扣费等未预期错误):以 error 事件可读告知,归一 'Not Found' 为中文兜底
        // (对齐控制器旧行为)。此前该翻译在控制器 catch 里;解耦后生成器不再抛到控制器,故就地翻译。
        const raw =
          err && typeof err === 'object' && 'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : '';
        out.push({
          type: 'error',
          message: raw && raw !== 'Not Found' ? raw : '对话不存在或无法访问',
        });
      } finally {
        out.close();
      }
    })();

    return this.consume(out);
  }

  // 把解耦事件流包成 AsyncGenerator(保持 streamMessage 的对外类型不变);控制器停止迭代不影响后台任务。
  private async *consume(
    out: DiagnosisEventStream<ChatStreamEvent>,
  ): AsyncGenerator<ChatStreamEvent, void, void> {
    yield* out;
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private async persistUserMessage(convId: string, content: string): Promise<Message> {
    return this.msgRepo.save(
      this.msgRepo.create({ conversation_id: convId, role: 'user', content } as Partial<Message>),
    ) as Promise<Message>;
  }

  private async persistAssistantMessage(
    convId: string,
    content: string,
    richCard: Record<string, unknown> | null,
  ): Promise<Message> {
    return this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'assistant',
        content,
        rich_card: richCard,
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

  private async buildUserContext(userId: string, content: string): Promise<string> {
    const [opening, referenced] = await Promise.all([
      this.coachContext.buildContext(userId),
      this.coachContext.loadReferencedProducts(userId, content),
    ]);
    return referenced ? `${opening}\n\n${referenced}` : opening;
  }

  /** payload 序列化后超过此字符数判为非法,不建 handoff 记录(正文已完整落库)。 */
  private static readonly MAX_PAYLOAD_CHARS = 4000;

  private static isPayloadWithinLimit(payload: Record<string, unknown>): boolean {
    try {
      return JSON.stringify(payload).length <= ConversationsService.MAX_PAYLOAD_CHARS;
    } catch {
      return false;
    }
  }

  private readableError(err: unknown): string {
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

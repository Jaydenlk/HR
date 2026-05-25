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
  ) {}

  async create(userId: string, dto: CreateConversationDto): Promise<Conversation> {
    const conv = this.convRepo.create({
      user_id: userId,
      title: dto.title ?? undefined,
      context_type: dto.context_type ?? 'free',
      context_id: dto.context_id ?? undefined,
    } as Partial<Conversation>);
    return this.convRepo.save(conv) as Promise<Conversation>;
  }

  findAllByUser(userId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
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

    // Save user message
    const userMsg = await this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'user',
        content,
      } as Partial<Message>),
    ) as Message;

    // Build history (all messages before this one)
    const history = conv.messages;

    // Build context from diagnosis or opportunity if available
    let context: { type: string; data: string } | undefined;
    if (conv.context_type === 'diagnosis' && conv.context_id) {
      const diagnosis = await this.diagnosisRepo.findOne({ where: { id: conv.context_id } });
      if (diagnosis) {
        context = {
          type: '简历诊断结果',
          data: `公司: ${diagnosis.jd_company || '未知'}\n岗位: ${diagnosis.jd_role || '未知'}\n匹配分: ${diagnosis.score}/100\n命中关键词: ${(diagnosis.keywords_hit || []).join(', ')}\n缺失关键词: ${(diagnosis.keywords_miss || []).join(', ')}\n改写建议: ${(diagnosis.suggestions || []).map((s: any) => s.reason).join('; ')}`,
        };
      }
    } else if (conv.context_type === 'opportunity' && conv.context_id) {
      const opp = await this.oppRepo.findOne({ where: { id: conv.context_id } });
      if (opp) {
        const eval_ = await this.evalRepo.findOne({
          where: { opportunity_id: conv.context_id },
          order: { created_at: 'DESC' },
        });
        context = {
          type: '机会评估结果',
          data: `公司: ${opp.company || '未知'}\n岗位: ${opp.role || '未知'}\n` +
            (eval_
              ? `匹配度: ${Math.round(eval_.match_score * 100)}%\n投递价值: ${Math.round(eval_.value_score * 100)}%\n可信度: ${Math.round(eval_.credibility_score * 100)}%\n建议: ${eval_.recommendation}\n风险: ${JSON.stringify(eval_.risk_flags)}\n优势: ${JSON.stringify(eval_.strengths)}\n差距: ${JSON.stringify(eval_.gaps)}`
              : '评估未完成'),
        };
      }
    }

    // Get AI reply
    const replyText = await this.chat.reply(history, content, context);

    // Save assistant message
    const assistantMsg = await this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'assistant',
        content: replyText,
      } as Partial<Message>),
    ) as Message;

    // Auto-title from first user message
    if (!conv.title && history.length === 0) {
      const shortTitle = content.length > 30 ? content.slice(0, 30) + '…' : content;
      await this.convRepo.update(convId, { title: shortTitle });
    }

    // Touch updated_at
    await this.convRepo.update(convId, { updated_at: new Date() });

    return { user_message: userMsg, assistant_message: assistantMsg };
  }

  async remove(id: string, userId: string): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { id, user_id: userId } });
    if (!conv) throw new NotFoundException();
    await this.convRepo.remove(conv);
  }
}

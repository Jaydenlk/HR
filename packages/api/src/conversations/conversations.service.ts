import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
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
  ): Promise<Message> {
    // Verify ownership and load messages
    const conv = await this.findOne(convId, userId);

    // Save user message
    await this.msgRepo.save(
      this.msgRepo.create({
        conversation_id: convId,
        role: 'user',
        content,
      } as Partial<Message>),
    );

    // Build history (all messages before this one)
    const history = conv.messages;

    // Build context from diagnosis if available
    let context: { type: string; data: string } | undefined;
    if (conv.context_type === 'diagnosis' && conv.context_id) {
      const diagnosis = await this.diagnosisRepo.findOne({ where: { id: conv.context_id } });
      if (diagnosis) {
        context = {
          type: '简历诊断结果',
          data: `公司: ${diagnosis.jd_company || '未知'}\n岗位: ${diagnosis.jd_role || '未知'}\n匹配分: ${diagnosis.score}/100\n命中关键词: ${(diagnosis.keywords_hit || []).join(', ')}\n缺失关键词: ${(diagnosis.keywords_miss || []).join(', ')}\n改写建议: ${(diagnosis.suggestions || []).map((s: any) => s.reason).join('; ')}`,
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

    return assistantMsg;
  }

  async remove(id: string, userId: string): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { id, user_id: userId } });
    if (!conv) throw new NotFoundException();
    await this.convRepo.remove(conv);
  }
}

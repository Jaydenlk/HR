import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ChatService } from './chat.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
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

    // Get AI reply
    const replyText = await this.chat.reply(history, content);

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

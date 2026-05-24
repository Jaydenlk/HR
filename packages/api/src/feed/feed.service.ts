import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
  ) {}

  create(userId: string, dto: CreateFeedItemDto): Promise<FeedItem> {
    const item = this.repo.create({
      user_id: userId,
      title: dto.title,
      content: dto.content,
      company: dto.company,
      role: dto.role,
      outcome: dto.outcome,
      source: 'ugc',
      category: 'interview_exp',
    });
    return this.repo.save(item);
  }

  findAll(): Promise<FeedItem[]> {
    return this.repo.find({
      relations: { user: true },
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!item) throw new NotFoundException();
    await this.repo.remove(item);
  }
}

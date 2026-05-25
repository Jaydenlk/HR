import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

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
        source_kind: 'ugc',
        source_name: '用户投稿',
        category: 'interview_exp',
      });
    return this.repo.save(item);
  }

  findAll(query: FeedQueryDto = {}): Promise<FeedItem[]> {
    const qb = this.repo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.user', 'user')
      .leftJoinAndSelect('item.source_ref', 'source')
      .where(
        new Brackets((scope) => {
          scope
            .where('item.source_kind IN (:...localKinds)', { localKinds: ['ugc', 'coach'] })
            .orWhere('item.source_url IS NOT NULL');
        }),
      )
      .orderBy('item.published_at', 'DESC')
      .addOrderBy('item.created_at', 'DESC');

    if (query.category) {
      qb.andWhere('item.category = :category', { category: query.category });
    }
    if (query.source_kind) {
      qb.andWhere('item.source_kind = :sourceKind', { sourceKind: query.source_kind });
    }
    if (query.company) {
      qb.andWhere('item.company = :company', { company: query.company });
    }
    if (query.keyword) {
      qb.andWhere(
        new Brackets((scope) => {
          scope
            .where('item.title LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('item.content LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('item.company LIKE :keyword', { keyword: `%${query.keyword}%` });
        }),
      );
    }

    return qb.getMany();
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!item) throw new NotFoundException();
    await this.repo.remove(item);
  }
}

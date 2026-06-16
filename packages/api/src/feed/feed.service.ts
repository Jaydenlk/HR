import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedItemResponseDto } from './dto/feed-item-response.dto';
import type { ClassifiedFeed } from './feed-classifier.service';
import type { FeedCandidate } from './importers/feed-importer.interface';
import { CompanyRegistryService } from './company-registry.service';
import { deriveQuarterFromPublishedAt, applyFeedQualityFilter } from './radar-helpers';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
    private readonly companyRegistry: CompanyRegistryService,
  ) {}

  async create(userId: string, dto: CreateFeedItemDto): Promise<FeedItemResponseDto> {
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
    const saved = await this.repo.save(item);
    return FeedItemResponseDto.from(saved);
  }

  async findAll(query: FeedQueryDto = {}): Promise<FeedItemResponseDto[]> {
    const qb = this.repo
      .createQueryBuilder('item')
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

    const raw = await qb.getMany();
    return raw
      .map((item) => applyFeedQualityFilter(item))
      .filter((item): item is FeedItem => item !== null)
      .map((item) => FeedItemResponseDto.from(item));
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!item) throw new NotFoundException();
    await this.repo.remove(item);
  }

  async existsExternal(externalId: string, sourceUrl: string): Promise<boolean> {
    const conditions: Array<Record<string, string>> = [];
    if (externalId) conditions.push({ external_id: externalId });
    if (sourceUrl) conditions.push({ source_url: sourceUrl });
    if (conditions.length === 0) return false;
    const existing = await this.repo.findOne({ where: conditions });
    return Boolean(existing);
  }

  async saveExternal(
    candidate: FeedCandidate,
    classified: ClassifiedFeed,
    sourceId: string,
  ): Promise<FeedItem> {
    const item = this.repo.create({
      user_id: null,
      title: classified.title,
      content: candidate.content,
      summary: classified.summary,
      company: classified.company,
      role: classified.role,
      outcome: classified.outcome,
      source: candidate.source_kind,
      source_kind: candidate.source_kind,
      source_name: candidate.source_name,
      source_id: sourceId,
      source_url: candidate.source_url,
      external_id: candidate.external_id,
      fetched_at: candidate.fetched_at,
      published_at: candidate.published_at,
      date_confidence: candidate.date_confidence,
      category: classified.category,
      tags_json: JSON.stringify(classified.tags),
      quality_score: classified.quality_score,
      author: candidate.author,
      department: classified.department,
      role_category: classified.role_category,
      interview_round: classified.interview_round,
      question_types: classified.question_types,
      difficulty: classified.difficulty,
      quarter: classified.quarter,
      confidence: classified.confidence,
    });
    item.quarter = deriveQuarterFromPublishedAt(candidate.published_at, candidate.date_confidence);
    if (classified.company) {
      const matched = await this.companyRegistry.matchCompany(classified.company);
      if (matched) {
        item.company_id = matched.id;
      }
    }
    if (classified.role_category) {
      const matched = await this.companyRegistry.matchRoleCategory(classified.role_category);
      if (matched) {
        item.role_category_id = matched.id;
      }
    }
    return this.repo.save(item);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { Application } from '../applications/entities/application.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';

export interface NewspaperEdition {
  headline: { items: FeedItem[]; generated_at: string };
  user_voice: FeedItem[];
  tech_radar: FeedItem[];
  insight: FeedItem[];
  trending_tags: string[];
  total_count: number;
  categories: Record<string, number>;
}

export interface RadarQuery {
  company?: string;
  role_category?: string;
  source_kind?: string;
  quarter?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface RadarResult {
  items: FeedItem[];
  total: number;
  company_stats: Array<{ company: string; count: number }>;
  role_stats: Array<{ role_category: string; count: number }>;
}

@Injectable()
export class NewspaperService {
  constructor(
    @InjectRepository(FeedItem)
    private readonly feedRepo: Repository<FeedItem>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
  ) {}

  async getNewspaper(userId: string): Promise<NewspaperEdition> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query all non-low-confidence items from last 7 days
    const allItems = await this.feedRepo.find({
      where: {
        confidence: Not('low') as never,
        created_at: MoreThanOrEqual(sevenDaysAgo),
      },
      order: { quality_score: 'DESC' },
    });

    // Build user companies set for personalization
    const userCompanies = new Set<string>();

    const apps = await this.appRepo.find({
      where: { user_id: userId },
      select: { company: true },
    });
    apps.forEach((a) => {
      if (a.company) userCompanies.add(a.company.toLowerCase());
    });

    const opps = await this.oppRepo.find({
      where: { user_id: userId },
      select: { company: true },
    });
    opps.forEach((o) => {
      if (o.company) userCompanies.add(o.company.toLowerCase());
    });

    // Personalized sort: boost items matching user companies
    const sortPersonalized = (items: FeedItem[]): FeedItem[] =>
      [...items].sort((a, b) => {
        const aRelevant = a.company && userCompanies.has(a.company.toLowerCase()) ? 1 : 0;
        const bRelevant = b.company && userCompanies.has(b.company.toLowerCase()) ? 1 : 0;
        if (aRelevant !== bRelevant) return bRelevant - aRelevant;
        return (b.quality_score ?? 0) - (a.quality_score ?? 0);
      });

    // Split by source_kind
    const userVoiceRaw = allItems
      .filter((i) => i.source_kind === 'xhs')
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
      .slice(0, 10);

    const techRadarRaw = allItems
      .filter((i) => i.source_kind === 'nowcoder')
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
      .slice(0, 10);

    const insightRaw = allItems
      .filter((i) => i.source_kind === 'wechat')
      .slice(0, 5);

    // Build trending_tags from this week's items
    const tagFreq = new Map<string, number>();
    for (const item of allItems) {
      if (!item.tags_json) continue;
      try {
        const tags: string[] = JSON.parse(item.tags_json);
        for (const tag of tags) {
          tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
        }
      } catch {
        // skip malformed tags_json
      }
    }
    const trendingTags = [...tagFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    // Build categories count
    const categories: Record<string, number> = {};
    for (const item of allItems) {
      if (item.category) {
        categories[item.category] = (categories[item.category] ?? 0) + 1;
      }
    }

    // Headline: top 3 overall by personalized sort
    const headlineItems = sortPersonalized(allItems).slice(0, 3);

    return {
      headline: {
        items: headlineItems,
        generated_at: new Date().toISOString(),
      },
      user_voice: sortPersonalized(userVoiceRaw),
      tech_radar: sortPersonalized(techRadarRaw),
      insight: insightRaw,
      trending_tags: trendingTags,
      total_count: allItems.length,
      categories,
    };
  }

  async getRadar(query: RadarQuery): Promise<RadarResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.feedRepo.createQueryBuilder('item');

    if (query.company) {
      qb.andWhere('item.company = :company', { company: query.company });
    }
    if (query.role_category) {
      qb.andWhere('item.role_category = :roleCategory', {
        roleCategory: query.role_category,
      });
    }
    if (query.source_kind) {
      qb.andWhere('item.source_kind = :sourceKind', {
        sourceKind: query.source_kind,
      });
    }
    if (query.quarter) {
      qb.andWhere('item.quarter = :quarter', { quarter: query.quarter });
    }
    if (query.keyword) {
      qb.andWhere(
        '(item.title LIKE :keyword OR item.content LIKE :keyword OR item.company LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('item.quality_score', 'DESC')
      .addOrderBy('item.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Company stats aggregation
    const companyStatsQb = this.feedRepo.createQueryBuilder('item')
      .select('item.company', 'company')
      .addSelect('COUNT(*)', 'count')
      .where('item.company IS NOT NULL');

    if (query.quarter) {
      companyStatsQb.andWhere('item.quarter = :quarter', { quarter: query.quarter });
    }

    const companyStatsRaw: Array<{ company: string; count: string }> =
      await companyStatsQb
        .groupBy('item.company')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

    const companyStats = companyStatsRaw.map((r) => ({
      company: r.company,
      count: parseInt(r.count, 10),
    }));

    // Role stats aggregation
    const roleStatsQb = this.feedRepo.createQueryBuilder('item')
      .select('item.role_category', 'role_category')
      .addSelect('COUNT(*)', 'count')
      .where('item.role_category IS NOT NULL');

    if (query.quarter) {
      roleStatsQb.andWhere('item.quarter = :quarter', { quarter: query.quarter });
    }

    const roleStatsRaw: Array<{ role_category: string; count: string }> =
      await roleStatsQb
        .groupBy('item.role_category')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

    const roleStats = roleStatsRaw.map((r) => ({
      role_category: r.role_category,
      count: parseInt(r.count, 10),
    }));

    return {
      items,
      total,
      company_stats: companyStats,
      role_stats: roleStats,
    };
  }
}

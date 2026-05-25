import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { EvidenceService } from '../intelligence/evidence.service';

// --- Response interfaces ---

export interface HeadlineObservation {
  observation: string;
  evidence_items: FeedItem[];
}

export interface InsightCard {
  title: string;
  source_name: string;
  source_url: string;
  why_read: string;
  career_implication: string;
  impact_tags: string[];
  summary: string;
}

export interface RoleTrend {
  role_category: string;
  label: string;
  hot_topics: string[];
  item_count: number;
}

export interface CoachAction {
  action: string;
  reason: string;
  data_source: string;
}

export interface NewspaperEdition {
  headline_observations: HeadlineObservation[];
  insight_cards: InsightCard[];
  user_voice: FeedItem[];
  tech_radar: FeedItem[];
  role_trends: RoleTrend[];
  coach_actions: CoachAction[];
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
    private readonly evidence: EvidenceService,
  ) {}

  async getNewspaper(userId: string): Promise<NewspaperEdition> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query all non-low-confidence items from last 7 days
    const allItemsRaw = await this.feedRepo.find({
      where: {
        confidence: Not('low') as never,
        created_at: MoreThanOrEqual(sevenDaysAgo),
      },
      order: { quality_score: 'DESC' },
    });

    // Issue 8: Filter out items with empty/null source_url
    const allItems = allItemsRaw.filter(
      (i) => i.source_url && i.source_url.trim() !== '',
    );

    // Build user companies set for personalization
    const companiesOfInterest = await this.evidence.getCompaniesOfInterest(userId);
    const userCompanies = new Set(companiesOfInterest.map((c) => c.toLowerCase()));

    // Personalized sort: boost items matching user companies
    const sortPersonalized = (items: FeedItem[]): FeedItem[] =>
      [...items].sort((a, b) => {
        const aRelevant =
          a.company && userCompanies.has(a.company.toLowerCase()) ? 1 : 0;
        const bRelevant =
          b.company && userCompanies.has(b.company.toLowerCase()) ? 1 : 0;
        if (aRelevant !== bRelevant) return bRelevant - aRelevant;
        return (b.quality_score ?? 0) - (a.quality_score ?? 0);
      });

    // Issue 4: headline_observations — rule-based aggregation
    const headlineObservations = this.buildHeadlineObservations(allItems);

    // Split by source_kind
    const userVoiceRaw = allItems
      .filter((i) => i.source_kind === 'xhs')
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
      .slice(0, 10);

    const techRadarRaw = allItems
      .filter((i) => i.source_kind === 'nowcoder')
      .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
      .slice(0, 10);

    // Issue 5: insight_cards from wechat items
    const wechatItems = allItems
      .filter((i) => i.source_kind === 'wechat')
      .slice(0, 5);
    const insightCards = this.buildInsightCards(wechatItems);

    // Issue 6: coach_actions — personalized user guidance
    const coachActions = await this.buildCoachActions(userId);

    // role_trends — aggregate by role_category
    const roleTrends = this.buildRoleTrends(allItems);

    // Issue 7: trending_tags — parse FeedTags object properly
    const trendingTags = this.buildTrendingTags(allItems);

    // Build categories count
    const categories: Record<string, number> = {};
    for (const item of allItems) {
      if (item.category) {
        categories[item.category] = (categories[item.category] ?? 0) + 1;
      }
    }

    return {
      headline_observations: headlineObservations,
      insight_cards: insightCards,
      user_voice: sortPersonalized(userVoiceRaw),
      tech_radar: sortPersonalized(techRadarRaw),
      role_trends: roleTrends,
      coach_actions: coachActions,
      trending_tags: trendingTags,
      total_count: allItems.length,
      categories,
    };
  }

  // --- Issue 4: headline_observations ---

  private buildHeadlineObservations(
    items: FeedItem[],
  ): HeadlineObservation[] {
    const observations: HeadlineObservation[] = [];

    // Group by company
    const byCompany = new Map<string, FeedItem[]>();
    for (const item of items) {
      if (item.company) {
        const list = byCompany.get(item.company) || [];
        list.push(item);
        byCompany.set(item.company, list);
      }
    }

    // Top companies with most items
    const sortedCompanies = [...byCompany.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    for (const [company, companyItems] of sortedCompanies) {
      const roles = [
        ...new Set(companyItems.map((i) => i.role_category).filter(Boolean)),
      ];
      observations.push({
        observation: `本周${company}面经活跃（${companyItems.length}条），涉及${roles.join('、') || '多个岗位'}`,
        evidence_items: companyItems.slice(0, 3),
      });
    }

    return observations.slice(0, 3);
  }

  // --- Issue 5: insight_cards ---

  private buildInsightCards(items: FeedItem[]): InsightCard[] {
    return items.map((item) => ({
      title: item.title,
      source_name: item.source_name ?? '公众号',
      source_url: item.source_url ?? '',
      why_read: item.summary
        ? `了解${item.company ?? '行业'}最新动态`
        : '行业深度分析',
      career_implication: this.inferCareerImplication(item),
      impact_tags: this.extractImpactTags(item),
      summary: item.summary ?? item.content.slice(0, 150),
    }));
  }

  private inferCareerImplication(item: FeedItem): string {
    if (item.company)
      return `关注${item.company}的求职者应了解此动态`;
    if (item.role_category)
      return `${item.role_category}岗位求职者值得关注`;
    return '了解行业趋势有助于求职决策';
  }

  private extractImpactTags(item: FeedItem): string[] {
    const tags: string[] = [];
    if (item.company) tags.push(item.company);
    if (item.role_category) tags.push(item.role_category);
    if (item.tags_json) {
      try {
        const parsed = JSON.parse(item.tags_json);
        if (Array.isArray(parsed.topics)) tags.push(...parsed.topics.slice(0, 3));
      } catch {
        // skip malformed tags_json
      }
    }
    return [...new Set(tags)].slice(0, 5);
  }

  // --- Issue 6: coach_actions ---

  private async buildCoachActions(userId: string): Promise<CoachAction[]> {
    const intelligence = await this.evidence.gather(userId);
    const actions: CoachAction[] = [];

    if (!intelligence.has_resume) {
      actions.push({
        action: '上传简历',
        reason: '上传简历后可获得个性化面经推荐',
        data_source: '你还没有上传简历',
      });
    }

    if (intelligence.has_applications) {
      const companies = intelligence.application_companies.slice(0, 3).join('、');
      actions.push({
        action: `关注${companies}的最新面经`,
        reason: '你正在投递这些公司',
        data_source: `基于你的投递记录（${intelligence.applications.length}个）`,
      });
    } else {
      actions.push({
        action: '开始投递',
        reason: '投递后月刊会为你推荐相关面经',
        data_source: '你还没有投递记录',
      });
    }

    if (intelligence.has_opportunities) {
      actions.push({
        action: '查看机会评估相关面经',
        reason: '你评估过的公司有新面经',
        data_source: `基于${intelligence.opportunities.length}个机会评估`,
      });
    }

    return actions.slice(0, 3);
  }

  // --- role_trends ---

  private buildRoleTrends(items: FeedItem[]): RoleTrend[] {
    const byRole = new Map<string, FeedItem[]>();
    for (const item of items) {
      if (item.role_category) {
        const list = byRole.get(item.role_category) || [];
        list.push(item);
        byRole.set(item.role_category, list);
      }
    }

    return [...byRole.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([roleCategory, roleItems]) => {
        // Collect hot topics from question_types
        const topicCounts = new Map<string, number>();
        for (const item of roleItems) {
          if (Array.isArray(item.question_types)) {
            for (const qt of item.question_types) {
              if (typeof qt === 'string' && qt.trim()) {
                topicCounts.set(qt, (topicCounts.get(qt) ?? 0) + 1);
              }
            }
          }
        }
        const hotTopics = [...topicCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic]) => topic);

        return {
          role_category: roleCategory,
          label: roleCategory,
          hot_topics: hotTopics,
          item_count: roleItems.length,
        };
      });
  }

  // --- Issue 7: trending_tags ---

  private buildTrendingTags(items: FeedItem[]): string[] {
    const tagCounts = new Map<string, number>();
    for (const item of items) {
      if (!item.tags_json) continue;
      try {
        const tags = JSON.parse(item.tags_json);
        const allTags = [
          ...(Array.isArray(tags.companies) ? tags.companies : []),
          ...(Array.isArray(tags.roles) ? tags.roles : []),
          ...(Array.isArray(tags.topics) ? tags.topics : []),
        ];
        for (const tag of allTags) {
          if (typeof tag === 'string' && tag.trim()) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
          }
        }
      } catch {
        // skip malformed tags_json
      }
    }
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  // --- Radar ---

  async getRadar(query: RadarQuery): Promise<RadarResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Issue 9: Build where clause once, reuse for items + stats
    const qb = this.feedRepo.createQueryBuilder('item');
    this.applyRadarFilters(qb, query);

    const [items, total] = await qb
      .orderBy('item.quality_score', 'DESC')
      .addOrderBy('item.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Company stats aggregation — same filters
    const companyStatsQb = this.feedRepo
      .createQueryBuilder('item')
      .select('item.company', 'company')
      .addSelect('COUNT(*)', 'count');
    this.applyRadarFilters(companyStatsQb, query);
    companyStatsQb.andWhere('item.company IS NOT NULL');

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

    // Role stats aggregation — same filters
    const roleStatsQb = this.feedRepo
      .createQueryBuilder('item')
      .select('item.role_category', 'role_category')
      .addSelect('COUNT(*)', 'count');
    this.applyRadarFilters(roleStatsQb, query);
    roleStatsQb.andWhere('item.role_category IS NOT NULL');

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

  /** Applies all radar filter conditions to a QueryBuilder. Reused for items + stats. */
  private applyRadarFilters(
    qb: ReturnType<Repository<FeedItem>['createQueryBuilder']>,
    query: RadarQuery,
  ): void {
    qb.andWhere('item.source_kind IN (:...externalSources)', {
      externalSources: ['xhs', 'nowcoder', 'wechat'],
    });
    qb.andWhere('item.source_url IS NOT NULL');
    qb.andWhere("item.source_url != ''");
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
  }
}

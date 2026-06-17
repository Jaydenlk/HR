import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { EvidenceService } from '../intelligence/evidence.service';
import { CompanyRegistryService } from './company-registry.service';
import {
  normalizeQualityScore,
  isUsable,
  buildDominantSignal,
  normalizeRoleCategory,
  normalizeQuarter,
  getCurrentQuarter,
  isValidCompany,
  computeGroupStats,
  applyFeedQualityFilter,
} from './radar-helpers';
import { EXTERNAL_SOURCE_KINDS } from './types/feed.types';

// Radar 分页 limit 默认/上限:service 层兜底强制 clamp,无论入参如何都不越界(防 .take(limit) 拉爆内存)。
const RADAR_DEFAULT_LIMIT = 20;
const RADAR_MAX_LIMIT = 100;

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

export interface CompanyRadarItem {
  company: string;
  company_id: string | null;
  company_type: string | null;
  priority: string | null;
  sector: string | null;
  total_count: number;
  usable_count: number;
  low_confidence_count: number;
  candidate_count: number;
  rejected_count: number;
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  top_roles: string[];
  high_confidence_count: number;
  quality_score_avg: number;
  latest_collected_at: string | null;
  dominant_signal: string | null;
}

export interface CompanyRadarResponse {
  companies: CompanyRadarItem[];
  total_companies: number;
  generated_at: string;
}

export interface RoleRadarItem {
  role_category: string;
  label: string;
  total_count: number;
  usable_count: number;
  candidate_count: number;
  rejected_count: number;
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  top_companies: string[];
  companies_covered: number;
  common_question_keywords: string[];
  representative_posts: Array<{
    title: string;
    company: string | null;
    source_url: string;
    source_kind: string;
  }>;
}

export interface RoleRadarResponse {
  roles: RoleRadarItem[];
  total_roles: number;
  generated_at: string;
}

export interface TrendRadarResponse {
  period: { current_start: string; current_end: string; previous_start: string; previous_end: string; };
  this_week: { new_items: number; new_companies: string[]; new_role_categories: string[]; top_sources: Array<{ source_kind: string; count: number }>; };
  comparison: { has_baseline: boolean; item_count_delta: number; item_count_previous: number; message: string; };
  hot_posts: Array<{ title: string; company: string | null; role_category: string | null; source_kind: string; source_url: string; created_at: string; published_at: string | null; date_confidence: string; }>;
}

@Injectable()
export class NewspaperService {
  constructor(
    @InjectRepository(FeedItem)
    private readonly feedRepo: Repository<FeedItem>,
    private readonly evidence: EvidenceService,
    private readonly companyRegistry: CompanyRegistryService,
  ) {}

  async getNewspaper(userId: string): Promise<NewspaperEdition> {
    const { start, end } = getCurrentQuarter();

    // Query items from current quarter with high/medium date_confidence
    const allItemsRaw = await this.feedRepo
      .createQueryBuilder('item')
      .where('item.confidence != :lowConf', { lowConf: 'low' })
      .andWhere('item.published_at >= :qStart', { qStart: start.toISOString() })
      .andWhere('item.published_at <= :qEnd', { qEnd: end.toISOString() })
      .andWhere("item.date_confidence IN ('high', 'medium')")
      .orderBy('item.quality_score', 'DESC')
      .getMany();

    // Quality filter: strip English-only titles, string-null company, placeholder URLs
    const qualityFiltered = allItemsRaw
      .map((i) => applyFeedQualityFilter(i))
      .filter((i): i is FeedItem => i !== null);

    // Issue 4 (freshness): Only usable items on homepage
    const allItems = qualityFiltered.filter(isUsable);

    if (allItems.length === 0) {
      return {
        headline_observations: [],
        insight_cards: [],
        user_voice: [],
        tech_radar: [],
        role_trends: [],
        coach_actions: await this.buildCoachActions(userId),
        trending_tags: [],
        total_count: 0,
        categories: {},
      };
    }

    // Build user companies set for personalization
    const companiesOfInterest = await this.evidence.getCompaniesOfInterest(userId);
    const userCompanies = new Set(companiesOfInterest.map((c) => c.toLowerCase()));

    // Personalized sort: user-relevant companies first, then quality, then time
    const rankPersonalized = (items: FeedItem[]): FeedItem[] =>
      [...items].sort((a, b) => {
        const aRelevant = a.company && userCompanies.has(a.company.toLowerCase()) ? 1 : 0;
        const bRelevant = b.company && userCompanies.has(b.company.toLowerCase()) ? 1 : 0;
        if (aRelevant !== bRelevant) return bRelevant - aRelevant;
        const scoreDiff = (b.quality_score ?? 0) - (a.quality_score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0);
      });

    // Issue 4: headline_observations — rule-based aggregation
    const headlineObservations = this.buildHeadlineObservations(allItems);

    // Split by source_kind — personalize BEFORE slice to prevent truncation
    const userVoiceRaw = rankPersonalized(
      allItems.filter((i) => i.source_kind === 'xhs'),
    ).slice(0, 10);

    const techRadarRaw = rankPersonalized(
      allItems.filter((i) => i.source_kind === 'nowcoder'),
    ).slice(0, 10);

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
      user_voice: userVoiceRaw,
      tech_radar: techRadarRaw,
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

  // --- Radar Companies ---

  async getRadarCompanies(): Promise<CompanyRadarResponse> {
    const items = await this.feedRepo.find({
      where: {
        source_kind: In(EXTERNAL_SOURCE_KINDS),
      },
    });

    const companyItems = items.filter((i) => isValidCompany(i.company));

    // Group by company
    const byCompany = new Map<string, FeedItem[]>();
    for (const item of companyItems) {
      const key = item.company as string;
      const list = byCompany.get(key) || [];
      list.push(item);
      byCompany.set(key, list);
    }

    // Fetch all registered companies for enrichment
    const allRegistered = await this.companyRegistry.findAll();
    const registryMap = new Map(allRegistered.map((c) => [c.name, c]));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const companies: CompanyRadarItem[] = [];

    for (const [company, group] of byCompany) {
      const stats = computeGroupStats(group);

      const lowConfCount = group.filter((i) => i.confidence === 'low').length;
      const highConfCount = group.filter((i) => i.confidence === 'high').length;

      // Top roles — normalize every item's role_category
      const roleCounts = new Map<string, number>();
      for (const item of group) {
        const normalized = normalizeRoleCategory(item.role_category);
        roleCounts.set(normalized, (roleCounts.get(normalized) ?? 0) + 1);
      }
      const topRoles = [...roleCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role]) => role);

      // Quality score average
      const scores = group.map((i) => normalizeQualityScore(i.quality_score));
      const qualityAvg = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
        : 0;

      // Latest collected_at
      const dates = group
        .map((i) => i.created_at)
        .filter((d): d is Date => d instanceof Date);
      const latestDate = dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : null;

      const hasRecentItems = dates.some((d) => d >= sevenDaysAgo);

      // Dominant signal
      const dominantSignal = buildDominantSignal({
        roleCounts,
        totalCount: group.length,
        xhsCount: stats.xhsCount,
        nowcoderCount: stats.nowcoderCount,
        hasRecentItems,
        usableCount: stats.usableCount,
      });

      // Enrich from registry
      const registered = registryMap.get(company) ?? null;

      companies.push({
        company,
        company_id: registered?.id ?? null,
        company_type: registered?.company_type ?? null,
        priority: registered?.priority ?? null,
        sector: registered?.sector ?? null,
        total_count: group.length,
        usable_count: stats.usableCount,
        low_confidence_count: lowConfCount,
        candidate_count: stats.candidateCount,
        rejected_count: stats.rejectedCount,
        xhs_count: stats.xhsCount,
        nowcoder_count: stats.nowcoderCount,
        wechat_count: stats.wechatCount,
        top_roles: topRoles,
        high_confidence_count: highConfCount,
        quality_score_avg: qualityAvg,
        latest_collected_at: latestDate ? latestDate.toISOString() : null,
        dominant_signal: dominantSignal,
      });
    }

    // Sort by usable_count DESC, quality_score_avg DESC
    companies.sort((a, b) => {
      if (b.usable_count !== a.usable_count) return b.usable_count - a.usable_count;
      return b.quality_score_avg - a.quality_score_avg;
    });

    return {
      companies,
      total_companies: companies.length,
      generated_at: new Date().toISOString(),
    };
  }

  // --- Radar Roles ---

  async getRadarRoles(): Promise<RoleRadarResponse> {
    const items = await this.feedRepo.find({
      where: {
        source_kind: In(EXTERNAL_SOURCE_KINDS),
      },
    });

    // Group by normalized role_category
    const byRole = new Map<string, FeedItem[]>();
    for (const item of items) {
      const key = normalizeRoleCategory(item.role_category);
      const list = byRole.get(key) || [];
      list.push(item);
      byRole.set(key, list);
    }

    // Load role categories from seed for question_taxonomy
    const allRoleCategories = await this.companyRegistry.findAllRoleCategories();
    const taxonomyMap = new Map(
      allRoleCategories.map((rc) => [rc.role_key, rc]),
    );

    const roles: RoleRadarItem[] = [];

    for (const [roleKey, group] of byRole) {
      const stats = computeGroupStats(group);

      // Top companies
      const companyCounts = new Map<string, number>();
      for (const item of group) {
        if (item.company && item.company.trim() !== '') {
          companyCounts.set(item.company, (companyCounts.get(item.company) ?? 0) + 1);
        }
      }
      const topCompanies = [...companyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([company]) => company);

      const companiesCovered = companyCounts.size;

      // Common question keywords from seed taxonomy
      const rcSeed = taxonomyMap.get(roleKey);
      const commonQuestionKeywords = rcSeed?.question_taxonomy ?? [];

      // Representative posts: top 3 usable items by normalized quality_score
      const usableItems = group
        .filter((i) => isUsable(i))
        .sort((a, b) => normalizeQualityScore(b.quality_score) - normalizeQualityScore(a.quality_score))
        .slice(0, 3);

      const representativePosts = usableItems.map((i) => ({
        title: i.title,
        company: i.company,
        source_url: i.source_url as string,
        source_kind: i.source_kind,
      }));

      // Label from seed or fallback to role_key
      const label = rcSeed?.label ?? roleKey;

      roles.push({
        role_category: roleKey,
        label,
        total_count: group.length,
        usable_count: stats.usableCount,
        candidate_count: stats.candidateCount,
        rejected_count: stats.rejectedCount,
        xhs_count: stats.xhsCount,
        nowcoder_count: stats.nowcoderCount,
        wechat_count: stats.wechatCount,
        top_companies: topCompanies,
        companies_covered: companiesCovered,
        common_question_keywords: commonQuestionKeywords,
        representative_posts: representativePosts,
      });
    }

    // Sort by total_count DESC
    roles.sort((a, b) => b.total_count - a.total_count);

    return {
      roles,
      total_roles: roles.length,
      generated_at: new Date().toISOString(),
    };
  }

  // --- Radar Trends ---

  async getRadarTrends(): Promise<TrendRadarResponse> {
    const now = new Date();

    const currentEnd = now;
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);

    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);

    // Only include items with high/medium date_confidence for trend calculations
    const allItems = await this.feedRepo
      .createQueryBuilder('item')
      .where('item.source_kind IN (:...externalSources)', {
        externalSources: EXTERNAL_SOURCE_KINDS,
      })
      .andWhere("item.date_confidence IN ('high', 'medium')")
      .getMany();

    // Use published_at (not created_at) for time-window filtering
    const currentItems = allItems.filter(
      (i) => i.published_at && i.published_at >= currentStart && i.published_at <= currentEnd,
    );
    const previousItems = allItems.filter(
      (i) => i.published_at && i.published_at >= previousStart && i.published_at < previousEnd,
    );

    const currentCompanies = new Set(currentItems.map((i) => i.company).filter(isValidCompany));
    const previousCompanies = new Set(previousItems.map((i) => i.company).filter(isValidCompany));
    const newCompanies = [...currentCompanies].filter((c) => !previousCompanies.has(c));

    const currentRoles = new Set(currentItems.map((i) => normalizeRoleCategory(i.role_category)));
    const previousRoles = new Set(previousItems.map((i) => normalizeRoleCategory(i.role_category)));
    const newRoleCategories = [...currentRoles].filter((r) => !previousRoles.has(r));

    // top_sources by count
    const sourceCounts = new Map<string, number>();
    for (const item of currentItems) {
      sourceCounts.set(item.source_kind, (sourceCounts.get(item.source_kind) ?? 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source_kind, count]) => ({ source_kind, count }));

    // comparison
    const hasBaseline = previousItems.length > 0;
    const itemCountDelta = hasBaseline ? currentItems.length - previousItems.length : 0;
    const message = hasBaseline
      ? `本周${currentItems.length}条，环比${itemCountDelta >= 0 ? '+' : ''}${itemCountDelta}条`
      : '暂无足够历史数据计算环比';

    // hot_posts: usable items from current period, most recent 5
    const hotPosts = currentItems
      .filter((i) => isUsable(i) && i.source_url && i.source_url.trim() !== '')
      .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0))
      .slice(0, 5)
      .map((i) => ({
        title: i.title,
        company: i.company,
        role_category: i.role_category,
        source_kind: i.source_kind,
        source_url: i.source_url as string,
        created_at: i.created_at?.toISOString() ?? '',
        published_at: i.published_at ? new Date(i.published_at).toISOString() : null,
        date_confidence: i.date_confidence || 'unknown',
      }));

    return {
      period: {
        current_start: currentStart.toISOString(),
        current_end: currentEnd.toISOString(),
        previous_start: previousStart.toISOString(),
        previous_end: previousEnd.toISOString(),
      },
      this_week: {
        new_items: currentItems.length,
        new_companies: newCompanies,
        new_role_categories: newRoleCategories,
        top_sources: topSources,
      },
      comparison: {
        has_baseline: hasBaseline,
        item_count_delta: itemCountDelta,
        item_count_previous: previousItems.length,
        message,
      },
      hot_posts: hotPosts,
    };
  }

  // --- Radar ---

  async getRadar(query: RadarQuery): Promise<RadarResult> {
    const page = query.page ?? 1;
    const limit = this.clampRadarLimit(query.limit);
    const offset = (page - 1) * limit;

    // Issue 9: Build where clause once, reuse for items + stats
    const qb = this.feedRepo.createQueryBuilder('item');
    this.applyRadarFilters(qb, query);

    const [rawItems, total] = await qb
      .orderBy('item.quality_score', 'DESC')
      .addOrderBy('item.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const items = rawItems
      .map((i) => applyFeedQualityFilter(i))
      .filter((i): i is FeedItem => i !== null);

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
      externalSources: EXTERNAL_SOURCE_KINDS,
    });
    qb.andWhere('item.source_url IS NOT NULL');
    qb.andWhere("item.source_url != ''");

    // Radar shows content from last 5 years; null published_at allowed
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    qb.andWhere(
      '(item.published_at >= :fiveYearsAgo OR item.published_at IS NULL)',
      { fiveYearsAgo: fiveYearsAgo.toISOString() },
    );
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
      const normalized = normalizeQuarter(query.quarter);
      if (normalized !== null) {
        qb.andWhere('item.quarter = :quarter', { quarter: normalized });
      }
    }
    if (query.keyword) {
      qb.andWhere(
        '(item.title LIKE :keyword OR item.content LIKE :keyword OR item.company LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }
  }

  /** Radar 分页 limit 钳制:未传/NaN → 20;否则向下取整后钳到 [1, 100],防 .take(limit) 无上限拉爆内存。 */
  private clampRadarLimit(limit?: number): number {
    if (limit === undefined || Number.isNaN(limit)) return RADAR_DEFAULT_LIMIT;
    return Math.min(Math.max(Math.trunc(limit), 1), RADAR_MAX_LIMIT);
  }
}

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoverageMetric } from './entities/coverage-metric.entity';
import { FeedItem } from './entities/feed-item.entity';
import { Company } from './entities/company.entity';
import { RoleCategory } from './entities/role-category.entity';
import { CompanyRegistryService } from './company-registry.service';
import { FeedIngestionService } from './feed-ingestion.service';
import { SourceRegistryService } from './source-registry.service';
import type { FeedSourceKind } from './types/feed.types';

export interface SearchJob {
  company_id: string;
  company_name: string;
  role_category_id: string;
  role_key: string;
  source: 'xhs' | 'nowcoder';
  query: string;
  target_count: number;
  current_count: number;
  gap: number;
  priority: string;
}

const TARGET_BY_PRIORITY: Record<string, number> = { A: 5, B: 3 };
const DEFAULT_DAILY_QUERY_BUDGET = 30;

@Injectable()
export class SearchSchedulerService {
  private readonly logger = new Logger(SearchSchedulerService.name);

  constructor(
    @InjectRepository(CoverageMetric)
    private readonly metricsRepo: Repository<CoverageMetric>,
    @InjectRepository(FeedItem)
    private readonly feedItemRepo: Repository<FeedItem>,
    private readonly companyRegistry: CompanyRegistryService,
    @Inject(forwardRef(() => FeedIngestionService))
    private readonly ingestion: FeedIngestionService,
    private readonly sourceRegistry: SourceRegistryService,
  ) {}

  async planDailyJobs(): Promise<SearchJob[]> {
    const quarter = this.currentQuarter();
    const [companies, roleCategories] = await Promise.all([
      this.fetchPriorityCompanies(),
      this.metricsRepo.manager.find(RoleCategory),
    ]);

    const metrics = await this.metricsRepo.find({
      where: { quarter },
    });
    const metricMap = this.buildMetricMap(metrics);

    const jobs: SearchJob[] = [];

    for (const company of companies) {
      const target = TARGET_BY_PRIORITY[company.priority] ?? 3;

      for (const rc of roleCategories) {
        if (!company.role_focus.includes(rc.role_key)) continue;

        const metricKey = `${company.id}:${rc.id}`;
        const validCount = metricMap.get(metricKey) ?? 0;
        const gap = target - validCount;
        if (gap <= 0) continue;

        const source = this.resolveSource(company.source_preference, rc.source_preference);
        const queryAlias = rc.aliases[0] ?? rc.label;
        const query = `${company.name} ${queryAlias} 面经 2026`;

        jobs.push({
          company_id: company.id,
          company_name: company.name,
          role_category_id: rc.id,
          role_key: rc.role_key,
          source,
          query,
          target_count: target,
          current_count: validCount,
          gap,
          priority: company.priority,
        });
      }
    }

    jobs.sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      return a.priority.localeCompare(b.priority);
    });

    const budget = this.dailyQueryBudget();
    return jobs.slice(0, budget);
  }

  async executeJobs(jobs: SearchJob[]): Promise<void> {
    const quarter = this.currentQuarter();

    for (const job of jobs) {
      this.logger.log(`Executing search job: ${job.company_name} / ${job.role_key} via ${job.source}`);

      try {
        const sources = await this.sourceRegistry.findActive();
        const matchedSource = sources.find((s) => s.kind === (job.source as FeedSourceKind));
        if (!matchedSource) {
          this.logger.warn(`No active source of kind "${job.source}" found; skipping job`);
          continue;
        }

        await this.ingestion.import({ source_id: matchedSource.id, keyword: job.query });
        await this.updateCoverage(job.company_id, job.role_category_id, job.source, quarter, job.target_count);
      } catch (error) {
        this.logger.error(`Job failed for ${job.company_name}/${job.role_key}: ${this.message(error)}`);
      }
    }
  }

  currentQuarter(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}Q${quarter}`;
  }

  private async fetchPriorityCompanies(): Promise<Company[]> {
    const [a, b] = await Promise.all([
      this.companyRegistry.findByPriority('A'),
      this.companyRegistry.findByPriority('B'),
    ]);
    return [...a, ...b];
  }

  private buildMetricMap(metrics: CoverageMetric[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const m of metrics) {
      const key = `${m.company_id}:${m.role_category_id}`;
      const existing = map.get(key) ?? 0;
      map.set(key, existing + m.valid_count);
    }
    return map;
  }

  private resolveSource(
    companyPreference: string,
    rolePreference: string,
  ): 'xhs' | 'nowcoder' {
    if (companyPreference === 'xhs' || rolePreference === 'xhs') return 'xhs';
    if (companyPreference === 'nowcoder' || rolePreference === 'nowcoder') return 'nowcoder';
    return 'nowcoder';
  }

  private async updateCoverage(
    companyId: string,
    roleCategoryId: string,
    source: string,
    quarter: string,
    targetCount: number,
  ): Promise<void> {
    // Count actual saved items that are valid (not low confidence, has source_url)
    const validCount = await this.feedItemRepo
      .createQueryBuilder('fi')
      .where('fi.company_id = :companyId', { companyId })
      .andWhere('fi.role_category_id = :roleCategoryId', { roleCategoryId })
      .andWhere('fi.quarter = :quarter', { quarter })
      .andWhere('fi.source_kind = :source', { source })
      .andWhere('fi.confidence != :low', { low: 'low' })
      .andWhere('fi.source_url IS NOT NULL')
      .andWhere("fi.source_url != ''")
      .getCount();

    let metric = await this.metricsRepo.findOne({
      where: { company_id: companyId, role_category_id: roleCategoryId, quarter, source },
    });

    if (!metric) {
      metric = this.metricsRepo.create({
        company_id: companyId,
        role_category_id: roleCategoryId,
        quarter,
        source,
        target_count: targetCount,
        valid_count: 0,
        freshness_score: 0,
        confidence_score: 0,
        gap_level: 'critical',
      });
    }

    metric.valid_count = validCount;
    metric.target_count = targetCount;
    metric.gap_level = validCount >= targetCount ? 'ok' : validCount > 0 ? 'partial' : 'critical';
    await this.metricsRepo.save(metric);
  }

  private dailyQueryBudget(): number {
    const parsed = Number.parseInt(process.env.DAILY_QUERY_BUDGET ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_QUERY_BUDGET;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

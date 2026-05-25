import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { DigestRun } from './entities/digest-run.entity';
import { FeedSource } from './entities/feed-source.entity';
import { ImportFeedDto } from './dto/import-feed.dto';
import { SourceRegistryService } from './source-registry.service';
import { FeedService } from './feed.service';
import { FeedClassifierService } from './feed-classifier.service';
import { RssImporterService } from './importers/rss-importer.service';
import { WechatImporterService } from './importers/wechat-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import type { DigestRunStatus, FeedSourceKind } from './types/feed.types';
import type { FeedImporter } from './importers/feed-importer.interface';

export interface ImportResult {
  runs: DigestRun[];
}

const DEFAULT_SOURCE_TIMEOUT_MS = 180_000;

@Injectable()
export class FeedIngestionService {
  private readonly logger = new Logger(FeedIngestionService.name);

  constructor(
    @InjectRepository(DigestRun)
    private readonly runs: Repository<DigestRun>,
    private readonly registry: SourceRegistryService,
    private readonly feed: FeedService,
    private readonly classifier: FeedClassifierService,
    private readonly rss: RssImporterService,
    private readonly wechat: WechatImporterService,
    private readonly xhs: XhsImporterService,
  ) {}

  findRuns(): Promise<DigestRun[]> {
    return this.runs.find({
      relations: { source: true },
      order: { created_at: 'DESC' },
      take: 30,
    });
  }

  async import(dto: ImportFeedDto): Promise<ImportResult> {
    const sources = dto.source_id
      ? [await this.registry.findOne(dto.source_id)]
      : await this.registry.findActive();
    const runs: DigestRun[] = [];

    for (const source of sources) {
      try {
        runs.push(await this.importSource(source, dto.keyword));
      } catch (error) {
        this.logger.error(`Import source ${source.name} crashed outside run handling: ${this.message(error)}`);
        runs.push(await this.recordUnhandledFailure(source.id, error));
      }
    }

    return { runs };
  }

  @Cron('0 0 3 * * *', { name: 'digest-daily-ingestion', timeZone: 'Asia/Shanghai' })
  async importDaily(): Promise<void> {
    await this.import({});
  }

  private async importSource(source: FeedSource, keyword?: string): Promise<DigestRun> {
    const run = await this.startRun(source.id);
    let fetched = 0;
    let saved = 0;
    let skipped = 0;

    try {
      if (source.status === 'needs_config') {
        return this.finishRun(run, 'failed', fetched, saved, skipped, `${source.name} requires ${source.config_key ?? 'configuration'}`);
      }

      const timeoutMs = this.sourceTimeoutMs();
      const importer = this.importerFor(source.kind);
      const candidates = await this.withTimeout(
        importer.fetch(source, keyword),
        timeoutMs,
        `${source.name} import timed out after ${timeoutMs}ms`,
      );
      fetched = candidates.length;

      for (const candidate of candidates) {
        if (await this.feed.existsExternal(candidate.external_id, candidate.source_url)) {
          skipped++;
          continue;
        }
        try {
          const classified = await this.withTimeout(
            this.classifier.classify(candidate),
            timeoutMs,
            `${source.name} classification timed out after ${timeoutMs}ms`,
          );
          await this.feed.saveExternal(candidate, classified, source.id);
          saved++;
        } catch (error) {
          skipped++;
          this.logger.warn(`Skipped feed candidate ${candidate.source_url}: ${this.message(error)}`);
        }
      }

      await this.registry.markRun(source.id);
      return this.finishRun(run, 'success', fetched, saved, skipped);
    } catch (error) {
      return this.finishRun(run, 'failed', fetched, saved, skipped, this.message(error));
    }
  }

  private importerFor(kind: FeedSourceKind): FeedImporter {
    if (kind === 'xhs') return this.xhs;
    if (kind === 'nowcoder') return this.rss;
    if (kind === 'wechat') return this.wechat;
    throw new Error(`No importer configured for source kind "${kind}"`);
  }

  private async startRun(sourceId: string): Promise<DigestRun> {
    return this.runs.save(this.runs.create({
      source_id: sourceId,
      status: 'running',
      fetched_count: 0,
      saved_count: 0,
      skipped_count: 0,
      error_message: null,
    }));
  }

  private async finishRun(
    run: DigestRun,
    status: DigestRunStatus,
    fetched: number,
    saved: number,
    skipped: number,
    error?: string,
  ): Promise<DigestRun> {
    run.status = status;
    run.fetched_count = fetched;
    run.saved_count = saved;
    run.skipped_count = skipped;
    run.error_message = error ?? null;
    return this.runs.save(run);
  }

  private async recordUnhandledFailure(sourceId: string, error: unknown): Promise<DigestRun> {
    const run = await this.startRun(sourceId);
    return this.finishRun(run, 'failed', 0, 0, 0, this.message(error));
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private sourceTimeoutMs(): number {
    const parsed = Number.parseInt(process.env.FEED_SOURCE_TIMEOUT_MS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SOURCE_TIMEOUT_MS;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

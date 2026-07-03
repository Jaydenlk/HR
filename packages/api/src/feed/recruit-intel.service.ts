import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { DigestRun } from './entities/digest-run.entity';
import { RecruitEvent } from './entities/recruit-event.entity';
import { SourceRegistryService } from './source-registry.service';
import { RecruitEventParserService } from './recruit-event-parser.service';
import type { ExtractedRecruitEvent, RecruitRawItem } from './recruit-event-parser.service';
import { parseSheetFile, parseCsvRows, extractRawLink } from './recruit-sheet-parser.util';
import type { SheetRow } from './recruit-sheet-parser.util';
import { parseWechatDumpPayload } from './recruit-wechat-dump-parser.util';
import type { WechatDumpArticle } from './recruit-wechat-dump-parser.util';
import { computeDedupKey, resolveDedupConflict } from './recruit-dedup.util';
import type { DigestRunStatus } from './types/feed.types';

export interface RecruitEventView {
  id: string;
  company: string;
  role_hint: string | null;
  event_type: string;
  event_date: string | null;
  city: string | null;
  apply_url: string | null;
}

export interface RecruitBoardData {
  upcoming: RecruitEventView[];
  unscheduled: RecruitEventView[];
}

export interface RecruitUploadResult {
  run: DigestRun;
  total_rows: number;
  saved: number;
  skipped: number;
}

// 一次 AI 调用处理的行数上限:控制单次 prompt 体积,避免大文件一把梭被截断/超限导致整批失败。
const PARSE_CHUNK_SIZE = 15;
const UPCOMING_LIMIT = 50;
const UNSCHEDULED_LIMIT = 20;

@Injectable()
export class RecruitIntelService {
  private readonly logger = new Logger(RecruitIntelService.name);

  constructor(
    @InjectRepository(RecruitEvent)
    private readonly repo: Repository<RecruitEvent>,
    @InjectRepository(DigestRun)
    private readonly runs: Repository<DigestRun>,
    private readonly registry: SourceRegistryService,
    private readonly parser: RecruitEventParserService,
  ) {}

  /** sheet_file / wechat_dump 上传即时解析:管理员上传文件时同步走一遍解析→去重→落库。 */
  async ingestUpload(sourceId: string, file: { buffer: Buffer; originalname: string }): Promise<RecruitUploadResult> {
    const source = await this.registry.findOne(sourceId);
    if (source.kind !== 'sheet_file' && source.kind !== 'wechat_dump') {
      throw new BadRequestException(`来源类型 "${source.kind}" 不支持文件上传，仅 sheet_file / wechat_dump 可用`);
    }

    const run = await this.startRun(sourceId);
    try {
      const rawItems =
        source.kind === 'sheet_file'
          ? sheetRowsToRawItems(await parseSheetFile(file.buffer, file.originalname))
          : wechatArticlesToRawItems(parseWechatDumpPayload(file.buffer).articles);

      if (rawItems.length === 0) {
        throw new BadRequestException('文件解析后没有可用数据行');
      }

      const extracted = await this.parseInChunks(rawItems);
      const saved = await this.saveEvents(extracted, sourceId);
      const skipped = rawItems.length - extracted.length;

      await this.registry.recordSuccess(sourceId);
      const finished = await this.finishRun(run, skipped > 0 ? 'partial' : 'success', rawItems.length, saved, skipped);
      return { run: finished, total_rows: rawItems.length, saved, skipped };
    } catch (error) {
      const msg = this.message(error);
      await this.registry.recordFailure(sourceId, msg);
      await this.finishRun(run, 'failed', 0, 0, 0, msg);
      throw error;
    }
  }

  /** 周 cron:sheet_link 尽力而为抓取。抓不到就在 source 上落降级提示,不做反爬对抗。 */
  async weeklySheetLinkIngest(): Promise<void> {
    const sources = (await this.registry.findActive()).filter((s) => s.kind === 'sheet_link');
    for (const source of sources) {
      const run = await this.startRun(source.id);
      try {
        if (!source.homepage_url) {
          throw new Error('sheet_link 来源未配置链接');
        }
        const csvText = await this.tryFetchCsv(source.homepage_url);
        if (!csvText) {
          throw new Error('无法直接抓取该链接的可读表格内容，请导出 CSV 通过 sheet_file 来源上传');
        }
        const rows = parseCsvRows(Buffer.from(csvText, 'utf-8'));
        if (rows.length === 0) {
          throw new Error('抓取内容为空表格');
        }
        const rawItems = sheetRowsToRawItems(rows);
        const extracted = await this.parseInChunks(rawItems);
        const saved = await this.saveEvents(extracted, source.id);
        const skipped = rawItems.length - extracted.length;

        await this.registry.recordSuccess(source.id);
        await this.finishRun(run, skipped > 0 ? 'partial' : 'success', rawItems.length, saved, skipped);
      } catch (error) {
        const msg = this.message(error);
        await this.registry.recordFailure(source.id, msg);
        await this.finishRun(run, 'failed', 0, 0, 0, msg);
        this.logger.warn(`sheet_link source "${source.name}" weekly fetch failed: ${msg}`);
      }
    }
  }

  /** /newspaper「校招情报」板块数据:未过期按 event_date 升序;缺日期落"日期待确认"。 */
  async getBoardData(): Promise<RecruitBoardData> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [upcomingRaw, unscheduledRaw] = await Promise.all([
      this.repo.find({
        where: { event_date: MoreThanOrEqual(startOfToday) },
        order: { event_date: 'ASC' },
        take: UPCOMING_LIMIT,
      }),
      this.repo.find({
        where: { event_date: IsNull() },
        order: { created_at: 'DESC' },
        take: UNSCHEDULED_LIMIT,
      }),
    ]);

    return {
      upcoming: upcomingRaw.map(toView),
      unscheduled: unscheduledRaw.map(toView),
    };
  }

  /** 供 digest-generator 周刊汇总钩子:近 N 天新增的校招事件(不含过期判断,单纯按创建时间)。 */
  async getRecentForDigest(sinceDays = 7): Promise<RecruitEvent[]> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    return this.repo.find({
      where: { created_at: MoreThan(since) },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  private async parseInChunks(items: RecruitRawItem[]): Promise<ExtractedRecruitEvent[]> {
    const results: ExtractedRecruitEvent[] = [];
    for (let i = 0; i < items.length; i += PARSE_CHUNK_SIZE) {
      const chunk = items.slice(i, i + PARSE_CHUNK_SIZE);
      const extracted = await this.parser.parseBatch(chunk);
      results.push(...extracted);
    }
    return results;
  }

  private async saveEvents(candidates: ExtractedRecruitEvent[], sourceId: string): Promise<number> {
    let count = 0;
    for (const candidate of candidates) {
      const dedupKey = computeDedupKey(candidate.company, candidate.event_type, candidate.event_date);
      const existing = await this.repo.findOne({ where: { dedup_key: dedupKey } });

      if (!existing) {
        await this.repo.save(
          this.repo.create({
            company: candidate.company,
            role_hint: candidate.role_hint,
            event_type: candidate.event_type,
            event_date: candidate.event_date,
            city: candidate.city,
            apply_url: candidate.apply_url,
            source_ref: sourceId,
            confidence: candidate.confidence,
            dedup_key: dedupKey,
          }),
        );
        count += 1;
        continue;
      }

      const resolution = resolveDedupConflict(
        { confidence: existing.confidence, created_at: existing.created_at, apply_url: existing.apply_url },
        { confidence: candidate.confidence, created_at: new Date(), apply_url: candidate.apply_url },
      );
      if (resolution.winner === 'incoming') {
        existing.company = candidate.company;
        existing.role_hint = candidate.role_hint;
        existing.event_type = candidate.event_type;
        existing.event_date = candidate.event_date;
        existing.city = candidate.city;
        existing.confidence = candidate.confidence;
        existing.source_ref = sourceId;
      }
      existing.apply_url = resolution.apply_url;
      await this.repo.save(existing);
      count += 1;
    }
    return count;
  }

  /** 极简"看起来像表格"探测:纯直连 fetch,不处理登录态/验证码/请求签名——抓不到就返回 null 走降级。 */
  private async tryFetchCsv(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) return null;
      const looksTabular = /[,\t]/.test(lines[0]);
      return looksTabular ? text : null;
    } catch {
      return null;
    }
  }

  private async startRun(sourceId: string): Promise<DigestRun> {
    return this.runs.save(
      this.runs.create({
        source_id: sourceId,
        status: 'running',
        fetched_count: 0,
        saved_count: 0,
        skipped_count: 0,
        error_message: null,
      }),
    );
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

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

function toView(event: RecruitEvent): RecruitEventView {
  return {
    id: event.id,
    company: event.company,
    role_hint: event.role_hint,
    event_type: event.event_type,
    event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
    city: event.city,
    apply_url: event.apply_url,
  };
}

function sheetRowsToRawItems(rows: SheetRow[]): RecruitRawItem[] {
  return rows.map((row) => ({
    row_number: row.row_number,
    raw_text: Object.entries(row.fields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; '),
    raw_link: extractRawLink(row.fields),
  }));
}

function wechatArticlesToRawItems(articles: WechatDumpArticle[]): RecruitRawItem[] {
  return articles.map((article, index) => ({
    row_number: index + 1,
    raw_text: [
      `标题: ${article.title}`,
      `发布时间: ${article.publish_time}`,
      article.author ? `作者: ${article.author}` : null,
      article.digest ? `摘要: ${article.digest}` : null,
      `正文: ${article.content}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n'),
    raw_link: article.url,
  }));
}

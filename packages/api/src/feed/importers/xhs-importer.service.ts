import { Injectable, Logger } from '@nestjs/common';
import { FeedSource } from '../entities/feed-source.entity';
import type { FeedCandidate, FeedImporter } from './feed-importer.interface';

interface McpSearchResult {
  feeds?: Array<{
    title?: string;
    desc?: string;
    note_url?: string;
    user?: { nickname?: string };
    liked_count?: number;
  }>;
}

const DEFAULT_KEYWORD = '校招 面经';
const IMPORT_LIMIT = 5;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RETRIES = 1;

@Injectable()
export class XhsImporterService implements FeedImporter {
  readonly kind = 'xhs' as const;

  private readonly logger = new Logger(XhsImporterService.name);

  async fetch(source: FeedSource, keyword = DEFAULT_KEYWORD): Promise<FeedCandidate[]> {
    const baseUrl = source.config_key ? process.env[source.config_key] : process.env.XHS_MCP_BASE_URL;
    if (!baseUrl) return [];

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/search_feeds`;
    const timeoutMs = readPositiveInt(process.env.XHS_IMPORT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    const retries = readPositiveInt(process.env.XHS_IMPORT_RETRIES, DEFAULT_RETRIES);

    this.logger.log(`Fetching XHS source "${source.name}" with keyword "${keyword}"`);
    const data = await this.fetchWithRetry(url, keyword, timeoutMs, retries);
    const now = new Date();

    return (data.feeds ?? [])
      .filter((item) => Boolean(item.note_url) && Boolean(item.title ?? item.desc))
      .slice(0, IMPORT_LIMIT)
      .map((item) => {
        const sourceUrl = item.note_url ?? '';
        return {
          source_kind: 'xhs',
          source_name: source.name,
          source_url: sourceUrl,
          external_id: sourceUrl,
          title: item.title ?? item.desc?.slice(0, 80) ?? '小红书面经',
          content: item.desc ?? item.title ?? '',
          author: item.user?.nickname ?? null,
          published_at: null,
          date_confidence: 'unknown',
          fetched_at: now,
          raw: { liked_count: item.liked_count ?? null },
        };
      });
  }

  private async fetchWithRetry(
    url: string,
    keyword: string,
    timeoutMs: number,
    retries: number,
  ): Promise<McpSearchResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.fetchOnce(url, keyword, timeoutMs);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          this.logger.warn(`XHS fetch attempt ${attempt + 1} failed: ${message(error)}; retrying`);
        }
      }
    }
    throw new Error(`XHS bridge failed after ${retries + 1} attempt(s): ${message(lastError)}`);
  }

  private async fetchOnce(url: string, keyword: string, timeoutMs: number): Promise<McpSearchResult> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, limit: IMPORT_LIMIT }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`XHS bridge ${res.status}: ${text.slice(0, 200)}`);
    }

    return (await res.json()) as McpSearchResult;
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

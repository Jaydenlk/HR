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
const IMPORT_LIMIT = 20;

@Injectable()
export class XhsImporterService implements FeedImporter {
  readonly kind = 'xhs' as const;

  private readonly logger = new Logger(XhsImporterService.name);

  async fetch(source: FeedSource, keyword = DEFAULT_KEYWORD): Promise<FeedCandidate[]> {
    const baseUrl = source.config_key ? process.env[source.config_key] : process.env.XHS_MCP_BASE_URL;
    if (!baseUrl) return [];

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/search_feeds`;
    this.logger.log(`Fetching XHS source "${source.name}" with keyword "${keyword}"`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, limit: IMPORT_LIMIT }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`XHS MCP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as McpSearchResult;
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
          fetched_at: now,
          raw: { liked_count: item.liked_count ?? null },
        };
      });
  }
}


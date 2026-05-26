import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { FeedSource } from '../entities/feed-source.entity';
import type { FeedCandidate, FeedImporter } from './feed-importer.interface';

interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  content?: string;
  summary?: string;
  contentEncoded?: string;
  isoDate?: string;
  creator?: string;
}

const IMPORT_LIMIT = 30;

@Injectable()
export class RssImporterService implements FeedImporter {
  readonly kind = 'nowcoder' as const;

  private readonly logger = new Logger(RssImporterService.name);
  private readonly parser = new Parser<Record<string, never>, RssItem>({
    timeout: 15000,
    headers: {
      'User-Agent': 'HRBP-Coach-Feed-Importer/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    customFields: {
      item: [['content:encoded', 'contentEncoded']],
    },
  });

  async fetch(source: FeedSource): Promise<FeedCandidate[]> {
    const rawUrl = source.config_key ? process.env[source.config_key] : process.env.RSS_FEED_URL;
    if (!rawUrl) return [];

    const urls = rawUrl.split(',').map((u) => u.trim()).filter(Boolean);

    let lastError: Error | null = null;
    for (const url of urls) {
      try {
        this.logger.log(`Fetching RSS source "${source.name}" from ${url}`);
        const parsed = await this.parser.parseURL(url);
        const now = new Date();

        return (parsed.items ?? [])
          .filter((item) => Boolean(item.link ?? item.guid))
          .slice(0, IMPORT_LIMIT)
          .map((item) => {
            const sourceUrl = item.link ?? item.guid ?? '';
            const rawContent = item.contentEncoded ?? item.content ?? item.summary ?? '';
            return {
              source_kind: 'nowcoder',
              source_name: source.name,
              source_url: sourceUrl,
              external_id: sourceUrl,
              title: this.stripHtml(item.title ?? '').slice(0, 200) || '牛客面经',
              content: this.stripHtml(rawContent).slice(0, 5000),
              author: item.creator ?? null,
              published_at: item.isoDate ? new Date(item.isoDate) : null,
              date_confidence: item.isoDate ? 'high' : 'unknown',
              fetched_at: now,
              raw: {},
            };
          });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`RSS URL failed: ${url} — ${lastError.message}. Trying next...`);
      }
    }

    throw lastError ?? new Error(`All ${urls.length} RSS URLs failed for "${source.name}"`);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}


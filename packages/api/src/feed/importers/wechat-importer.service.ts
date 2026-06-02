import { Injectable, Logger } from '@nestjs/common';
import { FeedSource } from '../entities/feed-source.entity';
import type { FeedCandidate, FeedImporter } from './feed-importer.interface';

interface WeMpArticle {
  id?: number;
  title?: string;
  content?: string;
  summary?: string;
  url?: string;
  author?: string;
  mp_name?: string;
  publish_time?: string;
  created_at?: string;
}

interface WeMpResponse {
  code: number;
  data: {
    list: WeMpArticle[];
    total?: number;
  };
}

const IMPORT_LIMIT = 20;

@Injectable()
export class WechatImporterService implements FeedImporter {
  readonly kind = 'wechat' as const;

  private readonly logger = new Logger(WechatImporterService.name);

  async fetch(source: FeedSource): Promise<FeedCandidate[]> {
    const baseUrl = source.config_key
      ? process.env[source.config_key]
      : process.env.WECHAT_SOURCE_FEEDS;
    if (!baseUrl) return [];

    const token = await this.login(baseUrl);

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/wx/articles?page=1&page_size=${IMPORT_LIMIT}`;
    this.logger.log(`Fetching WeChat articles from "${source.name}"`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`WeChat API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as WeMpResponse;
    if (data.code !== 0 || !data.data?.list) return [];

    const now = new Date();
    return data.data.list
      .filter((a) => Boolean(a.url) && Boolean(a.title))
      .slice(0, IMPORT_LIMIT)
      .map((a) => ({
        source_kind: 'wechat' as const,
        source_name: a.mp_name ?? source.name,
        source_url: a.url ?? '',
        external_id: a.url ?? String(a.id ?? ''),
        title: (a.title ?? '').slice(0, 200),
        content: (a.content ?? a.summary ?? '').slice(0, 5000),
        author: a.author ?? a.mp_name ?? null,
        published_at: a.publish_time ? new Date(a.publish_time) : null,
        date_confidence: a.publish_time ? 'high' : 'unknown',
        fetched_at: now,
        raw: { mp_name: a.mp_name ?? null },
      }));
  }

  private async login(baseUrl: string): Promise<string> {
    const username = process.env.WECHAT_RSS_USERNAME ?? 'admin';
    const password = process.env.WECHAT_RSS_PASSWORD ?? 'coach2026';
    const res = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/v1/wx/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`We-MP-RSS login failed ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as { code: number; data?: { access_token?: string } };
    const token = data.data?.access_token;
    if (!token) throw new Error('We-MP-RSS login succeeded but returned no access_token');
    return token;
  }
}

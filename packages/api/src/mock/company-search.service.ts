/**
 * 博查联网搜索服务 — 仅供 mock 模块使用
 *
 * POST https://api.bochaai.com/v1/web-search
 * 三路径：成功 / 超时 / 无 key
 * 失败时返回 unavailable 结果，不抛 500
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchCandidate {
  name: string;
  summary: string;
  source_url: string;
}

export interface SearchResult {
  available: true;
  candidate: SearchCandidate | null;
}

export interface SearchUnavailable {
  available: false;
  reason: 'no_key' | 'timeout' | 'error';
}

export type CompanySearchOutcome = SearchResult | SearchUnavailable;

/** 内存缓存条目 */
interface CacheEntry {
  outcome: CompanySearchOutcome;
  expireAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX = 200;

@Injectable()
export class CompanySearchService {
  private readonly logger = new Logger(CompanySearchService.name);
  private readonly apiKey: string | undefined;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BOCHA_API_KEY') || undefined;
  }

  /**
   * 搜索公司信息
   * @param companyName 公司名(调用方保证已 trim)
   */
  async search(companyName: string): Promise<CompanySearchOutcome> {
    if (!this.apiKey) {
      return { available: false, reason: 'no_key' };
    }

    // 缓存命中
    const cached = this.cache.get(companyName);
    if (cached && Date.now() < cached.expireAt) {
      return cached.outcome;
    }

    const query = `${companyName} 公司 简介 校招`;
    const outcome = await this.fetchBocha(query);

    // LRU 淘汰：超过上限时删最旧一条
    if (this.cache.size >= CACHE_MAX) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(companyName, { outcome, expireAt: Date.now() + CACHE_TTL_MS });

    return outcome;
  }

  private async fetchBocha(query: string): Promise<CompanySearchOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch('https://api.bochaai.com/v1/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, summary: true, count: 5 }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`博查搜索 HTTP ${response.status}`);
        return { available: true, candidate: null };
      }

      const data = (await response.json()) as BochaResponse;
      const candidate = this.extractCandidate(data);
      return { available: true, candidate };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.warn('博查搜索超时(8s)');
        return { available: false, reason: 'timeout' };
      }
      this.logger.warn(`博查搜索失败: ${String(err)}`);
      return { available: false, reason: 'error' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** 从博查原始返回提取首条高置信结果 */
  private extractCandidate(data: BochaResponse): SearchCandidate | null {
    const items = data?.data?.webPages?.value;
    if (!Array.isArray(items) || items.length === 0) return null;

    const first = items[0];
    const name = first.name?.trim() ?? '';
    const summary = (first.summary ?? first.snippet ?? '').trim().slice(0, 120);
    const source_url = first.url?.trim() ?? '';

    if (!name || !source_url) return null;
    return { name, summary, source_url };
  }
}

// ─── 博查响应类型（精简版）────────────────────────────────────────
interface BochaWebPage {
  name?: string;
  url?: string;
  snippet?: string;
  summary?: string;
}

interface BochaResponse {
  data?: {
    webPages?: {
      value?: BochaWebPage[];
    };
  };
}

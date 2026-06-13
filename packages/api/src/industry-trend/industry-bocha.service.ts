/**
 * 行业趋势模块专用博查联网搜索
 *
 * 独立于 mock/company-search.service.ts（已上线，禁止改动）。
 * 本文件仅供 industry-trend 模块内部使用，KISS 原则，不抽共享。
 *
 * POST https://api.bochaai.com/v1/web-search
 * 三路径：成功 / 超时 / 无 key
 * 失败时返回 unavailable，不抛 500
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── 返回给调用方的类型 ────────────────────────────────────────────────────────

export interface IndustrySearchItem {
  title: string;
  snippet: string;
  url: string;
}

export interface IndustrySearchSuccess {
  available: true;
  items: IndustrySearchItem[];
}

export interface IndustrySearchUnavailable {
  available: false;
  reason: 'no_key' | 'timeout' | 'error';
}

export type IndustrySearchOutcome = IndustrySearchSuccess | IndustrySearchUnavailable;

// ── 博查原始响应类型（精简版）──────────────────────────────────────────────────

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

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class IndustryBochaService {
  private readonly logger = new Logger(IndustryBochaService.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BOCHA_API_KEY') || undefined;
  }

  /**
   * 搜索行业实时信息
   *
   * query 由调用方组合（industry + region + timeframe），
   * 返回最多 count 条标题/摘要/URL；
   * 搜不到/超时/无 key 返回 unavailable。
   */
  async search(query: string, count = 6): Promise<IndustrySearchOutcome> {
    if (!this.apiKey) {
      this.logger.warn('BOCHA_API_KEY 未配置，行业趋势联网搜索降级');
      return { available: false, reason: 'no_key' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch('https://api.bochaai.com/v1/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, summary: true, count }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`博查搜索 HTTP ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          return { available: false, reason: 'no_key' };
        }
        return { available: false, reason: 'error' };
      }

      const data = (await response.json()) as BochaResponse;
      const items = this.extractItems(data);
      return { available: true, items };
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

  /** 从博查原始响应提取有效条目（title + url 均非空） */
  private extractItems(data: BochaResponse): IndustrySearchItem[] {
    const pages = data?.data?.webPages?.value;
    if (!Array.isArray(pages) || pages.length === 0) return [];

    return pages
      .map((p) => ({
        title: (p.name ?? '').trim(),
        snippet: ((p.summary ?? p.snippet) ?? '').trim().slice(0, 200),
        url: (p.url ?? '').trim(),
      }))
      .filter((item) => item.title.length > 0 && item.url.length > 0);
  }
}

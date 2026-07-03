import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 博查 web-search 单条返回项（精简字段） */
export interface BochaWebPage {
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

export interface BochaSearchSuccess {
  available: true;
  items: BochaWebPage[];
}

export interface BochaSearchUnavailable {
  available: false;
  reason: 'no_key' | 'timeout' | 'error';
}

export type BochaSearchOutcome = BochaSearchSuccess | BochaSearchUnavailable;

export interface BochaSearchOptions {
  /** 强召回域名白名单，如 "tianyancha.com,qcc.com"（对应博查 include 参数） */
  include?: string;
  count?: number;
}

/**
 * 博查 web-search 唯一低层客户端（T6 统一入口，取代 mock/company-search.service.ts 的直连逻辑）。
 *
 * 容错语义与旧实现一致：无 key / 超时(8s) / 非 2xx 一律归一化为 {available:false, reason}，
 * 不抛异常、不抛 500——调用方（company-research.service）据此做候选降级与前端 reason 透传。
 */
@Injectable()
export class BochaClient {
  private readonly logger = new Logger(BochaClient.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BOCHA_API_KEY') || undefined;
  }

  hasKey(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options: BochaSearchOptions = {}): Promise<BochaSearchOutcome> {
    if (!this.apiKey) {
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
        body: JSON.stringify({
          query,
          summary: true,
          count: options.count ?? 10,
          ...(options.include ? { include: options.include } : {}),
        }),
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
      const items = data?.data?.webPages?.value;
      return { available: true, items: Array.isArray(items) ? items : [] };
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
}

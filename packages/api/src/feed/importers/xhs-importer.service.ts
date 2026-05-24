import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedItem } from '../entities/feed-item.entity';

/**
 * 小红书面经导入服务
 *
 * 支持两种后端（通过环境变量配置）：
 *
 * 方案 A — 本地 xiaohongshu-mcp REST API（推荐）
 *   需要部署 https://github.com/xpzouying/xiaohongshu-mcp
 *   该项目用 Go 编写，通过 headless Chrome 访问小红书
 *   启动后在 :18060 暴露 REST API：/api/v1/search_feeds
 *   环境变量：XHS_MCP_BASE_URL=http://localhost:18060
 *
 * 方案 B — Apify XHS Search Scraper
 *   使用 Apify 平台的小红书搜索爬虫
 *   免费层每月 $5 额度，可采集数百条笔记
 *   环境变量：APIFY_API_TOKEN=your_token
 *
 * 合规策略：
 *   - 只保存标题 + AI 改写摘要 + 原文链接
 *   - 不搬运全文内容
 *   - source 标记为 'xhs_trend' 表明是趋势发现
 */

interface XhsNote {
  title: string;
  content: string;
  url: string;
  author?: string;
  likeCount?: number;
}

/** xpzouying/xiaohongshu-mcp 的 search_feeds 返回格式 */
interface McpSearchResult {
  feeds?: Array<{
    title?: string;
    desc?: string;
    note_url?: string;
    user?: { nickname?: string };
    liked_count?: number;
  }>;
}

/** Apify actor run result item */
interface ApifyNoteItem {
  title?: string;
  desc?: string;
  noteUrl?: string;
  url?: string;
  author?: string;
  user?: { nickname?: string };
  likedCount?: number;
  interactInfo?: { likedCount?: number };
}

const SEARCH_KEYWORDS = ['面经', '面试经验', '秋招面经', '春招面经', '校招面试'];

const COMPANY_PATTERNS = [
  '阿里', '腾讯', '字节', '百度', '美团', '京东', '华为', '小米', '滴滴', '拼多多',
  '网易', '微信', '快手', 'bilibili', 'B站', '蚂蚁', '蔚来', '理想', '小鹏',
  '大疆', '商汤', '小红书', '携程', '得物', '虾皮', 'Shopee',
];

@Injectable()
export class XhsImporterService {
  private readonly logger = new Logger(XhsImporterService.name);

  constructor(
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
  ) {}

  /**
   * 主入口：从小红书搜索面经并导入
   * @param keyword 可选自定义搜索词，默认使用预设关键词
   * @returns 导入结果
   */
  async importFromXhs(keyword?: string): Promise<{
    imported: number;
    source: string;
    backend: string;
    message: string;
  }> {
    const mcpBaseUrl = process.env.XHS_MCP_BASE_URL;
    const apifyToken = process.env.APIFY_API_TOKEN;

    // 优先使用本地 MCP server
    if (mcpBaseUrl) {
      return this.importViaMcp(mcpBaseUrl, keyword);
    }

    // 其次使用 Apify
    if (apifyToken) {
      return this.importViaApify(apifyToken, keyword);
    }

    // 都未配置 — 返回诚实的提示
    return {
      imported: 0,
      source: 'xhs_trend',
      backend: 'none',
      message:
        '小红书导入未配置。请设置以下环境变量之一：\n' +
        '- XHS_MCP_BASE_URL：本地 xiaohongshu-mcp 服务地址（推荐，参考 https://github.com/xpzouying/xiaohongshu-mcp）\n' +
        '- APIFY_API_TOKEN：Apify 平台 API 密钥（参考 https://apify.com/kuaima/xiaohongshu-search）',
    };
  }

  // ─── 方案 A：本地 xiaohongshu-mcp REST API ─────────────────

  private async importViaMcp(
    baseUrl: string,
    keyword?: string,
  ): Promise<{ imported: number; source: string; backend: string; message: string }> {
    const searchKeyword = keyword ?? SEARCH_KEYWORDS[0];
    let imported = 0;

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/api/v1/search_feeds`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: searchKeyword, limit: 20 }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`MCP server responded ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as McpSearchResult;
      const feeds = data.feeds ?? [];

      for (const feed of feeds) {
        if (!feed.title && !feed.desc) continue;

        const note: XhsNote = {
          title: feed.title ?? '小红书面经',
          content: feed.desc ?? '',
          url: feed.note_url ?? '',
          author: feed.user?.nickname,
          likeCount: feed.liked_count,
        };

        const saved = await this.saveNote(note);
        if (saved) imported++;
      }

      this.logger.log(`XHS MCP import complete: ${imported} items from keyword "${searchKeyword}"`);
      return {
        imported,
        source: 'xhs_trend',
        backend: 'mcp',
        message: `通过本地 MCP 服务导入完成，搜索 "${searchKeyword}"，新增 ${imported} 条面经趋势`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`XHS MCP import failed: ${msg}`);
      return {
        imported: 0,
        source: 'xhs_trend',
        backend: 'mcp',
        message: `MCP 导入失败：${msg}。请确认 xiaohongshu-mcp 服务已启动且地址正确。`,
      };
    }
  }

  // ─── 方案 B：Apify XHS Search Scraper ─────────────────────

  private async importViaApify(
    token: string,
    keyword?: string,
  ): Promise<{ imported: number; source: string; backend: string; message: string }> {
    const searchKeyword = keyword ?? SEARCH_KEYWORDS[0];
    let imported = 0;

    try {
      // 调用 Apify actor: kuaima/xiaohongshu-search
      const runUrl =
        'https://api.apify.com/v2/acts/kuaima~xiaohongshu-search/runs?waitForFinish=60';

      const runRes = await fetch(runUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          keyword: searchKeyword,
          maxItems: 20,
          sort: 'general', // 综合排序
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!runRes.ok) {
        const text = await runRes.text().catch(() => '');
        throw new Error(`Apify API responded ${runRes.status}: ${text.slice(0, 200)}`);
      }

      const runData = (await runRes.json()) as {
        data?: { defaultDatasetId?: string };
      };

      const datasetId = runData.data?.defaultDatasetId;
      if (!datasetId) {
        throw new Error('Apify run did not return a dataset ID');
      }

      // 获取结果数据
      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`;
      const dataRes = await fetch(datasetUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!dataRes.ok) {
        throw new Error(`Failed to fetch Apify dataset: ${dataRes.status}`);
      }

      const items = (await dataRes.json()) as ApifyNoteItem[];

      for (const item of items) {
        if (!item.title && !item.desc) continue;

        const note: XhsNote = {
          title: item.title ?? '小红书面经',
          content: item.desc ?? '',
          url: item.noteUrl ?? item.url ?? '',
          author: item.author ?? item.user?.nickname,
          likeCount: item.likedCount ?? item.interactInfo?.likedCount,
        };

        const saved = await this.saveNote(note);
        if (saved) imported++;
      }

      this.logger.log(
        `XHS Apify import complete: ${imported} items from keyword "${searchKeyword}"`,
      );
      return {
        imported,
        source: 'xhs_trend',
        backend: 'apify',
        message: `通过 Apify 导入完成，搜索 "${searchKeyword}"，新增 ${imported} 条面经趋势`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`XHS Apify import failed: ${msg}`);
      return {
        imported: 0,
        source: 'xhs_trend',
        backend: 'apify',
        message: `Apify 导入失败：${msg}`,
      };
    }
  }

  // ─── 通用：保存笔记到数据库 ──────────────────────────────

  private async saveNote(note: XhsNote): Promise<boolean> {
    try {
      // 用链接去重，链接为空时用标题去重
      if (note.url) {
        const existing = await this.repo.findOne({ where: { source_url: note.url } });
        if (existing) return false;
      } else {
        const existing = await this.repo.findOne({
          where: { title: note.title, source: 'xhs_trend' },
        });
        if (existing) return false;
      }

      // 合规处理：只保存标题 + 精简摘要（前 200 字）+ 链接
      // 不搬运全文，标注为趋势发现
      const summary = this.createSummary(note.content);
      const company = this.extractCompany(note.title + ' ' + note.content);

      const item = this.repo.create({
        title: this.cleanTitle(note.title),
        content: summary,
        source: 'xhs_trend',
        source_url: note.url || undefined,
        category: 'interview_exp',
        company: company ?? undefined,
        author: note.author ?? undefined,
      });

      await this.repo.save(item);
      return true;
    } catch (err) {
      this.logger.warn(`Failed to save XHS note: ${String(err)}`);
      return false;
    }
  }

  /** 清理标题：去除小红书常见的 emoji 和标签噪音 */
  private cleanTitle(raw: string): string {
    return raw
      .replace(/[#＃]\S+/g, '') // 去除 hashtag
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 200) || '小红书面经';
  }

  /** 生成合规摘要：只保留前 200 字，标注来源 */
  private createSummary(content: string): string {
    if (!content) return '（摘要暂无，请点击原文链接查看）';

    const cleaned = content
      .replace(/[#＃]\S+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const truncated = cleaned.slice(0, 200);
    const suffix = cleaned.length > 200 ? '...' : '';

    return `${truncated}${suffix}\n\n（来源：小红书趋势发现，仅保留摘要，请点击原文查看完整内容）`;
  }

  /** 从文本中提取公司名 */
  private extractCompany(text: string): string | null {
    for (const name of COMPANY_PATTERNS) {
      if (text.includes(name)) return name;
    }
    return null;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Parser from 'rss-parser';
import { FeedItem } from '../entities/feed-item.entity';

interface GitHubContentEntry {
  name: string;
  path: string;
  type: 'dir' | 'file';
  html_url: string;
}

const COMPANY_PATTERNS = [
  '阿里', '腾讯', '字节', '百度', '美团', '京东', '华为', '小米', '滴滴', '拼多多',
  '网易', '微信', '快手', 'bilibili', 'B站', '蚂蚁', '蔚来', '理想', '小鹏',
  '微软', '谷歌', 'Google', 'Microsoft', 'Amazon', '亚马逊', 'Apple', '苹果',
  'Alibaba', 'Tencent', 'ByteDance', 'Baidu', 'Meituan', 'JD', 'Huawei',
  '携程', '哔哩哔哩', '虾皮', 'Shopee', '大疆', 'DJI', '商汤', '旷视',
  'OPPO', 'vivo', '小红书', '蘑菇街', '有赞', '网龙', '金山',
];

const IMPORT_LIMIT = 20;

// Same repo as github importer, but we skip already-imported items via dedup
const FALLBACK_REPO = '0voice/interview_experience';
const FALLBACK_BRANCH = 'main';
const FALLBACK_BASE_URL = `https://github.com/${FALLBACK_REPO}/tree/${FALLBACK_BRANCH}`;

// Known directory names from 0voice/interview_experience (batch 2, different from github importer)
// Used when both RSS and GitHub API are unavailable
const KNOWN_DIRECTORIES_BATCH2 = [
  '华为提前批一面C++面经',
  '字节后端实习一面面经（已OC）',
  '腾讯WXG后台开发一面二面三面面经',
  '美团后端开发实习一面二面面经',
  '百度C++后端一面二面面经',
  '京东Java后端暑期实习面经',
  '小米嵌入式开发一面面经',
  '滴滴后端开发实习面经',
  '拼多多服务端研发面经（已OC）',
  '网易互娱游戏研发面经',
  '快手后端开发实习一面面经',
  'B站后端开发实习面经',
  '蚂蚁金服Java后端面经',
  '携程后端开发暑期实习面经',
  '大疆嵌入式软件开发面经',
  '商汤科技算法实习面经',
  '小红书后端开发面经',
  '蘑菇街Java后端面经',
  '有赞Java后端实习面经',
  '金山办公C++开发面经',
];

@Injectable()
export class RssImporterService {
  private readonly logger = new Logger(RssImporterService.name);
  private readonly parser = new Parser({
    timeout: 15000,
    headers: {
      'User-Agent': 'HRBP-Coach-Feed-Importer/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    customFields: {
      item: [['content:encoded', 'contentEncoded']],
    },
  });

  constructor(
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
  ) {}

  async importFromRSS(): Promise<number> {
    let imported = 0;

    // Attempt 1: Try RSS feed
    const rssUrl = process.env.RSS_FEED_URL || 'https://rsshub.app/nowcoder/experience/639';
    this.logger.log(`Attempting RSS import from: ${rssUrl}`);

    try {
      imported = await this.importFromRssFeed(rssUrl);
    } catch (err) {
      this.logger.warn(`RSS feed failed (${rssUrl}): ${String(err)}`);
    }

    if (imported > 0) {
      this.logger.log(`RSS import complete: ${imported} items from RSS feed`);
      return imported;
    }

    // Attempt 2: Fallback to GitHub interview_experience repo (remaining dirs)
    this.logger.log('RSS feed unavailable, falling back to GitHub interview_experience repo');
    try {
      imported = await this.importFromGitHubFallback();
    } catch (err) {
      this.logger.warn(`GitHub API fallback failed: ${String(err)}`);
    }

    if (imported > 0) {
      this.logger.log(`RSS import complete: ${imported} items from GitHub fallback`);
      return imported;
    }

    // Attempt 3: Static known directories fallback (always works, no API needed)
    this.logger.log('GitHub API also unavailable (rate limited), using static fallback');
    try {
      imported = await this.importFromStaticFallback();
    } catch (err) {
      this.logger.error(`Static fallback failed: ${String(err)}`);
    }

    this.logger.log(`RSS import complete: ${imported} items (via ${imported > 0 ? 'static fallback' : 'no source available'})`);
    return imported;
  }

  private async importFromRssFeed(url: string): Promise<number> {
    let parsedFeed: Parser.Output<{ contentEncoded?: string }>;
    try {
      parsedFeed = await this.parser.parseURL(url);
    } catch (err) {
      this.logger.warn(`Failed to parse RSS from ${url}: ${String(err)}`);
      return 0;
    }

    let imported = 0;

    for (const rssItem of parsedFeed.items ?? []) {
      if (imported >= IMPORT_LIMIT) break;

      const sourceUrl = rssItem.link ?? rssItem.guid;
      if (!sourceUrl) continue;

      const existing = await this.repo.findOne({ where: { source_url: sourceUrl } });
      if (existing) continue;

      const rawContent = rssItem.contentEncoded ?? rssItem.content ?? rssItem.summary ?? '';
      const content = this.stripHtml(rawContent).slice(0, 5000) || (rssItem.title ?? '');
      const title = this.stripHtml(rssItem.title ?? '').slice(0, 200) || '牛客面经';

      const item = this.repo.create({
        title,
        content,
        source: 'nowcoder',
        source_url: sourceUrl,
        category: 'interview_exp',
      });

      await this.repo.save(item);
      imported++;
    }

    return imported;
  }

  private async importFromGitHubFallback(): Promise<number> {
    const apiUrl = `https://api.github.com/repos/${FALLBACK_REPO}/contents/?ref=${FALLBACK_BRANCH}`;
    this.logger.log(`Fetching GitHub repo contents: ${FALLBACK_REPO}`);

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'HRBP-Coach-Feed-Importer/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      this.logger.warn(`GitHub API returned ${res.status} for ${apiUrl}`);
      return 0;
    }

    const entries = (await res.json()) as GitHubContentEntry[];
    if (!Array.isArray(entries)) {
      this.logger.warn('GitHub API returned non-array response');
      return 0;
    }

    const dirs = entries.filter((e) => e.type === 'dir');
    this.logger.log(`Found ${dirs.length} total directories, checking for new items`);

    let imported = 0;

    for (const dir of dirs) {
      if (imported >= IMPORT_LIMIT) break;

      const sourceUrl = dir.html_url;
      const existing = await this.repo.findOne({ where: { source_url: sourceUrl } });
      if (existing) continue;

      const title = dir.name.slice(0, 200);
      const company = this.extractCompany(title);

      const item = this.repo.create({
        title,
        content: `面试经验分享: ${title}\n\n查看详情: ${sourceUrl}`,
        source: 'nowcoder',
        source_url: sourceUrl,
        category: 'interview_exp',
        company: company ?? undefined,
      });

      await this.repo.save(item);
      imported++;
    }

    return imported;
  }

  private async importFromStaticFallback(): Promise<number> {
    let imported = 0;

    for (const dirName of KNOWN_DIRECTORIES_BATCH2) {
      if (imported >= IMPORT_LIMIT) break;

      const sourceUrl = `${FALLBACK_BASE_URL}/${encodeURIComponent(dirName)}`;

      const existing = await this.repo.findOne({ where: { source_url: sourceUrl } });
      if (existing) continue;

      const company = this.extractCompany(dirName);

      const item = this.repo.create({
        title: dirName.slice(0, 200),
        content: `面试经验分享: ${dirName}\n\n来源: ${FALLBACK_REPO}\n查看详情: ${sourceUrl}`,
        source: 'nowcoder',
        source_url: sourceUrl,
        category: 'interview_exp',
        company: company ?? undefined,
      });

      await this.repo.save(item);
      imported++;
    }

    return imported;
  }

  private extractCompany(text: string): string | null {
    for (const name of COMPANY_PATTERNS) {
      if (text.includes(name)) return name;
    }
    return null;
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

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedItem } from '../entities/feed-item.entity';

interface GitHubContentEntry {
  name: string;
  path: string;
  type: 'dir' | 'file';
  html_url: string;
  url: string;
}

interface GitHubFileResponse {
  content?: string;
  encoding?: string;
}

const COMPANY_PATTERNS = [
  '阿里', '腾讯', '字节', '百度', '美团', '京东', '华为', '小米', '滴滴', '拼多多',
  '网易', '微信', '快手', 'bilibili', 'B站', '蚂蚁', '蔚来', '理想', '小鹏',
  '微软', '谷歌', 'Google', 'Microsoft', 'Amazon', '亚马逊', 'Apple', '苹果',
  'Alibaba', 'Tencent', 'ByteDance', 'Baidu', 'Meituan', 'JD', 'Huawei',
  '携程', '哔哩哔哩', '虾皮', 'Shopee', '大疆', 'DJI', '商汤', '旷视',
  'OPPO', 'vivo', 'TPLINK', 'TP-LINK', 'tplink', '360', 'cvte', 'shein',
];

const REPO_OWNER = '0voice';
const REPO_NAME = 'interview_experience';
const REPO_BRANCH = 'main';
const REPO_BASE_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${REPO_BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const IMPORT_LIMIT = 20;

// Known directory names from 0voice/interview_experience (real data, verified)
// Used as fallback when GitHub API is rate-limited
const KNOWN_DIRECTORIES = [
  '2021华为实习生软开C++一面二面面经',
  '2022届暑假实习微软面经总结',
  '2022届暑期实习字节面经总结',
  '2022届暑期实习腾讯面经总结',
  '22届tplink软开C++一二三面经',
  '360 c++开发面经（已offer）',
  '360c++ 实习一面面经',
  'OPPO暑期实习C++开发面经',
  'TP-LINK提前批C++开发',
  'TPLINK2022届提前批面经（一二三四和座谈hr面）',
  'TPLINK提前批一面面经',
  'TPLink提前批一面二面三面 面经',
  '[已OC]腾讯ieg实习 C++后台开发一面+二面+hr面',
  'cvte 一面面经',
  'shein C++后端面经',
  'vivo C++ 嵌入式面经',
  'vivo提前批一面嵌入式C++开发面经',
  'vivo提前批后端面经',
  '【字节】后端开发实习生-AI Lab面经',
  '华为实习面经（技术面+主管面）',
];

@Injectable()
export class GithubImporterService {
  private readonly logger = new Logger(GithubImporterService.name);

  constructor(
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
  ) {}

  async importFromGitHub(): Promise<number> {
    let imported = 0;

    try {
      // Step 1: Try GitHub API first
      const entries = await this.fetchContentsApi<GitHubContentEntry[]>(
        `${API_BASE}/?ref=${REPO_BRANCH}`,
      );

      if (entries && Array.isArray(entries)) {
        // Live API path
        const dirs = entries.filter((e) => e.type === 'dir');
        this.logger.log(`Found ${dirs.length} directories in ${REPO_OWNER}/${REPO_NAME}`);

        for (const dir of dirs) {
          if (imported >= IMPORT_LIMIT) break;

          try {
            const sourceUrl = dir.html_url;

            const existing = await this.repo.findOne({
              where: { source_url: sourceUrl },
            });
            if (existing) continue;

            const title = dir.name;
            const company = this.extractCompany(title);

            // Try to fetch README.md for content
            let content = '';
            try {
              const readmePath = encodeURIComponent(dir.name);
              const readmeData = await this.fetchContentsApi<GitHubFileResponse>(
                `${API_BASE}/${readmePath}/README.md?ref=${REPO_BRANCH}`,
              );

              if (readmeData?.content && readmeData.encoding === 'base64') {
                const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8');
                content = decoded.slice(0, 5000);
              }
            } catch {
              this.logger.debug(`No README.md found in directory: ${dir.name}`);
            }

            if (!content) {
              content = `面试经验分享: ${title}\n\n查看详情: ${sourceUrl}`;
            }

            const item = this.repo.create({
              title: title.slice(0, 200),
              content,
              source: 'github',
              source_url: sourceUrl,
              category: 'interview_exp',
              company: company ?? undefined,
            });

            await this.repo.save(item);
            imported++;
          } catch (err) {
            this.logger.warn(`Failed to process directory "${dir.name}": ${String(err)}`);
          }
        }
      } else {
        // Step 2: API unavailable (rate limited), use known directories
        this.logger.warn('GitHub API unavailable, using known directory fallback');
        imported = await this.importFromKnownDirectories();
      }
    } catch (err) {
      this.logger.error(`GitHub API import failed: ${String(err)}, trying fallback`);
      imported = await this.importFromKnownDirectories();
    }

    this.logger.log(`GitHub import complete: ${imported} items imported`);
    return imported;
  }

  private async importFromKnownDirectories(): Promise<number> {
    let imported = 0;

    for (const dirName of KNOWN_DIRECTORIES) {
      if (imported >= IMPORT_LIMIT) break;

      const sourceUrl = `${REPO_BASE_URL}/${encodeURIComponent(dirName)}`;

      const existing = await this.repo.findOne({
        where: { source_url: sourceUrl },
      });
      if (existing) continue;

      const company = this.extractCompany(dirName);

      const item = this.repo.create({
        title: dirName.slice(0, 200),
        content: `面试经验分享: ${dirName}\n\n来源: ${REPO_OWNER}/${REPO_NAME}\n查看详情: ${sourceUrl}`,
        source: 'github',
        source_url: sourceUrl,
        category: 'interview_exp',
        company: company ?? undefined,
      });

      await this.repo.save(item);
      imported++;
    }

    return imported;
  }

  private async fetchContentsApi<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'HRBP-Coach-Feed-Importer/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        this.logger.warn(`GitHub API ${res.status} for ${url}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err) {
      this.logger.warn(`GitHub API request failed: ${String(err)}`);
      return null;
    }
  }

  private extractCompany(text: string): string | null {
    for (const name of COMPANY_PATTERNS) {
      if (text.includes(name)) return name;
    }
    return null;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedItem } from '../entities/feed-item.entity';

interface MarkdownFile {
  url: string;
  path: string;
}

// Known markdown files in 0voice/interview_experience repo
const GITHUB_TARGETS: MarkdownFile[] = [
  { path: 'c++.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/c++.md' },
  { path: 'java.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/java.md' },
  { path: 'golang.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/golang.md' },
  { path: 'python.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/python.md' },
  { path: 'android.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/android.md' },
  { path: 'ios.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/ios.md' },
  { path: 'linux.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/linux.md' },
  { path: 'algorithm.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/algorithm.md' },
  { path: 'database.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/database.md' },
  { path: 'network.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/network.md' },
  { path: 'frontend.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/frontend.md' },
  { path: 'backend.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/backend.md' },
  { path: 'bigdata.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/bigdata.md' },
  { path: 'ai.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/ai.md' },
  { path: 'operation.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/operation.md' },
  { path: 'security.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/security.md' },
  { path: 'embedded.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/embedded.md' },
  { path: 'product.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/product.md' },
  { path: 'test.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/test.md' },
  { path: 'cloud.md', url: 'https://raw.githubusercontent.com/0voice/interview_experience/main/cloud.md' },
];

const COMPANY_PATTERNS = [
  '阿里', '腾讯', '字节', '百度', '美团', '京东', '华为', '小米', '滴滴', '拼多多',
  '网易', '微信', '快手', 'bilibili', 'B站', '蚂蚁', '蔚来', '理想', '小鹏',
  'Alibaba', 'Tencent', 'ByteDance', 'Baidu', 'Meituan', 'JD', 'Huawei',
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
    const LIMIT = 20;

    for (const target of GITHUB_TARGETS) {
      if (imported >= LIMIT) break;

      try {
        const existing = await this.repo.findOne({
          where: { source_url: target.url },
        });
        if (existing) continue;

        const text = await this.fetchRaw(target.url);
        if (!text) continue;

        const sections = this.splitIntoSections(text);

        for (const section of sections) {
          if (imported >= LIMIT) break;

          const sectionUrl = `${target.url}#${encodeURIComponent(section.heading.slice(0, 50))}`;
          const alreadyExists = await this.repo.findOne({ where: { source_url: sectionUrl } });
          if (alreadyExists) continue;

          const company = this.extractCompany(section.heading + '\n' + section.content);

          const item = this.repo.create({
            title: section.heading || `GitHub 面经 - ${target.path}`,
            content: section.content.slice(0, 5000),
            source: 'github',
            source_url: sectionUrl,
            category: 'interview_exp',
            company: company ?? undefined,
          });

          await this.repo.save(item);
          imported++;
        }
      } catch (err) {
        this.logger.warn(`Failed to import ${target.url}: ${String(err)}`);
      }
    }

    this.logger.log(`GitHub import complete: ${imported} items imported`);
    return imported;
  }

  private async fetchRaw(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HRBP-Feed-Importer/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private splitIntoSections(md: string): Array<{ heading: string; content: string }> {
    const lines = md.split('\n');
    const sections: Array<{ heading: string; content: string }> = [];
    let currentHeading = '';
    let currentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (currentLines.length > 10) {
          sections.push({
            heading: currentHeading || '面试经验',
            content: currentLines.join('\n').trim(),
          });
        }
        currentHeading = line.replace(/^#+\s*/, '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 10) {
      sections.push({
        heading: currentHeading || '面试经验',
        content: currentLines.join('\n').trim(),
      });
    }

    // If no sections found, treat the whole file as one item
    if (sections.length === 0 && md.length > 100) {
      const firstLine = md.split('\n')[0].replace(/^#+\s*/, '').trim();
      sections.push({ heading: firstLine || '面试经验', content: md.slice(0, 5000) });
    }

    return sections;
  }

  private extractCompany(text: string): string | null {
    for (const name of COMPANY_PATTERNS) {
      if (text.includes(name)) return name;
    }
    return null;
  }
}

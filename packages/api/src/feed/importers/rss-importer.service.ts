import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Parser from 'rss-parser';
import { FeedItem } from '../entities/feed-item.entity';

interface RssFeed {
  url: string;
  source: string;
  category: string;
}

const RSS_FEEDS: RssFeed[] = [
  {
    url: 'https://rsshub.app/nowcoder/experience/639',
    source: 'nowcoder',
    category: 'interview_exp',
  },
];

@Injectable()
export class RssImporterService {
  private readonly logger = new Logger(RssImporterService.name);
  private readonly parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'HRBP-Feed-Importer/1.0' },
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

    for (const feed of RSS_FEEDS) {
      try {
        const count = await this.importFeed(feed);
        imported += count;
      } catch (err) {
        this.logger.warn(`Failed to import RSS feed ${feed.url}: ${String(err)}`);
      }
    }

    this.logger.log(`RSS import complete: ${imported} items imported`);
    return imported;
  }

  private async importFeed(feed: RssFeed): Promise<number> {
    let parsedFeed: Parser.Output<{ contentEncoded?: string }>;
    try {
      parsedFeed = await this.parser.parseURL(feed.url);
    } catch (err) {
      this.logger.warn(`Failed to parse RSS from ${feed.url}: ${String(err)}`);
      return 0;
    }

    let imported = 0;

    for (const rssItem of parsedFeed.items ?? []) {
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
        source: feed.source,
        source_url: sourceUrl,
        category: feed.category,
      });

      await this.repo.save(item);
      imported++;
    }

    return imported;
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

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { FeedItem } from './entities/feed-item.entity';
import { RecruitIntelService } from './recruit-intel.service';

@Injectable()
export class DigestGeneratorService {
  private readonly logger = new Logger(DigestGeneratorService.name);

  constructor(
    private readonly ai: AiService,
    @InjectRepository(FeedItem)
    private readonly repo: Repository<FeedItem>,
    private readonly recruitIntel: RecruitIntelService,
  ) {}

  async generateWeeklyDigest(): Promise<FeedItem | { status: 'empty'; message: string }> {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [recentItems, recentRecruitEvents] = await Promise.all([
      this.repo.find({
        where: { created_at: MoreThan(since) },
        order: { created_at: 'DESC' },
        take: 50,
      }),
      this.recruitIntel.getRecentForDigest(7),
    ]);

    if (recentItems.length === 0 && recentRecruitEvents.length === 0) {
      return { status: 'empty', message: '暂无已验证来源内容' };
    }

    const summaryInput = recentItems
      .map(
        (item, idx) =>
          `[${idx + 1}] 标题: ${item.title}\n公司: ${item.company ?? '未知'}\n来源: ${item.source}\n内容摘要: ${item.content.slice(0, 300)}`,
      )
      .join('\n\n---\n\n');

    // T2 M9:把本周新增的校招情报事件纳入周刊汇总段落(与面经内容一样只喂真实记录,不编造)。
    const recruitInput =
      recentRecruitEvents.length > 0
        ? recentRecruitEvents
            .map((event, idx) => {
              const date = event.event_date ? event.event_date.toISOString().slice(0, 10) : '日期待确认';
              return `[${idx + 1}] ${event.company} · ${event.event_type} · ${date}${event.city ? ` · ${event.city}` : ''}`;
            })
            .join('\n')
        : '本周无新增校招情报事件';

    const prompt = `以下是过去 7 天收录的 ${recentItems.length} 条面试经验，以及 ${recentRecruitEvents.length} 条新增校招情报事件。请生成一份中文周刊摘要，包括：
1. 本周概述（2-3句话）
2. 热门公司（出现频率高的公司及面试特点）
3. 本周亮点（2-3条值得关注的面试经验）
4. 趋势分析（本周面试市场整体趋势）
5. 校招情报速览（基于下方事件列表，提醒读者关注哪些公司的网申/宣讲/笔试节点；没有事件就如实说明本周无新增）

面试经验内容：
${summaryInput || '本周无新增面试经验'}

校招情报事件：
${recruitInput}`;

    const digestContent = await this.ai.complete({
      system: '你是一位专业的 HR 行业分析师，擅长总结求职面试趋势。请用简洁专业的中文写作，重点突出，有实际价值。',
      prompt,
      maxTokens: 2048,
    });

    const now = new Date();
    const weekStr = `${now.getFullYear()}年第${this.getWeekNumber(now)}周`;

    const item = this.repo.create({
      title: `AI 周刊：${weekStr}面试经验汇总`,
      content: digestContent,
      source: 'ai_digest',
      category: 'editorial',
    });

    const saved = await this.repo.save(item);
    this.logger.log(`Generated weekly digest: ${saved.id}`);
    return saved;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OpsEvent, OpsEventType } from './entities/ops-event.entity';

export interface DailyStats {
  date: string;
  AI_FAILOVER: number;
  AI_BOTH_DOWN: number;
  QUEUE_FULL: number;
}

@Injectable()
export class OpsEventsService {
  private readonly logger = new Logger(OpsEventsService.name);

  constructor(
    @InjectRepository(OpsEvent)
    private readonly repo: Repository<OpsEvent>,
  ) {}

  /**
   * 记录一条运维事件。绝不抛错:写入失败时 catch 并 warn,确保主业务流程不受影响。
   */
  async record(type: OpsEventType, detail: Record<string, unknown>): Promise<void> {
    try {
      const event = this.repo.create({ type, detail });
      await this.repo.save(event);
    } catch (err) {
      this.logger.warn(
        `OpsEventsService.record 写入失败(type=${type}):${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * 查询最近 N 条事件(按 created_at 倒序)。供管理后台 T3 调用。
   */
  async recent(limit = 50): Promise<OpsEvent[]> {
    return this.repo.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * 按日期聚合最近 7 天的三类事件计数。供管理后台 T3 趋势图使用。
   */
  async dailyStats(days = 7): Promise<DailyStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await this.repo.find({
      where: { created_at: MoreThan(since) },
      order: { created_at: 'ASC' },
    });

    // 聚合:以本地日期字符串(YYYY-MM-DD)为 key 分组
    const map = new Map<string, DailyStats>();
    for (const row of rows) {
      const date = row.created_at.toISOString().slice(0, 10);
      if (!map.has(date)) {
        map.set(date, { date, AI_FAILOVER: 0, AI_BOTH_DOWN: 0, QUEUE_FULL: 0 });
      }
      const entry = map.get(date)!;
      if (row.type === 'AI_FAILOVER') entry.AI_FAILOVER += 1;
      else if (row.type === 'AI_BOTH_DOWN') entry.AI_BOTH_DOWN += 1;
      else if (row.type === 'QUEUE_FULL') entry.QUEUE_FULL += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

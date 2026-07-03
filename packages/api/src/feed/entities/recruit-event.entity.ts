import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';
import type { FeedConfidence } from '../types/newspaper.types';
import type { RecruitEventType } from '../types/feed.types';

/**
 * T2 月刊校招情报事件:三类适配器(sheet_file/sheet_link/wechat_dump)解析产出的结构化事件,
 * 与 FeedItem 是两张独立的表(不写 feed_items)。
 *
 * 防编造红线:event_date / apply_url 缺失一律 null,不得由 AI 或代码推断补全;
 * company 缺失时整条丢弃(解析层处理,不落库),故此列非空。
 */
@Entity('recruit_events')
export class RecruitEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ type: 'varchar', nullable: true })
  role_hint: string | null;

  @Column({ type: 'varchar' })
  event_type: RecruitEventType;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  event_date: Date | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  apply_url: string | null;

  /** 溯源:产出该事件的 FeedSource id(上传批次/链接源均落此字段)。 */
  @Column({ type: 'varchar', nullable: true })
  source_ref: string | null;

  @Column({ type: 'varchar', default: 'medium' })
  confidence: FeedConfidence;

  /** 去重键:归一化公司名 + event_type + event_date。实体侧唯一索引让 sqlite e2e
   * (synchronize 按实体建表)与生产 Postgres(migration 建 IDX_recruit_events_dedup_key)
   * 双端约束一致——并发同 key 插入这类竞态才能在 e2e 环境暴露,不留"测试比生产宽松"的盲区。 */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  dedup_key: string;

  @CreateDateColumn()
  created_at: Date;
}

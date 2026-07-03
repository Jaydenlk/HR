import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE, JSONB_COLUMN_TYPE } from '../../database/column-types';
import type { OccupationSkeleton, Axis, OccupationEntryStatus } from '../occupation.types';
import { OccupationSlug } from './occupation-slug.entity';

/**
 * occupation_entries:结构主干(skeleton)+ 散文渲染(T3-career-wiki.md §4)。
 * slug 既是本表主键也是外键(与 occupation_slugs 共享自然键,1:1 关系)——设计文档数据模型表
 * 明确把本表的 slug 标注为「FK」,且注册表先行(§1 设计裁决 4)保证 entry 只在 slug 已存在
 * 后才会被创建,不存在「先建 entry 后建 slug」的时序冲突,故此处采用数据库级外键。
 */
@Entity('occupation_entries')
export class OccupationEntry {
  @PrimaryColumn({ type: 'varchar' })
  slug: string;

  @ManyToOne(() => OccupationSlug, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slug' })
  slugRef: OccupationSlug;

  // 结构主干:8 层固定骨架 + axis + domain_specifics,生成与校验唯一作用的对象。
  @Column({ type: JSONB_COLUMN_TYPE })
  skeleton: OccupationSkeleton;

  // 散文渲染:主干校验完之后的一次性廉价重排,不再单独校验。
  @Column({ type: 'text' })
  prose: string;

  @Column({ type: 'varchar' })
  axis: Axis;

  @Column({ type: 'varchar', default: 'draft' })
  status: OccupationEntryStatus;

  // 该词条累计消耗的 token 成本(单条预算 5 万目标 / 8 万熔断的可盯指标)。
  @Column({ type: 'int', default: 0 })
  cost_tokens: number;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_verified: Date | null;
}

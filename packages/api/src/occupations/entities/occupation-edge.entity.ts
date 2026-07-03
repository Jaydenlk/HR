import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import type { OccupationEdgeType } from '../occupation.types';

/**
 * occupation_edges:词条关系边,一等公民数据(T3-career-wiki.md §4)。
 *
 * from_slug / to_slug 不设数据库级外键——设计文档原文「脚本保证零悬空引用」把这份完整性
 * 的保障责任明确划给脚本/校验器层(见 occupation.validator.ts 的
 * validateEdgesReferentialIntegrity),而不是 DB 约束。理由:注册表 v1 阶段 edges 作为
 * 「一等公民数据」与全库 slug 坑位同批构建,生产按 L1 职业族聚簇分批推进,批与批之间
 * 存在合法的「先建边、后建目标词条」中间态;硬 FK 会阻断这个节奏。悬空引用检查由
 * occupation-seed-importer 在落库前统一执行,并有专门测试覆盖。
 */
@Entity('occupation_edges')
@Index('UQ_occupation_edges_from_to_type', ['from_slug', 'to_slug', 'type'], { unique: true })
export class OccupationEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  from_slug: string;

  @Index()
  @Column({ type: 'varchar' })
  to_slug: string;

  @Column({ type: 'varchar' })
  type: OccupationEdgeType;

  @Column({ type: 'text' })
  note: string;
}

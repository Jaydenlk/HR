import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';
import type { EvidenceSourceLevel, EvidenceVerdict } from '../occupation-evidence.types';
import { OccupationEntry } from './occupation-entry.entity';

/**
 * occupation_evidence:证据侧表(T3-career-wiki.md §4)。骨架正文彻底移出的溯源/分级/
 * 校验结论全部下沉在这里,field_path 定位骨架内具体字段(如 "operations.deliverables[2]")。
 *
 * entry_slug 设数据库级外键(→ occupation_entries.slug)——与 edges 不同,证据行只在
 * seed-importer 同一次事务里跟随其所属 entry 一起写入(不存在跨批次的「先建证据后建
 * entry」中间态),硬 FK 不与生产节奏冲突,反而对「证据必须归属于某个已存在词条」这条
 * 更强的完整性诉求有直接价值。
 */
@Entity('occupation_evidence')
@Index('IDX_occupation_evidence_entry_field', ['entry_slug', 'field_path'])
export class OccupationEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  entry_slug: string;

  @ManyToOne(() => OccupationEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_slug', referencedColumnName: 'slug' })
  entryRef: OccupationEntry;

  @Column({ type: 'varchar' })
  field_path: string;

  @Column({ type: 'text' })
  claim: string;

  @Column({ type: 'text' })
  source_excerpt: string;

  @Column({ type: 'varchar' })
  source_url: string;

  @Column({ type: 'varchar' })
  tier: EvidenceSourceLevel;

  @Column({ type: 'varchar' })
  verdict: EvidenceVerdict;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_verified: Date | null;
}

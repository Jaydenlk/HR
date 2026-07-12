import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE, JSONB_COLUMN_TYPE } from '../../database/column-types';
import type { EvidenceSourceLevel, EvidenceVerdict, ReasoningChain } from '../occupation-evidence.types';
import { OccupationEntry } from './occupation-entry.entity';

/**
 * occupation_evidence:证据侧表(T3-career-wiki.md §4)。骨架正文彻底移出的溯源/分级/
 * 校验结论全部下沉在这里,field_path 定位骨架内具体字段(如 "operations.deliverables[2]")。
 *
 * entry_slug 设数据库级外键(→ occupation_entries.slug)——与 edges 不同,证据行只在
 * seed-importer 同一次事务里跟随其所属 entry 一起写入(不存在跨批次的「先建证据后建
 * entry」中间态),硬 FK 不与生产节奏冲突,反而对「证据必须归属于某个已存在词条」这条
 * 更强的完整性诉求有直接价值。
 *
 * TC-02 定稿(t3-codex56-review-2026-07-10.md §R3):现有 id 列直接作 claim_id 主键
 * (UUIDv7,S2 创建全程沿用,field_path 数组重排/复合断言拆分/重写场景下不再可靠作为
 * 定位主键);旧 claim 列映射为 claim_text;新增 field_value_hash/span_start/span_end/
 * reasoning_chain 四列(migration 见 TC-04,本卡只改 entity 类型,不生成/不跑 migration)。
 * 不加 freshness/source_document(门B 范畴,本卡不做)。
 */
@Entity('occupation_evidence')
@Index('IDX_occupation_evidence_entry_field', ['entry_slug', 'field_path'])
export class OccupationEvidence {
  /** claim_id:UUIDv7,复用既有 id 列,S2 创建全程沿用,不重新生成。 */
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  claim_id: string;

  @Column({ type: 'varchar' })
  entry_slug: string;

  @ManyToOne(() => OccupationEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_slug', referencedColumnName: 'slug' })
  entryRef: OccupationEntry;

  @Column({ type: 'varchar' })
  field_path: string;

  /** 原子断言原文,复用既有 claim 列(列名不变,应用层属性改名 claim_text)。 */
  @Column({ name: 'claim', type: 'text' })
  claim_text: string;

  /** sha256(normalizeLeafValue(当前 skeleton 该路径的值)),防改写复用旧 hash。 */
  @Column({ type: 'varchar', length: 64 })
  field_value_hash: string;

  /** claim_text 在当前叶子规范化串中的半开区间起点(含)。 */
  @Column({ type: 'int' })
  span_start: number;

  /** claim_text 在当前叶子规范化串中的半开区间终点(不含)。 */
  @Column({ type: 'int' })
  span_end: number;

  @Column({ type: 'text' })
  source_excerpt: string;

  @Column({ type: 'varchar' })
  source_url: string;

  @Column({ type: 'varchar' })
  tier: EvidenceSourceLevel;

  @Column({ type: 'varchar' })
  verdict: EvidenceVerdict;

  /** 仅 verdict=inference_supported 时非 null;门B 前不加 freshness/source_document。 */
  @Column({ type: JSONB_COLUMN_TYPE, nullable: true })
  reasoning_chain: ReasoningChain | null;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_verified: Date | null;
}

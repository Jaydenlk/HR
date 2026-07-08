import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * occupation_aliases:别名表,精确命中检索用(T3-career-wiki.md §5「检索顺序:别名精确
 * 命中(归一化)→ pg_trgm 相似 + 全文兜底」)。唯一索引 (alias, slug) 为 T3 §4 明确要求。
 *
 * slug 不设数据库级外键——理由同 occupation_edges:别名扩展(§6「机械环节」)与词条主体
 * 生产可能不在同一批次严格同步,脚本层校验悬空引用即可,不需要 DB 硬约束卡住节奏。
 */
@Entity('occupation_aliases')
@Index('UQ_occupation_aliases_alias_slug', ['alias', 'slug'], { unique: true })
export class OccupationAlias {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  alias: string;

  @Index()
  @Column({ type: 'varchar' })
  slug: string;

  @Column({ type: 'float', default: 1 })
  weight: number;
}

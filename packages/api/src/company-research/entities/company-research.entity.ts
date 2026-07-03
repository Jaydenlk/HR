import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * company_research：公司搜索结果落库缓存（T6）。
 *
 * canonical_name：归一化名（去空格/全半角/大小写/常见后缀剥离），唯一索引，作为缓存键。
 * 缓存命中条件（红线，只此一条，不做模糊命中）：canonical_name 精确相等 且 retrieved_at 距今 ≤7 天。
 * raw：博查原始返回的精简字段，simple-json 存储（双库兼容：sqlite/postgres 均落 text 列）。
 *
 * 本实体的归一化规则只服务本模块的搜索缓存，不与 feed/company-registry.service.ts 的
 * CompanyRegistryService.matchCompany（trim+toLowerCase 精确比对）合并，两者独立并存。
 */
@Entity('company_research')
export class CompanyResearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  canonical_name: string;

  @Column()
  display_name: string;

  @Column()
  summary: string;

  @Column()
  source_url: string;

  @Column()
  source_domain: string;

  // 每次落库/刷新时显式赋值为 new Date()，非自动列，故用普通 @Column()（非 nullable，
  // 反射类型为单一 Date，两端驱动都能正确推出各自的时间戳列类型，无需 TIMESTAMP_COLUMN_TYPE——
  // 该工具仅用于 Date|null 联合类型的可空时间列，见 database/column-types.ts 头注）。
  @Column()
  retrieved_at: Date;

  // 博查原始返回精简字段（消歧/排障留痕用）。simple-json 双端落 text 列，不是字面 jsonb 类型。
  @Column('simple-json', { nullable: true })
  raw: Record<string, unknown> | null;
}

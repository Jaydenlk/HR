import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { L0Board, OccupationSlugStatus } from '../occupation.types';

/**
 * occupation_slugs:全库注册表坑位(T3-career-wiki.md §4)。
 * slug 是自然主键(小写连字符),不用 uuid 代理键——本表本身就是「slug 值域的权威登记表」,
 * 其它 4 张表的 slug 类字段都以此为参照(部分设 DB 级外键,见各实体头注)。
 */
@Entity('occupation_slugs')
export class OccupationSlug {
  @PrimaryColumn({ type: 'varchar' })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  l0: L0Board;

  @Column({ type: 'varchar' })
  l1_family: string;

  @Column({ type: 'varchar', nullable: true })
  l2_scene: string | null;

  // 是否为「拆条判据」下独立生成的 L3 变体(默认一条职业一条词条,仅当行业变体在
  // ≥4/8 骨架层有实质差异且有独立 JD 池时才拆为独立 L3 词条)。
  @Column({ type: 'boolean', default: false })
  l3_flag: boolean;

  @Column({ type: 'varchar', default: 'planned' })
  status: OccupationSlugStatus;
}

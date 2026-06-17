import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';

// 公告种类:功能上新 / 修复 / 维护。前端据此渲染图标与色彩。
export type AnnouncementKind = 'feature' | 'fix' | 'maintenance';

// 展示形态:横幅(主区顶部内联条) / 弹窗(首次访问弹出)。前端据此分流渲染。
export type AnnouncementDisplayType = 'banner' | 'modal';

// 站内公告。运营经管理后台发布,公开端只返 active 的,供登录/未登录用户读取。
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  body: string;

  // 种类标签,默认 feature。
  @Column({ type: 'varchar', default: 'feature' })
  kind: AnnouncementKind;

  // 展示形态,默认 banner(横幅)。modal 走首次访问弹窗。
  @Column({ type: 'varchar', default: 'banner' })
  display_type: AnnouncementDisplayType;

  // 上架开关:仅 active=true 的对公开端可见。下架置 false 即隐藏(软下架)。
  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  // 发布时间:创建即上架时与 created_at 同步;下架不清空(保留历史发布点)。
  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  published_at: Date | null;
}

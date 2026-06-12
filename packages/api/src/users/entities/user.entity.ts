import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Resume } from '../../resumes/entities/resume.entity';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column()
  invite_code: string;

  // 角色:'user' | 'admin'。ADMIN_EMAILS 命中或管理后台手动提升。
  @Column({ default: 'user' })
  role: string;

  // 状态:'active' | 'banned'。banned 用户登录被拒。
  @Column({ default: 'active' })
  status: string;

  // 每用户每日 AI 配额覆盖值;null 表示用全局 DAILY_AI_QUOTA。
  @Column({ type: 'int', nullable: true })
  daily_quota_override: number | null;

  @Column({ default: 'zh' })
  locale: string;

  // 最近登录 IP(Caddy 反代后经 trust proxy 还原的真实客户端 IP)。
  @Column({ type: 'varchar', nullable: true })
  last_login_ip: string | null;

  // 最近登录 IP 的离线归属省/市(ip2region 解析;内网为「内网」,解析失败为 null,不编造)。
  @Column({ type: 'varchar', nullable: true })
  last_login_province: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_city: string | null;

  // 最近登录时间。可空时间列须显式列类型(双端兼容),见 src/database/column-types.ts。
  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_login_at: Date | null;

  // 首次同意用户条款时间;已有值不覆盖。
  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  terms_agreed_at: Date | null;

  @OneToMany(() => Resume, (r) => r.user)
  resumes: Resume[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

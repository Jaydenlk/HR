import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Resume } from '../../resumes/entities/resume.entity';

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

  @OneToMany(() => Resume, (r) => r.user)
  resumes: Resume[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

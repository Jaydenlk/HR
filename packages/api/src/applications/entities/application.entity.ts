import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApplicationEvent } from './application-event.entity';

export type ApplicationStage = 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'varchar', default: 'wishlist' })
  stage: ApplicationStage;

  @Column({ nullable: true })
  salary_range: string;

  @Column({ nullable: true })
  deadline: string;

  @Column({ nullable: true })
  referrer: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  resume_id: string;

  @Column({ nullable: true })
  diagnosis_id: string;

  // 发送的是哪一版简历(软引用 resume_versions,与 resume_id 不是一回事:resume_id 是简历级,
  // 这个是版本级)。归属校验经 resume_id 反查其所属 Resume 的 user_id,见 application-links.service.ts。
  // 类型显式含 null(不同于 resume_id/diagnosis_id 沿用的历史 string 写法):link/unlink 端点
  // 需要真的把这两列置回 null,故此处类型如实反映可空性。
  @Column({ nullable: true, type: 'uuid' })
  resume_version_id: string | null;

  // 软引用 T6 的 company_research(全局缓存表,无 user_id 列,"归属校验"只判存在)。
  @Column({ nullable: true, type: 'uuid' })
  company_research_id: string | null;

  @OneToMany(() => ApplicationEvent, (e) => e.application, { cascade: true })
  events: ApplicationEvent[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

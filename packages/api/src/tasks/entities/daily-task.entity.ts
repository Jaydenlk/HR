import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type TaskType = 'practice' | 'apply' | 'review' | 'learn' | 'resume';
export type TaskStatus = 'todo' | 'done';
export type LinkedType = 'diagnosis' | 'interview' | 'application';

@Entity('daily_tasks')
export class DailyTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  task_date: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'int' })
  duration_min: number | null;

  @Column({ type: 'varchar' })
  task_type: string;

  @Column('text', { nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', default: 'todo' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  linked_type: string | null;

  @Column({ type: 'varchar', nullable: true })
  linked_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}

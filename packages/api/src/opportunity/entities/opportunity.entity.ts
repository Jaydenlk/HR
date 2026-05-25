import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { OpportunityStatus, EmploymentType } from '../types/opportunity.types';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'varchar', nullable: true })
  employment_type: EmploymentType | null;

  @Column({ nullable: true })
  source_platform: string;

  @Column({ nullable: true })
  source_url: string;

  @Column('text')
  jd_text: string;

  @Column({ type: 'simple-json', nullable: true })
  jd_snapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: OpportunityStatus;

  @Column({ nullable: true })
  application_id: string;

  @Column({ nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

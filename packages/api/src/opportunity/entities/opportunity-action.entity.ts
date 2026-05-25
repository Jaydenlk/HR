import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Opportunity } from './opportunity.entity';
import type { ActionType, ActionStatus } from '../types/opportunity.types';

@Entity('opportunity_actions')
export class OpportunityAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  opportunity_id: string;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column({ type: 'varchar' })
  action_type: ActionType;

  @Column()
  title: string;

  @Column('text')
  reason: string;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ nullable: true })
  linked_task_id: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ActionStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

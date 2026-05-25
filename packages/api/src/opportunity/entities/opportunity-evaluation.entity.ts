import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Opportunity } from './opportunity.entity';
import type { Recommendation, ConfidenceLevel } from '../types/opportunity.types';

@Entity('opportunity_evaluations')
export class OpportunityEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  opportunity_id: string;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column({ type: 'real', default: 0 })
  match_score: number;

  @Column({ type: 'real', default: 0 })
  value_score: number;

  @Column({ type: 'real', default: 0 })
  credibility_score: number;

  @Column({ type: 'real', default: 0 })
  overall_score: number;

  @Column({ type: 'varchar', default: 'neutral' })
  recommendation: Recommendation;

  @Column({ type: 'varchar', default: 'insufficient' })
  confidence: ConfidenceLevel;

  @Column({ type: 'simple-json', default: '[]' })
  risk_flags: string[];

  @Column({ type: 'simple-json', default: '[]' })
  strengths: string[];

  @Column({ type: 'simple-json', default: '[]' })
  gaps: string[];

  @Column({ type: 'simple-json', default: '[]' })
  next_actions: string[];

  @Column({ type: 'simple-json', nullable: true })
  raw_ai_response: Record<string, unknown> | null;

  @Column({ nullable: true })
  model_version: string;

  @CreateDateColumn()
  created_at: Date;
}

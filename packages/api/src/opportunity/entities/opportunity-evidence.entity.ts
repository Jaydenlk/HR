import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';
import { Opportunity } from './opportunity.entity';
import type { EvidenceKind, ConfidenceLevel } from '../types/opportunity.types';

@Entity('opportunity_evidence')
export class OpportunityEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  opportunity_id: string;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column({ type: 'varchar' })
  kind: EvidenceKind;

  @Column({ nullable: true })
  source_platform: string;

  @Column({ nullable: true })
  source_url: string;

  @Column()
  title: string;

  @Column('text')
  excerpt: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  published_at: Date | null;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  fetched_at: Date | null;

  @Column({ type: 'varchar', default: 'medium' })
  confidence: ConfidenceLevel;

  @CreateDateColumn()
  created_at: Date;
}

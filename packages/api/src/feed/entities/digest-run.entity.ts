import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedSource } from './feed-source.entity';
import type { DigestRunStatus } from '../types/feed.types';

@Entity('digest_runs')
export class DigestRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  source_id: string | null;

  @ManyToOne(() => FeedSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source: FeedSource | null;

  @Column({ type: 'varchar' })
  status: DigestRunStatus;

  @Column({ type: 'integer', default: 0 })
  fetched_count: number;

  @Column({ type: 'integer', default: 0 })
  saved_count: number;

  @Column({ type: 'integer', default: 0 })
  skipped_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}


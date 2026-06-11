import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';
import type { FeedSourceKind, FeedSourceStatus } from '../types/feed.types';

@Entity('feed_sources')
export class FeedSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  kind: FeedSourceKind;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  homepage_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  config_key: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: FeedSourceStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_run_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  fail_count: number;

  @Column({ type: 'integer', default: 0 })
  success_count: number;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_success_at: Date | null;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  last_failure_at: Date | null;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;

  @Column({ type: 'varchar', default: 'unknown' })
  health: 'healthy' | 'degraded' | 'down' | 'unknown';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


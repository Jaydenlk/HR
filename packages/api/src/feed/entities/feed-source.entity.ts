import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  @Column({ type: 'datetime', nullable: true })
  last_run_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


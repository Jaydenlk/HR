import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FeedSource } from './feed-source.entity';
import type { FeedCategory, FeedSourceKind } from '../types/feed.types';

@Entity('feed_items')
export class FeedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'varchar', nullable: true })
  company: string | null;

  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({ type: 'varchar', nullable: true })
  outcome: string | null;

  /** Legacy source label kept only while feed services migrate to source_kind. */
  @Column({ default: 'ugc' })
  source: string;

  @Column({ type: 'varchar', default: 'ugc' })
  source_kind: FeedSourceKind;

  @Column({ type: 'varchar', nullable: true })
  source_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  source_id: string | null;

  @ManyToOne(() => FeedSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source_ref: FeedSource | null;

  @Column({ type: 'varchar', default: 'interview_exp' })
  category: FeedCategory;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  source_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  external_id: string | null;

  @Column({ type: 'datetime', nullable: true })
  fetched_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  published_at: Date | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  tags_json: string | null;

  @Column({ type: 'integer', default: 0 })
  quality_score: number;

  @Column({ type: 'varchar', nullable: true })
  author: string | null;

  @CreateDateColumn()
  created_at: Date;
}

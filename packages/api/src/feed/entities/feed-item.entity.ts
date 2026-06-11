import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';
import { User } from '../../users/entities/user.entity';
import { FeedSource } from './feed-source.entity';
import { Company } from './company.entity';
import { Department } from './department.entity';
import { RoleCategory } from './role-category.entity';
import type { FeedCategory, FeedSourceKind } from '../types/feed.types';
import type { FeedConfidence } from '../types/newspaper.types';

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

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  fetched_at: Date | null;

  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  published_at: Date | null;

  @Column({ type: 'varchar', default: 'unknown' })
  date_confidence: 'high' | 'medium' | 'low' | 'unknown';

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  tags_json: string | null;

  @Column({ type: 'integer', default: 0 })
  quality_score: number;

  @Column({ type: 'varchar', nullable: true })
  author: string | null;

  // Evidence Graph FK columns
  @Column({ nullable: true })
  company_id: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company_ref: Company | null;

  @Column({ nullable: true })
  department_id: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department_ref: Department | null;

  @Column({ nullable: true })
  role_category_id: string | null;

  @ManyToOne(() => RoleCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_category_id' })
  role_category_ref: RoleCategory | null;

  // Enhanced classification fields
  @Column({ type: 'varchar', default: 'medium' })
  confidence: FeedConfidence;

  @Column({ type: 'varchar', nullable: true })
  interview_round: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  question_types: string[];

  @Column({ type: 'varchar', nullable: true })
  difficulty: string | null;

  @Column({ type: 'varchar', nullable: true })
  quarter: string | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  role_category: string | null;

  @CreateDateColumn()
  created_at: Date;
}

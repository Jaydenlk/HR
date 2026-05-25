import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coverage_metrics')
export class CoverageMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_id: string;

  @Column()
  role_category_id: string;

  @Column({ type: 'varchar' })
  quarter: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'integer', default: 0 })
  target_count: number;

  @Column({ type: 'integer', default: 0 })
  valid_count: number;

  @Column({ type: 'real', default: 0 })
  freshness_score: number;

  @Column({ type: 'real', default: 0 })
  confidence_score: number;

  @Column({ type: 'varchar', default: 'critical' })
  gap_level: string;

  @UpdateDateColumn()
  updated_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CompanyType, CompanyPriority, ReasonType } from '../types/newspaper.types';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'simple-json', default: '[]' })
  aliases: string[];

  @Column({ type: 'simple-json', default: '[]' })
  bu_aliases: string[];

  @Column({ type: 'varchar' })
  company_type: CompanyType;

  @Column({ type: 'varchar', default: 'C' })
  priority: CompanyPriority;

  @Column({ type: 'varchar', default: 'both' })
  source_preference: string;

  @Column({ type: 'simple-json', default: '[]' })
  role_focus: string[];

  @Column({ nullable: true })
  sector: string;

  @Column({ type: 'varchar', default: 'product_judgment' })
  reason_type: ReasonType;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

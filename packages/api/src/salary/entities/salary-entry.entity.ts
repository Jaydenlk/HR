import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type SalarySource = 'self' | 'peer';

@Entity('salary_entries')
export class SalaryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  location: string;

  @Column('float')
  base_salary: number;

  @Column('float', { nullable: true })
  bonus: number;

  @Column('float', { nullable: true })
  stock_value: number;

  @Column('float')
  total_comp: number;

  @Column({ nullable: true })
  level: string;

  @Column({ type: 'varchar', default: 'self' })
  source: SalarySource;

  @CreateDateColumn()
  created_at: Date;
}

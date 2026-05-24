import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface Question {
  n: number;
  type: string;
  topic: string;
  difficulty: string;
  question: string;
  hint: string;
}

export interface Answer {
  n: number;
  answer: string;
  score: number;
  feedback: string;
  filler_count: number;
}

export interface Evaluation {
  overall_score: number;
  overall_grade: string;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

@Entity('mock_sessions')
export class MockSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  application_id: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column('text', { nullable: true })
  jd_text: string;

  @Column({ default: 'text' })
  mode: string;

  @Column({ default: 'in_progress' })
  status: string;

  @Column('simple-json', { nullable: true })
  questions: Question[];

  @Column('simple-json', { nullable: true })
  answers: Answer[];

  @Column('simple-json', { nullable: true })
  evaluation: Evaluation;

  @Column({ nullable: true, type: 'int' })
  total_filler_count: number;

  @CreateDateColumn()
  created_at: Date;
}

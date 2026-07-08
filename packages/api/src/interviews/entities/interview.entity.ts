import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Application } from '../../applications/entities/application.entity';

export interface ScoreItem {
  name: string;
  score: number;
}

export interface QuestionItem {
  question: string;
  tone: 'good' | 'warn' | 'bad';
  coach_assessment: string;
  better_answer: string;
  knowledge_gaps: string[];
}

export interface PredictionItem {
  topic: string;
  likelihood: number;
}

export interface InterviewPrediction {
  next_round_topics: PredictionItem[];
  summary: string;
}

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  application_id: string;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column()
  round: string;

  @Column({ nullable: true })
  interview_at: string;

  @Column({ nullable: true, type: 'int' })
  duration_min: number;

  @Column({ nullable: true })
  interviewer: string;

  @Column({ nullable: true })
  audio_url: string;

  @Column('text', { nullable: true })
  transcript: string;

  @Column({ nullable: true })
  overall_grade: string;

  @Column('text', { nullable: true })
  overall_note: string;

  // 面试全过程客观总结(问了什么/聊了什么/关键信息);只基于转写,无内容则空。
  // nullable:旧数据(本列上线前生成的复盘)为 null,前端据此优雅降级不白屏。
  @Column('text', { nullable: true })
  summary: string;

  @Column('simple-json', { nullable: true })
  scores: ScoreItem[];

  @Column('simple-json', { nullable: true })
  questions: QuestionItem[];

  @Column('simple-json', { nullable: true })
  prediction: InterviewPrediction;

  @CreateDateColumn()
  created_at: Date;
}

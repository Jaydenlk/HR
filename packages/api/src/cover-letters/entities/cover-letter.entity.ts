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

export type CoverLetterTone = 'professional' | 'warm' | 'direct';

@Entity('cover_letters')
export class CoverLetter {
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
  resume_id: string;

  @Column({ type: 'varchar', default: 'warm' })
  tone: CoverLetterTone;

  @Column({ nullable: true })
  length_words: number;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column('text', { nullable: true })
  jd_text: string;

  @Column('text')
  content: string;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;
}

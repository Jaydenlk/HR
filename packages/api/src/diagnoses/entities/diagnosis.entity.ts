import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Resume } from '../../resumes/entities/resume.entity';
import type { ParsedJD, MatchDimensions, RewriteSuggestion } from '../../common/types';

@Entity('diagnoses')
export class Diagnosis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  resume_id: string;

  @ManyToOne(() => Resume, (r) => r.diagnoses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: Resume;

  @Column('text')
  jd_text: string;

  @Column('simple-json', { nullable: true })
  jd_parsed: ParsedJD | null;

  @Column({ nullable: true })
  jd_company: string;

  @Column({ nullable: true })
  jd_role: string;

  @Column({ nullable: true })
  score: number;

  @Column('simple-json', { nullable: true })
  dimensions: MatchDimensions | null;

  @Column('simple-json', { nullable: true })
  keywords_hit: string[];

  @Column('simple-json', { nullable: true })
  keywords_miss: string[];

  @Column('simple-json', { nullable: true })
  suggestions: RewriteSuggestion[];

  @CreateDateColumn()
  created_at: Date;
}

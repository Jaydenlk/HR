import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Resume } from '../../resumes/entities/resume.entity';
import type { ParsedJD, MatchDimensions, ProfessionStandardResult, RewriteSuggestion } from '../../common/types';

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

  @Column({ type: 'text', nullable: true })
  jd_text?: string;

  @Column('simple-json', { nullable: true })
  jd_parsed: ParsedJD | null;

  @Column({ type: 'varchar', nullable: true })
  profession?: string;

  @Column({ type: 'varchar', nullable: true })
  preset_id?: string;

  @Column({ type: 'varchar', default: 'jd_match' })
  mode: 'jd_match' | 'profession_standard';

  @Column({ nullable: true })
  jd_company: string;

  @Column({ nullable: true })
  jd_role: string;

  @Column({ nullable: true })
  score: number;

  @Column('simple-json', { nullable: true })
  dimensions?: MatchDimensions | ProfessionStandardResult;

  @Column('simple-json', { nullable: true })
  keywords_hit: string[];

  @Column('simple-json', { nullable: true })
  keywords_miss: string[];

  @Column('simple-json', { nullable: true })
  suggestions: RewriteSuggestion[];

  @CreateDateColumn()
  created_at: Date;
}

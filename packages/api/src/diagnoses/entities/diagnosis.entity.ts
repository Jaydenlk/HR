import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Resume } from '../../resumes/entities/resume.entity';
import type {
  ParsedJD,
  MatchDimensions,
  ProfessionStandardResult,
  ProfessionTier,
  RewriteSuggestion,
} from '../../common/types';

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

  // 难度档:校招职业标尺诊断专用(standard/pressure);jd_match 模式为 null。
  // 结果页凭此字段判定压力版标识,无需用 preset_id 字符串硬匹配。
  @Column({ type: 'varchar', nullable: true })
  tier?: ProfessionTier;

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

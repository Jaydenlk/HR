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

  // 单次诊断的成败记账(与全局 AI 成功率 /admin/success-stats 是两个独立指标,互不并计):
  //   success —— 整条流水线跑完落库;failed —— 流水线抛错;partial —— 分析已落库但改写阶段失败。
  // 存量行(本特性上线前)为 NULL(未记账),统计端把 NULL 排除在分母外,不污染历史。
  @Column({ type: 'varchar', nullable: true })
  status?: 'success' | 'failed' | 'partial';

  // 失败归类(仅 failed/partial 行有值):input_validation | parser_error | analyzer_timeout
  //   | analyzer_error | rewriter_error | client_disconnect | unknown。供后台按原因下钻。
  @Column({ type: 'varchar', nullable: true })
  failure_reason?: string;

  // 原始错误信息(诊断用,仅失败行有值);text 容纳长堆栈/中文可读错误。
  @Column({ type: 'text', nullable: true })
  pipeline_error_message?: string;

  @CreateDateColumn()
  created_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * user_skill_self_assessment 表:用户对单个技能的自评分(0-10),用于纠偏 AI 的虚高/虚低分。
 *
 * 唯一约束 (user_id, skill_name):每个用户对同一技能只保留最新一条(POST 时 upsert)。
 * analyze 时:有自评的技能用 self_score 覆盖 AI 的 current,AI 分仅作参考保留;
 * 响应标注该分来自"用户自评"。这是"以真实自评精进数据"的落点。
 *
 * 类型映射依据 TypeORM PostgresDriver(与初始迁移头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'uuid' }) → uuid NOT NULL
 *  - @Column() (string) → character varying NOT NULL
 *  - @Column('int') → integer NOT NULL
 *  - @UpdateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * FK user_id → users.id CASCADE:用户注销后自动清理其自评记录。
 */
@Entity('user_skill_self_assessment')
@Index('UQ_user_skill_self_assessment', ['user_id', 'skill_name'], { unique: true })
export class UserSkillSelfAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  skill_name: string;

  @Column('int')
  self_score: number;

  @UpdateDateColumn()
  updated_at: Date;
}

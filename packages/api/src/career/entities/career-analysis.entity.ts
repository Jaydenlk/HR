import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { CareerAnalysis } from '../career.service';

/**
 * career_analysis 表:每次职业地图生成成功后落一条,供「看历史」与第3批 Coach 宏观层调取。
 *
 * 类型映射依据 TypeORM PostgresDriver(与初始迁移头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'uuid' }) → uuid NOT NULL
 *  - @Column('simple-json') → text(存权威 CareerAnalysis JSON)
 *  - @CreateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 索引 (user_id, created_at):加速「我的历史(按时间倒序)」查询。
 * FK user_id → users.id CASCADE:用户注销后自动清理其历史记录。
 */
@Entity('career_analysis')
@Index('IDX_career_analysis_user_id_created_at', ['user_id', 'created_at'])
export class CareerAnalysisRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('simple-json')
  result_json: CareerAnalysis;

  @CreateDateColumn()
  created_at: Date;
}

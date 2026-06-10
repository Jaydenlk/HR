import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// 每成功一次 AI 调用写一条;配额按「本地时区当日」的行数统计。
// 复合索引 (user_id, created_at) 服务于「某用户当日计数」的范围查询。
@Entity('ai_usage')
@Index(['user_id', 'created_at'])
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ type: 'varchar' })
  endpoint: string;

  @CreateDateColumn()
  created_at: Date;
}

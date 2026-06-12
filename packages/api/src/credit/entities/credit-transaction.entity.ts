import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// credit 账务流水(与 ai_usage 运营口径双轨并存,不合并):每笔余额变动记一条。
//  - signup_grant:注册赠送 +50
//  - admin_grant:管理员充值(created_by 记管理员 id)
//  - consume:AI 端点成功调用扣 1(endpoint 记路由)
// balance_after 为本笔落账后的余额,由 CreditService 在事务+行锁内计算写入。
// 复合索引 (user_id, created_at) 服务于「某用户流水倒序分页」。
export type CreditTransactionType = 'signup_grant' | 'admin_grant' | 'consume';

@Entity('credit_transactions')
@Index(['user_id', 'created_at'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  // 本笔变动量:消耗为负(-1),赠送/充值为正。
  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'varchar' })
  type: CreditTransactionType;

  // 落账后余额。
  @Column({ type: 'int' })
  balance_after: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  // 管理员充值时记管理员 id;其余为 null。
  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  // consume 时记触发的路由;其余为 null。
  @Column({ type: 'varchar', nullable: true })
  endpoint: string | null;

  @CreateDateColumn()
  created_at: Date;
}

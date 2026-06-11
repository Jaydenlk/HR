import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type OpsEventType = 'AI_FAILOVER' | 'AI_BOTH_DOWN' | 'QUEUE_FULL';

// 运维事件流水:记录 AI 降级/两通道皆败/并发队列满三类异常事件。
// 供管理后台(T3)展示系统健康状态,不对主业务流程造成任何影响。
@Entity('ops_events')
@Index(['type', 'created_at'])
export class OpsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: OpsEventType;

  // detail:JSON 对象,记录上下文信息(操作名/错误消息/当前并发数等)。
  // simple-json 在 SQLite 与 PostgreSQL 两端都落为 text,由 TypeORM 自动 JSON.stringify/parse,双端一致。
  @Column({ type: 'simple-json', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}

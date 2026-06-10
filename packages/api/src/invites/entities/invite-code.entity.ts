import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// 邀请码。试运行放量手段:新用户首次注册必须带有效邀请码。
@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  // 最大可用次数。
  @Column({ type: 'int', default: 1 })
  max_uses: number;

  // 已用次数,达到 max_uses 即失效。
  @Column({ type: 'int', default: 0 })
  used_count: number;

  // 手动停用开关,置 true 立即失效。
  @Column({ default: false })
  disabled: boolean;

  // 备注(发码用途/批次)。
  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  created_at: Date;
}

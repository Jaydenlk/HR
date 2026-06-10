import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// 邮箱登录验证码。code 本身不落库,仅存 HMAC-SHA256(key=JWT_SECRET) 摘要。
@Entity('login_codes')
export class LoginCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  email: string;

  // HMAC-SHA256(code) 十六进制摘要,杜绝明文验证码落库。
  @Column()
  code_hash: string;

  @Column()
  expires_at: Date;

  // 错误尝试次数,达到上限(5)即锁定该码。
  @Column({ type: 'int', default: 0 })
  attempts: number;

  // 成功消费或被新码作废后置 true。
  @Column({ default: false })
  consumed: boolean;

  @CreateDateColumn()
  created_at: Date;
}

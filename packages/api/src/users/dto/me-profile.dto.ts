import { User } from '../entities/user.entity';

// GET /me 响应:用户基本信息 + credit 余额(不含 role/status 等内部字段)。
export interface MeProfileDto {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  invite_code: string;
  created_at: Date;
  credit_balance: number;
}

export function toMeProfile(user: User): MeProfileDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url ?? null,
    invite_code: user.invite_code,
    created_at: user.created_at,
    credit_balance: user.credit_balance,
  };
}

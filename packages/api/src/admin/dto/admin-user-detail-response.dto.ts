import { User } from '../../users/entities/user.entity';

// 用户详情每日调用数据点(近 7 日按日 UTC)。
export interface AdminUserDailyUsage {
  date: string; // YYYY-MM-DD(UTC)
  count: number;
}

// 出参:管理后台用户详情(GET /admin/users/:id)。
// 隐私铁律 + 字段白名单:from() 静态工厂强制投影,绝不直接返回实体。
// 明确【不返回】terms_agreed_at / invite_code / daily_quota_override / avatar_url / 任何 token —— 无展示需求,做减法。
export class AdminUserDetailResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  credit_balance: number;
  created_at: Date;
  last_login_ip: string | null;
  last_login_province: string | null;
  last_login_city: string | null;
  last_login_at: Date | null;
  usage_today: number;
  usage_total: number;
  daily_usage: AdminUserDailyUsage[];

  // 静态工厂:从实体 + 计数 + 近 7 日按日数据构造,强制字段投影(白名单)。
  static from(
    user: User,
    counts: { usage_today: number; usage_total: number },
    daily: AdminUserDailyUsage[],
  ): AdminUserDetailResponseDto {
    const dto = new AdminUserDetailResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.role = user.role;
    dto.status = user.status;
    dto.credit_balance = user.credit_balance;
    dto.created_at = user.created_at;
    dto.last_login_ip = user.last_login_ip;
    dto.last_login_province = user.last_login_province;
    dto.last_login_city = user.last_login_city;
    dto.last_login_at = user.last_login_at;
    dto.usage_today = counts.usage_today;
    dto.usage_total = counts.usage_total;
    dto.daily_usage = daily;
    return dto;
  }
}

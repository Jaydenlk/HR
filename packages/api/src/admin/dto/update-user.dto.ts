import { IsIn, IsOptional } from 'class-validator';

// 管理后台改用户:封禁/解封 / 提升降级。两字段均可选,至少改一项由 service 处理。
// 注:credit 完全替代制后,每日配额覆盖(daily_quota_override)已退役,本 DTO 不再接受该字段。
export class UpdateUserDto {
  @IsOptional()
  @IsIn(['active', 'banned'], { message: 'status 仅支持 active | banned' })
  status?: 'active' | 'banned';

  @IsOptional()
  @IsIn(['user', 'admin'], { message: 'role 仅支持 user | admin' })
  role?: 'user' | 'admin';
}

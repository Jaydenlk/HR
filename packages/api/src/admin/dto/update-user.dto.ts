import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

// 管理后台改用户:封禁/解封 / 提升降级 / 配额覆盖。三字段均可选,至少改一项由 service 处理。
export class UpdateUserDto {
  @IsOptional()
  @IsIn(['active', 'banned'], { message: 'status 仅支持 active | banned' })
  status?: 'active' | 'banned';

  @IsOptional()
  @IsIn(['user', 'admin'], { message: 'role 仅支持 user | admin' })
  role?: 'user' | 'admin';

  // 每日 AI 配额覆盖值;>=0 整数。传 null 清除覆盖、回落全局配额。
  @IsOptional()
  @IsInt({ message: 'daily_quota_override 必须为整数' })
  @Min(0, { message: 'daily_quota_override 不能为负' })
  daily_quota_override?: number | null;
}

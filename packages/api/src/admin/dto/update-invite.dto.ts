import { IsBoolean } from 'class-validator';

// 管理后台停用/启用邀请码。
export class UpdateInviteDto {
  @IsBoolean({ message: 'disabled 必须为布尔值' })
  disabled: boolean;
}

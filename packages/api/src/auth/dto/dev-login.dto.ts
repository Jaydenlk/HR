import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

// 测试通道登录入参:仅需邮箱(免验证码免邀请码)。
export class DevLoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}

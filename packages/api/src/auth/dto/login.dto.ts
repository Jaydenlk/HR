import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '验证码不能为空' })
  @MinLength(1, { message: '验证码不能为空' })
  code: string;

  // 新用户首次注册必填(由 service 校验);老用户可不传。
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '邀请码格式不正确' })
  invite_code?: string;

  // 新用户首次注册必填(由 service 校验);老用户可不传。
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '姓名格式不正确' })
  name?: string;
}

import { IsBoolean, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestCodeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  // 条款门:必填布尔。缺失/非布尔在 DTO 层即 400(文案与服务层一致);
  // 值为 false 时由 auth.service 在发码前拦截,确保邮件分支根本不执行。
  @IsBoolean({ message: '请先阅读并同意用户条款' })
  terms_agreed: boolean;
}

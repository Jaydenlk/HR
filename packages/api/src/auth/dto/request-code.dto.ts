import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestCodeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// 管理后台建邀请码:code 可选(不传则随机 8 位);max_uses 必填正整数。
export class CreateInviteDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'code 格式不正确' })
  code?: string;

  @IsInt({ message: 'max_uses 必须为整数' })
  @Min(1, { message: 'max_uses 至少为 1' })
  max_uses: number;
}

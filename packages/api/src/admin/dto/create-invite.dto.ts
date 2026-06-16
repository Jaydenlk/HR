import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// 管理后台建邀请码:code 可选(不传则随机 8 位);max_uses 必填正整数;note 可选(发码用途/批次备注)。
export class CreateInviteDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'code 格式不正确' })
  code?: string;

  @IsInt({ message: 'max_uses 必须为整数' })
  @Min(1, { message: 'max_uses 至少为 1' })
  max_uses: number;

  // 备注(发码用途/批次)。note 列已存在于 invite_codes 实体与生产基线迁移,无需 ALTER 迁移。
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'note 格式不正确' })
  @MaxLength(200, { message: 'note 最长 200 字' })
  note?: string;
}

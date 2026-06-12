import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// 管理员充值:delta 为正整数(只加不减),note 可选备注。
export class GrantCreditsDto {
  @IsInt({ message: 'delta 必须为整数' })
  @Min(1, { message: 'delta 必须为正整数' })
  delta: number;

  @IsOptional()
  @IsString({ message: 'note 必须为字符串' })
  note?: string;
}

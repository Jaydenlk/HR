import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// 管理员充值:delta 为正整数(只加不减,上限 10000 防手滑多个零),note 可选备注(上限 200 字符)。
export class GrantCreditsDto {
  @IsInt({ message: 'delta 必须为整数' })
  @Min(1, { message: 'delta 必须为正整数' })
  @Max(10000, { message: 'delta 不能超过 10000' })
  delta: number;

  @IsOptional()
  @IsString({ message: 'note 必须为字符串' })
  @MaxLength(200, { message: 'note 不能超过 200 字符' })
  note?: string;
}

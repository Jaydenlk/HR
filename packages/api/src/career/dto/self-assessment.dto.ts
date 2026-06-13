import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// 单条技能自评:skill_name 非空(上限 100 字符防脏数据),self_score 0-10 整数(与量程一致)。
export class SelfAssessmentItemDto {
  @IsString({ message: 'skill_name 必须为字符串' })
  @MinLength(1, { message: 'skill_name 不能为空' })
  @MaxLength(100, { message: 'skill_name 不能超过 100 字符' })
  skill_name: string;

  @IsInt({ message: 'self_score 必须为整数' })
  @Min(0, { message: 'self_score 不能小于 0' })
  @Max(10, { message: 'self_score 不能大于 10' })
  self_score: number;
}

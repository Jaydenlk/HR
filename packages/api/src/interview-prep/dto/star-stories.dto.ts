import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  ArrayMinSize,
} from 'class-validator';

const COMPETENCIES = [
  '问题解决',
  '领导力',
  '协作影响',
  '主动创新',
  '逆境应对',
  '数据驱动',
  '客户中心',
  '自我学习',
] as const;

const JOB_TYPES = ['tech', 'product', 'ops', 'sales', 'general'] as const;

/** behavioral-story-builder 输入：从用户经历提炼 STAR 故事库 */
export class StarStoriesDto {
  /**
   * 用户工作经历原文（每段一个经历）。STAR 故事的所有事实与量化结果
   * 必须来自这些原文，服务端 guard 会据此剔除编造的数字。
   */
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要提供 1 段工作经历' })
  @IsString({ each: true })
  experiences: string[];

  /** 希望重点覆盖的能力维度 */
  @IsArray()
  @IsOptional()
  @IsIn(COMPETENCIES, { each: true })
  target_competencies?: string[];

  /** 目标岗位类型，用于判断各维度重要性权重 */
  @IsOptional()
  @IsIn(JOB_TYPES)
  target_job_type?: (typeof JOB_TYPES)[number];
}

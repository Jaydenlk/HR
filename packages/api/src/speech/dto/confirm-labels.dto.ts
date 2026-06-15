import { IsArray, IsIn, IsInt, Min, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 单段角色纠正项:仅承载 idx + speaker。
 * 防篡改铁律(规格 §5):confirm 端点只接受 speaker,text 一律以服务端 segments_json 为准——
 * 故此 DTO 刻意不含 text/startMs/endMs,客户端无从改写转写正文。
 */
export class LabelCorrectionDto {
  /** 目标段在服务端 segments_json 中的下标;service 层再做越界/缺/多 → 400 的最终校验。 */
  @IsInt()
  @Min(0)
  idx: number;

  /** 纠正后的角色;漂移值在 DTO 层即被 @IsIn 拦下,绝不进库。 */
  @IsIn(['interviewer', 'candidate'])
  speaker: 'interviewer' | 'candidate';
}

/**
 * PATCH /interviews/:id/transcribe/:taskId/confirm 入参。
 * 用户在复盘页逐段切换/批量反转角色后提交;service 按 idx 覆盖 speaker 后触发 analyze。
 */
export class ConfirmLabelsDto {
  @IsArray()
  @ArrayNotEmpty({ message: '请至少提交一段角色标注' })
  // each:true 对数组每个元素递归校验;@Type 提供 class-transformer 反序列化为 LabelCorrectionDto。
  @ValidateNested({ each: true })
  @Type(() => LabelCorrectionDto)
  segments: LabelCorrectionDto[];
}

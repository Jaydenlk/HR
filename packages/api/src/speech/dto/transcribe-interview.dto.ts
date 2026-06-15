import { IsIn } from 'class-validator';

/**
 * 上传面试录音转写的入参(multipart/form-data 的非文件字段)。
 * 隐私铁律(规格 §6):上传必须强制勾选《录音上传与隐私条款》——
 * 前端复选框勾上才发请求,FormData 带 consent='true';后端用 @IsIn(['true'])
 * 硬校验,缺失/非 'true' → 400 不进任何转写流程,音频字节不进 StepFun。
 *
 * 仅接受字符串字面量 'true':multipart 字段全是字符串,不存在布尔型;
 * 用 @IsIn(['true']) 而非 @IsBoolean 避免 'false'/空串/'1' 等被误放行。
 */
export class TranscribeInterviewDto {
  @IsIn(['true'], { message: '必须勾选并同意《录音上传与隐私条款》后才能上传录音' })
  consent: 'true';
}

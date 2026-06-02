import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  title: string;

  // 文本粘贴路径走此字段;文件上传路径 raw_text 不传(由文件解析得到),
  // 故保持可选,但一旦提供就强制最小长度。最终正文长度由 controller 在
  // 解析出 rawText 后统一兜底校验(覆盖文件路径),与 diagnoses 侧 30 字口径一致。
  @IsString()
  @IsOptional()
  @MinLength(30, { message: '简历内容至少需要 30 字，请粘贴包含完整工作经历和技能的简历正文' })
  raw_text?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  is_primary?: boolean;
}

import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDiagnosisDto {
  @IsUUID()
  resume_id: string;

  @IsString()
  @MinLength(50, { message: 'JD 文本至少需要 50 字，包含岗位职责和要求' })
  jd_text: string;
}

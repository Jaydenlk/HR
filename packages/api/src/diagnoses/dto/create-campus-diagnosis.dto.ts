import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCampusDiagnosisDto {
  @IsUUID()
  resume_id: string;

  @IsString()
  profession: string;

  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'JD 如填写则至少 50 字' })
  jd_text?: string;
}

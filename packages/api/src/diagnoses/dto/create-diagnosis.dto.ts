import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDiagnosisDto {
  @IsUUID()
  resume_id: string;

  @IsString()
  @MinLength(10)
  jd_text: string;
}

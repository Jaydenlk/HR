import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ProfessionTier } from '../../common/types';

export class CreateCampusDiagnosisDto {
  @IsUUID()
  resume_id: string;

  @IsString()
  profession: string;

  @IsOptional()
  @IsIn(['standard', 'pressure'])
  tier?: ProfessionTier;

  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'JD 如填写则至少 50 字' })
  jd_text?: string;
}

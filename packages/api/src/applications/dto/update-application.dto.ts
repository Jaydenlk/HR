import { IsString, IsOptional, IsIn } from 'class-validator';
import type { ApplicationStage } from '../entities/application.entity';

const STAGES: ApplicationStage[] = ['wishlist', 'applied', 'interview', 'final', 'offer', 'rejected'];

export class UpdateApplicationDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsIn(STAGES)
  @IsOptional()
  stage?: ApplicationStage;

  @IsString()
  @IsOptional()
  salary_range?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  resume_id?: string;

  @IsString()
  @IsOptional()
  diagnosis_id?: string;
}

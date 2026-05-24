import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';
import type { ApplicationStage } from '../entities/application.entity';

const STAGES: ApplicationStage[] = ['wishlist', 'applied', 'interview', 'final', 'offer', 'rejected'];

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  company: string;

  @IsString()
  @MinLength(1)
  role: string;

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

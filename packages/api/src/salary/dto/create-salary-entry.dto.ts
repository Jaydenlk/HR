import { IsString, IsNumber, IsOptional, MinLength } from 'class-validator';

export class CreateSalaryEntryDto {
  @IsString()
  @MinLength(1)
  company: string;

  @IsString()
  @MinLength(1)
  role: string;

  @IsNumber()
  base_salary: number;

  @IsNumber()
  total_comp: number;

  @IsNumber()
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @IsOptional()
  stock_value?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  source?: 'self' | 'peer';
}

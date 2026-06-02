import { IsString, IsNumber, IsPositive, IsOptional, IsIn, Min, MinLength } from 'class-validator';
import { IsNotGreaterThan } from './is-not-greater-than.validator';

// Sources a user may submit. 'market' is system-only (seed data) and is
// deliberately excluded so callers cannot inject pool records.
const USER_SOURCES = ['self', 'peer'] as const;
type UserSource = (typeof USER_SOURCES)[number];

export class CreateSalaryEntryDto {
  @IsString()
  @MinLength(1)
  company: string;

  @IsString()
  @MinLength(1)
  role: string;

  @IsNumber()
  @IsPositive()
  @IsNotGreaterThan('total_comp')
  base_salary: number;

  @IsNumber()
  @IsPositive()
  total_comp: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_value?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsIn(USER_SOURCES)
  @IsOptional()
  source?: UserSource;
}

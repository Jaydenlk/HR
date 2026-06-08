import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OfferWeightsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  compensation?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  growth?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  stability?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  work_life_balance?: number;
}

export class OfferItemDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  company: string;

  /** 月薪（元） */
  @IsNumber()
  @Min(0)
  base_monthly: number;

  /** 年薪月数（如 13、14、15），默认 12 */
  @IsNumber()
  @Min(1)
  @IsOptional()
  months_per_year?: number;

  /** 年终奖（元），未知时省略 */
  @IsNumber()
  @Min(0)
  @IsOptional()
  annual_bonus?: number;

  /** 城市 */
  @IsString()
  @IsOptional()
  city?: string;

  /** 职级 */
  @IsString()
  @IsOptional()
  level?: string;

  /** 周工时，未知时省略（影响 hourly_rate） */
  @IsNumber()
  @Min(1)
  @IsOptional()
  weekly_hours?: number;

  /** 试用期折扣比例（0~1），如 0.8 = 8折，未知省略 */
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  probation_discount?: number;

  /** 试用期月数，未知省略 */
  @IsNumber()
  @Min(0)
  @IsOptional()
  probation_months?: number;

  /** 五险一金公司部分月缴（元），未知省略 */
  @IsNumber()
  @Min(0)
  @IsOptional()
  social_insurance_monthly?: number;

  /** RSU/期权年均价值（元），未知省略 */
  @IsNumber()
  @Min(0)
  @IsOptional()
  equity_annual?: number;

  /** 股票类型（A股/港股/美股/虚拟股/期权） */
  @IsString()
  @IsOptional()
  equity_type?: string;

  /** 其他补充描述 */
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompareOffersDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'Offer 比对至少需要 2 个 offer，当前只有 1 个或为空' })
  @ValidateNested({ each: true })
  @Type(() => OfferItemDto)
  offers: OfferItemDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => OfferWeightsDto)
  @IsOptional()
  weights?: OfferWeightsDto;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @IsOptional()
  user_priorities?: string[];
}

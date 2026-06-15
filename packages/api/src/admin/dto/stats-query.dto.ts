import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 入参:按日聚合统计查询(GET /admin/ops-stats、GET /admin/success-stats)。
// days 范围 1~90,防止拉取过长时间窗口导致全表扫描(有索引但量大时仍有代价)。
export class StatsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days 必须为整数' })
  @Min(1, { message: 'days 最小为 1' })
  @Max(90, { message: 'days 最大为 90' })
  days?: number;
}

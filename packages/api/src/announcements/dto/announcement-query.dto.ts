import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 入参:公告列表分页(GET /announcements)。
// service 层另行 clamp(默认 20、上限 50),此处 @Max/@Min 提前拦截非法值。
export class AnnouncementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 最小为 1' })
  @Max(50, { message: 'limit 最大为 50' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset 必须为整数' })
  @Min(0, { message: 'offset 最小为 0' })
  offset?: number;
}

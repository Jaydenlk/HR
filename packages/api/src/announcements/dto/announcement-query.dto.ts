import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { AnnouncementDisplayType } from '../entities/announcement.entity';

const ANNOUNCEMENT_DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];

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

  // 可选:按展示形态过滤(banner/modal)。不传则返全部,前端按 display_type 自行分流。
  @IsOptional()
  @IsIn(ANNOUNCEMENT_DISPLAY_TYPES, {
    message: 'placement 只能是 banner/modal',
  })
  placement?: AnnouncementDisplayType;
}

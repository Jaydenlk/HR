import { Controller, Get, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';

// 公开端公告:无守卫(登录/未登录均可读),只返 active 的,出站走响应 DTO 白名单。
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  async list(@Query() query: AnnouncementQueryDto): Promise<AnnouncementResponseDto[]> {
    const items = await this.announcements.findActive(
      query.limit,
      query.offset,
      query.placement,
    );
    return items.map(AnnouncementResponseDto.fromPublic);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';

// 管理后台公告:全部端点经 JwtAuthGuard(认证)+ AdminGuard(role==='admin')。
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  // 全部公告(含已下架),供后台管理。
  @Get()
  async list(): Promise<AnnouncementResponseDto[]> {
    const items = await this.announcements.findAll();
    return items.map(AnnouncementResponseDto.from);
  }

  // 发布公告。
  @Post()
  async create(@Body() dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const item = await this.announcements.create(dto);
    return AnnouncementResponseDto.from(item);
  }

  // 改公告(含下架:active=false)。
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const item = await this.announcements.update(id, dto);
    return AnnouncementResponseDto.from(item);
  }

  // 删除公告(硬删)。成功返回 204。
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.announcements.remove(id);
  }
}

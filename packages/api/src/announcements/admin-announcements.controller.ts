import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementGeneratorService } from './announcement-generator.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { GenerateAnnouncementDto } from './dto/generate-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import type { AnnouncementStatus } from './entities/announcement.entity';

const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ['draft', 'published'];

// 管理后台公告:全部端点经 JwtAuthGuard(认证)+ AdminGuard(role==='admin')。
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnnouncementsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly generator: AnnouncementGeneratorService,
  ) {}

  // 全部公告(含草稿/已下架),供后台管理。可选 ?status=draft|published 过滤(前端 tab)。
  @Get()
  async list(@Query('status') status?: string): Promise<AnnouncementResponseDto[]> {
    const filter = this.parseStatus(status);
    const items = await this.announcements.findAll(filter);
    return items.map(AnnouncementResponseDto.from);
  }

  // AI 起草「最近更新」公告:据管理员粘贴的要点生成,保存为草稿(status='draft',公开端绝不可见)。
  @Post('generate')
  async generate(
    @Body() dto: GenerateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    const item = await this.generator.generateDraft(dto);
    return AnnouncementResponseDto.from(item);
  }

  // 发布/暂存公告(active=true 即发布,false 即暂存草稿)。
  @Post()
  async create(@Body() dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const item = await this.announcements.create(dto);
    return AnnouncementResponseDto.from(item);
  }

  // 改公告(含草稿发布:status='published';下架:active=false;改 CTA 字段)。
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

  // ?status 过滤:未传 → undefined(返全部);合法 → 收窄;非法 → 400。
  private parseStatus(status?: string): AnnouncementStatus | undefined {
    if (status === undefined || status === '') return undefined;
    if (!ANNOUNCEMENT_STATUSES.includes(status as AnnouncementStatus)) {
      throw new BadRequestException('status 只能是 draft/published');
    }
    return status as AnnouncementStatus;
  }
}

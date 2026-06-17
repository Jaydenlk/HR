import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import type { AnnouncementDisplayType } from '../entities/announcement.entity';

const ANNOUNCEMENT_DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];

// 入参:AI 起草「最近更新」公告(POST /admin/announcements/generate)。
// source_content 是管理员粘贴的本次更新要点(每行一条),AI 的唯一事实源——
// 严禁编造要点之外的功能。preferred_display_type 是展示形态倾向(横幅/弹窗)。
export class GenerateAnnouncementDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'source_content 必须为字符串' })
  @IsNotEmpty({ message: 'source_content 不能为空' })
  source_content: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_DISPLAY_TYPES, {
    message: 'preferred_display_type 只能是 banner/modal',
  })
  preferred_display_type?: AnnouncementDisplayType;
}

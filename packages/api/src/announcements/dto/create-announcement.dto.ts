import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import type {
  AnnouncementDisplayType,
  AnnouncementKind,
} from '../entities/announcement.entity';

// 公告种类白名单,与实体 AnnouncementKind 保持一致。
const ANNOUNCEMENT_KINDS: AnnouncementKind[] = ['feature', 'fix', 'maintenance'];

// 展示形态白名单,与实体 AnnouncementDisplayType 保持一致。
const ANNOUNCEMENT_DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];

// 管理后台发布公告:title/body 必填,kind 可选(默认 feature),active 可选(默认上架)。
export class CreateAnnouncementDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'title 必须为字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'body 必须为字符串' })
  @IsNotEmpty({ message: 'body 不能为空' })
  body: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_KINDS, { message: 'kind 只能是 feature/fix/maintenance' })
  kind?: AnnouncementKind;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_DISPLAY_TYPES, {
    message: 'display_type 只能是 banner/modal',
  })
  display_type?: AnnouncementDisplayType;

  @IsOptional()
  @IsBoolean({ message: 'active 必须为布尔值' })
  active?: boolean;
}

import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type {
  AnnouncementDisplayType,
  AnnouncementKind,
  AnnouncementStatus,
} from '../entities/announcement.entity';

const ANNOUNCEMENT_KINDS: AnnouncementKind[] = ['feature', 'fix', 'maintenance'];
const ANNOUNCEMENT_DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];
const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ['draft', 'published'];

// CTA 跳转路径:只允许站内相对路径(以单个 / 开头,排除 //evil.com 协议相对 URL),防开放重定向。
const INTERNAL_PATH = /^\/(?!\/)/;

// 管理后台改公告:全部字段可选,只更新传入项;active=false 即下架。
export class UpdateAnnouncementDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'title 必须为字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'body 必须为字符串' })
  @IsNotEmpty({ message: 'body 不能为空' })
  body?: string;

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

  // 审核状态流转:draft → published(service 据此设 published_at + active=true)。
  @IsOptional()
  @IsIn(ANNOUNCEMENT_STATUSES, { message: 'status 只能是 draft/published' })
  status?: AnnouncementStatus;

  // ── 引导按钮(CTA),全部可选 ────────────────────────────────────────────────
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'cta_label 必须为字符串' })
  cta_label?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'cta_href 必须为字符串' })
  @Matches(INTERNAL_PATH, { message: 'cta_href 必须为站内路径(以 / 开头)' })
  cta_href?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'cta_tour_id 必须为字符串' })
  cta_tour_id?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'feature_key 必须为字符串' })
  feature_key?: string;
}

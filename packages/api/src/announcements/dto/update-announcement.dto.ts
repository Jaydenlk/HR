import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import type { AnnouncementKind } from '../entities/announcement.entity';

const ANNOUNCEMENT_KINDS: AnnouncementKind[] = ['feature', 'fix', 'maintenance'];

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
  @IsBoolean({ message: 'active 必须为布尔值' })
  active?: boolean;
}

import {
  Announcement,
  AnnouncementDisplayType,
  AnnouncementKind,
} from '../entities/announcement.entity';

// 出参:公开端公告记录(GET /announcements)。
// 出站白名单:逐字段手工映射,绝不透传实体,杜绝意外字段泄漏。
export class AnnouncementResponseDto {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  display_type: AnnouncementDisplayType;
  active: boolean;
  created_at: Date;
  published_at: Date | null;

  static from(item: Announcement): AnnouncementResponseDto {
    const dto = new AnnouncementResponseDto();
    dto.id = item.id;
    dto.title = item.title;
    dto.body = item.body;
    dto.kind = item.kind;
    dto.display_type = item.display_type;
    dto.active = item.active;
    dto.created_at = item.created_at;
    dto.published_at = item.published_at ?? null;
    return dto;
  }
}

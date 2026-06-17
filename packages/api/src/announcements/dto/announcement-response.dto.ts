import {
  Announcement,
  AnnouncementDisplayType,
  AnnouncementKind,
  AnnouncementStatus,
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
  // 审核状态:仅管理端(from)填充;公开端(fromPublic)不填 → undefined 不入 JSON,匿名客户端见不到内部审核词汇。
  status?: AnnouncementStatus;
  cta_label: string | null;
  cta_href: string | null;
  cta_tour_id: string | null;
  feature_key: string | null;

  // 公开端工厂(GET /announcements):不含 status——公开端只读 published,审核词汇对匿名客户端无消费需求。
  static fromPublic(item: Announcement): AnnouncementResponseDto {
    const dto = new AnnouncementResponseDto();
    dto.id = item.id;
    dto.title = item.title;
    dto.body = item.body;
    dto.kind = item.kind;
    dto.display_type = item.display_type;
    dto.active = item.active;
    dto.created_at = item.created_at;
    dto.published_at = item.published_at ?? null;
    dto.cta_label = item.cta_label ?? null;
    dto.cta_href = item.cta_href ?? null;
    dto.cta_tour_id = item.cta_tour_id ?? null;
    dto.feature_key = item.feature_key ?? null;
    return dto;
  }

  // 管理端工厂(GET/POST/PATCH /admin/announcements):在公开端字段基础上补 status,供后台 tab/草稿计数/发布判断。
  static from(item: Announcement): AnnouncementResponseDto {
    const dto = AnnouncementResponseDto.fromPublic(item);
    dto.status = item.status;
    return dto;
  }
}

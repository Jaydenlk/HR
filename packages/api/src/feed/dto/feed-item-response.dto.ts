import { FeedItem } from '../entities/feed-item.entity';
import type { FeedCategory, FeedSourceKind } from '../types/feed.types';

/**
 * Public-facing community feed record. The feed is an intentionally
 * cross-user shared dataset, so every record returned here is stripped of
 * the submitter's identity — the `user`/`user_id` relation NEVER leaves the
 * API. No email, no real name, no invite code, no login IP / location.
 *
 * The only "author" surfaced is the non-PII `author` field, which holds
 * public platform handles for externally imported items (e.g. a 小红书
 * nickname) and is `null` for user submissions — UGC posts therefore render
 * as anonymous (the frontend falls back to `source_name` / "用户投稿").
 */
export class FeedItemResponseDto {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  company: string | null;
  role: string | null;
  outcome: string | null;
  source_kind: FeedSourceKind;
  source_name: string | null;
  category: FeedCategory;
  source_url: string | null;
  author: string | null;
  quality_score: number;
  published_at: Date | null;
  fetched_at: Date | null;
  created_at: Date;
  date_confidence: FeedItem['date_confidence'];

  static from(item: FeedItem): FeedItemResponseDto {
    const dto = new FeedItemResponseDto();
    dto.id = item.id;
    dto.title = item.title;
    dto.content = item.content;
    dto.summary = item.summary ?? null;
    dto.company = item.company ?? null;
    dto.role = item.role ?? null;
    dto.outcome = item.outcome ?? null;
    dto.source_kind = item.source_kind;
    dto.source_name = item.source_name ?? null;
    dto.category = item.category;
    dto.source_url = item.source_url ?? null;
    dto.author = item.author ?? null;
    dto.quality_score = item.quality_score;
    dto.published_at = item.published_at ?? null;
    dto.fetched_at = item.fetched_at ?? null;
    dto.created_at = item.created_at;
    dto.date_confidence = item.date_confidence;
    return dto;
  }
}

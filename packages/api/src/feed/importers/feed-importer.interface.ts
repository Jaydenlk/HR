import { FeedSource } from '../entities/feed-source.entity';
import type { FeedSourceKind } from '../types/feed.types';

export interface FeedCandidate {
  source_kind: FeedSourceKind;
  source_name: string;
  source_url: string;
  external_id: string;
  title: string;
  content: string;
  author: string | null;
  published_at: Date | null;
  date_confidence: 'high' | 'medium' | 'low' | 'unknown';
  fetched_at: Date;
  raw: Record<string, unknown>;
}

export interface FeedImporter {
  readonly kind: FeedSourceKind;
  fetch(source: FeedSource, keyword?: string): Promise<FeedCandidate[]>;
}


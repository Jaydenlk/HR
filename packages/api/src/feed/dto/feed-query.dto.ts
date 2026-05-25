import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FEED_CATEGORIES, FEED_SOURCE_KINDS } from '../types/feed.types';
import type { FeedCategory, FeedSourceKind } from '../types/feed.types';

export class FeedQueryDto {
  @IsOptional()
  @IsIn([...FEED_CATEGORIES])
  category?: FeedCategory;

  @IsOptional()
  @IsIn([...FEED_SOURCE_KINDS])
  source_kind?: FeedSourceKind;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}


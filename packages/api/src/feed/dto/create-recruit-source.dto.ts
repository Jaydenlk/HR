import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RECRUIT_INTEL_SOURCE_KINDS } from '../types/feed.types';
import type { RecruitIntelSourceKind } from '../types/feed.types';

/**
 * 校招情报三类源(sheet_file/sheet_link/wechat_dump)由管理员在 /digest 供给页手动创建,
 * 不走 digest_sources.json 种子机制;其余既有 kind(xhs/nowcoder/wechat/blog/ugc/coach)
 * 不通过本端点创建,避免与种子/UGC 既有通道混用。
 */
export class CreateRecruitSourceDto {
  @IsIn(RECRUIT_INTEL_SOURCE_KINDS)
  kind: RecruitIntelSourceKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** sheet_link 用来存放腾讯文档/飞书链接；其余类型可留空。 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homepage_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  Announcement,
  AnnouncementDisplayType,
} from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

// 分页默认/上限:与 AnnouncementQueryDto 的 @Max 一致,service 层兜底强制 clamp。
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// 公开端可见窗口:发布后 3 天。计算式过滤(now ≤ published_at + 3 天),不落 expires 列。
const VISIBLE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {}

  // 公开端:仅 active 且发布后 ≤3 天的公告,发布时间倒序。
  // 3 天窗口为计算式:published_at ≥ now - 3 天。published_at 为空(从未上架)的不返。
  // 可选 placement 过滤(banner/modal);不传则返全部,前端按 display_type 自行分流。
  // limit/offset 在此 clamp,无论入参如何都不越界。
  findActive(
    limit?: number,
    offset?: number,
    placement?: AnnouncementDisplayType,
  ): Promise<Announcement[]> {
    const take = this.clampLimit(limit);
    const skip = this.clampOffset(offset);
    const since = new Date(Date.now() - VISIBLE_WINDOW_MS);
    return this.repo.find({
      where: {
        active: true,
        published_at: MoreThanOrEqual(since),
        ...(placement ? { display_type: placement } : {}),
      },
      order: { published_at: 'DESC', created_at: 'DESC' },
      take,
      skip,
    });
  }

  // 管理后台:全部公告(含已下架),创建时间倒序。
  findAll(): Promise<Announcement[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  // 管理后台:发布公告。active 默认 true;active 为 true 时 published_at 取当前时间(3 天窗口起点)。
  create(dto: CreateAnnouncementDto): Promise<Announcement> {
    const active = dto.active ?? true;
    const entity = this.repo.create({
      title: dto.title,
      body: dto.body,
      kind: dto.kind ?? 'feature',
      display_type: dto.display_type ?? 'banner',
      active,
      published_at: active ? new Date() : null,
    });
    return this.repo.save(entity);
  }

  // 管理后台:改公告。只更新传入字段。
  // published_at 刷新时机:更新后处于 active 状态即刷新(再发布/编辑视为重新开始 3 天窗口);
  // 下架(active=false)不动 published_at(保留历史发布点)。
  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) {
      throw new NotFoundException('公告不存在');
    }
    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.body !== undefined) existing.body = dto.body;
    if (dto.kind !== undefined) existing.kind = dto.kind;
    if (dto.display_type !== undefined) existing.display_type = dto.display_type;
    if (dto.active !== undefined) existing.active = dto.active;
    // 更新后仍上架 → 刷新发布点,重新计 3 天窗口;已下架则保留旧 published_at。
    if (existing.active) {
      existing.published_at = new Date();
    }
    return this.repo.save(existing);
  }

  // 管理后台:删除公告(硬删)。下架用 PATCH active=false,删除是彻底移除。
  async remove(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('公告不存在');
    }
  }

  private clampLimit(limit?: number): number {
    if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIMIT;
    return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
  }

  private clampOffset(offset?: number): number {
    if (offset === undefined || Number.isNaN(offset)) return 0;
    return Math.max(Math.trunc(offset), 0);
  }
}

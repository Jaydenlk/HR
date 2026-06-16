import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

// 分页默认/上限:与 AnnouncementQueryDto 的 @Max 一致,service 层兜底强制 clamp。
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {}

  // 公开端:仅 active 公告,发布时间倒序(空发布时间退化到创建时间排序由 created_at 兜底)。
  // limit/offset 在此 clamp,无论入参如何都不越界。
  findActive(limit?: number, offset?: number): Promise<Announcement[]> {
    const take = this.clampLimit(limit);
    const skip = this.clampOffset(offset);
    return this.repo.find({
      where: { active: true },
      order: { published_at: 'DESC', created_at: 'DESC' },
      take,
      skip,
    });
  }

  // 管理后台:全部公告(含已下架),创建时间倒序。
  findAll(): Promise<Announcement[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  // 管理后台:发布公告。active 默认 true;active 为 true 时 published_at 取当前时间。
  create(dto: CreateAnnouncementDto): Promise<Announcement> {
    const active = dto.active ?? true;
    const entity = this.repo.create({
      title: dto.title,
      body: dto.body,
      kind: dto.kind ?? 'feature',
      active,
      published_at: active ? new Date() : null,
    });
    return this.repo.save(entity);
  }

  // 管理后台:改公告。只更新传入字段;active 由 false→true 时补 published_at(首次/再次上架记发布点)。
  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) {
      throw new NotFoundException('公告不存在');
    }
    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.body !== undefined) existing.body = dto.body;
    if (dto.kind !== undefined) existing.kind = dto.kind;
    if (dto.active !== undefined) {
      if (dto.active && !existing.active) {
        existing.published_at = new Date();
      }
      existing.active = dto.active;
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

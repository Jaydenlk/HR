import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { User } from '../users/entities/user.entity';
import { InviteCode } from '../invites/entities/invite-code.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

// 管理后台返回的用户行:实体字段 + 今日/累计 AI 调用次数。
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  daily_quota_override: number | null;
  created_at: Date;
  usage_today: number;
  usage_total: number;
}

// 用量概览:近 7 日每日总数 + 今日 per-user 明细。
export interface AdminUsageOverview {
  daily: { date: string; count: number }[];
  today_by_user: { user_id: string; email: string; name: string; count: number }[];
}

@Injectable()
export class AdminService {
  constructor(
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    @InjectRepository(AiUsage) private readonly usageRepo: Repository<AiUsage>,
  ) {}

  // 全量用户 + 各自今日/累计调用次数。20 人规模:逐用户计数可接受。
  async listUsers(): Promise<AdminUserRow[]> {
    const all = await this.users.findAll();
    const startToday = this.startOfLocalDay(new Date());
    return Promise.all(
      all.map(async (u) => {
        const usageToday = await this.usageRepo.count({
          where: { user_id: u.id, created_at: MoreThanOrEqual(startToday) },
        });
        const usageTotal = await this.usageRepo.count({ where: { user_id: u.id } });
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          daily_quota_override: u.daily_quota_override,
          created_at: u.created_at,
          usage_today: usageToday,
          usage_total: usageTotal,
        };
      }),
    );
  }

  // 改用户:禁止把自己改成非 admin 或封禁自己。
  async updateUser(actingUserId: string, targetId: string, dto: UpdateUserDto): Promise<User> {
    if (targetId === actingUserId) {
      if (dto.role === 'user') {
        throw new BadRequestException('不能撤销自己的管理员权限');
      }
      if (dto.status === 'banned') {
        throw new BadRequestException('不能封禁自己');
      }
    }
    if (dto.status === undefined && dto.role === undefined && dto.daily_quota_override === undefined) {
      throw new BadRequestException('请至少修改一项');
    }
    const patch: Partial<Pick<User, 'status' | 'role' | 'daily_quota_override'>> = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.daily_quota_override !== undefined) {
      patch.daily_quota_override = dto.daily_quota_override;
    }
    const updated = await this.users.updateById(targetId, patch);
    if (!updated) {
      throw new NotFoundException('用户不存在');
    }
    return updated;
  }

  listInvites(): Promise<InviteCode[]> {
    return this.invites.findAll();
  }

  createInvite(dto: CreateInviteDto): Promise<InviteCode> {
    return this.invites.create(dto.code, dto.max_uses);
  }

  async updateInvite(id: string, disabled: boolean): Promise<InviteCode> {
    const updated = await this.invites.setDisabled(id, disabled);
    if (!updated) {
      throw new NotFoundException('邀请码不存在');
    }
    return updated;
  }

  // 用量概览:近 7 日每日总数(本地时区)+ 今日 per-user 明细。
  async usageOverview(): Promise<AdminUsageOverview> {
    const now = new Date();
    const daily: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = this.startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999);
      const count = await this.usageRepo.count({
        where: { created_at: Between(dayStart, dayEnd) },
      });
      daily.push({ date: this.formatDate(dayStart), count });
    }

    // 今日 per-user 明细:取今日有调用的用户,关联邮箱/姓名。
    const startToday = this.startOfLocalDay(now);
    const todayRows = await this.usageRepo.find({
      where: { created_at: MoreThanOrEqual(startToday) },
    });
    const countByUser = new Map<string, number>();
    for (const row of todayRows) {
      countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
    }
    const allUsers = await this.users.findAll();
    const userById = new Map(allUsers.map((u) => [u.id, u]));
    const todayByUser = [...countByUser.entries()]
      .map(([userId, count]) => {
        const u = userById.get(userId);
        return {
          user_id: userId,
          email: u?.email ?? '(已删除)',
          name: u?.name ?? '',
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    return { daily, today_by_user: todayByUser };
  }

  // 本地时区某日 00:00:00.000。
  private startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  // YYYY-MM-DD(本地时区)。
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

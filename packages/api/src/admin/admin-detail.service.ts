import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreditService } from '../credit/credit.service';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import {
  AdminUserDetailResponseDto,
  AdminUserDailyUsage,
} from './dto/admin-user-detail-response.dto';
import {
  AdminCreditTxResponseDto,
  AdminCreditHistoryResponse,
} from './dto/admin-credit-tx-response.dto';

// ============================================================
// 波1 块A 新增:管理后台用户详情 + 充值/消耗流水。
// 独立 service,不触碰热点 admin.service.ts —— 波2 集成时在 AdminModule 注册 provider,
// 在 AdminController 接两个端点(见文件尾「波2 接线点」注释)。
//
// 数据隔离红线(每个新端点强制):
//  - 守卫:端点继承 AdminController 级 @UseGuards(JwtAuthGuard, AdminGuard)(波2 接线时无需额外加)。
//  - 出站 DTO 字段白名单:userDetail → AdminUserDetailResponseDto.from(投影,无 PII 无 token);
//    creditHistory → AdminCreditTxResponseDto.fromMany(仅账务字段,无正文)。
//  - 分页 clamp:creditHistory 缺省 50、硬上限 200(DTO @Max(200) 前置 + 本 service 兜底双防线)。
//  - 参数绑定:findById 主键查询(TypeORM 参数化);usage 计数用 Repository where 对象绑定。
//    畸形 :id 由 controller 的 ParseUUIDPipe 在波2接线时挡下(400 不穿 DB)。
// ============================================================
@Injectable()
export class AdminDetailService {
  // SQLite(开发/测试)与 Postgres(生产)的按日聚合表达式不同,启动期定一次。
  private readonly isPostgres: boolean;

  // 充值/消耗流水分页:缺省条数(流水量大,小于全局 MAX)。
  private static readonly DEFAULT_CREDIT_PAGE_SIZE = 50;
  // 服务端硬上限:任何分页请求最多取 200 条(与 AdminService.MAX_PAGE_SIZE 同口径)。
  private static readonly MAX_PAGE_SIZE = 200;

  constructor(
    private readonly users: UsersService,
    private readonly credit: CreditService,
    private readonly dataSource: DataSource,
    @InjectRepository(AiUsage) private readonly usageRepo: Repository<AiUsage>,
  ) {
    this.isPostgres = this.dataSource.options.type === 'postgres';
  }

  // 用户详情:实体投影 + 今日/累计 AI 调用计数 + 近 7 日按日(UTC)调用趋势。
  // 不存在 → NotFoundException(404)。
  async userDetail(id: string): Promise<AdminUserDetailResponseDto> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const counts = await this.userUsageCounts(id);
    const daily = await this.dailyUsage(id);
    return AdminUserDetailResponseDto.from(user, counts, daily);
  }

  // 某用户今日/累计 AI 调用次数(ai_usage 计数,成功才写)。
  // Repository where 对象绑定(TypeORM 参数化),无注入面。
  private async userUsageCounts(
    userId: string,
  ): Promise<{ usage_today: number; usage_total: number }> {
    const startToday = this.startOfLocalDay(new Date());
    const usageToday = await this.usageRepo.count({
      where: { user_id: userId, created_at: MoreThanOrEqual(startToday) },
    });
    const usageTotal = await this.usageRepo.count({ where: { user_id: userId } });
    return { usage_today: usageToday, usage_total: usageTotal };
  }

  // 近 7 日按日(UTC)调用次数。DB 端 GROUP BY(dialect-aware),不把全表拉进进程。
  // 日期口径与 OpsEventsService.dailyStats / AdminService.countByUtcDate 一致(存储 UTC 值截前 10 位)。
  private async dailyUsage(userId: string): Promise<AdminUserDailyUsage[]> {
    const window = 7;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (window - 1));
    since.setUTCHours(0, 0, 0, 0);

    const dateExpr = this.isPostgres
      ? `to_char(u.created_at, 'YYYY-MM-DD')`
      : `strftime('%Y-%m-%d', u.created_at)`;
    const raw = await this.usageRepo
      .createQueryBuilder('u')
      .where('u.user_id = :userId', { userId })
      .andWhere('u.created_at >= :since', { since })
      .select(dateExpr, 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy(dateExpr)
      .getRawMany<{ date: string; count: string | number }>();

    const byDate = new Map<string, number>();
    for (const r of raw) {
      if (r.date) byDate.set(r.date, Number(r.count));
    }

    // 连续填充 7 天(含零值天),便于前端画趋势。i = window-1 downto 0(今日为 i=0)。
    const out: AdminUserDailyUsage[] = [];
    for (let i = window - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: byDate.get(key) ?? 0 });
    }
    return out;
  }

  // 充值/消耗流水分页(倒序)。先校验用户存在(404),再复用 CreditService.listTransactions
  //(已有 (user_id, created_at) 复合索引)。limit 缺省 50、硬上限 200;offset 兜底 ≥0。
  async creditHistory(
    id: string,
    limit?: number,
    offset?: number,
  ): Promise<AdminCreditHistoryResponse> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const take = this.clampPageSize(limit);
    const skip = this.clampOffset(offset);
    const { items, total } = await this.credit.listTransactions(id, take, skip);
    return { items: AdminCreditTxResponseDto.fromMany(items), total };
  }

  // 分页上限钳制:未传/越界 → 缺省 50;否则向下取整后钳到 [1, MAX_PAGE_SIZE]。
  private clampPageSize(limit?: number): number {
    if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
      return AdminDetailService.DEFAULT_CREDIT_PAGE_SIZE;
    }
    return Math.min(Math.floor(limit), AdminDetailService.MAX_PAGE_SIZE);
  }

  // offset 钳制:未传/非有限/负数 → 0;否则向下取整。
  private clampOffset(offset?: number): number {
    if (offset === undefined || !Number.isFinite(offset) || offset <= 0) {
      return 0;
    }
    return Math.floor(offset);
  }

  // 本地时区某日 00:00:00.000(与 AdminService.startOfLocalDay 同口径)。
  private startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
}

// ============================================================
// 波2 接线点(集成 agent 收口热点文件时按此接,本块A 不改这些文件):
//
// 1) packages/api/src/admin/admin.module.ts
//    - providers 加入 AdminDetailService
//    - imports 确认含 TypeOrmModule.forFeature([AiUsage])(listUsers 已用 AiUsage,通常已在)
//      及 CreditModule(导出 CreditService)、UsersModule(导出 UsersService)—— AdminModule 现有依赖应已覆盖。
//
// 2) packages/api/src/admin/admin.controller.ts
//    - 构造注入 private readonly detail: AdminDetailService
//    - 加两个端点(继承 controller 级 JwtAuthGuard+AdminGuard,无需额外守卫):
//
//      @Get('users/:id')
//      userDetail(@Param('id', ParseUUIDPipe) id: string) {
//        return this.detail.userDetail(id);
//      }
//
//      @Get('users/:id/credit-history')
//      creditHistory(
//        @Param('id', ParseUUIDPipe) id: string,
//        @Query() query: CreditHistoryQueryDto,
//      ) {
//        return this.detail.creditHistory(id, query.limit, query.offset);
//      }
//
//    - import: ParseUUIDPipe(@nestjs/common)、CreditHistoryQueryDto(./dto/credit-history-query.dto)
//    - 路由顺序:'users/:id' 须放在 'users'(GET)之后;且 'users/:id/credit-history' 更具体,
//      Nest 按声明匹配,把 credit-history 放在 'users/:id' 之前或之后均可(路径段不同不冲突)。
// ============================================================

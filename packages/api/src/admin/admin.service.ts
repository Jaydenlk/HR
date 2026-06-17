import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { AiProviderService } from '../ai/ai-provider.service';
import { AiService } from '../ai/ai.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { TestAiProviderDraftDto } from './dto/test-ai-provider.dto';
import {
  AdminAiProviderResponseDto,
  AdminAiProviderTestResponseDto,
} from './dto/admin-ai-provider-response.dto';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { CreditService } from '../credit/credit.service';
import { OpsEventsService, DailyStats } from '../ops/ops-events.service';
import { OpsEvent } from '../ops/entities/ops-event.entity';
import { HealthService } from '../health/health.service';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { CreditTransaction } from '../credit/entities/credit-transaction.entity';
import { User } from '../users/entities/user.entity';
import { InviteCode } from '../invites/entities/invite-code.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import {
  AdminActivityResponseDto,
  EndpointCallCount,
  EndpointCreditCount,
} from './dto/admin-activity-response.dto';
import { AdminErrorEventResponseDto } from './dto/admin-error-event-response.dto';
import { AdminRecentFailureResponseDto } from './dto/admin-recent-failure-response.dto';
import { AdminHealthResponseDto } from './dto/admin-health-response.dto';

// 管理后台返回的用户行:实体字段 + credit 余额 + 今日/累计 AI 调用次数 + 最近登录 IP/归属/时间。
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  credit_balance: number;
  created_at: Date;
  last_login_ip: string | null;
  last_login_province: string | null;
  last_login_city: string | null;
  last_login_at: Date | null;
  usage_today: number;
  usage_total: number;
}

// 用量概览:近 7 日每日总数 + 今日 per-user 明细。
export interface AdminUsageOverview {
  daily: { date: string; count: number }[];
  today_by_user: { user_id: string; email: string; name: string; count: number }[];
}

// 成功率趋势:按日(UTC 日期键,与 OpsEventsService.dailyStats 同口径)对齐成功/失败计数。
//  - success:ai_usage 当日成功调用行数(语义:成功才写)。
//  - failed:ops_events 中 AI 失败类(AI_FAILOVER + AI_BOTH_DOWN + AI_CALL_FAILED)当日计数。
//  - success_rate:success/(success+failed),分母为 0 时记 null(当日无任何 AI 活动)。
// 隐私铁律:纯计数,不含任何正文/用户标识。credit 扣点失败不计入此分母(单独指标)。
export interface AdminSuccessStatsRow {
  date: string;
  success: number;
  failed: number;
  success_rate: number | null;
}

@Injectable()
export class AdminService {
  // SQLite(开发/测试)与 Postgres(生产)的按日聚合表达式不同,启动期定一次。
  private readonly isPostgres: boolean;

  constructor(
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    private readonly credit: CreditService,
    private readonly opsEvents: OpsEventsService,
    private readonly health: HealthService,
    private readonly concurrency: ConcurrencyLimiter,
    private readonly dataSource: DataSource,
    private readonly aiProviders: AiProviderService,
    private readonly aiService: AiService,
    @InjectRepository(AiUsage) private readonly usageRepo: Repository<AiUsage>,
    @InjectRepository(CreditTransaction)
    private readonly creditTxRepo: Repository<CreditTransaction>,
  ) {
    this.isPostgres = this.dataSource.options.type === 'postgres';
  }

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
          credit_balance: u.credit_balance,
          created_at: u.created_at,
          last_login_ip: u.last_login_ip,
          last_login_province: u.last_login_province,
          last_login_city: u.last_login_city,
          last_login_at: u.last_login_at,
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
    if (dto.status === undefined && dto.role === undefined) {
      throw new BadRequestException('请至少修改一项');
    }
    const patch: Partial<Pick<User, 'status' | 'role'>> = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.role !== undefined) patch.role = dto.role;
    const updated = await this.users.updateById(targetId, patch);
    if (!updated) {
      throw new NotFoundException('用户不存在');
    }
    void this.opsEvents.record('ADMIN_ACTION', {
      actor: actingUserId,
      target: targetId,
      op: 'updateUser',
      patch,
    });
    return updated;
  }

  // 管理员充值:给目标用户加点(admin_grant,记充值管理员 id 与备注)。返回最新余额。
  async grantCredits(
    actingUserId: string,
    targetId: string,
    delta: number,
    note?: string,
  ): Promise<{ credit_balance: number }> {
    const target = await this.users.findById(targetId);
    if (!target) {
      throw new NotFoundException('用户不存在');
    }
    const balance = await this.credit.grant(targetId, delta, 'admin_grant', note, actingUserId);
    void this.opsEvents.record('ADMIN_ACTION', {
      actor: actingUserId,
      target: targetId,
      op: 'grantCredits',
      delta,
      note,
    });
    return { credit_balance: balance };
  }

  listInvites(): Promise<InviteCode[]> {
    return this.invites.findAll();
  }

  createInvite(dto: CreateInviteDto): Promise<InviteCode> {
    return this.invites.create(dto.code, dto.max_uses, dto.note);
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

  // ============================================================
  // Phase2 波2A 聚合方法
  // 全用 QueryBuilder + setParameter 参数绑定;分页 take 服务端 clamp ≤200;
  // 排序字段走枚举白名单;严禁 N+1(逐用户循环计数)。
  // 隐私铁律:user-activity 只返回计数级数据;ops_events.detail 经响应 DTO 白名单剔除 token/正文。
  // ============================================================

  // 服务端硬上限:任何分页请求最多取 200 条,DTO 的 @Max(200) 是前置防线,这里是最后兜底。
  private static readonly MAX_PAGE_SIZE = 200;

  // 错误/审计流水可见类型:AI 失败类 + 扣点失败 + 管理操作。正常运营类(失败外)也允许查看以便排障。
  private static readonly ERROR_STREAM_TYPES = [
    'AI_CALL_FAILED',
    'AI_FAILOVER',
    'AI_BOTH_DOWN',
    'CREDIT_CONSUME_FAILED',
    'QUEUE_FULL',
    'ADMIN_ACTION',
  ] as const;

  // 成功率分母中的「AI 失败」类型:只有真正的 AI 调用失败计入,扣点失败单独成指标不进此处。
  private static readonly AI_FAILURE_TYPES = [
    'AI_FAILOVER',
    'AI_BOTH_DOWN',
    'AI_CALL_FAILED',
  ] as const;

  // user-activity 排序枚举白名单(对应入参 DTO 的 orderBy):仅这两个字面量可被接受,杜绝 ORDER BY 注入。
  // 语义映射(GROUP BY endpoint 后无 created_at 列):'created_at' → 按 count 倒序(活跃度);'endpoint' → 按端点名升序。
  private static readonly ACTIVITY_ORDER_FIELDS = ['created_at', 'endpoint'] as const;

  // 运维事件流水(GET /admin/ops-events):取最近 N 条,detail 经响应 DTO 白名单过滤。
  async recentOpsEvents(limit?: number): Promise<AdminErrorEventResponseDto[]> {
    const take = this.clampPageSize(limit);
    const events = await this.opsEvents.recent(take);
    return AdminErrorEventResponseDto.fromMany(events);
  }

  // 运维事件按日聚合(GET /admin/ops-stats):直接复用 OpsEventsService.dailyStats。
  async opsStats(days?: number): Promise<DailyStats[]> {
    return this.opsEvents.dailyStats(days ?? 7);
  }

  // 平台健康快照(GET /admin/health-snapshot):DB 探活 + 并发护栏状态。
  // HealthService/ConcurrencyLimiter 由 2C 在 module 接线注入,这里按预期签名直接调用。
  async healthSnapshot(): Promise<AdminHealthResponseDto> {
    const report = await this.health.check();
    const queue = this.concurrency.status();
    return AdminHealthResponseDto.from(report, queue);
  }

  // 单用户活动明细(GET /admin/user-activity):仅计数,绝不含任何正文。
  //  - aiCallsByEndpoint:ai_usage GROUP BY endpoint(成功调用计数)。
  //  - creditConsumeByEndpoint:credit_transactions where type='consume' GROUP BY endpoint。
  // 用 QueryBuilder + setParameter 绑定 userId/时间窗口;单条 GROUP BY,无逐端点循环(无 N+1)。
  async userActivity(
    userId: string,
    from?: string,
    to?: string,
    orderBy?: 'created_at' | 'endpoint',
  ): Promise<AdminActivityResponseDto> {
    // 白名单兜底 + 语义映射:DTO 已校验枚举,这里把 created_at 翻译成「按 count 倒序」。
    const requested = AdminService.ACTIVITY_ORDER_FIELDS.includes(
      orderBy as (typeof AdminService.ACTIVITY_ORDER_FIELDS)[number],
    )
      ? orderBy
      : 'created_at';
    const order: 'count' | 'endpoint' = requested === 'endpoint' ? 'endpoint' : 'count';

    const fromDate = this.parseDate(from);
    // 'to' 含整天:'YYYY-MM-DD' 默认被解析成当日 00:00 UTC,会把结束日当天排除。
    // 以 endOfDay 把边界推到当日 23:59:59.999,使 <= :to 包含结束日全天。
    const toDate = this.parseDate(to, true);

    const aiCallsByEndpoint = await this.groupCountByEndpoint(
      this.usageRepo
        .createQueryBuilder('u')
        .select('u.endpoint', 'endpoint')
        .addSelect('COUNT(*)', 'count')
        .where('u.user_id = :userId', { userId })
        .groupBy('u.endpoint'),
      fromDate,
      toDate,
      order,
      'u.created_at',
    );

    const creditConsumeRaw = await this.groupCountByEndpoint(
      this.creditTxRepo
        .createQueryBuilder('t')
        .select('t.endpoint', 'endpoint')
        .addSelect('COUNT(*)', 'count')
        .where('t.user_id = :userId', { userId })
        .andWhere('t.type = :consumeType', { consumeType: 'consume' })
        .groupBy('t.endpoint'),
      fromDate,
      toDate,
      order,
      't.created_at',
    );
    // credit consume 的 endpoint 可能为 null(旧数据),保留 null 类型供前端区分。
    const creditConsumeByEndpoint: EndpointCreditCount[] = creditConsumeRaw.map((r) => ({
      endpoint: r.endpoint,
      count: r.count,
    }));

    return AdminActivityResponseDto.from({
      userId,
      from: from ?? null,
      to: to ?? null,
      aiCallsByEndpoint,
      creditConsumeByEndpoint,
    });
  }

  // 错误/审计流水(GET /admin/error-stream):ops_events 失败类/ADMIN_ACTION 倒序翻页,detail 白名单。
  // type 可选:命中白名单则只查该类型;否则查全部可见类型。QueryBuilder + setParameter 绑定。
  async errorStream(
    limit?: number,
    type?: string,
    offset?: number,
  ): Promise<AdminErrorEventResponseDto[]> {
    const take = this.clampPageSize(limit);
    const skip = this.clampOffset(offset);
    const qb = this.dataSource
      .getRepository(OpsEvent)
      .createQueryBuilder('e')
      .orderBy('e.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (type && (AdminService.ERROR_STREAM_TYPES as readonly string[]).includes(type)) {
      qb.where('e.type = :type', { type });
    } else {
      qb.where('e.type IN (:...types)', { types: [...AdminService.ERROR_STREAM_TYPES] });
    }

    const events = await qb.getMany();
    return AdminErrorEventResponseDto.fromMany(events);
  }

  // 最近 AI 调用失败(GET /admin/recent-failures):只取 AI_CALL_FAILED 倒序前 N 条。
  // 同时覆盖两类来源:AiUsageInterceptor 的 HTTP 失败 + interviews 转写失败(detail.stage='transcribe')。
  // 隐私铁律:detail.user_id(UUID)经 users 映射解析为邮箱后【打码】输出(ab***@x.com),绝不回完整邮箱。
  // 20 人规模:用 findAll 建 id→email 映射(与 usageOverview 同手法),避免按 id 逐条查库。
  async recentFailures(limit?: number): Promise<AdminRecentFailureResponseDto[]> {
    const take = this.clampPageSize(limit);
    const events = await this.dataSource
      .getRepository(OpsEvent)
      .createQueryBuilder('e')
      .where('e.type = :type', { type: 'AI_CALL_FAILED' })
      .orderBy('e.created_at', 'DESC')
      .take(take)
      .getMany();

    const allUsers = await this.users.findAll();
    const emailById = new Map(allUsers.map((u) => [u.id, u.email]));
    return AdminRecentFailureResponseDto.fromMany(events, emailById);
  }

  // 成功率趋势(GET /admin/success-stats):成功=ai_usage 按日,失败=ops_events AI 失败类按日。
  // 两侧均用 DB 端按日 GROUP BY(dialect-aware 日期表达式),避免把全表行拉进进程(10万行场景)。
  // 日期键统一用 UTC(与 OpsEventsService.dailyStats 的 toISOString().slice(0,10) 同口径)。
  async successStats(days?: number): Promise<AdminSuccessStatsRow[]> {
    const window = days ?? 7;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - window);
    since.setUTCHours(0, 0, 0, 0);

    const successByDate = await this.countByUtcDate(
      this.usageRepo.createQueryBuilder('u'),
      'u.created_at',
      since,
    );
    const failedByDate = await this.countByUtcDate(
      this.dataSource
        .getRepository(OpsEvent)
        .createQueryBuilder('e')
        .where('e.type IN (:...types)', { types: [...AdminService.AI_FAILURE_TYPES] }),
      'e.created_at',
      since,
    );

    // 连续填充窗口内每一天(含零值天),便于前端画趋势。
    // i = window-1 downto 0:days=7 时精确输出 7 天(今日为 i=0)。
    const rows: AdminSuccessStatsRow[] = [];
    for (let i = window - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const success = successByDate.get(key) ?? 0;
      const failed = failedByDate.get(key) ?? 0;
      const total = success + failed;
      rows.push({
        date: key,
        success,
        failed,
        success_rate: total === 0 ? null : success / total,
      });
    }
    return rows;
  }

  // ============================================================
  // API 管理:AI provider 通道 CRUD(GET/POST/PATCH/DELETE /admin/ai-providers + 连通性测试)
  // 安全红线:出站只投影打码密钥(apiKeyMasked 末 4 位),绝不回明文/密文;
  //   密钥 write-only(PATCH 不传则不改);所有改动 invalidate 缓存,下次 AI 调用即时生效,免重启。
  // ============================================================

  // 全部 AI 通道列表(密钥打码)。
  async listAiProviders(): Promise<AdminAiProviderResponseDto[]> {
    const views = await this.aiProviders.list();
    return AdminAiProviderResponseDto.fromMany(views);
  }

  // 新建通道:apiKey 加密落库;记审计事件。
  async createAiProvider(
    actingUserId: string,
    dto: CreateAiProviderDto,
  ): Promise<AdminAiProviderResponseDto> {
    const view = await this.aiProviders.create({
      name: dto.name,
      protocol: dto.protocol,
      baseURL: dto.baseURL,
      apiKey: dto.apiKey,
      modelPro: dto.modelPro,
      modelFlash: dto.modelFlash,
      role: dto.role,
      sortOrder: dto.sortOrder,
      timeoutMs: dto.timeoutMs,
      maxRetries: dto.maxRetries,
    });
    void this.opsEvents.record('ADMIN_ACTION', {
      actor: actingUserId,
      op: 'createAiProvider',
      provider: view.name,
      role: view.role,
    });
    return AdminAiProviderResponseDto.from(view);
  }

  // 改通道:apiKey 不传则不改(write-only);记审计事件(不含密钥)。
  async updateAiProvider(
    actingUserId: string,
    id: string,
    dto: UpdateAiProviderDto,
  ): Promise<AdminAiProviderResponseDto> {
    const view = await this.aiProviders.update(id, {
      name: dto.name,
      protocol: dto.protocol,
      baseURL: dto.baseURL,
      apiKey: dto.apiKey,
      modelPro: dto.modelPro,
      modelFlash: dto.modelFlash,
      role: dto.role,
      sortOrder: dto.sortOrder,
      timeoutMs: dto.timeoutMs,
      maxRetries: dto.maxRetries,
    });
    void this.opsEvents.record('ADMIN_ACTION', {
      actor: actingUserId,
      op: 'updateAiProvider',
      provider: view.name,
      role: view.role,
      keyChanged: dto.apiKey !== undefined && dto.apiKey.trim().length > 0,
    });
    return AdminAiProviderResponseDto.from(view);
  }

  // 删通道:记审计事件。
  async deleteAiProvider(actingUserId: string, id: string): Promise<{ deleted: true }> {
    await this.aiProviders.remove(id);
    void this.opsEvents.record('ADMIN_ACTION', {
      actor: actingUserId,
      op: 'deleteAiProvider',
      providerId: id,
    });
    return { deleted: true };
  }

  // 连通性测试(已保存通道):解密 key 发一次最小请求,返回 {ok, latencyMs, error}(error 无 key)。
  async testAiProvider(id: string): Promise<AdminAiProviderTestResponseDto> {
    const loaded = await this.aiProviders.getDecrypted(id);
    return this.aiService.testConnection(loaded);
  }

  // 连通性测试(未保存草稿):用入站明文 key 发一次最小请求,不落库。
  async testAiProviderDraft(dto: TestAiProviderDraftDto): Promise<AdminAiProviderTestResponseDto> {
    return this.aiService.testConnection({
      id: 'draft',
      name: 'draft',
      protocol: dto.protocol,
      baseURL: dto.baseURL,
      apiKey: dto.apiKey,
      modelPro: dto.modelFlash,
      modelFlash: dto.modelFlash,
      timeoutMs: dto.timeoutMs ?? 30000,
      maxRetries: 0,
    });
  }

  // ---- 波2A 私有助手 ----

  // 服务端分页上限钳制:未传或越界 → MAX_PAGE_SIZE;否则向下取整后钳到 [1, MAX_PAGE_SIZE]。
  private clampPageSize(limit?: number): number {
    if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
      return AdminService.MAX_PAGE_SIZE;
    }
    return Math.min(Math.floor(limit), AdminService.MAX_PAGE_SIZE);
  }

  // 服务端 offset 钳制:未传/非有限/负数 → 0;否则向下取整后兜底 ≥0。
  private clampOffset(offset?: number): number {
    if (offset === undefined || !Number.isFinite(offset) || offset <= 0) {
      return 0;
    }
    return Math.floor(offset);
  }

  // 合法 ISO 日期字符串 → Date;非法/未传 → undefined(不进 WHERE)。
  // endOfDay=true:把纯日期 'YYYY-MM-DD' 推到当日末刻(23:59:59.999 UTC),
  // 供 'to' 边界 <= :to 包含结束日整天;若入参已带时间则尊重原值不动。
  private parseDate(s?: string, endOfDay = false): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return undefined;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(s.trim())) {
      d.setUTCHours(23, 59, 59, 999);
    }
    return d;
  }

  // 通用「按 endpoint 分组计数」:接 select+groupBy 已就绪的 QueryBuilder,补时间窗口 + 排序后取 raw。
  // ORDER BY 仅接受枚举白名单('count'|'endpoint'),字面量已固定,无注入面。
  private async groupCountByEndpoint<T extends import('typeorm').ObjectLiteral>(
    qb: import('typeorm').SelectQueryBuilder<T>,
    fromDate: Date | undefined,
    toDate: Date | undefined,
    order: 'count' | 'endpoint',
    createdAtCol: string,
  ): Promise<EndpointCallCount[]> {
    if (fromDate) qb.andWhere(`${createdAtCol} >= :from`, { from: fromDate });
    if (toDate) qb.andWhere(`${createdAtCol} <= :to`, { to: toDate });
    if (order === 'endpoint') {
      qb.orderBy('endpoint', 'ASC');
    } else {
      qb.orderBy('count', 'DESC');
    }
    const raw = await qb.getRawMany<{ endpoint: string | null; count: string | number }>();
    return raw.map((r) => ({
      endpoint: r.endpoint as string,
      count: Number(r.count),
    }));
  }

  // DB 端按日期分组计数:接已就绪(含可选 WHERE)的 QueryBuilder,加日期表达式 GROUP BY。
  // dialect-aware:日期直接从已存储值(双端均落 UTC)截取前 10 位,不做时区换算——
  // 避免 Postgres `timestamp without time zone AT TIME ZONE` 的会话时区偏移陷阱;
  // 与 OpsEventsService.dailyStats 的 toISOString().slice(0,10)(同样按存储 UTC 值)口径一致。
  //   Postgres: to_char(created_at,'YYYY-MM-DD');SQLite: strftime('%Y-%m-%d', created_at)。
  // 返回 date(YYYY-MM-DD)→ count 的 Map。
  private async countByUtcDate<T extends import('typeorm').ObjectLiteral>(
    qb: import('typeorm').SelectQueryBuilder<T>,
    createdAtCol: string,
    since: Date,
  ): Promise<Map<string, number>> {
    const dateExpr = this.isPostgres
      ? `to_char(${createdAtCol}, 'YYYY-MM-DD')`
      : `strftime('%Y-%m-%d', ${createdAtCol})`;
    const raw = await qb
      .andWhere(`${createdAtCol} >= :since`, { since })
      .select(dateExpr, 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy(dateExpr)
      .getRawMany<{ date: string; count: string | number }>();
    const map = new Map<string, number>();
    for (const r of raw) {
      if (r.date) map.set(r.date, Number(r.count));
    }
    return map;
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

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminDetailService } from './admin-detail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantCreditsDto } from './dto/grant-credits.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateInviteDto } from './dto/update-invite.dto';
import { OpsEventsQueryDto } from './dto/ops-events-query.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { UserActivityQueryDto } from './dto/user-activity-query.dto';
import { ErrorStreamQueryDto } from './dto/error-stream-query.dto';
import { CreditHistoryQueryDto } from './dto/credit-history-query.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';

// 管理后台:全部端点经 JwtAuthGuard(认证)+ AdminGuard(role==='admin')。
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly detail: AdminDetailService,
  ) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  // 用户详情:实体投影 + 今日/累计调用 + 近 7 日趋势(出站 DTO 白名单,无 PII/token)。
  // ':id' 经 ParseUUIDPipe,畸形 id → 400 不穿 DB。声明在 'users'(GET)之后,Nest 按声明匹配。
  @Get('users/:id')
  userDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.detail.userDetail(id);
  }

  // 用户充值/消耗流水分页(倒序;limit 缺省 50、硬上限 200;出站 DTO 仅账务字段无正文)。
  @Get('users/:id/credit-history')
  creditHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CreditHistoryQueryDto,
  ) {
    return this.detail.creditHistory(id, query.limit, query.offset);
  }

  @Patch('users/:id')
  updateUser(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(req.user.id, id, dto);
  }

  // 管理员充值:给目标用户加点(admin_grant),返回最新余额。
  @Post('users/:id/credits')
  grantCredits(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: GrantCreditsDto,
  ) {
    return this.admin.grantCredits(req.user.id, id, dto.delta, dto.note);
  }

  @Get('invites')
  listInvites() {
    return this.admin.listInvites();
  }

  @Post('invites')
  createInvite(@Body() dto: CreateInviteDto) {
    return this.admin.createInvite(dto);
  }

  @Patch('invites/:id')
  updateInvite(@Param('id') id: string, @Body() dto: UpdateInviteDto) {
    return this.admin.updateInvite(id, dto.disabled);
  }

  @Get('usage')
  usage() {
    return this.admin.usageOverview();
  }

  // ===== Phase2 波2A:运维/健康/活动/错误流水/成功率 6 端点(均继承 controller 级 JwtAuthGuard+AdminGuard)=====

  // 运维事件流水:最近 N 条(detail 经响应 DTO 白名单过滤)。
  @Get('ops-events')
  opsEvents(@Query() query: OpsEventsQueryDto) {
    return this.admin.recentOpsEvents(query.limit);
  }

  // 运维事件按日聚合(近 days 天各类事件计数)。
  @Get('ops-stats')
  opsStats(@Query() query: StatsQueryDto) {
    return this.admin.opsStats(query.days);
  }

  // 平台健康快照:DB 探活 + 版本/uptime + 并发护栏状态。
  @Get('health-snapshot')
  healthSnapshot() {
    return this.admin.healthSnapshot();
  }

  // 单用户活动明细:仅计数(各端点 AI 调用次数 / credit 消耗次数),绝不含任何正文。
  @Get('user-activity')
  userActivity(@Query() query: UserActivityQueryDto) {
    return this.admin.userActivity(query.userId, query.from, query.to, query.orderBy);
  }

  // 错误/审计流水:ops_events 失败类/管理操作 倒序翻页(detail 白名单)。
  @Get('error-stream')
  errorStream(@Query() query: ErrorStreamQueryDto) {
    return this.admin.errorStream(query.limit, query.type, query.offset);
  }

  // 成功率趋势:成功=ai_usage 按日,失败=ops_events AI 失败类按日。
  @Get('success-stats')
  successStats(@Query() query: StatsQueryDto) {
    return this.admin.successStats(query.days);
  }

  // ===== API 管理:AI provider 主备切换(出站 DTO 绝不含 apiKey/baseURL)=====

  // 当前 AI provider 状态:三通道 configured/型号 + 有效主力/降级顺序。
  @Get('ai-provider')
  aiProvider() {
    return this.admin.aiProviderStatus();
  }

  // 切换 AI provider 主备:primary 须是已配置密钥的通道(否则 400);即时生效,免重启。
  @Patch('ai-provider')
  updateAiProvider(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateAiProviderDto,
  ) {
    return this.admin.updateAiProvider(req.user.id, dto);
  }
}

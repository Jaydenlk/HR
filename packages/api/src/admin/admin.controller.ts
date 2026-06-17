import {
  Body,
  Controller,
  Delete,
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
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { TestAiProviderDraftDto } from './dto/test-ai-provider.dto';

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

  // 最近 AI 调用失败:只取 AI_CALL_FAILED 倒序前 N 条(用户标识打码,绝不回完整邮箱)。
  @Get('recent-failures')
  recentFailures(@Query() query: OpsEventsQueryDto) {
    return this.admin.recentFailures(query.limit);
  }

  // 成功率趋势:成功=ai_usage 按日,失败=ops_events AI 失败类按日。
  @Get('success-stats')
  successStats(@Query() query: StatsQueryDto) {
    return this.admin.successStats(query.days);
  }

  // ===== API 管理:AI provider 通道 CRUD(出站只回打码密钥,绝不回明文/密文)=====

  // 全部 AI 通道列表(密钥打码末 4 位)。
  @Get('ai-providers')
  listAiProviders() {
    return this.admin.listAiProviders();
  }

  // 新建通道:apiKey 加密落库;即时生效,免重启。
  @Post('ai-providers')
  createAiProvider(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateAiProviderDto,
  ) {
    return this.admin.createAiProvider(req.user.id, dto);
  }

  // 连通性测试(未保存草稿):用入站明文 key 发一次最小请求,不落库。
  // 声明在 ':id/test' 之前,避免 'test' 被 ParseUUIDPipe 当 id 拒绝。
  @Post('ai-providers/test')
  testAiProviderDraft(@Body() dto: TestAiProviderDraftDto) {
    return this.admin.testAiProviderDraft(dto);
  }

  // 连通性测试(已保存通道):解密 key 发一次最小请求,返回 {ok, latencyMs, error}。
  @Post('ai-providers/:id/test')
  testAiProvider(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.testAiProvider(id);
  }

  // 改通道:apiKey 不传则不改(write-only);即时生效,免重启。
  @Patch('ai-providers/:id')
  updateAiProvider(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiProviderDto,
  ) {
    return this.admin.updateAiProvider(req.user.id, id, dto);
  }

  // 删通道。
  @Delete('ai-providers/:id')
  deleteAiProvider(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.deleteAiProvider(req.user.id, id);
  }
}

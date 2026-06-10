export const meta = {
  name: 'trial-t1-followup',
  description: 'T1 复审尾巴清账:diagnoses漏配额P1 + 安全P2三件 + 未纳管端点全纳管',
  phases: [{ title: '修复', detail: '单实现者(串行,无冲突)' }, { title: '复审', detail: '只读核对' }],
};

const ROOT = 'E:/Agent program/HRBP';

const SPEC = `
仓库根:${ROOT}。NestJS+TypeORM。T1 安全硬化刚落地(邮箱验证码登录/邀请码DB/QuotaGuard+AiUsageInterceptor),复审留了一批尾巴,你来清账。严格类型无 any;中文 only;每条 step→verify 真跑测试贴证据。

【P1 必修】
1. POST /diagnoses(packages/api/src/diagnoses/diagnoses.controller.ts:27-33,通用JD诊断,每请求最多4次AI调用)漏挂 @UseGuards(QuotaGuard)+@UseInterceptors(AiUsageInterceptor)。补挂(保持 JwtAuthGuard 在前的既有顺序)。

【P2 全修】
2. 未纳管 AI 端点全部纳管(同样补挂 guard+interceptor,逐个 Read 确认含 AiService 调用):
   - conversations POST :id/messages(chat,最易滥用)
   - opportunity POST :id/evaluate
   - interviews POST :id/analyze
   - feed POST digest
   - tasks POST generate
   - career GET analysis
   注意各 module 需 import QuotaModule(已 @Global 仍显式 import 保持一致性,参照其它 11 个已纳管 module 的写法)。
3. 验证码生成换密码学安全随机:auth.service.ts:142-144 Math.random → crypto.randomInt(100000,1000000)(crypto 已 import)。
4. request-code 同邮箱 60s 冷却:同邮箱上一条未过期码生成时间 <60s → 429「请求过于频繁,请稍后再试」(throttler 按 IP 不防分布式刷同一邮箱,这是补充防线)。
5. 封禁即时生效:common/guards/jwt.strategy.ts validate 改为查库取 user 并检查 status==='banned' → 抛 UnauthorizedException「账号已被停用」;返回 {id,email} 形状保持兼容。注意这给每请求加一次 users 主键查询,可接受;确保 users.service findById 可注入(strategy 需要 UsersModule 导出,看 auth.module 现状接线)。

【P3 顺手清】
6. 死代码:InvitesService.isUsable 全仓零调用→删除;AuthService.purgeExpiredCodes 零调用→用 @nestjs/schedule @Cron 每日 04:00 挂上(ScheduleModule 已在 app.module forRoot)并加注释。
7. login.dto invite_code/name 的 @IsString 补中文 message。
8. 补 2 个测试缺口(auth.e2e):已消费验证码重放→401;同邮箱 60s 冷却→429。

【验证】改完跑:npx tsc --noEmit(0错);auth.e2e + quota.e2e + 新纳管端点对应的既有 e2e 套件(conversations/opportunity/interviews/feed/tasks/career,有哪些跑哪些);最后全量 e2e 一次(--runInBand)必须 0 failed。所有命令贴关键输出行。
`;

const SCHEMA = {
  type: 'object',
  properties: {
    steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, verify: { type: 'string' }, result: { type: 'string', enum: ['PASS', 'FAIL', 'SKIPPED'] }, evidence: { type: 'string' } }, required: ['step', 'verify', 'result', 'evidence'] } },
    files_modified: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['steps', 'files_modified', 'notes'],
};
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, problem: { type: 'string' } }, required: ['severity', 'problem'] } },
  },
  required: ['verdict', 'issues'],
};

log('T1 followup 清账启动');
const impl = await agent(SPEC, { label: 'followup-impl', phase: '修复', schema: SCHEMA, model: 'opus' });
const review = await agent(
  `只读独立审查(找茬)。T1 followup 清账完成,原任务:\n${SPEC}\n实现者自报:\n${JSON.stringify(impl, null, 1)}\n\n用 Read/Grep + 重跑关键测试核对:①8 项是否逐条真落地(file:line);②全部含 AiService 的 controller 现在是否 100% 纳管(自己 Grep 一遍 AiService 注入点交叉验证,列出仍未纳管的);③jwt.strategy 查库改动是否破坏既有 e2e(抽 2 套重跑);④全量 e2e 是否真 0 failed。给 verdict。`,
  { label: 'followup-review', phase: '复审', schema: REVIEW },
);
log(`followup 完成:${review?.verdict}`);
return { impl, review };

export const meta = {
  name: 'saas-full-audit',
  description: 'SaaS 全量对抗式审计:每模块/页面一名找茬审查员 → 逐条对抗验证',
  phases: [
    { title: 'Backend审计', detail: 'NestJS 服务/控制器/DTO 逐模块找茬' },
    { title: 'Frontend审计', detail: 'Next 页面 mock数据/死按钮/状态机找茬' },
    { title: '横切审计', detail: 'authz/IDOR · 防编造一致性 · 做减法完整性' },
    { title: '对抗验证', detail: '逐条 CONFIRMED/PLAUSIBLE/REFUTED' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

// ── 项目红线 + 架构上下文(注入每个 agent) ───────────────────────────────
const CONTEXT = `
项目:校招简历诊断 SaaS(monorepo: packages/api = NestJS+TypeORM+SQLite/PG, packages/web = Next.js 16.2.6)。
仓库根目录:${ROOT}(用 Read/Grep 时路径相对此根,如 packages/api/src/...)。

【强制红线 — CLAUDE.md】
1. 严格类型:禁止 any / as unknown as / as any(测试文件除外)。
2. 前端禁止 mock/假数据、禁止硬编码假数字、禁止空 onClick(()=>{})、禁止"建设中/敬请期待"占位。
3. 每个 AI 功能必须在数据缺失时拒绝编造(返回 confidence=insufficient 或 cannot_determine,而非杜撰内容)。
4. 单一职责、KISS、最简实现、无胶水补丁。
5. 中文 only:面向用户的 AI 产物(求职信/消息/诊断)必须中文,不得输出英文维度 key。

【AI 架构(避免误报)】
- AiService.completeStructured<T>() 强制 tool_use 返回结构化 JSON;complete() 返回纯文本。
- withFailover:主通道(CloudDreamAI auto-v2)失败自动降级备用(DeepSeek),两者皆败抛 503 ServiceUnavailableException。
- ConcurrencyLimiter:并发上限 2 + 队列 8(2C2G VPS),超出抛 503。这是有意设计,非 bug。
- 所有重 AI 调用应经 limiter.run();结构化输出应有 schema 校验。

【安全基线】
- 受保护接口需 JwtAuthGuard;凡按 id 取用户资源(简历/诊断/投递等)必须校验归属(防 IDOR/越权)。
- 用户输入进 AI prompt 需注意注入;DTO 应有 class-validator 校验且全局 ValidationPipe 生效。
`;

// ── 审计范围清单 ────────────────────────────────────────────────────────
const MODULES = [
  // ===== Backend(反哺新增 AI 能力 + 基础设施) =====
  { key: 'be-ai-core', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/ai/ai.service.ts, packages/api/src/ai/concurrency-limiter.ts, packages/api/src/config/ai.config.ts, packages/api/src/config/env.validation.ts, packages/api/src/app.module.ts',
    lens: '主备降级竞态/空块耗尽/超时/maxTokens 截断风险;env 校验完整性;limiter 释放正确性(finally);DI 装配。' },
  { key: 'be-applications', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/applications/ 目录全部(尤其 strategy.service.ts, applications.service.ts, applications.controller.ts, dto/)',
    lens: '投递策略 AI 调用;归属校验;DTO 校验;防编造。' },
  { key: 'be-follow-up', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/follow-up/ 目录全部',
    lens: '跟进消息生成;数据缺失拒绝编造;中文输出。' },
  { key: 'be-industry-trend', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/industry-trend/ 目录全部',
    lens: '行业趋势是否凭空编造数据/数字;时效性免责;防编造。' },
  { key: 'be-interview-prep', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/interview-prep/ 目录全部(service 约 815 行 + 4 个 DTO: case-coach/company-playbook/star-stories/tech-coach)',
    lens: '4 合 1 子能力;大 service 单一职责;各子能力 schema/拒绝编造;prompt 注入。' },
  { key: 'be-learning-roadmap', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/learning-roadmap/ 目录全部',
    lens: '学习路线;资源链接是否杜撰(编造不存在的课程/URL);防编造。' },
  { key: 'be-networking', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/networking/ 目录全部(networking.service.ts, dto: networking-message/referral-strategy)',
    lens: '内推消息/路径;confidence=insufficient 分支;防编造人脉。' },
  { key: 'be-offer-comparator', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/offer-comparator/ 目录全部',
    lens: 'offer 比对;薪资数字是否编造;计算正确性;防编造。' },
  { key: 'be-salary', kind: 'be', phase: 'Backend审计',
    files: 'packages/api/src/salary/ 目录全部(salary-analysis.service.ts, city-industry-fit.service.ts, salary.controller.ts, dto/)',
    lens: '薪资对标/城市行业适配;是否编造市场薪资数据;归属;防编造。' },

  // ===== Frontend(反哺新增/重改页面) =====
  { key: 'fe-applications', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/applications/page.tsx',
    lens: 'mock数据/死按钮/真实 API 接线/加载·错误·空·insufficient 状态机。' },
  { key: 'fe-follow-up', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/follow-up/page.tsx',
    lens: '同上 + 中文 only。' },
  { key: 'fe-industry-trend', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/industry-trend/page.tsx',
    lens: '同上;是否展示编造数字而无来源/免责。' },
  { key: 'fe-interview-prep', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/interview-prep/page.tsx',
    lens: '4 合 1 tab;每 tab 真实接线、无死按钮、状态机完整。' },
  { key: 'fe-learning-roadmap', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/learning-roadmap/page.tsx',
    lens: '同上;杜撰链接是否可点击呈现为真实。' },
  { key: 'fe-coverletter-referral', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/cover-letter/page.tsx, packages/web/src/app/(main)/cover-letter/_referral/index.tsx',
    lens: '求职信合并内推(做减法);tab 切换;两子能力接线;clipboard;无死按钮。' },
  { key: 'fe-offer-comparator', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/offer-comparator/page.tsx',
    lens: '多 offer 输入校验;结果渲染;状态机。' },
  { key: 'fe-salary', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/salary/page.tsx',
    lens: '薪资雷达;注意第 834 行"数据正在完善中,敬请期待"是否为红线占位还是合理空态;有无 mock 数字。' },
  { key: 'fe-diagnoses', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/app/(main)/diagnoses/campus/page.tsx, packages/web/src/app/(main)/diagnoses/[id]/diagnosis-detail.tsx',
    lens: '校招诊断主入口/详情;改写呈现;无 mock;状态机。' },
  { key: 'fe-shared', kind: 'fe', phase: 'Frontend审计',
    files: 'packages/web/src/lib/types.ts, packages/web/src/lib/api.ts, packages/web/src/app/(main)/layout.tsx',
    lens: 'types 与后端 DTO 是否一致/有无 any;api 封装错误处理;layout 导航做减法(注释说"8 个核心"但 core 实际数量是否相符,死链)。' },

  // ===== 横切维度 =====
  { key: 'xcut-authz', kind: 'xcut', phase: '横切审计',
    files: '全部新增控制器:applications/follow-up/industry-trend/interview-prep/learning-roadmap/networking/offer-comparator/salary 的 *.controller.ts,以及对应 service 中按 id 取资源处。可 Grep @UseGuards/@Controller/JwtAuthGuard/findOne/where',
    lens: '逐控制器核 JwtAuthGuard 是否缺失;逐"按 id 取用户资源"核归属校验(IDOR);DTO 是否有 class-validator 装饰;全局 ValidationPipe。最多 8 条最严重。' },
  { key: 'xcut-antifab', kind: 'xcut', phase: '横切审计',
    files: '全部新增 AI service:applications/strategy.service.ts, follow-up, industry-trend, interview-prep, learning-roadmap, networking, offer-comparator, salary/*.service.ts。可 Grep insufficient/cannot_determine/confidence',
    lens: '横向对比:哪些 service 有"数据缺失→拒绝编造(insufficient/cannot_determine/confidence)"护栏,哪些缺失。列出缺护栏的具体 service:行。这是核心商业护城河红线。最多 8 条。' },
  { key: 'xcut-subtraction', kind: 'xcut', phase: '横切审计',
    files: '做减法删除:education-path/personal-brand/question-bank/role-transition(api+web+test 全删,未提交)。检查 app.module.ts 是否还 import 已删模块、web 是否还有死路由/类型残留、根 package.json 是否引入了指向不存在 .worktrees/.../*.tgz 的 file: 依赖(已知存在,确认影响)。可 Grep education-path|personal-brand|question-bank|role-transition',
    lens: '删除完整性:残留 import/路由/nav 链接/类型;根 package.json 破损依赖对 pnpm install 的影响;cover-letter 合并 networking 后原 networking 后端是否成孤儿(仍被引用?)。最多 8 条。' },
];

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          category: { type: 'string', description: 'correctness|security|fabrication-guard|mock-data|dead-button|type-safety|simplification|efficiency|consistency|docs' },
          file: { type: 'string' },
          line: { type: 'number' },
          summary: { type: 'string', description: '一句话描述缺陷' },
          evidence: { type: 'string', description: '引用的真实代码片段' },
          impact: { type: 'string', description: '具体触发条件→错误后果' },
          fix: { type: 'string', description: '修复建议' },
        },
        required: ['severity', 'category', 'file', 'summary', 'impact', 'fix'],
      },
    },
  },
  required: ['scope', 'findings'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string' },
    verified: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          category: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          summary: { type: 'string' },
          verdict: { type: 'string', enum: ['CONFIRMED', 'PLAUSIBLE', 'REFUTED'] },
          reason: { type: 'string', description: 'CONFIRMED:输入/状态+错误输出并引用行;PLAUSIBLE:机制成立触发不确定;REFUTED:引用证明已被守护或代码并非如此' },
          impact: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'category', 'file', 'summary', 'verdict', 'reason', 'fix'],
      },
    },
  },
  required: ['scope', 'verified'],
};

function finderPrompt(m) {
  const role = m.kind === 'fe'
    ? '资深 React/Next.js 前端代码审查员'
    : '资深 NestJS 后端代码审查员';
  const feCaveat = m.kind === 'fe'
    ? '\n注意:本项目 Next.js 为 16.2.6(相对你训练数据有破坏性变更)。不要基于过时 Next 知识误报 API/约定问题;不确定就标低优先级并说明。'
    : '';
  return `${CONTEXT}
你是${role},执行"找茬"(fault-finding)审计 —— 你的职责是找出真实缺陷,不是确认正确。
审计范围(只看这些,不要越界):${m.files}
重点视角:${m.lens}${feCaveat}

步骤:用 Read 完整读取范围内文件(大文件分段读全),必要时 Grep 调用点/类型定义佐证。逐行核对。
对每个缺陷判定:什么输入/状态/时序会让它出错?后果是什么?
输出最多 8 条最严重的真实缺陷(按严重度排序)。correctness/security/fabrication-guard 优先于 simplification/efficiency。
每条必须能引用具体代码作证据。若确无缺陷,返回空 findings —— 不要凑数、不要把正常设计当 bug。`;
}

function verifierPrompt(m, findings) {
  return `${CONTEXT}
你是对抗式验证员。下面是针对范围"${m.scope || m.key}"的候选缺陷,需逐条核实真伪。
范围文件:${m.files}

候选缺陷 JSON:
${JSON.stringify(findings, null, 2)}

对每一条:用 Read/Grep 复核真实代码,给出 verdict:
- CONFIRMED:能指出触发的输入/状态与错误输出/崩溃,并引用证明行。
- PLAUSIBLE:机制真实但触发取决于环境/配置/时序,说明还需什么才能确认。
- REFUTED:代码并非如此,或已在别处被守护 —— 引用证明行反驳。
保持怀疑:找不到所引用代码、或其实已被正确处理,就判 REFUTED。
保留每条的 severity/category/file/line/summary/impact/fix,补上 verdict 与 reason。返回全部条目(含被 REFUTED 的)。`;
}

// ── 执行:pipeline(模块 → 找茬 → 对抗验证) ──────────────────────────────
log(`SaaS 全量审计启动:${MODULES.length} 个范围(backend ${MODULES.filter(m=>m.kind==='be').length} / frontend ${MODULES.filter(m=>m.kind==='fe').length} / 横切 ${MODULES.filter(m=>m.kind==='xcut').length})`);

const results = await pipeline(
  MODULES,
  // stage 1: 找茬
  (m) => agent(finderPrompt(m), {
    label: `find:${m.key}`,
    phase: m.phase,
    schema: FINDINGS_SCHEMA,
  }).then((r) => ({ m, found: r })),
  // stage 2: 对抗验证(无缺陷则跳过,省 token)
  (prev) => {
    if (!prev || !prev.found || !prev.found.findings || prev.found.findings.length === 0) {
      return { scope: prev?.m?.key ?? 'unknown', verified: [], kind: prev?.m?.kind };
    }
    const scoped = { ...prev.found, key: prev.m.key, files: prev.m.files };
    return agent(verifierPrompt(prev.m, prev.found.findings), {
      label: `verify:${prev.m.key}`,
      phase: '对抗验证',
      schema: VERDICT_SCHEMA,
    }).then((v) => ({
      scope: prev.m.key,
      kind: prev.m.kind,
      verified: (v && v.verified) ? v.verified : [],
    }));
  },
);

// ── 汇总:保留非 REFUTED,按严重度排序 ──────────────────────────────────
const SEV_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const all = (results || []).filter(Boolean);
const confirmed = [];
for (const r of all) {
  for (const f of (r.verified || [])) {
    if (f.verdict !== 'REFUTED') {
      confirmed.push({ ...f, scope: r.scope, kind: r.kind });
    }
  }
}
confirmed.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

const byScope = {};
for (const r of all) {
  const kept = (r.verified || []).filter((f) => f.verdict !== 'REFUTED').length;
  const refuted = (r.verified || []).filter((f) => f.verdict === 'REFUTED').length;
  byScope[r.scope] = { kept, refuted };
}

log(`审计完成:确认/疑似 ${confirmed.length} 条(P0=${confirmed.filter(f=>f.severity==='P0').length} P1=${confirmed.filter(f=>f.severity==='P1').length} P2=${confirmed.filter(f=>f.severity==='P2').length} P3=${confirmed.filter(f=>f.severity==='P3').length})`);

return {
  summary: {
    scopes_reviewed: MODULES.length,
    findings_kept: confirmed.length,
    by_severity: {
      P0: confirmed.filter(f => f.severity === 'P0').length,
      P1: confirmed.filter(f => f.severity === 'P1').length,
      P2: confirmed.filter(f => f.severity === 'P2').length,
      P3: confirmed.filter(f => f.severity === 'P3').length,
    },
    by_scope: byScope,
  },
  findings: confirmed,
};

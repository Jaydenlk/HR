/**
 * admin-load-test.mjs
 *
 * 压测脚本:管理面板规格 §3② — 不进 jest 主跑,直接 node 执行。
 *
 * 用法(从 packages/api 目录):
 *   node test/admin-load-test.mjs
 *
 * 需要先确认 dist/ 已编译(pnpm build 或 nest build)。
 *
 * 设计:
 *  - 用 NestJS AppModule (SQLite 临时文件) 启动真实 HTTP server
 *  - Seed: ai_usage ~5000 条 / ops_events ~2000 条(诚实标注:机器偏小,10万行SQLite会慢)
 *  - 2 个 admin token + 5 个普通用户 token(via dev-login)
 *  - 50 并发 × ~30s 打 /admin/users、/admin/usage、/admin/user-activity
 *  - 判据: 普通用户 100% 403; 两 admin 结果不互串; 无 500; p50/p95 延迟; limit=999999 clamp≤200
 *
 * 输出格式:JSON (LOAD_TEST_RESULT) + 人类可读日志
 */

import { createRequire } from 'module';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── env 注入(在 AppModule import 前) ──────────────────────────────────────────
const TEMP_DB = join(tmpdir(), `coach-load-${process.pid}-${Date.now()}.sqlite`);
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = TEMP_DB;
process.env.CLOUDDREAM_API_KEY = 'test-key-load';
process.env.CLOUDDREAM_MODEL = 'auto-v2';
process.env.JWT_SECRET = 'load-test-secret-' + randomUUID();
process.env.ADMIN_EMAILS = 'admin1@load.test,admin2@load.test';
process.env.DISABLE_THROTTLE = '1';
process.env.DAILY_AI_QUOTA = '100000';
process.env.DEV_LOGIN = '1';           // 开 dev-login 快速签发 token
process.env.NODE_ENV = 'test';         // 非 production → dev-login 可用
process.env.SMTP_HOST = '';
process.env.RESEND_API_KEY = '';
process.env.__SEAL_OPS_ENV__ = '';     // 让 env.validation 不拦截 DEV_LOGIN/ADMIN_EMAILS

// ── 常量 ──────────────────────────────────────────────────────────────────────
const CONCURRENCY = 50;
const DURATION_MS = 30_000;
const ADMIN_EMAILS = ['admin1@load.test', 'admin2@load.test'];
const NORMAL_COUNT = 5;
const AI_USAGE_SEED = 5_000;     // 诚实标注:机器偏小,目标1万~10万缩至5k
const OPS_EVENTS_SEED = 2_000;

// ── 工具 ──────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[idx];
}

// 简单 HTTP 封装(node:http)
function httpRequest(baseUrl, method, path, token, bodyObj) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const { request } = require('http');
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : undefined;
    const opts = {
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const t0 = Date.now();
    const req = request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body, latency: Date.now() - t0 });
      });
    });
    req.on('error', (e) => {
      resolve({ status: 0, body: e.message, latency: Date.now() - t0 });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ status: 0, body: 'timeout', latency: Date.now() - t0 });
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function httpGet(baseUrl, path, token) {
  return httpRequest(baseUrl, 'GET', path, token, null);
}

function httpPost(baseUrl, path, token, body) {
  return httpRequest(baseUrl, 'POST', path, token, body);
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== admin-load-test start ===');
  console.log(`TEMP_DB: ${TEMP_DB}`);
  console.log(`Seed targets: ai_usage=${AI_USAGE_SEED}, ops_events=${OPS_EVENTS_SEED}`);
  console.log(`Concurrency: ${CONCURRENCY}, Duration: ${DURATION_MS}ms`);

  // 1. Boot NestJS app from compiled dist/
  console.log('\n[1/6] Booting NestJS app from dist/...');

  require('reflect-metadata');

  // Use @nestjs/testing from node_modules
  const { Test } = require('@nestjs/testing');
  const { ValidationPipe } = require('@nestjs/common');

  // Load compiled dist modules
  const distBase = join(__dirname, '..', 'dist');
  const { AppModule } = require(join(distBase, 'app.module.js'));
  const { AiService } = require(join(distBase, 'ai', 'ai.service.js'));

  const mockAi = {
    complete: async () => 'mock',
    completeStructured: async () => ({
      summary: 'mock', confidence: 'low',
      salary_range: { p25: 1, p50: 2, p75: 3, unit: 'monthly_rmb', year: '2025', city: '北京', role: '测', grade: 'B', freshness: 'stale' },
      data_sources: [], comparison: [], recommendations: [], risks: [], next_actions: [],
      follow_up_questions: [], cannot_determine: [], data_freshness: 'stale',
    }),
  };

  let moduleRef;
  try {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAi)
      .compile();
  } catch (e) {
    console.error('Failed to compile module:', e.message);
    throw e;
  }

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const server = app.getHttpServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`  Server up at ${baseUrl}`);

  // 2. Seed users via dev-login
  console.log('\n[2/6] Seeding users via dev-login...');

  async function devLogin(email) {
    const res = await httpPost(baseUrl, '/api/auth/dev-login', null, { email });
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`dev-login failed for ${email}: ${res.status} ${res.body.slice(0, 200)}`);
    }
    const data = JSON.parse(res.body);
    return data.access_token;
  }

  // admin tokens
  const adminTokens = [];
  for (const email of ADMIN_EMAILS) {
    const tok = await devLogin(email);
    adminTokens.push({ email, token: tok });
    console.log(`  admin: ${email} → token OK`);
  }

  // normal user tokens
  const normalTokens = [];
  for (let i = 0; i < NORMAL_COUNT; i++) {
    const email = `normal${i}@load.test`;
    const tok = await devLogin(email);
    normalTokens.push({ email, token: tok });
  }
  console.log(`  ${NORMAL_COUNT} normal users seeded`);

  // 3. Seed ai_usage + ops_events via TypeORM repo
  console.log('\n[3/6] Seeding ai_usage and ops_events...');

  const { getRepositoryToken } = require('@nestjs/typeorm');
  const { DataSource } = require('typeorm');

  const { AiUsage } = require(join(distBase, 'quota', 'entities', 'ai-usage.entity.js'));
  const { OpsEvent } = require(join(distBase, 'ops', 'entities', 'ops-event.entity.js'));
  const { User } = require(join(distBase, 'users', 'entities', 'user.entity.js'));

  const usageRepo = moduleRef.get(getRepositoryToken(AiUsage));
  const opsRepo = moduleRef.get(getRepositoryToken(OpsEvent));
  const userRepo = moduleRef.get(getRepositoryToken(User));

  const allUsers = await userRepo.find();
  const userIds = allUsers.map((u) => u.id);
  console.log(`  Found ${userIds.length} users in DB`);

  const endpointSamples = ['/api/diagnoses', '/api/resumes/rewrite', '/api/career', '/api/salary', '/api/cover-letters'];
  const opsTypes = ['AI_FAILOVER', 'AI_BOTH_DOWN', 'AI_CALL_FAILED', 'CREDIT_CONSUME_FAILED', 'QUEUE_FULL', 'ADMIN_ACTION'];

  console.log(`  Inserting ${AI_USAGE_SEED} ai_usage rows...`);
  const now = Date.now();
  let usageBatch = [];
  for (let i = 0; i < AI_USAGE_SEED; i++) {
    const uid = userIds[i % userIds.length];
    const ep = endpointSamples[i % endpointSamples.length];
    const daysBack = Math.floor(Math.random() * 7);
    const createdAt = new Date(now - daysBack * 86400_000 - Math.random() * 3600_000);
    usageBatch.push({ user_id: uid, endpoint: ep, created_at: createdAt });
    if (usageBatch.length === 500 || i === AI_USAGE_SEED - 1) {
      await usageRepo.insert(usageBatch);
      usageBatch = [];
    }
  }
  console.log(`  ai_usage seeded`);

  console.log(`  Inserting ${OPS_EVENTS_SEED} ops_events rows...`);
  let opsBatch = [];
  for (let i = 0; i < OPS_EVENTS_SEED; i++) {
    const type = opsTypes[i % opsTypes.length];
    const daysBack = Math.floor(Math.random() * 7);
    const createdAt = new Date(now - daysBack * 86400_000 - Math.random() * 3600_000);
    opsBatch.push({ type, detail: { msg: 'load-test', seq: i }, created_at: createdAt });
    if (opsBatch.length === 500 || i === OPS_EVENTS_SEED - 1) {
      await opsRepo.insert(opsBatch);
      opsBatch = [];
    }
  }
  console.log(`  ops_events seeded`);

  // 4. Verify clamp (limit=999999)
  console.log('\n[4/6] Verifying limit clamp (limit=999999)...');
  const adminTok0 = adminTokens[0].token;

  const clampRes = await httpGet(baseUrl, '/api/admin/ops-events?limit=999999', adminTok0);
  let clampWorks = false;
  let clampNote = '';
  if (clampRes.status === 400) {
    // DTO @Max(200) 提前拦截 → 400 是合法防线
    clampWorks = true;
    clampNote = `DTO层@Max(200)拦截返回400 (limit=999999)`;
  } else if (clampRes.status === 200) {
    try {
      const parsed = JSON.parse(clampRes.body);
      if (Array.isArray(parsed) && parsed.length <= 200) {
        clampWorks = true;
        clampNote = `返回${parsed.length}条≤200 (service层clamp)`;
      } else if (Array.isArray(parsed)) {
        clampNote = `返回${parsed.length}条>200 — FAIL`;
      } else {
        clampNote = `非数组响应: ${typeof parsed}`;
      }
    } catch {
      clampNote = `JSON解析失败: ${clampRes.body.slice(0, 100)}`;
    }
  } else {
    clampNote = `非预期状态码: ${clampRes.status}`;
  }
  console.log(`  clamp result: status=${clampRes.status}, works=${clampWorks}, note=${clampNote}`);

  // 5. Verify no cross-user bleed between two admins
  console.log('\n[5/6] Verifying no cross-user bleed between 2 admins...');

  const normalUser = allUsers.find((u) => u.role !== 'admin');
  const sampleUserId = normalUser ? normalUser.id : userIds[0];

  const activityPath = `/api/admin/user-activity?userId=${sampleUserId}`;
  const [r1, r2] = await Promise.all([
    httpGet(baseUrl, activityPath, adminTokens[0].token),
    httpGet(baseUrl, activityPath, adminTokens[1].token),
  ]);

  let noCrossBleed = false;
  let crossBleedNote = '';
  if (r1.status === 200 && r2.status === 200) {
    try {
      const b1 = JSON.parse(r1.body);
      const b2 = JSON.parse(r2.body);
      if (b1.userId === sampleUserId && b2.userId === sampleUserId) {
        noCrossBleed = true;
        crossBleedNote = `两admin均收到userId=${sampleUserId}的数据,无串流`;
      } else {
        crossBleedNote = `userId不匹配: admin1=${b1.userId}, admin2=${b2.userId}`;
      }
    } catch (e) {
      crossBleedNote = `JSON解析失败: ${e.message}`;
    }
  } else if (r1.status === 403 || r2.status === 403) {
    crossBleedNote = `admin被403: r1=${r1.status}, r2=${r2.status} — 可能admin_emails未生效`;
  } else {
    crossBleedNote = `r1=${r1.status} r2=${r2.status}`;
  }
  console.log(`  cross-bleed: noCrossBleed=${noCrossBleed}, ${crossBleedNote}`);

  // 6. 50-concurrent load test for ~30s
  console.log(`\n[6/6] Running ${CONCURRENCY}-concurrent load test for ${DURATION_MS}ms...`);

  const allNormalTokens = normalTokens.map((t) => t.token);
  const allAdminTokens = adminTokens.map((t) => t.token);

  const results = {
    admin_latencies: [],
    normal_latencies: [],
    errors500: 0,
    connErrors: 0,
    normal403Violations: 0,  // 普通用户收到非403的次数
    normal403Ok: 0,
  };

  const startTime = Date.now();
  let activeWorkers = 0;
  let workersDone = 0;
  const workerPromises = [];

  const adminPaths = [
    `/api/admin/users`,
    `/api/admin/usage`,
    `/api/admin/user-activity?userId=${sampleUserId}`,
  ];

  // Worker: 40% = admin workers, 60% = normal workers
  async function worker(workerId) {
    activeWorkers++;
    const isAdminWorker = workerId < Math.floor(CONCURRENCY * 0.4);
    const token = isAdminWorker
      ? allAdminTokens[workerId % allAdminTokens.length]
      : allNormalTokens[workerId % allNormalTokens.length];

    while (Date.now() - startTime < DURATION_MS) {
      const path = adminPaths[Math.floor(Math.random() * adminPaths.length)];
      const res = await httpGet(baseUrl, path, token);

      if (isAdminWorker) {
        results.admin_latencies.push(res.latency);
        if (res.status === 500) results.errors500++;
        if (res.status === 0) results.connErrors++;
      } else {
        results.normal_latencies.push(res.latency);
        if (res.status === 403) {
          results.normal403Ok++;
        } else {
          results.normal403Violations++;
          if (results.normal403Violations <= 5) {
            // only log first few violations to avoid spam
            console.error(`  [VIOLATION] Normal user got ${res.status} on ${path}`);
          }
        }
        if (res.status === 500) results.errors500++;
        if (res.status === 0) results.connErrors++;
      }

      // Small yield to avoid tight loop
      await sleep(5);
    }

    activeWorkers--;
    workersDone++;
  }

  for (let i = 0; i < CONCURRENCY; i++) {
    workerPromises.push(worker(i));
  }

  // Progress indicator every 5s
  const progressTimer = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const total = results.admin_latencies.length + results.normal_latencies.length;
    console.log(`  [${elapsed}s] active=${activeWorkers} done=${workersDone} total_reqs=${total} 500s=${results.errors500} 403_ok=${results.normal403Ok} 403_violations=${results.normal403Violations}`);
  }, 5000);

  await Promise.all(workerPromises);
  clearInterval(progressTimer);

  // ── Analyze results ──────────────────────────────────────────────────────
  console.log('\n=== RESULTS ===');

  const allLatencies = [
    ...results.admin_latencies,
    ...results.normal_latencies,
  ].sort((a, b) => a - b);

  const p50 = percentile(allLatencies, 50);
  const p95 = percentile(allLatencies, 95);

  const nonAdminAll403 = results.normal403Violations === 0;
  const no500 = results.errors500 === 0;
  const noConnErrors = results.connErrors === 0;
  const totalReqs = allLatencies.length;

  console.log(`  Total requests: ${totalReqs}`);
  console.log(`  Admin requests: ${results.admin_latencies.length}`);
  console.log(`  Normal requests: ${results.normal_latencies.length}`);
  console.log(`  500 errors: ${results.errors500}`);
  console.log(`  Conn errors: ${results.connErrors}`);
  console.log(`  p50 latency: ${p50}ms`);
  console.log(`  p95 latency: ${p95}ms`);
  console.log(`  Normal 403 ok: ${results.normal403Ok}`);
  console.log(`  Normal 403 violations: ${results.normal403Violations}`);
  console.log(`  Clamp works: ${clampWorks} (${clampNote})`);
  console.log(`  No cross-bleed: ${noCrossBleed} (${crossBleedNote})`);

  const allCriteriaMet = nonAdminAll403 && noCrossBleed && no500 && clampWorks;
  const verdict = allCriteriaMet ? 'PASS' : 'FAIL';
  console.log(`\n  VERDICT: ${verdict}`);

  const structured = {
    ran: true,
    seedSize: `ai_usage=${AI_USAGE_SEED}, ops_events=${OPS_EVENTS_SEED}`,
    concurrency: String(CONCURRENCY),
    nonAdminAll403,
    noCrossUserBleed: noCrossBleed,
    no500,
    latencyMs: `p50=${p50}ms, p95=${p95}ms`,
    clampWorks,
    verdict,
    notes: [
      `Platform: ${process.platform}, Node ${process.version}`,
      `总请求量: ${totalReqs} (${results.admin_latencies.length} admin + ${results.normal_latencies.length} normal)`,
      `seed规模缩至ai_usage=${AI_USAGE_SEED}/ops_events=${OPS_EVENTS_SEED}(目标1万~10万;Windows开发机SQLite内存限制,诚实标注)`,
      `clamp: ${clampNote}`,
      `crossBleed: ${crossBleedNote}`,
      noConnErrors ? '' : `连接错误: ${results.connErrors}次`,
    ].filter(Boolean).join('; '),
  };

  console.log('\nLOAD_TEST_RESULT=' + JSON.stringify(structured, null, 2));

  await app.close();
  try { unlinkSync(TEMP_DB); } catch {}

  return structured;
}

main().then(() => {
  process.exit(0);
}).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

/**
 * ops-events.e2e-spec.ts
 *
 * 验证 OpsEventsService 在 AI 降级(AI_FAILOVER)和并发队列满(QUEUE_FULL)两条路径
 * 上能正确写入 ops_events 表。
 *
 * 策略:
 * Suite 1 — OpsEventsService 直接写入:直接调用 record(),查库断言。
 * Suite 2 — AI_FAILOVER 钩子:给 AiService 提供真实 OpsEventsService spy,
 *            mock SDK 主通道挂,断言 record 被调用(跳过 async void 的等待问题)。
 * Suite 3 — QUEUE_FULL 钩子:给 ConcurrencyLimiter 提供真实 OpsEventsService spy,
 *            触发队列满,断言 record 被调用。
 * Suite 4 — recent() / dailyStats() 查询接口。
 */
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';
import { OpsEventsModule } from '../src/ops/ops-events.module';
import { OpsEventsService } from '../src/ops/ops-events.service';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import type { AiConfig } from '../src/config/ai.config';

// ── SDK mock:与 ai-service-structured.spec.ts 保持相同手法 ──────────────────
const createMock = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = { create: createMock };
  },
}));

// ── 工具:生成唯一临时 sqlite 文件 ──────────────────────────────────────────
const tempFiles: string[] = [];
afterAll(() => {
  for (const f of tempFiles) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      // 尽力清理,忽略错误
    }
  }
});

let dbSeq = 0;
function uniqueDb(): string {
  dbSeq += 1;
  const f = join(tmpdir(), `ops-e2e-${process.pid}-${dbSeq}.sqlite`);
  tempFiles.push(f);
  return f;
}

// ── AiConfig stub ────────────────────────────────────────────────────────────
// 通道顺序 relay 在前(主)→ deepseek(备),验证 AI_FAILOVER 钩子按 provider 名记录降级链。
const aiCfg: AiConfig = {
  primaryProvider: 'relay',
  deepseek: {
    apiKey: 'deepseek-key',
    modelPro: 'deepseek-v4-pro',
    modelFlash: 'deepseek-v4-flash',
    baseURL: 'https://api.deepseek.com/anthropic',
    timeoutMs: 120000,
    maxRetries: 3,
  },
  relay: {
    apiKey: 'relay-key',
    model: 'auto-v2',
    baseURL: 'https://api.tutorial.clouddreamai.com',
    timeoutMs: 60000,
    maxRetries: 0,
  },
  // glm 可选第三通道(无 key → 不构造 Provider);AiConfig.glm 为必填字段,fixture 须补齐。
  glm: {
    apiKey: undefined,
    modelPro: 'glm-4.6',
    modelFlash: 'glm-4.5-air',
    baseURL: 'https://open.bigmodel.cn/api/anthropic',
    timeoutMs: 120000,
    maxRetries: 3,
  },
  concurrency: { max: 2, queue: 8 },
};

function makeConfigStub(cfg = aiCfg): ConfigService {
  return {
    get: (key: string): unknown => {
      if (key === 'ai') return cfg;
      if (key === 'ai.concurrency') return cfg.concurrency;
      return undefined;
    },
  } as ConfigService;
}

// ── 构建轻量 ORM 模块(只含 OpsEvent 实体)──────────────────────────────────
async function buildOpsModule(dbPath: string) {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: dbPath,
        entities: [OpsEvent],
        synchronize: true,
      }),
      OpsEventsModule,
    ],
  }).compile();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 1: OpsEventsService 直接写入验证
// ═══════════════════════════════════════════════════════════════════════════════
describe('OpsEventsService: 直接 record 写入', () => {
  it('record(AI_FAILOVER) 写入后 recent() 能查到', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    await svc.record('AI_FAILOVER', { op: 'complete', primary: 'auto-v2', fallback: 'deepseek-chat', error: 'timeout' });

    const events = await svc.recent(10);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('AI_FAILOVER');
    expect(events[0].detail).toMatchObject({ op: 'complete', primary: 'auto-v2' });

    await module.close();
  });

  it('record(QUEUE_FULL) 写入后 recent() 能查到', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    await svc.record('QUEUE_FULL', { active: 2, maxConcurrent: 2, maxQueue: 0 });

    const events = await svc.recent(10);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('QUEUE_FULL');
    expect(events[0].detail).toMatchObject({ maxConcurrent: 2, maxQueue: 0 });

    await module.close();
  });

  it('record(AI_BOTH_DOWN) 写入后 recent() 能查到', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    await svc.record('AI_BOTH_DOWN', { op: 'complete', error: 'both down' });

    const events = await svc.recent(10);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('AI_BOTH_DOWN');

    await module.close();
  });

  it('record 内部 DB 挂了也不抛错(吞掉异常保护主流程)', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    // 注入一个会抛错的 repo
    const repo = (svc as unknown as { repo: { create: jest.Mock; save: jest.Mock } }).repo;
    const origSave = repo.save;
    repo.save = jest.fn().mockRejectedValue(new Error('DB down'));

    // 绝不抛错
    await expect(svc.record('AI_FAILOVER', { x: 1 })).resolves.toBeUndefined();

    repo.save = origSave;
    await module.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 2: AI_FAILOVER 钩子 —— AiService.withFailover 降级时调用 record
// ═══════════════════════════════════════════════════════════════════════════════
describe('OpsEvents: AI_FAILOVER 钩子(AiService 集成)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('主通道抛错 → AiService 降级时调用 OpsEventsService.record(AI_FAILOVER)', async () => {
    // 构建真实 OpsEventsService(内存 SQLite),然后 spy 其 record 方法
    const opsModule = await buildOpsModule(uniqueDb());
    const opsEvents = opsModule.get(OpsEventsService);
    const recordSpy = jest.spyOn(opsEvents, 'record');

    // 主通道挂、备用通道成功
    createMock
      .mockRejectedValueOnce(new Error('Request timed out.'))
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '备用通道响应' }] });

    // 直接构造 AiService,将真实 OpsEventsService 注入
    const limiter = new ConcurrencyLimiter(makeConfigStub(), opsEvents);
    const aiService = new AiService(limiter, opsEvents, makeConfigStub());

    await aiService.complete({ system: '你是助手', prompt: '测试' });

    // 等待 void promise 的异步写入
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(recordSpy).toHaveBeenCalledWith(
      'AI_FAILOVER',
      expect.objectContaining({
        op: 'complete',
        primary: 'relay',
        fallback: 'deepseek',
      }),
    );

    // 还能查到真实写入
    const events = await opsEvents.recent(10);
    expect(events.filter((e) => e.type === 'AI_FAILOVER')).toHaveLength(1);

    await opsModule.close();
  });

  it('主备都失败 → 同时调用 AI_FAILOVER 和 AI_BOTH_DOWN', async () => {
    const opsModule = await buildOpsModule(uniqueDb());
    const opsEvents = opsModule.get(OpsEventsService);
    const recordSpy = jest.spyOn(opsEvents, 'record');

    createMock.mockRejectedValue(new Error('both down'));

    const limiter = new ConcurrencyLimiter(makeConfigStub(), opsEvents);
    const aiService = new AiService(limiter, opsEvents, makeConfigStub());

    await expect(aiService.complete({ system: '你是助手', prompt: '测试' })).rejects.toThrow(
      ServiceUnavailableException,
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const types = recordSpy.mock.calls.map(([t]) => t);
    expect(types).toContain('AI_FAILOVER');
    expect(types).toContain('AI_BOTH_DOWN');

    // 查库验证真实写入
    const events = await opsEvents.recent(10);
    expect(events.filter((e) => e.type === 'AI_FAILOVER')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'AI_BOTH_DOWN')).toHaveLength(1);

    await opsModule.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 3: QUEUE_FULL 钩子 —— ConcurrencyLimiter 队列满时调用 record
// ═══════════════════════════════════════════════════════════════════════════════
describe('OpsEvents: QUEUE_FULL 钩子(ConcurrencyLimiter 集成)', () => {
  it('超出并发上限且队列已满 → ConcurrencyLimiter 调用 record(QUEUE_FULL)', async () => {
    const opsModule = await buildOpsModule(uniqueDb());
    const opsEvents = opsModule.get(OpsEventsService);
    const recordSpy = jest.spyOn(opsEvents, 'record');

    // max=1, queue=0:第一个任务占满并发槽,第二个直接 QUEUE_FULL
    const tightCfg: AiConfig = { ...aiCfg, concurrency: { max: 1, queue: 0 } };
    const limiter = new ConcurrencyLimiter(makeConfigStub(tightCfg), opsEvents);

    // 第一个任务挂起占槽
    let releaseFirst!: () => void;
    const first = limiter.run(
      () => new Promise<void>((resolve) => { releaseFirst = resolve; }),
    );

    // 第二个:队列满 → 立即 503
    await expect(limiter.run(async () => {})).rejects.toBeInstanceOf(ServiceUnavailableException);

    // 等待 void promise 写入
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(recordSpy).toHaveBeenCalledWith(
      'QUEUE_FULL',
      expect.objectContaining({ maxConcurrent: 1, maxQueue: 0 }),
    );

    // 查库验证真实写入
    const events = await opsEvents.recent(10);
    expect(events.filter((e) => e.type === 'QUEUE_FULL')).toHaveLength(1);

    // 释放第一个任务
    releaseFirst();
    await first;

    await opsModule.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 4: OpsEventsService 查询接口
// ═══════════════════════════════════════════════════════════════════════════════
describe('OpsEventsService: recent() & dailyStats()', () => {
  it('recent(N) 限制返回条数', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    await svc.record('AI_FAILOVER', { x: 1 });
    await svc.record('QUEUE_FULL', { x: 2 });
    await svc.record('AI_BOTH_DOWN', { x: 3 });

    const all = await svc.recent(10);
    expect(all).toHaveLength(3);
    // 三类事件均存在(SQLite 同毫秒时倒序不可预测,不断言首条)
    const types = all.map((e) => e.type);
    expect(types).toContain('AI_FAILOVER');
    expect(types).toContain('QUEUE_FULL');
    expect(types).toContain('AI_BOTH_DOWN');

    const limited = await svc.recent(1);
    expect(limited).toHaveLength(1);

    await module.close();
  });

  it('dailyStats() 聚合当日三类事件计数', async () => {
    const module = await buildOpsModule(uniqueDb());
    const svc = module.get(OpsEventsService);

    await svc.record('AI_FAILOVER', { x: 1 });
    await svc.record('AI_FAILOVER', { x: 2 });
    await svc.record('QUEUE_FULL', { x: 3 });

    const stats = await svc.dailyStats(1);
    expect(stats).toHaveLength(1);
    expect(stats[0].AI_FAILOVER).toBe(2);
    expect(stats[0].QUEUE_FULL).toBe(1);
    expect(stats[0].AI_BOTH_DOWN).toBe(0);

    await module.close();
  });
});

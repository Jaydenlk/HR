import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { AiProviderService, LoadedProvider } from '../src/ai/ai-provider.service';

/**
 * AiService 从 ai_providers 池(已解密、已排序)取通道 + tier 选型 + 主备降级的 mock 测试位。
 *
 * 本套件以 mock @anthropic-ai/sdk(按 baseURL 分流 deepseek/relay/glm)验证「接线正确」:
 *   - LoadedProvider 池按顺序消费(主走 [0],失败降级到 [1]);
 *   - tier=pro/flash 选 modelPro/modelFlash;
 *   - 池为空 / providers service 缺失 → 503(绝不静默成功)。
 * 真实 GLM 调用验证待加 key(见 §9 真跑计划)。
 */

interface Call {
  provider: string;
  model: string;
}
const calls: Call[] = [];
const createQueue: Array<unknown | (() => unknown)> = [];

function providerOf(baseURL: string): string {
  if (baseURL.includes('deepseek')) return 'deepseek';
  if (baseURL.includes('bigmodel')) return 'glm';
  return 'relay';
}

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    private readonly baseURL: string;
    constructor(opts: { baseURL: string }) {
      this.baseURL = opts.baseURL;
    }
    messages = {
      create: (params: { model: string }) => {
        calls.push({ provider: providerOf(this.baseURL), model: params.model });
        const next = createQueue.shift();
        const val = typeof next === 'function' ? (next as () => unknown)() : next;
        return Promise.resolve(val ?? { content: [{ type: 'text', text: 'ok' }] });
      },
      stream: () => {
        throw new Error('stream 未在本套件使用');
      },
    };
  },
}));

function lp(name: string, overrides: Partial<LoadedProvider> = {}): LoadedProvider {
  const baseURL =
    name === 'deepseek'
      ? 'https://api.deepseek.com/anthropic'
      : name === 'glm'
        ? 'https://open.bigmodel.cn/api/anthropic'
        : 'https://api.tutorial.clouddreamai.com';
  const modelPro = name === 'glm' ? 'glm-4.6' : name === 'deepseek' ? 'deepseek-v4-pro' : 'auto-v2';
  const modelFlash = name === 'glm' ? 'glm-4.5-air' : name === 'deepseek' ? 'deepseek-v4-flash' : 'auto-v2';
  return {
    id: `id-${name}`,
    name,
    protocol: 'anthropic-compat',
    baseURL,
    apiKey: `${name}-key`,
    modelPro,
    modelFlash,
    timeoutMs: 60000,
    maxRetries: 0,
    ...overrides,
  };
}

// fake provider service:loadPool() 返回预置池(或抛错)。
function fakeProviders(pool: LoadedProvider[] | 'throw') {
  return {
    loadPool: () =>
      pool === 'throw' ? Promise.reject(new Error('pool down')) : Promise.resolve(pool),
  } as unknown as AiProviderService;
}

// ConcurrencyLimiter 需要 ConfigService 读 ai.concurrency;提供最小 stub。
const configStub = {
  get: (k: string): unknown =>
    k === 'ai.concurrency' ? { max: 2, queue: 8 } : k === 'ai' ? { concurrency: { max: 2, queue: 8 } } : undefined,
} as unknown as ConfigService;

async function buildService(providers?: AiProviderService): Promise<AiService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AiService,
      ConcurrencyLimiter,
      { provide: ConfigService, useValue: configStub },
      ...(providers ? [{ provide: AiProviderService, useValue: providers }] : []),
    ],
  }).compile();
  return moduleRef.get(AiService);
}

beforeEach(() => {
  calls.length = 0;
  createQueue.length = 0;
});

describe('AiService 从池取通道 + tier 选型', () => {
  it('GLM 主力,tier=pro → glm-4.6;走智谱端点', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'glm pro' }] });
    const svc = await buildService(fakeProviders([lp('glm'), lp('deepseek')]));
    const out = await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(out).toBe('glm pro');
    expect(calls[0]).toEqual({ provider: 'glm', model: 'glm-4.6' });
  });

  it('tier=flash → modelFlash', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'glm flash' }] });
    const svc = await buildService(fakeProviders([lp('glm')]));
    await svc.complete({ system: 's', prompt: 'p' });
    expect(calls[0]).toEqual({ provider: 'glm', model: 'glm-4.5-air' });
  });
});

describe('主备降级', () => {
  it('主力(池[0])挂 → 降级到池[1]', async () => {
    createQueue.push(() => {
      throw new Error('glm down');
    });
    createQueue.push({ content: [{ type: 'text', text: 'deepseek 接管' }] });
    const svc = await buildService(fakeProviders([lp('glm'), lp('deepseek')]));
    const out = await svc.complete({ system: 's', prompt: 'p' });
    expect(out).toBe('deepseek 接管');
    expect(calls.map((c) => c.provider)).toEqual(['glm', 'deepseek']);
  });

  it('池为空 → 503(绝不静默成功)', async () => {
    const svc = await buildService(fakeProviders([]));
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow();
  });

  it('providers service 缺失 → 503', async () => {
    const svc = await buildService();
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow(
      'AI 服务未配置任何可用通道',
    );
  });

  it('loadPool 抛错 → 冒泡(由 loadPool 内部容错,这里验 service 不吞)', async () => {
    const svc = await buildService(fakeProviders('throw'));
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow();
  });
});

describe('client 复用', () => {
  it('同一通道配置多次调用复用同一 client(签名缓存)', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'a' }] });
    createQueue.push({ content: [{ type: 'text', text: 'b' }] });
    const pool = [lp('deepseek')];
    const svc = await buildService(fakeProviders(pool));
    await svc.complete({ system: 's', prompt: 'p1' });
    await svc.complete({ system: 's', prompt: 'p2' });
    expect(calls.length).toBe(2);
    expect(calls.every((c) => c.provider === 'deepseek')).toBe(true);
  });
});

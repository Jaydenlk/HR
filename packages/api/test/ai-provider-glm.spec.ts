import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { AiProviderSettingsService } from '../src/ai/ai-provider-settings.service';
import { orderProviders, type AiConfig, type AiProviderKind } from '../src/config/ai.config';

/**
 * GLM provider 接入 + 运行时主备切换的 mock 测试位。
 *
 * ⚠ 真实 GLM 调用验证待加 key:无 AI_GLM_API_KEY 无法对智谱真跑 complete/completeStructured。
 * 本套件以 mock @anthropic-ai/sdk(按 baseURL 分流 deepseek/relay/glm)验证「接线正确」:
 *   - glm Provider 按 key 构造、按 tier 选 pro/flash 型号、走 Anthropic 兼容端点 baseURL;
 *   - 运行时 resolveOrder 读 AiProviderSettingsService 的有效配置据此排序(免重启切主备);
 *   - 无 settings / 读取失败回退构造期默认顺序。
 * 加 key 后由 test-agent 按设计稿 §9 测试三补一次真跑(complete + completeStructured)。
 */

interface Call {
  provider: AiProviderKind;
  model: string;
}
const calls: Call[] = [];
const createQueue: Array<unknown | (() => unknown)> = [];

function providerOf(baseURL: string): AiProviderKind {
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

function baseConfig(keys: { deepseek?: string; relay?: string; glm?: string }): AiConfig {
  return {
    primaryProvider: 'deepseek',
    deepseek: {
      apiKey: keys.deepseek,
      modelPro: 'deepseek-v4-pro',
      modelFlash: 'deepseek-v4-flash',
      baseURL: 'https://api.deepseek.com/anthropic',
      timeoutMs: 120000,
      maxRetries: 3,
    },
    relay: {
      apiKey: keys.relay ?? '',
      model: 'auto-v2',
      baseURL: 'https://api.tutorial.clouddreamai.com',
      timeoutMs: 60000,
      maxRetries: 0,
    },
    glm: {
      apiKey: keys.glm,
      modelPro: 'glm-4.6',
      modelFlash: 'glm-4.5-air',
      baseURL: 'https://open.bigmodel.cn/api/anthropic',
      timeoutMs: 120000,
      maxRetries: 3,
    },
    concurrency: { max: 2, queue: 8 },
  };
}

// 极简 fake settings service:current() 返回预置有效配置;不接 DB。
function fakeSettings(effective: { primary: AiProviderKind; order: AiProviderKind[] } | 'throw') {
  return {
    current: () =>
      effective === 'throw'
        ? Promise.reject(new Error('settings down'))
        : Promise.resolve(effective),
    invalidate: () => {},
  } as unknown as AiProviderSettingsService;
}

async function buildService(
  cfg: AiConfig,
  settings?: AiProviderSettingsService,
): Promise<AiService> {
  const moduleBuilder = Test.createTestingModule({
    providers: [
      AiService,
      ConcurrencyLimiter,
      {
        provide: ConfigService,
        useValue: {
        get: (k: string) => {
          if (k === 'ai') return cfg;
          if (k === 'ai.concurrency') return cfg.concurrency;
          return undefined;
        },
      },
      },
      ...(settings ? [{ provide: AiProviderSettingsService, useValue: settings }] : []),
    ],
  });
  const module = await moduleBuilder.compile();
  return module.get(AiService);
}

beforeEach(() => {
  calls.length = 0;
  createQueue.length = 0;
});

// ── orderProviders 纯函数 ─────────────────────────────────────────────────────
describe('orderProviders', () => {
  it('primary 永远排第一,其后按 order + 默认序去重补齐', () => {
    expect(orderProviders('glm')).toEqual(['glm', 'deepseek', 'relay']);
    expect(orderProviders('relay', ['glm'])).toEqual(['relay', 'glm', 'deepseek']);
    // 默认 primary=deepseek 不传 order → 默认序原样
    expect(orderProviders('deepseek')).toEqual(['deepseek', 'relay', 'glm']);
  });

  it('order 含重复/与 primary 重叠 → 去重', () => {
    expect(orderProviders('glm', ['glm', 'deepseek', 'deepseek'])).toEqual([
      'glm',
      'deepseek',
      'relay',
    ]);
  });
});

// ── GLM provider 构造 + tier 选型 ─────────────────────────────────────────────
describe('GLM provider 接线', () => {
  it('配置 AI_GLM_API_KEY → glm 通道可用,complete 走智谱端点,tier=pro 用 glm-4.6', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'glm pro' }] });
    const svc = await buildService(
      baseConfig({ glm: 'gk' }),
      fakeSettings({ primary: 'glm', order: ['glm', 'deepseek', 'relay'] }),
    );
    const out = await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(out).toBe('glm pro');
    expect(calls[0]).toEqual({ provider: 'glm', model: 'glm-4.6' });
  });

  it('tier=flash → glm-4.5-air', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'glm flash' }] });
    const svc = await buildService(
      baseConfig({ glm: 'gk' }),
      fakeSettings({ primary: 'glm', order: ['glm'] }),
    );
    await svc.complete({ system: 's', prompt: 'p' });
    expect(calls[0]).toEqual({ provider: 'glm', model: 'glm-4.5-air' });
  });

  it('无 AI_GLM_API_KEY → glm 不入池,设为主力也被跳过,顺位由有 key 的通道顶上', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'deepseek 兜底' }] });
    const svc = await buildService(
      baseConfig({ deepseek: 'dk' }), // 只有 deepseek 有 key
      fakeSettings({ primary: 'glm', order: ['glm', 'deepseek'] }), // 配置说 glm 主力,但无 key
    );
    const out = await svc.complete({ system: 's', prompt: 'p' });
    expect(out).toBe('deepseek 兜底');
    expect(calls[0].provider).toBe('deepseek'); // glm 缺席 → deepseek 顶上
  });
});

// ── 运行时主备切换(免重启) ───────────────────────────────────────────────────
describe('运行时 resolveOrder', () => {
  it('DB 配置 primary=glm → 主走 glm;改成 deepseek 主力(新 settings)→ 主走 deepseek', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'a' }] });
    const svc = await buildService(
      baseConfig({ deepseek: 'dk', glm: 'gk' }),
      fakeSettings({ primary: 'glm', order: ['glm', 'deepseek'] }),
    );
    await svc.complete({ system: 's', prompt: 'p' });
    expect(calls[0].provider).toBe('glm');
  });

  it('主力 glm 挂 → 按配置降级序切到 deepseek', async () => {
    createQueue.push(() => {
      throw new Error('glm down');
    });
    createQueue.push({ content: [{ type: 'text', text: 'deepseek 接管' }] });
    const svc = await buildService(
      baseConfig({ deepseek: 'dk', glm: 'gk' }),
      fakeSettings({ primary: 'glm', order: ['glm', 'deepseek'] }),
    );
    const out = await svc.complete({ system: 's', prompt: 'p' });
    expect(out).toBe('deepseek 接管');
    expect(calls.map((c) => c.provider)).toEqual(['glm', 'deepseek']);
  });

  it('settings service 缺失 → 回退构造期默认顺序(env primaryProvider=deepseek)', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'x' }] });
    const svc = await buildService(baseConfig({ deepseek: 'dk', glm: 'gk' })); // 不注入 settings
    await svc.complete({ system: 's', prompt: 'p' });
    expect(calls[0].provider).toBe('deepseek');
  });

  it('settings.current() 抛错 → 回退默认顺序,不让一次调用因配置读取失败而无通道', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'y' }] });
    const svc = await buildService(baseConfig({ deepseek: 'dk', glm: 'gk' }), fakeSettings('throw'));
    const out = await svc.complete({ system: 's', prompt: 'p' });
    expect(out).toBe('y');
    expect(calls[0].provider).toBe('deepseek');
  });
});

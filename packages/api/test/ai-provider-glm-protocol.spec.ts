/**
 * 防回退守卫(MINOR ⑤a):glm 通道在 env 回退池(envFallbackPool)与 env→DB 种子(seedFromEnvIfEmpty)里
 * 必须是 protocol='openai-compat'(GLM coding 端点是 OpenAI Chat Completions 兼容,运行期走原生 fetch)。
 * 日后若有人误把它改回 'anthropic-compat',AiService 会走 SDK 路径打错端点 → 本测试立即变红。
 *
 * 不依赖 DB:无 PROVIDER_ENC_KEY → masterKey()=null → buildPool() 直接走 envFallbackPool;
 * 种子路径用一个记录 save 入参的假 Repository 验证种入行的 protocol。
 */
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AiProviderService } from '../src/ai/ai-provider.service';
import { AiProvider } from '../src/ai/entities/ai-provider.entity';
import { aiConfig, AiConfig } from '../src/config/ai.config';

// 64 位 hex = 32 字节,合法主密钥(种子路径需要)。
const TEST_MASTER_KEY = 'b'.repeat(64);

function configWith(ai: AiConfig): ConfigService {
  return { get: (k: string): unknown => (k === 'ai' ? ai : undefined) } as unknown as ConfigService;
}

describe('glm 通道 protocol 守卫(防误改回 anthropic-compat)', () => {
  const savedGlm = process.env.AI_GLM_API_KEY;
  const savedEnc = process.env.PROVIDER_ENC_KEY;

  afterEach(() => {
    if (savedGlm === undefined) delete process.env.AI_GLM_API_KEY;
    else process.env.AI_GLM_API_KEY = savedGlm;
    if (savedEnc === undefined) delete process.env.PROVIDER_ENC_KEY;
    else process.env.PROVIDER_ENC_KEY = savedEnc;
  });

  it('envFallbackPool:有 glm key + 无主密钥 → loadPool 回退池里 glm 为 openai-compat', async () => {
    process.env.AI_GLM_API_KEY = 'glm-fallback-key';
    delete process.env.PROVIDER_ENC_KEY; // 无主密钥 → 走 envFallbackPool
    const ai = aiConfig() as AiConfig;
    // repo 不应被触达(无主密钥时 buildPool 直接回退,不查库);给个会爆的占位以确保没走 DB 路径。
    const repo = {
      find: () => Promise.reject(new Error('buildPool 不应在无主密钥时查库')),
    } as unknown as Repository<AiProvider>;
    const svc = new AiProviderService(repo, configWith(ai));
    const pool = await svc.loadPool();
    const glm = pool.find((p) => p.name === 'glm');
    expect(glm).toBeDefined();
    expect(glm!.protocol).toBe('openai-compat');
    expect(glm!.baseURL).toBe('https://open.bigmodel.cn/api/coding/paas/v4');
  });

  it('seedFromEnvIfEmpty:表空 + 有 glm key + 有主密钥 → 种入的 glm 行 protocol=openai-compat', async () => {
    process.env.AI_GLM_API_KEY = 'glm-seed-key';
    process.env.PROVIDER_ENC_KEY = TEST_MASTER_KEY;
    const ai = aiConfig() as AiConfig;
    let saved: AiProvider[] = [];
    const repo = {
      count: () => Promise.resolve(0), // 表空 → 触发种子
      create: (row: Partial<AiProvider>) => ({ ...row }) as AiProvider,
      save: (rows: AiProvider[]) => {
        saved = rows;
        return Promise.resolve(rows);
      },
    } as unknown as Repository<AiProvider>;
    const svc = new AiProviderService(repo, configWith(ai));
    await svc.seedFromEnvIfEmpty();
    const glm = saved.find((r) => r.name === 'glm');
    expect(glm).toBeDefined();
    expect(glm!.protocol).toBe('openai-compat');
  });
});

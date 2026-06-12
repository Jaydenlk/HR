import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import type { AiConfig } from '../src/config/ai.config';

// 模块级 mock @anthropic-ai/sdk:auto-mock 不会填充运行时创建的 messages 实例属性,
// 故用工厂返回一个 messages.create 指向可控 createMock 的类,避免任何 as unknown as 断言。
const createMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: class {
      messages = { create: createMock };
    },
  };
});

const STRUCTURED_PARAMS = {
  system: '你是一个结构化解析器',
  prompt: '解析这段内容',
  toolName: 'parse',
  toolDescription: '将内容解析为结构化数据',
  schema: { type: 'object' as const },
};

const emptyToolUse = { content: [{ type: 'tool_use', name: 'parse', input: {} }] };
const validToolUse = (input: Record<string, unknown>) => ({
  content: [{ type: 'tool_use', name: 'parse', input }],
});
const textResponse = (text: string) => ({ content: [{ type: 'text', text }] });

/**
 * 构造一个带 mock ConfigService 的 AiService 实例。
 * 沿用历史语义:primaryKey=主通道(此处映射到 relay,通道顺序 relay 在前),fallbackKey=备通道(deepseek)。
 * 单 key 时只有 relay 一个通道("主通道");双 key 时 relay→deepseek 降级链。
 */
async function buildService(primaryKey: string, fallbackKey?: string): Promise<AiService> {
  const aiCfg: AiConfig = {
    primaryProvider: 'relay',
    deepseek: {
      apiKey: fallbackKey,
      modelPro: 'deepseek-v4-pro',
      modelFlash: 'deepseek-v4-flash',
      baseURL: 'https://api.deepseek.com/anthropic',
      timeoutMs: 120000,
      maxRetries: 3,
    },
    relay: {
      apiKey: primaryKey,
      model: 'auto-v2',
      baseURL: 'https://api.tutorial.clouddreamai.com',
      timeoutMs: 60000,
      maxRetries: 0,
    },
    concurrency: { max: 2, queue: 8 },
  };

  const module = await Test.createTestingModule({
    providers: [
      AiService,
      ConcurrencyLimiter,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            if (key === 'ai') return aiCfg;
            if (key === 'ai.concurrency') return aiCfg.concurrency;
            return undefined;
          },
        },
      },
    ],
  }).compile();

  return module.get(AiService);
}

// 背景:autoV2 中转偶发对强制 tool_use 返回空块({} 或无 tool_use),概率个位数 %、与业务无关。
// 因此 completeStructured 把空块当瞬时故障,最多尝试 3 次取非空;全空才抛 503(可重试)。
describe('AiService.completeStructured 空返回硬化(autoV2 偶发空 tool_use)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('首次空 {} → 重试拿到非空并返回', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: true }));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ ok: boolean }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('连续两次空 {} → 第三次非空仍救回(单通道最多 4 次尝试,命中即返回)', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: true }));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ ok: boolean }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('连续空 {} 耗尽 → 抛 ServiceUnavailableException(503,可重试),绝不静默返回空', async () => {
    createMock.mockResolvedValue(emptyToolUse);

    const svc = await buildService('test-key');
    await expect(svc.completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    // ATTEMPTS=4:空 tool_use 在单通道内最多重试 4 次(含纠正轮 + 抬温扰动打破 DeepSeek prefill 锁定)。
    expect(createMock).toHaveBeenCalledTimes(4);
  });

  it('完全无 tool_use 块 → 视为空,耗尽重试后抛 503', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: '抱歉无法解析' }] });

    const svc = await buildService('test-key');
    await expect(svc.completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createMock).toHaveBeenCalledTimes(4);
  });

  it('首次即非空 → 只调用一次、原样返回(正常路径未退化)', async () => {
    const payload = { name: '张三', skills: ['SQL'] };
    createMock.mockResolvedValueOnce(validToolUse(payload));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<typeof payload>(STRUCTURED_PARAMS);

    expect(result).toEqual(payload);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

// 降级:默认主通道 autoV2;主通道抛错(超时/连接/5xx)或空块耗尽时,自动切到 DeepSeek 备用通道;主备都失败才抛 503。
describe('AiService 主备降级(默认 autoV2,失败降级 DeepSeek)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('主通道抛错(超时/连接)→ 自动降级到 DeepSeek 并返回其结果', async () => {
    createMock
      .mockRejectedValueOnce(new Error('Request timed out.'))
      .mockResolvedValueOnce(validToolUse({ ok: 'fallback' }));

    const svc = await buildService('primary-key', 'fallback-key');
    const result = await svc.completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    // 拿到 fallback 专属载荷即证明走了备用通道(若无降级,主通道抛错会直接 503)
    expect(result).toEqual({ ok: 'fallback' });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('主通道连续空块耗尽 → 降级到 DeepSeek 救回', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: 'fallback' }));

    const svc = await buildService('primary-key', 'fallback-key');
    const result = await svc.completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: 'fallback' });
    expect(createMock).toHaveBeenCalledTimes(5); // 主通道 4 次空(ATTEMPTS=4)+ 备用 1 次非空
  });

  it('主备都失败 → 抛 ServiceUnavailableException(503)', async () => {
    createMock.mockRejectedValue(new Error('both down'));

    const svc = await buildService('primary-key', 'fallback-key');
    await expect(svc.completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createMock).toHaveBeenCalledTimes(2); // 主 1 次抛 + 备 1 次抛
  });

  it('主通道成功 → 不触发降级(备用通道不被调用)', async () => {
    createMock.mockResolvedValueOnce(validToolUse({ ok: 'primary' }));

    const svc = await buildService('primary-key', 'fallback-key');
    const result = await svc.completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: 'primary' });
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

// schema 校验:enum 成员校验 + oneOf/anyOf 分支匹配。
// 目标:非法 enum 走既有重试链(不直接 503),null 经 oneOf/anyOf 的 {type:'null'} 分支放行。
describe('AiService.completeStructured schema 校验(enum + oneOf/anyOf)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  const enumSchema = {
    type: 'object' as const,
    required: ['level'],
    properties: { level: { type: 'string', enum: ['初级', '中级', '高级'] } },
  };

  it('enum 值非法 → 当作不完整,重试拿到合法值后返回', async () => {
    createMock
      .mockResolvedValueOnce(validToolUse({ level: '特级' })) // 枚举漂移,非法
      .mockResolvedValueOnce(validToolUse({ level: '高级' })); // 合法

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ level: string }>({
      ...STRUCTURED_PARAMS,
      schema: enumSchema,
    });

    expect(result).toEqual({ level: '高级' });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('enum 值合法 → 首次即返回(未误伤合法成员)', async () => {
    createMock.mockResolvedValueOnce(validToolUse({ level: '中级' }));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ level: string }>({
      ...STRUCTURED_PARAMS,
      schema: enumSchema,
    });

    expect(result).toEqual({ level: '中级' });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('enum 值持续非法 → 走重试链耗尽后抛 503(不静默透传非法枚举)', async () => {
    createMock.mockResolvedValue(validToolUse({ level: '特级' }));

    const svc = await buildService('test-key');
    await expect(
      svc.completeStructured({ ...STRUCTURED_PARAMS, schema: enumSchema }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(createMock).toHaveBeenCalledTimes(4);
  });

  it('oneOf 含 {type:"null"} 分支 → 该字段为 null 时放行(不误伤"无数据"信号)', async () => {
    const oneOfSchema = {
      type: 'object' as const,
      required: ['salary'],
      properties: {
        salary: {
          oneOf: [
            { type: 'object', required: ['min'], properties: { min: { type: 'number' } } },
            { type: 'null' },
          ],
        },
      },
    };
    createMock.mockResolvedValueOnce(validToolUse({ salary: null }));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ salary: null }>({
      ...STRUCTURED_PARAMS,
      schema: oneOfSchema,
    });

    expect(result).toEqual({ salary: null });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('anyOf 命中其中一支(对象分支) → 放行', async () => {
    const anyOfSchema = {
      type: 'object' as const,
      required: ['salary'],
      properties: {
        salary: {
          anyOf: [
            { type: 'object', required: ['min'], properties: { min: { type: 'number' } } },
            { type: 'null' },
          ],
        },
      },
    };
    createMock.mockResolvedValueOnce(validToolUse({ salary: { min: 12000 } }));

    const svc = await buildService('test-key');
    const result = await svc.completeStructured<{ salary: { min: number } }>({
      ...STRUCTURED_PARAMS,
      schema: anyOfSchema,
    });

    expect(result).toEqual({ salary: { min: 12000 } });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('oneOf 全分支均不匹配 → 当作不完整走重试链', async () => {
    const oneOfSchema = {
      type: 'object' as const,
      required: ['salary'],
      properties: {
        salary: {
          oneOf: [
            { type: 'object', required: ['min'], properties: { min: { type: 'number' } } },
            { type: 'null' },
          ],
        },
      },
    };
    // salary 是字符串,既非含 min 的对象也非 null → 两支皆不中
    createMock.mockResolvedValue(validToolUse({ salary: '面议' }));

    const svc = await buildService('test-key');
    await expect(
      svc.completeStructured({ ...STRUCTURED_PARAMS, schema: oneOfSchema }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(createMock).toHaveBeenCalledTimes(4);
  });
});

// complete()(纯文本):无 text 块 / 仅空 text 时必须抛错走 withFailover,绝不静默返回 ''
// (否则求职信等用户面产物会被持久化为空白)。
describe('AiService.complete 空文本硬化', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  const COMPLETE_PARAMS = { system: '你是写作助手', prompt: '写一封求职信' };

  it('有文本 → 原样返回', async () => {
    createMock.mockResolvedValueOnce(textResponse('尊敬的招聘官,您好...'));

    const svc = await buildService('test-key');
    const result = await svc.complete(COMPLETE_PARAMS);

    expect(result).toBe('尊敬的招聘官,您好...');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('无 text 块(仅 tool_use)→ 抛错降级到备用通道救回', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse) // 主通道无 text 块
      .mockResolvedValueOnce(textResponse('来自备用通道的求职信'));

    const svc = await buildService('primary-key', 'fallback-key');
    const result = await svc.complete(COMPLETE_PARAMS);

    expect(result).toBe('来自备用通道的求职信');
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('text 为空串 → 视为无内容,主备皆空时抛 503(不持久化空白)', async () => {
    createMock.mockResolvedValue(textResponse(''));

    const svc = await buildService('primary-key', 'fallback-key');
    await expect(svc.complete(COMPLETE_PARAMS)).rejects.toThrow(ServiceUnavailableException);
    expect(createMock).toHaveBeenCalledTimes(2); // 主 1 + 备 1
  });

  it('无 fallback 且主通道无文本 → 直接抛 503', async () => {
    createMock.mockResolvedValue(emptyToolUse);

    const svc = await buildService('test-key');
    await expect(svc.complete(COMPLETE_PARAMS)).rejects.toThrow(ServiceUnavailableException);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

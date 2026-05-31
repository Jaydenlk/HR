import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../src/ai/ai.service';

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

// 背景:autoV2 中转偶发对强制 tool_use 返回空块({} 或无 tool_use),概率个位数 %、与业务无关。
// 因此 completeStructured 把空块当瞬时故障,最多尝试 3 次取非空;全空才抛 503(可重试)。
describe('AiService.completeStructured 空返回硬化(autoV2 偶发空 tool_use)', () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    delete process.env.DEEPSEEK_API_KEY; // 本组只验主通道行为:无降级时与历史行为一致
  });

  it('首次空 {} → 重试拿到非空并返回', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: true }));

    const result = await new AiService().completeStructured<{ ok: boolean }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('连续两次空 {} → 第三次非空仍救回(最多 3 次尝试)', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: true }));

    const result = await new AiService().completeStructured<{ ok: boolean }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('三次都空 {} → 抛 ServiceUnavailableException(503,可重试),绝不静默返回空', async () => {
    createMock.mockResolvedValue(emptyToolUse);

    await expect(new AiService().completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('完全无 tool_use 块 → 视为空,三次后抛 503', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: '抱歉无法解析' }] });

    await expect(new AiService().completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it('首次即非空 → 只调用一次、原样返回(正常路径未退化)', async () => {
    const payload = { name: '张三', skills: ['SQL'] };
    createMock.mockResolvedValueOnce(validToolUse(payload));

    const result = await new AiService().completeStructured<typeof payload>(STRUCTURED_PARAMS);

    expect(result).toEqual(payload);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

// 降级:默认主通道 autoV2;主通道抛错(超时/连接/5xx)或空块耗尽时,自动切到 DeepSeek 备用通道;主备都失败才抛 503。
describe('AiService 主备降级(默认 autoV2,失败降级 DeepSeek)', () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.CLOUDDREAM_API_KEY = 'primary-key';
    process.env.DEEPSEEK_API_KEY = 'fallback-key';
  });
  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
  });

  it('主通道抛错(超时/连接)→ 自动降级到 DeepSeek 并返回其结果', async () => {
    createMock
      .mockRejectedValueOnce(new Error('Request timed out.'))
      .mockResolvedValueOnce(validToolUse({ ok: 'fallback' }));

    const result = await new AiService().completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    // 拿到 fallback 专属载荷即证明走了备用通道(若无降级,主通道抛错会直接 503)
    expect(result).toEqual({ ok: 'fallback' });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('主通道连续空块耗尽 → 降级到 DeepSeek 救回', async () => {
    createMock
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(emptyToolUse)
      .mockResolvedValueOnce(validToolUse({ ok: 'fallback' }));

    const result = await new AiService().completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: 'fallback' });
    expect(createMock).toHaveBeenCalledTimes(4); // 主通道 3 次空 + 备用 1 次非空
  });

  it('主备都失败 → 抛 ServiceUnavailableException(503)', async () => {
    createMock.mockRejectedValue(new Error('both down'));

    await expect(new AiService().completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createMock).toHaveBeenCalledTimes(2); // 主 1 次抛 + 备 1 次抛
  });

  it('主通道成功 → 不触发降级(备用通道不被调用)', async () => {
    createMock.mockResolvedValueOnce(validToolUse({ ok: 'primary' }));

    const result = await new AiService().completeStructured<{ ok: string }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: 'primary' });
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

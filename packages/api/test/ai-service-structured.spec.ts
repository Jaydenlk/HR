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

describe('AiService.completeStructured 空返回硬化', () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.CLOUDDREAM_API_KEY = 'test-key';
  });

  it('首次空对象 {} → 重试一次拿到非空结果并返回', async () => {
    createMock
      .mockResolvedValueOnce({ content: [{ type: 'tool_use', name: 'parse', input: {} }] })
      .mockResolvedValueOnce({ content: [{ type: 'tool_use', name: 'parse', input: { ok: true } }] });

    const result = await new AiService().completeStructured<{ ok: boolean }>(STRUCTURED_PARAMS);

    expect(result).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('两次都返回空 {} → 抛错,绝不静默返回空', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'tool_use', name: 'parse', input: {} }] });

    await expect(new AiService().completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      'CloudDreamAI 为工具 "parse" 返回了空结果(重试后仍为空)',
    );
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('完全无 tool_use 块 → 同样视为空并重试后抛错', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: '抱歉无法解析' }] });

    await expect(new AiService().completeStructured(STRUCTURED_PARAMS)).rejects.toThrow(
      'CloudDreamAI 为工具 "parse" 返回了空结果(重试后仍为空)',
    );
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('首次即返回非空 → 只调用一次、原样返回(正常路径未退化)', async () => {
    const payload = { name: '张三', skills: ['SQL'] };
    createMock.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'parse', input: payload }],
    });

    const result = await new AiService().completeStructured<typeof payload>(STRUCTURED_PARAMS);

    expect(result).toEqual(payload);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

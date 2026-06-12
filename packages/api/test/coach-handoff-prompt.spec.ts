/**
 * coach-handoff-prompt.spec.ts
 * Step 4 验证:system prompt 中含有 handoff 标记格式说明和「不适时不输出」约束
 */
import { ChatService } from '../src/conversations/chat.service';

// ChatService 只依赖 AiService,这里仅测 buildSystemPrompt 纯字符串逻辑,不需要 DI。
const mockAi = {} as never;
const svc = new ChatService(mockAi);

describe('ChatService.buildSystemPrompt — handoff marker rules', () => {
  const prompt = svc.buildSystemPrompt();

  it('含有 <handoff> 标记格式说明', () => {
    expect(prompt).toContain('<handoff>');
  });

  it('包含合法 target 列表(mock/diagnosis/cover_letter/resume_rewrite)', () => {
    expect(prompt).toContain('mock');
    expect(prompt).toContain('diagnosis');
    expect(prompt).toContain('cover_letter');
    expect(prompt).toContain('resume_rewrite');
  });

  it('包含「不适时不输出」类约束文字', () => {
    // 检查「禁止输出」或「不输出」的限制段存在
    expect(prompt).toMatch(/禁止输出标记|不输出|尚未表达/);
  });

  it('包含「一次最多一张」的约束', () => {
    expect(prompt).toMatch(/最多一张|不输出两个/);
  });
});

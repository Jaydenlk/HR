/**
 * B2 修复批验证:F3 简历截断 / F4 消息限长 / F5 目录查询合并
 *
 * F3:CoachContextService.truncateResumeText 独立小函数。
 * F4:SendMessageDto @MaxLength(4000) class-validator 验证。
 * F5:gatherSelectorCatalog 一次查询供两处复用(通过 spy 断言查询次数)。
 */

import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CoachContextService } from '../src/conversations/coach-context.service';
import { SendMessageDto } from '../src/conversations/dto/send-message.dto';

// ── F3:简历截断 ───────────────────────────────────────────────────────────────
describe('F3 CoachContextService.truncateResumeText', () => {
  it('短简历不截断', () => {
    const text = '这是一段短简历。';
    expect(CoachContextService.truncateResumeText(text)).toBe(text);
  });

  it('恰好 6000 字不截断', () => {
    const text = 'A'.repeat(6000);
    expect(CoachContextService.truncateResumeText(text)).toBe(text);
  });

  it('7000 字简历截断到 6000 字并追加标注', () => {
    const text = 'B'.repeat(7000);
    const result = CoachContextService.truncateResumeText(text);
    // 前 6000 字保留
    expect(result.startsWith('B'.repeat(6000))).toBe(true);
    // 追加截断提示
    expect(result).toContain('简历过长');
    expect(result).toContain('前 6000 字');
    // 不含超限部分
    expect(result.slice(0, 6000)).not.toContain('C');
  });

  it('截断后总长度受控(不超过合理上限)', () => {
    const text = 'X'.repeat(50000);
    const result = CoachContextService.truncateResumeText(text);
    // 6000 字 + 一行提示文字,不会无限增长
    expect(result.length).toBeLessThan(6100);
  });
});

// ── F4:消息长度上限 ───────────────────────────────────────────────────────────
describe('F4 SendMessageDto @MaxLength(4000)', () => {
  async function validateDto(content: string) {
    const dto = plainToInstance(SendMessageDto, { content });
    return validate(dto);
  }

  it('正常消息通过校验', async () => {
    const errors = await validateDto('你好,帮我看看简历');
    expect(errors).toHaveLength(0);
  });

  it('恰好 4000 字通过校验', async () => {
    const errors = await validateDto('A'.repeat(4000));
    expect(errors).toHaveLength(0);
  });

  it('4001 字触发 MaxLength 400', async () => {
    const errors = await validateDto('A'.repeat(4001));
    expect(errors.length).toBeGreaterThan(0);
    const contentError = errors.find((e) => e.property === 'content');
    expect(contentError).toBeDefined();
    expect(Object.keys(contentError!.constraints ?? {})).toContain('maxLength');
    // 错误文案可读(中文提示)
    expect(contentError!.constraints?.maxLength).toContain('4000');
  });

  it('空字符串触发 MinLength', async () => {
    const errors = await validateDto('');
    expect(errors.length).toBeGreaterThan(0);
    const contentError = errors.find((e) => e.property === 'content');
    expect(contentError).toBeDefined();
  });
});

// ── F5:目录查询合并 ───────────────────────────────────────────────────────────
// 通过注入 spy 断言 gatherSelectorCatalog 只做一次并发查询(两仓 Promise.all = 2 次 find 而非旧版的 4-6 次)。
describe('F5 gatherSelectorCatalog 查询次数', () => {
  // 构造最小 CoachContextService stub:只断言数据库查询次数,不测试 AI 行为。
  function buildService() {
    // 空用户:诊断/求职信都是空数组,选择器短路返回 ''
    const diagnosisRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    const coverLetterRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    const resumeRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    // evidence.gather / formatForAI stub
    const evidence = {
      gather: jest.fn().mockResolvedValue({}),
      formatForAI: jest.fn().mockReturnValue(''),
    };
    const ai = {
      completeStructured: jest.fn(),
    };

    // 直接实例化:绕过 NestJS DI(仅测试纯逻辑)
    const svc = new CoachContextService(
      evidence as never,
      ai as never,
      resumeRepo as never,
      diagnosisRepo as never,
      coverLetterRepo as never,
    );
    return { svc, diagnosisRepo, coverLetterRepo };
  }

  it('loadReferencedProducts:diagnosisRepo.find 仅调用 1 次(合并查询)', async () => {
    const { svc, diagnosisRepo } = buildService();
    await svc.loadReferencedProducts('user-1', '帮我看上次的诊断');
    // gatherSelectorCatalog 内 diagnosisRepo.find 仅调用一次(旧版会调用 2 次:gatherCatalogIds + describeCatalogForSelector)
    expect(diagnosisRepo.find).toHaveBeenCalledTimes(1);
  });

  it('loadReferencedProducts:coverLetterRepo.find 仅调用 1 次(合并查询)', async () => {
    const { svc, coverLetterRepo } = buildService();
    await svc.loadReferencedProducts('user-1', '查我的求职信');
    expect(coverLetterRepo.find).toHaveBeenCalledTimes(1);
  });
});

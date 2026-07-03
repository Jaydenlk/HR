import { Test } from '@nestjs/testing';
import { AiService } from '../src/ai/ai.service';
import { RecruitEventParserService } from '../src/feed/recruit-event-parser.service';
import type { RecruitRawItem } from '../src/feed/recruit-event-parser.service';

describe('RecruitEventParserService', () => {
  const ai = {
    complete: jest.fn<Promise<string>, [{ system: string; prompt: string; maxTokens?: number }]>(),
  };
  let service: RecruitEventParserService;

  const items: RecruitRawItem[] = [
    { row_number: 1, raw_text: '公司: 字节跳动; 类型: 网申开启; 日期: 2026-08-01', raw_link: 'https://a.example.com' },
    { row_number: 2, raw_text: '公司: 阿里巴巴; 类型: 宣讲会; 日期: 2026-08-15', raw_link: null },
  ];

  beforeEach(async () => {
    ai.complete.mockReset();
    const module = await Test.createTestingModule({
      providers: [RecruitEventParserService, { provide: AiService, useValue: ai }],
    }).compile();
    service = module.get(RecruitEventParserService);
  });

  it('normalizes a well-formed batch response', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: '字节跳动', role_hint: '后端开发', event_type: '网申开启', event_date: '2026-08-01', city: '北京', apply_url: 'https://jobs.bytedance.com/1', confidence: 'high' },
        { row_number: 2, company: '阿里巴巴', role_hint: null, event_type: '宣讲会', event_date: '2026-08-15', city: '杭州', apply_url: null, confidence: 'medium' },
      ]),
    );

    const result = await service.parseBatch(items);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ row_number: 1, company: '字节跳动', event_type: '网申开启', city: '北京' });
    expect(result[0].event_date?.toISOString().slice(0, 10)).toBe('2026-08-01');
    expect(result[0].apply_url).toBe('https://jobs.bytedance.com/1');
  });

  it('drops a row when company is null (缺公司主体的条目不落库)', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: null, role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
        { row_number: 2, company: '阿里巴巴', role_hint: null, event_type: '宣讲会', event_date: '2026-08-15', city: '杭州', apply_url: null, confidence: 'medium' },
      ]),
    );

    const result = await service.parseBatch(items);

    expect(result).toHaveLength(1);
    expect(result[0].row_number).toBe(2);
  });

  it('falls back event_type to 其他 when invalid or missing', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: '字节跳动', role_hint: null, event_type: 'not-a-real-type', event_date: null, city: null, apply_url: null, confidence: 'low' },
      ]),
    );

    const result = await service.parseBatch([items[0]]);

    expect(result[0].event_type).toBe('其他');
  });

  it('禁止编造日期:模糊/无效日期一律返回 null,不推断补全', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: '字节跳动', role_hint: null, event_type: '网申开启', event_date: '近期', city: null, apply_url: null, confidence: 'low' },
      ]),
    );

    const result = await service.parseBatch([items[0]]);

    expect(result[0].event_date).toBeNull();
  });

  it('apply_url 兜底:AI 未抽到具体链接时回退到输入行自带的真实链接(非编造)', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: '字节跳动', role_hint: null, event_type: '网申开启', event_date: null, city: null, apply_url: null, confidence: 'low' },
      ]),
    );

    const result = await service.parseBatch([items[0]]);

    expect(result[0].apply_url).toBe('https://a.example.com');
  });

  it('apply_url 兜底:输入行本身也没有链接时保持 null,不编造', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 2, company: '阿里巴巴', role_hint: null, event_type: '宣讲会', event_date: null, city: null, apply_url: null, confidence: 'low' },
      ]),
    );

    const result = await service.parseBatch([items[1]]);

    expect(result[0].apply_url).toBeNull();
  });

  it('rejects invalid JSON output', async () => {
    ai.complete.mockResolvedValue('not-json');
    await expect(service.parseBatch(items)).rejects.toThrow('Recruit event parser returned invalid JSON');
  });

  it('rejects a non-array JSON output', async () => {
    ai.complete.mockResolvedValue(JSON.stringify({ not: 'an array' }));
    await expect(service.parseBatch(items)).rejects.toThrow('Recruit event parser did not return a JSON array');
  });

  it('discards entries whose row_number does not match any input item', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 999, company: '幽灵公司', role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
        { row_number: 1, company: '字节跳动', role_hint: null, event_type: '网申开启', event_date: '2026-08-01', city: null, apply_url: null, confidence: 'high' },
      ]),
    );

    const result = await service.parseBatch(items);

    expect(result).toHaveLength(1);
    expect(result[0].company).toBe('字节跳动');
  });

  it('keeps only the first entry when the AI duplicates a row_number', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify([
        { row_number: 1, company: '字节跳动', role_hint: null, event_type: '网申开启', event_date: '2026-08-01', city: null, apply_url: null, confidence: 'high' },
        { row_number: 1, company: '重复行', role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
      ]),
    );

    const result = await service.parseBatch([items[0]]);

    expect(result).toHaveLength(1);
    expect(result[0].company).toBe('字节跳动');
  });

  it('returns an empty array without calling AI when given no items', async () => {
    const result = await service.parseBatch([]);
    expect(result).toEqual([]);
    expect(ai.complete).not.toHaveBeenCalled();
  });
});

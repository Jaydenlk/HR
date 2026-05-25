import { Test } from '@nestjs/testing';
import { AiService } from '../src/ai/ai.service';
import { FeedClassifierService } from '../src/feed/feed-classifier.service';
import type { FeedCandidate } from '../src/feed/importers/feed-importer.interface';

describe('FeedClassifierService', () => {
  const ai = {
    complete: jest.fn<Promise<string>, [{ system: string; prompt: string; maxTokens?: number }]>(),
  };
  let service: FeedClassifierService;

  const candidate: FeedCandidate = {
    source_kind: 'xhs',
    source_name: '小红书面经',
    source_url: 'https://www.xiaohongshu.com/explore/pdd-product-interview',
    external_id: 'https://www.xiaohongshu.com/explore/pdd-product-interview',
    title: 'PDD 产品一面复盘，顺手对比了一下字节',
    content: '目标公司是拼多多，岗位是产品经理。内容里只把字节作为对比对象。',
    author: 'candidate',
    published_at: null,
    fetched_at: new Date('2026-05-25T00:00:00.000Z'),
    raw: {},
  };

  beforeEach(async () => {
    ai.complete.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        FeedClassifierService,
        { provide: AiService, useValue: ai },
      ],
    }).compile();
    service = module.get(FeedClassifierService);
  });

  it('keeps target interview company separate from comparison companies', async () => {
    ai.complete.mockResolvedValue(JSON.stringify({
      category: 'interview_exp',
      title: 'PDD 产品一面复盘',
      summary: '候选人复盘拼多多产品岗一面，重点是增长实验和高压追问。',
      company: '拼多多',
      role: '产品经理',
      outcome: null,
      tags: {
        companies: ['拼多多'],
        roles: ['产品经理'],
        topics: ['增长实验'],
      },
      quality_score: 82,
    }));

    const result = await service.classify(candidate);

    expect(result.company).toBe('拼多多');
    expect(result.tags.companies).toEqual(['拼多多']);
    expect(result.tags.companies).not.toContain('字节跳动');
    expect(result.quality_score).toBe(82);
  });

  it('rejects invalid classifier JSON', async () => {
    ai.complete.mockResolvedValue('not-json');

    await expect(service.classify(candidate)).rejects.toThrow('Feed classifier returned invalid JSON');
  });

  it('clamps quality score and falls back unknown category', async () => {
    ai.complete.mockResolvedValue(JSON.stringify({
      category: 'random',
      title: '',
      summary: '',
      company: '',
      role: '',
      outcome: '',
      tags: { companies: ['拼多多'], roles: [], topics: [] },
      quality_score: 180,
    }));

    const result = await service.classify(candidate);

    expect(result.category).toBe('job_tips');
    expect(result.title).toBe(candidate.title);
    expect(result.company).toBeNull();
    expect(result.quality_score).toBe(100);
  });
});


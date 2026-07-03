/**
 * CompanyResearchService 单元测试
 *
 * 覆盖设计文档 step→verify 要求的 5 类场景（gates 门3 单独核对）：
 *   缓存精确命中 / 形似名不命中 / 7 天过期 / 候选全量提取 / 无 key 降级
 * 另覆盖：GLM 上下文匹配高置信排序、无上下文降级、按 source_url 去重、findById。
 */
import { CompanyResearchService } from './company-research.service';
import { CompanyResearch } from './entities/company-research.entity';
import { normalizeCompanyName } from './normalize';

/** 极简内存 Repository 伪实现：以 canonical_name 为主键做 find/create/save，贴近真实 upsert 语义。 */
function makeFakeRepo(seed: Partial<CompanyResearch>[] = []) {
  const rows = new Map<string, CompanyResearch>();
  for (const s of seed) {
    const row = { id: `seed-${rows.size}`, raw: null, ...s } as CompanyResearch;
    rows.set(row.canonical_name, row);
  }
  let counter = 0;

  return {
    findOne: jest.fn(async ({ where }: { where: { canonical_name?: string; id?: string } }) => {
      if (where.id) {
        return [...rows.values()].find((r) => r.id === where.id) ?? null;
      }
      return rows.get(where.canonical_name ?? '') ?? null;
    }),
    create: jest.fn((partial: Partial<CompanyResearch>) => partial as CompanyResearch),
    save: jest.fn(async (partial: Partial<CompanyResearch>) => {
      const existing = rows.get(partial.canonical_name as string);
      const saved: CompanyResearch = {
        id: existing?.id ?? `new-${counter++}`,
        canonical_name: partial.canonical_name as string,
        display_name: partial.display_name as string,
        summary: partial.summary as string,
        source_url: partial.source_url as string,
        source_domain: partial.source_domain as string,
        retrieved_at: partial.retrieved_at as Date,
        raw: (partial.raw as Record<string, unknown> | null) ?? null,
      };
      rows.set(saved.canonical_name, saved);
      return saved;
    }),
    _rows: rows,
  };
}

function makeBocha(impl?: (query: string, options?: { include?: string }) => unknown) {
  return { search: jest.fn(impl ?? (async () => ({ available: false, reason: 'no_key' }))) };
}

function makeAi(impl?: (args: unknown) => unknown) {
  return { completeStructured: jest.fn(impl ?? (async () => ({ rankings: [] }))) };
}

function makeService({
  repo = makeFakeRepo(),
  bocha = makeBocha(),
  ai = makeAi(),
} = {}) {
  return {
    svc: new CompanyResearchService(repo as any, bocha as any, ai as any),
    repo,
    bocha,
    ai,
  };
}

describe('CompanyResearchService — 缓存精确命中', () => {
  it('canonical_name 精确相等且 7 天内 → 直接返回单候选，不调用博查', async () => {
    const canonical = normalizeCompanyName('字节跳动');
    const repo = makeFakeRepo([
      {
        canonical_name: canonical,
        display_name: '字节跳动',
        summary: '短视频与内容科技公司',
        source_url: 'https://a.com/bytedance',
        source_domain: 'a.com',
        retrieved_at: new Date(), // 刚查过
      },
    ]);
    const bocha = makeBocha();
    const { svc } = makeService({ repo, bocha });

    const result = await svc.search('字节跳动');

    expect(bocha.search).not.toHaveBeenCalled();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe('字节跳动');
  });
});

describe('CompanyResearchService — 形似名不命中缓存', () => {
  it('相近但不同的公司名不会命中已有缓存，会触发真实搜索', async () => {
    const repo = makeFakeRepo([
      {
        canonical_name: normalizeCompanyName('字节跳动有限公司'),
        display_name: '字节跳动',
        summary: '短视频公司',
        source_url: 'https://a.com/bytedance',
        source_domain: 'a.com',
        retrieved_at: new Date(),
      },
    ]);
    const bocha = makeBocha(async () => ({
      available: true,
      items: [{ name: '字节跳动网络技术有限公司', url: 'https://b.com/x', summary: '另一家主体' }],
    }));
    const { svc } = makeService({ repo, bocha });

    // 形似但不同：输入是"字节跳动网络技术有限公司"，缓存键是"字节跳动"，归一化后不相等。
    const result = await svc.search('字节跳动网络技术有限公司');

    expect(bocha.search).toHaveBeenCalled(); // 未走缓存，真实发起了搜索
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe('字节跳动网络技术有限公司');
  });
});

describe('CompanyResearchService — 7 天缓存过期', () => {
  it('retrieved_at 超过 7 天 → 视为过期，重新真实搜索', async () => {
    const canonical = normalizeCompanyName('量子翻斗云科技');
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const repo = makeFakeRepo([
      {
        canonical_name: canonical,
        display_name: '量子翻斗云科技',
        summary: '旧简介(8天前)',
        source_url: 'https://old.com/x',
        source_domain: 'old.com',
        retrieved_at: eightDaysAgo,
      },
    ]);
    const bocha = makeBocha(async () => ({
      available: true,
      items: [{ name: '量子翻斗云科技', url: 'https://new.com/x', summary: '新简介' }],
    }));
    const { svc } = makeService({ repo, bocha });

    const result = await svc.search('量子翻斗云科技');

    expect(bocha.search).toHaveBeenCalled();
    expect(result.candidates[0].summary).toBe('新简介');
    expect(result.candidates[0].source_url).toBe('https://new.com/x');
  });
});

describe('CompanyResearchService — 候选全量提取(不截断)', () => {
  it('两路查询合并去重后候选数量 >5 时全量返回，不裁剪到 top3-5', async () => {
    const generalItems = Array.from({ length: 6 }, (_, i) => ({
      name: `候选公司${i}`,
      url: `https://general.com/${i}`,
      summary: `简介${i}`,
    }));
    const strongItems = Array.from({ length: 6 }, (_, i) => ({
      name: `候选公司${i + 6}`,
      url: `https://qcc.com/${i}`,
      summary: `简介${i + 6}`,
    }));
    const bocha = makeBocha(async (_query, options) => ({
      available: true,
      items: options?.include ? strongItems : generalItems,
    }));
    const { svc } = makeService({ bocha });

    const result = await svc.search('某冷门公司');

    expect(bocha.search).toHaveBeenCalledTimes(2);
    expect(result.candidates).toHaveLength(12); // 6+6 全量，无 slice(0, N)
  });

  it('两路查询按 source_url 去重合并，不产生重复候选', async () => {
    const bocha = makeBocha(async (_query, options) => ({
      available: true,
      items: options?.include
        ? [
            { name: '重复公司', url: 'https://dup.com/x', summary: '强召回路径的同一条' },
            { name: '独有候选B', url: 'https://qcc.com/only', summary: '仅强召回命中' },
          ]
        : [{ name: '重复公司', url: 'https://dup.com/x', summary: '通用路径的同一条' }],
    }));
    const { svc } = makeService({ bocha });

    const result = await svc.search('某公司');

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((c) => c.source_url).sort()).toEqual(
      ['https://dup.com/x', 'https://qcc.com/only'].sort(),
    );
  });
});

describe('CompanyResearchService — 无 key 降级', () => {
  it('两路查询均因无 key 不可用 → 返回空候选 + reason:no_key，不落库', async () => {
    const repo = makeFakeRepo();
    const bocha = makeBocha(async () => ({ available: false, reason: 'no_key' }));
    const { svc, repo: repoRef } = makeService({ repo, bocha });

    const result = await svc.search('任意公司');

    expect(result).toEqual({ candidates: [], reason: 'no_key' });
    expect(repoRef.save).not.toHaveBeenCalled();
  });
});

describe('CompanyResearchService — GLM 上下文匹配', () => {
  it('多候选 + 有上下文 + 高置信(≥0.85 且分差≥0.15) → 首位为 AI 最看好的候选', async () => {
    const bocha = makeBocha(async () => ({
      available: true,
      items: [
        { name: '候选A', url: 'https://a.com', summary: 'A' },
        { name: '候选B', url: 'https://b.com', summary: 'B' },
      ],
    }));
    const ai = makeAi(async () => ({
      rankings: [
        { index: 1, confidence: 0.92 },
        { index: 0, confidence: 0.3 },
      ],
    }));
    const { svc } = makeService({ bocha, ai });

    const result = await svc.search('候选', { jdText: '某岗位 JD 文本' });

    expect(ai.completeStructured).toHaveBeenCalledTimes(1);
    expect(result.candidates[0].name).toBe('候选B');
  });

  it('无上下文时不调用 GLM，直接进入人工消歧，候选全量原序返回', async () => {
    const bocha = makeBocha(async () => ({
      available: true,
      items: [
        { name: '候选A', url: 'https://a.com', summary: 'A' },
        { name: '候选B', url: 'https://b.com', summary: 'B' },
      ],
    }));
    const ai = makeAi();
    const { svc } = makeService({ bocha, ai });

    const result = await svc.search('候选');

    expect(ai.completeStructured).not.toHaveBeenCalled();
    expect(result.candidates).toHaveLength(2);
  });

  it('置信度分差不明显(<0.15)时不采信排序，降级人工消歧', async () => {
    const bocha = makeBocha(async () => ({
      available: true,
      items: [
        { name: '候选A', url: 'https://a.com', summary: 'A' },
        { name: '候选B', url: 'https://b.com', summary: 'B' },
      ],
    }));
    const ai = makeAi(async () => ({
      rankings: [
        { index: 1, confidence: 0.9 },
        { index: 0, confidence: 0.86 }, // 分差仅 0.04，未达 0.15 门槛
      ],
    }));
    const { svc } = makeService({ bocha, ai });

    const result = await svc.search('候选', { jdText: 'JD' });

    // 未采信 GLM 排序，保持博查合并原序(候选A 在前)
    expect(result.candidates[0].name).toBe('候选A');
  });
});

describe('CompanyResearchService — findById(防伪造用)', () => {
  it('按 id 返回真实库内记录', async () => {
    const repo = makeFakeRepo([
      {
        canonical_name: 'x',
        display_name: '某公司',
        summary: '简介',
        source_url: 'https://x.com',
        source_domain: 'x.com',
        retrieved_at: new Date(),
      },
    ]);
    const { svc } = makeService({ repo });

    const row = await svc.findById('seed-0');
    expect(row?.display_name).toBe('某公司');

    const missing = await svc.findById('not-exist');
    expect(missing).toBeNull();
  });
});

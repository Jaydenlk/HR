import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfessionPresetsService } from '../src/profession-presets/profession-presets.service';

describe('ProfessionPresetsService', () => {
  let svc: ProfessionPresetsService;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ providers: [ProfessionPresetsService] }).compile();
    svc = mod.get(ProfessionPresetsService);
  });

  it('list() returns deduped professions with their available tiers', () => {
    const list = svc.list().flatMap((g) => g.options);
    const pm = list.find((o) => o.profession === '互联网产品经理');
    expect(pm).toBeDefined();
    // 同职业去重为一条,含两个难度档
    expect(list.filter((o) => o.profession === '互联网产品经理')).toHaveLength(1);
    expect(pm!.tiers.map((t) => t.tier).sort()).toEqual(['pressure', 'standard']);
  });

  it('defaults to standard tier (fusion preset) and weights sum to 100', () => {
    const p = svc.resolveByProfession('互联网产品经理');
    expect(p.id).toBe('product-manager-campus');
    expect(p.tier).toBe('standard');
    expect(p.dimensions.reduce((s, d) => s + d.weight, 0)).toBe(100);
  });

  it('resolves standard tier to the fusion preset', () => {
    const p = svc.resolveByProfession('互联网产品经理', 'standard');
    expect(p.id).toBe('product-manager-campus');
    expect(p.tier).toBe('standard');
  });

  it('resolves pressure tier to the Anthropic high-standard preset', () => {
    const p = svc.resolveByProfession('互联网产品经理', 'pressure');
    expect(p.id).toBe('product-manager-campus-anthropic');
    expect(p.tier).toBe('pressure');
    expect(p.dimensions.reduce((s, d) => s + d.weight, 0)).toBe(100);
  });

  it('throws NotFound for unknown profession', () => {
    expect(() => svc.resolveByProfession('星际探险家')).toThrow(NotFoundException);
  });

  it('throws NotFound for an unsupported (profession, tier) combination', () => {
    // 已知职业但未注册的档位组合也应抛错(此处用未知职业的 pressure 验证组合键不串)
    expect(() => svc.resolveByProfession('星际探险家', 'pressure')).toThrow(NotFoundException);
  });

  it('list() 按大类分组:所有注册职业恰好归入一个大类(无"其他"兜底、无重复、大类有序)', () => {
    const groups = svc.list();
    // 出现"其他"说明有职业未在 CATEGORY_ORDER 归类或职业串写错 → 必须为 0
    expect(groups.some((g) => g.category === '其他')).toBe(false);
    const all = groups.flatMap((g) => g.options.map((o) => o.profession));
    expect(new Set(all).size).toBe(all.length); // 无重复
    expect(groups.map((g) => g.category)).toEqual([
      '技术研发', '产品 · 运营', '设计', '数据', '市场 · 销售', '金融', '财务', '人力资源', '职能 · 法务', '咨询 · 战略', '行业 · 垂类',
    ]);
    for (const g of groups) expect(g.options.length).toBeGreaterThan(0);
  });

  it('every registered preset has exactly 5 dimensions and weights summing to 100', () => {
    for (const opt of svc.list().flatMap((g) => g.options)) {
      for (const { tier } of opt.tiers) {
        const p = svc.resolveByProfession(opt.profession, tier);
        expect(p.dimensions).toHaveLength(5);
        expect(p.dimensions.reduce((s, d) => s + d.weight, 0)).toBe(100);
      }
    }
  });

  it('exposes the finance 大类 professions (standard tier) in list()', () => {
    const professions = svc.list().flatMap((g) => g.options).map((o) => o.profession);
    expect(professions).toEqual(
      expect.arrayContaining(['财务管培生', '审计(事务所)', '会计核算', '财务分析/FP&A']),
    );
    for (const prof of ['财务管培生', '审计(事务所)', '会计核算', '财务分析/FP&A']) {
      const p = svc.resolveByProfession(prof);
      expect(p.tier).toBe('standard');
      expect(p.stage).toBe('campus');
    }
  });

  it('exposes the tech-cluster professions (standard tier) in list()', () => {
    const professions = svc.list().flatMap((g) => g.options).map((o) => o.profession);
    expect(professions).toEqual(
      expect.arrayContaining(['后端开发', '算法(含大模型)', '前端/客户端', '测试开发', '运营(含AIGC)']),
    );
    for (const prof of ['后端开发', '算法(含大模型)', '前端/客户端', '测试开发', '运营(含AIGC)']) {
      const p = svc.resolveByProfession(prof);
      expect(p.tier).toBe('standard');
      expect(p.stage).toBe('campus');
    }
  });

  it('exposes the securities / P2 / HR cluster professions (standard tier) in list()', () => {
    const professions = svc.list().flatMap((g) => g.options).map((o) => o.profession);
    const added = [
      '证券研究/行业研究', '投行(IBD)', '风控/风险管理', '量化研究/交易',
      '数据分析师', '销售', '设计师(UI/UX)', '市场营销',
      '招聘/校园招聘', 'HRBP', '薪酬福利(C&B)',
    ];
    expect(professions).toEqual(expect.arrayContaining(added));
    for (const prof of added) {
      const p = svc.resolveByProfession(prof);
      expect(p.tier).toBe('standard');
      expect(p.stage).toBe('campus');
    }
  });
});

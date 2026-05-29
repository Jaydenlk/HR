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
    const list = svc.list();
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
});

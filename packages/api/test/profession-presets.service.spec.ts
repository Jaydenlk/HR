import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfessionPresetsService } from '../src/profession-presets/profession-presets.service';

describe('ProfessionPresetsService', () => {
  let svc: ProfessionPresetsService;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ providers: [ProfessionPresetsService] }).compile();
    svc = mod.get(ProfessionPresetsService);
  });
  it('lists at least the MVP preset', () => {
    expect(svc.list().find((p) => p.id === 'product-manager-campus')).toBeDefined();
  });
  it('resolves a known profession', () => {
    const p = svc.resolveByProfession('互联网产品经理');
    expect(p.id).toBe('product-manager-campus');
    expect(p.dimensions.reduce((s, d) => s + d.weight, 0)).toBe(100);
  });
  it('throws NotFound for unknown profession', () => {
    expect(() => svc.resolveByProfession('星际探险家')).toThrow(NotFoundException);
  });
});

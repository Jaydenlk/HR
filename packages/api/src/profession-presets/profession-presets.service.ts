import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionPreset } from '../common/types';
import { productManagerCampus } from './presets/product-manager-campus';

const PRESETS: ProfessionPreset[] = [productManagerCampus];

@Injectable()
export class ProfessionPresetsService {
  private readonly byId = new Map(PRESETS.map((p) => [p.id, p]));
  private readonly byProfession = new Map(PRESETS.map((p) => [p.profession, p]));
  list(): ProfessionPreset[] { return [...this.byId.values()]; }
  resolveById(id: string): ProfessionPreset {
    const p = this.byId.get(id);
    if (!p) throw new NotFoundException(`未知职业预设: ${id}`);
    return p;
  }
  resolveByProfession(profession: string): ProfessionPreset {
    const p = this.byProfession.get(profession);
    if (!p) throw new NotFoundException(`暂不支持该职业的校招诊断: ${profession}`);
    return p;
  }
}

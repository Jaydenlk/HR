import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionPreset, ProfessionTier } from '../common/types';
import { productManagerCampus } from './presets/product-manager-campus';
import { productManagerCampusAnthropic } from './presets/product-manager-campus-anthropic';

const PRESETS: ProfessionPreset[] = [productManagerCampus, productManagerCampusAnthropic];

const tierKey = (profession: string, tier: ProfessionTier): string => `${profession}::${tier}`;

export interface ProfessionOption {
  profession: string;
  tiers: Array<{ tier: ProfessionTier; presetId: string; displayName: string }>;
}

@Injectable()
export class ProfessionPresetsService {
  private readonly byId = new Map(PRESETS.map((p) => [p.id, p]));
  private readonly byProfessionTier = new Map(PRESETS.map((p) => [tierKey(p.profession, p.tier), p]));

  /** 去重的职业清单(每个职业含其可用难度档),供前端下拉/档位开关使用。 */
  list(): ProfessionOption[] {
    const grouped = new Map<string, ProfessionOption>();
    for (const p of PRESETS) {
      const opt = grouped.get(p.profession) ?? { profession: p.profession, tiers: [] };
      opt.tiers.push({ tier: p.tier, presetId: p.id, displayName: p.displayName });
      grouped.set(p.profession, opt);
    }
    return [...grouped.values()];
  }

  /** 某职业可用的难度档(按注册顺序)。未知职业抛 NotFound。 */
  tiersForProfession(profession: string): ProfessionTier[] {
    const tiers = PRESETS.filter((p) => p.profession === profession).map((p) => p.tier);
    if (tiers.length === 0) {
      throw new NotFoundException(`暂不支持该职业的校招诊断: ${profession}`);
    }
    return tiers;
  }

  resolveByProfession(profession: string, tier: ProfessionTier = 'standard'): ProfessionPreset {
    const p = this.byProfessionTier.get(tierKey(profession, tier));
    if (!p) {
      throw new NotFoundException(`暂不支持该职业/难度档的校招诊断: ${profession} (${tier})`);
    }
    return p;
  }
}

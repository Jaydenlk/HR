import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionPreset, ProfessionTier } from '../common/types';
import { productManagerCampus } from './presets/product-manager-campus';
import { productManagerCampusAnthropic } from './presets/product-manager-campus-anthropic';
import { financeManagementTraineeCampus } from './presets/finance-management-trainee-campus';
import { auditorFirmCampus } from './presets/auditor-firm-campus';
import { accountantGlCampus } from './presets/accountant-gl-campus';
import { fpaAnalystCampus } from './presets/fpa-analyst-campus';
import { backendCampus } from './presets/backend-campus';
import { algorithmCampus } from './presets/algorithm-campus';
import { frontendCampus } from './presets/frontend-campus';
import { testDevCampus } from './presets/test-dev-campus';
import { operationsCampus } from './presets/operations-campus';

const PRESETS: ProfessionPreset[] = [
  productManagerCampus,
  productManagerCampusAnthropic,
  financeManagementTraineeCampus,
  auditorFirmCampus,
  accountantGlCampus,
  fpaAnalystCampus,
  backendCampus,
  algorithmCampus,
  frontendCampus,
  testDevCampus,
  operationsCampus,
];

const tierKey = (profession: string, tier: ProfessionTier): string => `${profession}::${tier}`;

export interface ProfessionOption {
  profession: string;
  tiers: Array<{ tier: ProfessionTier; presetId: string; displayName: string }>;
}

@Injectable()
export class ProfessionPresetsService {
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

  resolveByProfession(profession: string, tier: ProfessionTier = 'standard'): ProfessionPreset {
    const p = this.byProfessionTier.get(tierKey(profession, tier));
    if (!p) {
      throw new NotFoundException(`暂不支持该职业/难度档的校招诊断: ${profession} (${tier})`);
    }
    return p;
  }
}

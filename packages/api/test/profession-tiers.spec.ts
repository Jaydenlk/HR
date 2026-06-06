import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../src/ai/ai.module';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { AiService } from '../src/ai/ai.service';
import { ProfessionPresetsService } from '../src/profession-presets/profession-presets.service';
import { ProfessionPreset, ProfessionStandardResult } from '../src/common/types';
import { aiConfig } from '../src/config/ai.config';

const LIVE = process.env.RUN_AI_LIVE === '1';

/**
 * P1 双难度档验证(AI live,真跑 CloudDreamAI):
 *  - 引擎按 tier 解析:standard→融合版、pressure→Anthropic 高标准版
 *  - 两档各跑一次 analyzeAgainstPreset:返回 5 维带 why、total∈[0,100]、每维 score∈[0,max]
 *  - 融合版的 gap 里能看到反模式风味(方案先行/虚荣指标/盲目对标/Non-Goals/样样P0)
 */
const RESUME = JSON.stringify({
  basic_info: { name: '李明', phone: '138****0000', email: 'liming@example.com' },
  education: [
    {
      school: '华东师范大学',
      degree: '本科',
      major: '信息管理与信息系统',
      gpa: '3.7/4.0(专业前15%)',
      duration: '2022.09-2026.06',
    },
  ],
  work_experience: [
    {
      company: '某在线教育公司',
      title: '产品实习生(用户增长方向)',
      start_date: '2025.06',
      end_date: '2025.09',
      description:
        '参与 K12 续报小程序的需求调研与迭代:访谈了12位续报家长、整理了近300条客服工单,定位到"续报流程步骤多、价格信息不透明"两个核心痛点;撰写了续报优化的 PRD,推动其中"一键续报"功能上线。',
      achievements: ['续报转化率从 8% 提升到 11%', '续报流程平均耗时从 4 步降到 2 步'],
    },
  ],
  projects: [
    {
      name: '校园二手交易平台(课程实践项目,4人组,任组长)',
      duration: '2024.03-2024.06',
      description:
        '作为组长主导从0到1的产品设计:做了竞品分析(对比闲鱼、转转、校园墙三类方案),输出了 PRD 与原型(Axure),协调2名开发和1名设计推动 MVP 上线。',
      achievements: ['两周内累计注册用户 600+', '完成交易 80 余笔'],
    },
  ],
  skills: {
    technical: ['SQL', 'Axure', 'Excel 数据透视', 'Figma 基础'],
    soft: ['跨职能协作', '需求文档撰写', '用户访谈'],
    languages: ['英语 CET-6'],
    certifications: [],
  },
});

function assertFiveDimsWithWhy(preset: ProfessionPreset, res: ProfessionStandardResult): void {
  expect(preset.dimensions.length).toBe(5);
  expect(res.dimensions.length).toBe(5);
  expect(res.total_score).toBeGreaterThanOrEqual(0);
  expect(res.total_score).toBeLessThanOrEqual(100);
  for (const d of res.dimensions) {
    expect(d.why.trim().length).toBeGreaterThan(0);
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThanOrEqual(d.max);
  }
}

(LIVE ? describe : describe.skip)('Profession dual-tier analyze (AI live)', () => {
  let analyzer: AnalyzerService;
  let presets: ProfessionPresetsService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [aiConfig] }), AiModule],
      providers: [ProfessionPresetsService],
    }).compile();
    analyzer = mod.get(AnalyzerService);
    presets = mod.get(ProfessionPresetsService);
  });

  it('standard(融合版): 5 维带 why,total∈[0,100],gap 含反模式风味', async () => {
    const preset = presets.resolveByProfession('互联网产品经理', 'standard');
    const res = await analyzer.analyzeAgainstPreset(RESUME, preset);
    // eslint-disable-next-line no-console
    console.log(`[standard] ${preset.displayName} total=${res.total_score}`);
    for (const d of res.dimensions) {
      // eslint-disable-next-line no-console
      console.log(`  [${d.name}] ${d.score}/${d.max} gap: ${(d.gap || '').slice(0, 90)}`);
    }
    assertFiveDimsWithWhy(preset, res);
    // 融合版反模式风味:gap 里应出现方法论命名词之一
    const allGaps = res.dimensions.map((d) => `${d.gap ?? ''} ${d.why ?? ''}`).join(' ');
    const flavor = ['方案先行', '虚荣指标', '盲目对标', 'Non-Goal', '样样P0'];
    expect(flavor.some((kw) => allGaps.includes(kw))).toBe(true);
  }, 200000);

  it('pressure(Anthropic 高标准版): 5 维带 why,total∈[0,100]', async () => {
    const preset = presets.resolveByProfession('互联网产品经理', 'pressure');
    const res = await analyzer.analyzeAgainstPreset(RESUME, preset);
    // eslint-disable-next-line no-console
    console.log(`[pressure] ${preset.displayName} total=${res.total_score}`);
    for (const d of res.dimensions) {
      // eslint-disable-next-line no-console
      console.log(`  [${d.name}] ${d.score}/${d.max} why: ${d.why.slice(0, 70)}`);
    }
    assertFiveDimsWithWhy(preset, res);
  }, 200000);
});

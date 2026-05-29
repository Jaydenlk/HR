import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { RewriterService } from '../src/ai/rewriter.service';
import { AiService } from '../src/ai/ai.service';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';
import { productManagerCampusAnthropic } from '../src/profession-presets/presets/product-manager-campus-anthropic';
import { ProfessionPreset, ProfessionStandardResult, RewriteSuggestion } from '../src/common/types';

// A/B 原型:同一份简历,approach-1(现有手写版)vs approach-2(Anthropic 框架适配版)。
// 不走注册表(两版 id 同名 profession),直接 import 两个常量对比。重点是把两套真实诊断打印出来。
const RESUME = JSON.stringify({
  basic_info: { name: '李明', phone: '138****0000', email: 'liming@example.com' },
  education: [
    {
      school: '华东师范大学',
      degree: '本科',
      major: '信息管理与信息系统',
      gpa: '3.7/4.0(专业前15%)',
      duration: '2022.09-2026.06',
      courses: ['数据结构', '数据库原理', '用户体验设计', '统计学', '运营管理'],
    },
  ],
  work_experience: [
    {
      company: '某在线教育公司',
      title: '产品实习生(用户增长方向)',
      start_date: '2025.06',
      end_date: '2025.09',
      description:
        '参与 K12 续报小程序的需求调研与迭代:访谈了12位续报家长、整理了近300条客服工单,定位到"续报流程步骤多、价格信息不透明"两个核心痛点;撰写了续报优化的 PRD,推动其中"一键续报"功能上线;协助数据同学搭建了续报漏斗看板。',
      achievements: ['续报转化率从 8% 提升到 11%', '续报流程平均耗时从 4 步降到 2 步'],
    },
    {
      company: '某本地生活平台',
      title: '产品运营实习生',
      start_date: '2024.07',
      end_date: '2024.09',
      description:
        '负责到店团购品类的商家活动运营,参与了一次"周三半价"促销活动的策划与复盘;每周拉取活动数据做简单分析,向运营负责人汇报;协助梳理了商家入驻流程的体验问题清单。',
      achievements: ['参与的促销活动带动品类周 GMV 环比增长约 20%'],
    },
  ],
  projects: [
    {
      name: '校园二手交易平台(课程实践项目,4人组,任组长)',
      duration: '2024.03-2024.06',
      description:
        '作为组长主导从0到1的产品设计:做了竞品分析(对比闲鱼、转转、校园墙三类方案),输出了 PRD 与原型(Axure),协调2名开发和1名设计推动 MVP 上线;上线后在3个学院做了小范围推广。',
      achievements: ['两周内累计注册用户 600+', '完成交易 80 余笔', '课程项目答辩获评年级第一'],
    },
  ],
  skills: {
    technical: ['SQL', 'Axure', 'Excel 数据透视', 'Figma 基础', 'A/B 测试基础概念'],
    soft: ['跨职能协作', '需求文档撰写', '用户访谈'],
    languages: ['英语 CET-6'],
    certifications: [],
  },
  self_evaluation:
    '对产品有热情,做事踏实负责,具备一定的数据分析与用户洞察能力,希望从事用户增长/C端产品方向的工作。',
});

function logResult(label: string, preset: ProfessionPreset, res: ProfessionStandardResult): void {
  // eslint-disable-next-line no-console
  console.log(`\n======== ${label} | ${preset.displayName} (${preset.id}) ========`);
  // eslint-disable-next-line no-console
  console.log(`total_score = ${res.total_score}`);
  for (const d of res.dimensions) {
    // eslint-disable-next-line no-console
    console.log(
      `  [${d.name}] ${d.score}/${d.max}\n    why: ${d.why.slice(0, 80)}` +
        (d.gap ? `\n    gap: ${d.gap.slice(0, 80)}` : ''),
    );
  }
}

function logSuggestions(label: string, suggestions: RewriteSuggestion[]): void {
  // eslint-disable-next-line no-console
  console.log(`\n---- ${label} 前3条改写建议 ----`);
  suggestions.slice(0, 3).forEach((s, i) => {
    // eslint-disable-next-line no-console
    console.log(
      `  #${i + 1} [${s.section}/${s.priority}]\n    original: ${(s.original || '(新增建议,无原文)').slice(0, 80)}` +
        `\n    suggested: ${s.suggested.slice(0, 80)}` +
        `\n    reason: ${s.reason.slice(0, 80)}`,
    );
  });
}

describe('A/B 预设对比 (AI live): approach-1 手写版 vs approach-2 Anthropic框架版', () => {
  let analyzer: AnalyzerService;
  let rewriter: RewriterService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AnalyzerService, RewriterService, AiService],
    }).compile();
    analyzer = mod.get(AnalyzerService);
    rewriter = mod.get(RewriterService);
  });

  // 宽松断言:返回 5 维、total ∈ [0,100]、每维 score ∈ [0,max]、why 非空、权重和=100、有改写建议。
  function assertLoose(preset: ProfessionPreset, res: ProfessionStandardResult, sug: RewriteSuggestion[]): void {
    expect(res.dimensions.length).toBe(preset.dimensions.length);
    expect(preset.dimensions.length).toBe(5);
    expect(preset.dimensions.reduce((s, dim) => s + dim.weight, 0)).toBe(100);
    expect(res.total_score).toBeGreaterThanOrEqual(0);
    expect(res.total_score).toBeLessThanOrEqual(100);
    for (const d of res.dimensions) {
      expect(d.why.trim().length).toBeGreaterThan(0);
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(d.max);
    }
    expect(sug.length).toBeGreaterThan(0);
  }

  // 拆成两个用例:每套 2 次 AI 调用(analyze+suggest)。auto-v2 中转 + 偶发空结果重试,
  // 内容充足的简历单套实测 ~200s 上下,故给 300s/用例预算(--runInBand 串行,互不抢占)。
  it('approach-1 手写版:打印真实诊断+改写建议', async () => {
    const res = await analyzer.analyzeAgainstPreset(RESUME, productManagerCampus);
    const sug = await rewriter.suggestAgainstPreset(RESUME, productManagerCampus, res);
    logResult('approach-1', productManagerCampus, res);
    logSuggestions('approach-1', sug);
    assertLoose(productManagerCampus, res, sug);
  }, 300000);

  it('approach-2 Anthropic框架版:打印真实诊断+改写建议', async () => {
    const res = await analyzer.analyzeAgainstPreset(RESUME, productManagerCampusAnthropic);
    const sug = await rewriter.suggestAgainstPreset(RESUME, productManagerCampusAnthropic, res);
    logResult('approach-2', productManagerCampusAnthropic, res);
    logSuggestions('approach-2', sug);
    assertLoose(productManagerCampusAnthropic, res, sug);
  }, 300000);
});

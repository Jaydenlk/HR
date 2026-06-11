import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../src/ai/ai.module';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { RewriterService } from '../src/ai/rewriter.service';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';
import { renderResumeForReview } from '../src/ai/prompts/analyze-profession-standard';
import { aiConfig } from '../src/config/ai.config';
import { ParsedResume } from '../src/common/types';

// 真 AI 验证(RUN_AI_LIVE=1,主备均 deepseek-chat)。自拟夹具,不取材任何外部 testset。
// 三场景:(a) 3 处时间矛盾→显著标注;(b) 夸大数字→无"数字可信"背书+不进高分区+改写含补口径;(c) 正常→无误伤。

const LIVE = process.env.RUN_AI_LIVE === '1';

// (a) 自拟:含 3 处时间矛盾 —— ①实习早于入学 ②项目结束早于开始 ③大三在读却写远期毕业年
const RESUME_TIMELINE: ParsedResume = {
  basic_info: { name: '李明' },
  summary: '本人目前大三在读,积极寻找产品方向实习。',
  work_experience: [
    {
      company: '字节跳动',
      title: '产品实习生',
      start_date: '2021-06',
      end_date: '2021-09',
      description: '参与电商商家工具需求调研,撰写PRD',
      achievements: ['推动优惠券模板上线'],
    },
  ],
  education: [
    { school: '某重点大学', degree: '本科', major: '信息管理', graduation_date: `2023-${new Date().getFullYear() + 6}` },
  ],
  skills: { technical: ['SQL', 'Axure'], soft: [], languages: [], certifications: [] },
  projects: [
    { name: '校园二手平台', description: '项目周期 2024.09-2024.03,担任产品负责人,完成竞品分析', technologies: [], role: '负责人' },
  ],
  links: [],
  awards_honors: [],
};

// (b) 自拟:夸大数字(2个月增长200%、转化率45%、复购60%,均无基数/口径)
const RESUME_EXAGGERATED: ParsedResume = {
  basic_info: { name: '王芳' },
  summary: '互联网产品方向应届生。',
  work_experience: [
    {
      company: '某电商公司',
      title: '产品实习生',
      start_date: '2025-06',
      end_date: '2025-09',
      description: '负责会员增长项目,上线 2 个月内将销售额增长 200%,把下单转化率做到 45%,推动复购率提升至 60%',
      achievements: ['增长 200%', '转化率 45%', '复购率 60%'],
    },
  ],
  education: [
    { school: '某大学', degree: '本科', major: '市场营销', graduation_date: '2022-2026' },
  ],
  skills: { technical: ['SQL', '数据分析'], soft: [], languages: [], certifications: [] },
  projects: [],
  links: [],
  awards_honors: [],
};

// (c) 自拟:正常简历(时间自洽、数字合理)
const RESUME_NORMAL: ParsedResume = {
  basic_info: { name: '张三' },
  summary: '互联网产品方向应届生,求职产品经理。',
  work_experience: [
    {
      company: '某科技公司',
      title: '产品实习生',
      start_date: '2025-06',
      end_date: '2025-09',
      description: '负责商家工具需求调研,主导一次需求评审,推动优惠券功能上线,将转化率从 18% 提升到 27%,留存提升 9%',
      achievements: ['转化率 18%→27%', '留存 +9%'],
    },
  ],
  education: [
    { school: '某重点大学', degree: '本科', major: '信息管理与信息系统', graduation_date: '2022-2026' },
  ],
  skills: { technical: ['SQL', 'Axure', '数据分析'], soft: [], languages: [], certifications: [] },
  projects: [
    { name: '校园二手平台', description: '项目周期 2024.03-2024.06,担任产品负责人,完成竞品分析与用户访谈30份', technologies: [], role: '负责人' },
  ],
  links: [],
  awards_honors: ['全国大学生市场调研大赛二等奖'],
};

(LIVE ? describe : describe.skip)('引擎守卫 真 AI 验证(deepseek-chat)', () => {
  let analyzer: AnalyzerService;
  let rewriter: RewriterService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [aiConfig] }), AiModule],
    }).compile();
    analyzer = mod.get(AnalyzerService);
    rewriter = mod.get(RewriterService);
  });

  it('(a) 含 3 处时间矛盾 → 报告显著标注时间线矛盾', async () => {
    const res = await analyzer.analyzeAgainstPreset(
      renderResumeForReview(RESUME_TIMELINE),
      productManagerCampus,
      null,
      RESUME_TIMELINE,
    );
    const timelineChecks = res.conventionChecks.filter((c) => c.key.includes('时间线矛盾'));
    console.log('[live a] 时间线核查命中数:', timelineChecks.length);
    console.log('[live a] notes:', timelineChecks.map((c) => c.note));
    // 确定性 guard 至少应抓到这 3 类(实习早于入学/项目区间颠倒/年级勾稽)
    expect(timelineChecks.length).toBeGreaterThanOrEqual(3);
    expect(timelineChecks.every((c) => c.status === 'missing')).toBe(true);
  }, 200000);

  it('(b) 夸大数字 → 无"数字可信"背书 + 评分不进高分区 + 改写含补口径建议', async () => {
    const res = await analyzer.analyzeAgainstPreset(
      renderResumeForReview(RESUME_EXAGGERATED),
      productManagerCampus,
      null,
      RESUME_EXAGGERATED,
    );
    console.log('[live b] total_score:', res.total_score);
    console.log('[live b] conventionChecks:', res.conventionChecks.map((c) => `${c.key}:${c.status}`));

    // 可疑数字应被标注(确定性 guard 保底命中)
    const suspect = res.conventionChecks.filter((c) => c.key.includes('可疑量化'));
    expect(suspect.length).toBeGreaterThan(0);

    // 任何 conventionChecks note 不得出现"数字可信/数据扎实"类背书
    const endorses = res.conventionChecks.some((c) => /数字.{0,4}可信|数据.{0,2}扎实|运营数字.{0,4}可信/.test(c.note));
    expect(endorses).toBe(false);

    // 数据驱动维度不进高分区(被确定性压制封顶到满分 60%)
    const dataDim = res.dimensions.find((d) => d.key === 'data_driven');
    expect(dataDim).toBeDefined();
    expect(dataDim!.score).toBeLessThanOrEqual(Math.floor(dataDim!.max * 0.6));

    // 改写应含"补基数/口径"的改法(改进型量化建议带占位符,或 gap_advice 提补口径)
    const suggestions = await rewriter.suggestAgainstPreset(
      renderResumeForReview(RESUME_EXAGGERATED),
      productManagerCampus,
      res,
    );
    console.log('[live b] suggestions:', suggestions.map((s) => `${s.type}:${s.suggested.slice(0, 40)}`));
    const hasCaliberAdvice = suggestions.some(
      (s) => /基数|口径|分母|样本|计算过程|计算方式|\[具体数字\]/.test(s.suggested + s.reason),
    );
    expect(hasCaliberAdvice).toBe(true);
    // 改写仍受防编造守卫:改进型 original 必在原文
    const resumeText = renderResumeForReview(RESUME_EXAGGERATED);
    for (const s of suggestions) {
      if (s.original && s.original.trim().length > 0) expect(resumeText).toContain(s.original);
    }
  }, 280000);

  it('(c) 正常简历 → 无误伤(时间不报矛盾、合理数字不标可疑)', async () => {
    const res = await analyzer.analyzeAgainstPreset(
      renderResumeForReview(RESUME_NORMAL),
      productManagerCampus,
      null,
      RESUME_NORMAL,
    );
    console.log('[live c] conventionChecks keys:', res.conventionChecks.map((c) => c.key));
    // 确定性 guard 不应误报时间线矛盾或可疑数字
    expect(res.conventionChecks.some((c) => c.key.includes('时间线矛盾'))).toBe(false);
    expect(res.conventionChecks.some((c) => c.key.includes('可疑量化'))).toBe(false);
    // 数据驱动维度未被压制(无可疑数字)
    const dataDim = res.dimensions.find((d) => d.key === 'data_driven');
    expect(dataDim!.why.includes('压制')).toBe(false);
  }, 200000);
});

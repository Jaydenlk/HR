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

// (d) 自拟:模仿"被 parser 削平后的形态特征"——结构化教育只剩单一毕业日(YYYY-MM)、
//      项目/年级日期标注被剥离;矛盾判据全部落在 rawText 里(带点日期 + 倒序区间 + 年级标注矛盾)。
//      这正是生产路径(parseResume→ParsedResume)发生漏报的真实形态。内容自拟,不取材任何 testset。
const STRIPPED_RESUME: ParsedResume = {
  basic_info: { name: '陈实', location: '广州' },
  summary: '后端方向应届生,动手能力强,希望在后端持续深耕。',
  work_experience: [
    {
      company: '广州某互联网公司',
      title: '后端开发实习生',
      start_date: '2021-07', // 早于入学(rawText 教育区间 2022.09 入学)
      end_date: '2021-09',
      description: '参与内部管理系统后端开发,负责用户权限模块接口',
      achievements: [],
    },
  ],
  education: [
    // parser 削平:只剩单一毕业日,入学年与年级标注已丢(全靠 rawText 兜底)
    { school: '某二本院校', degree: '本科', major: '软件工程', graduation_date: '2025-06' },
  ],
  skills: { technical: ['Java', 'Spring Boot', 'MySQL'], soft: [], languages: ['CET-4 467'], certifications: [] },
  projects: [
    // parser 把项目日期标注剥离,描述里不含任何区间
    { name: '校园二手交易平台', description: '基于 Spring Boot 的后端服务,实现用户/商品/订单模块', technologies: ['Spring Boot', 'MySQL'], role: '后端负责人' },
  ],
  links: [],
  awards_honors: [],
};
// 对应原始简历正文:矛盾判据在此(带点日期 2022.09-2025.06 / 倒序 2024.10-2024.03 / "大三在读")
const STRIPPED_RAW_TEXT = [
  '现居:广州 | 求职方向:后端开发工程师',
  '## 教育背景',
  '- 2022.09-2025.06 某二本院校 软件工程 / 本科(大三在读)',
  '## 实习经历',
  '**2021.07-2021.09 广州某互联网公司 后端开发实习生**',
  '- 参与内部管理系统后端开发,负责用户权限模块接口',
  '## 项目经历',
  '**2024.10-2024.03 校园二手交易平台(后端负责人)**',
  '- 基于 Spring Boot 搭建后端服务,实现用户/商品/订单模块',
].join('\n');

// (e) 自拟:本科期合法实习 + 硕士在读(多学历正常简历,削平形态),验证零误报。
const MULTI_DEGREE_RESUME: ParsedResume = {
  basic_info: { name: '林正' },
  summary: '数据方向应届硕士,求职数据分析岗。',
  work_experience: [
    // 本科期(2022/2023)实习,合法:不早于最早入学(本科 2020 入学)
    { company: '某教育机构', title: '助教实习生', start_date: '2023-03', end_date: '2023-06', description: '辅导课程,整理学情数据', achievements: [] },
    { company: '某咨询公司', title: '数据实习生', start_date: '2022-06', end_date: '2022-08', description: '用 Excel 做数据汇总分析', achievements: [] },
  ],
  education: [
    { school: '某 QS 前 200 高校', degree: '硕士', major: '数据科学', graduation_date: '2025-09' },
    { school: '某一本高校', degree: '学士', major: '统计学', graduation_date: '2024-06' },
  ],
  skills: { technical: ['Python', 'SQL', 'Pandas'], soft: [], languages: ['雅思 6.5'], certifications: [] },
  projects: [
    { name: '学生成绩预测', description: '项目周期 2025.03-2025.06,用回归模型预测期末分数', technologies: ['Python', 'sklearn'], role: '成员' },
  ],
  links: [],
  awards_honors: [],
};
const MULTI_DEGREE_RAW_TEXT = [
  '## 教育背景',
  '- 2024.09-2025.09 某 QS 前 200 高校 数据科学 应届硕士毕业生',
  '- 2020.09-2024.06 某一本高校 统计学 统招学士',
  '## 实习经历',
  '**2023.03-2023.06 某教育机构 助教实习生**',
  '**2022.06-2022.08 某咨询公司 数据实习生**',
  '## 项目经历',
  '**2025.03-2025.06 学生成绩预测**',
].join('\n');

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

  it('(d) 削平形态(矛盾判据仅在 rawText)→ 走完整 campus 诊断至少命中 2/3', async () => {
    const res = await analyzer.analyzeAgainstPreset(
      renderResumeForReview(STRIPPED_RESUME),
      productManagerCampus,
      null,
      STRIPPED_RESUME,
      STRIPPED_RAW_TEXT,
    );
    const timelineChecks = res.conventionChecks.filter((c) => c.key.includes('时间线矛盾'));
    console.log('[live d] 时间线核查命中数:', timelineChecks.length);
    console.log('[live d] notes:', timelineChecks.map((c) => c.note));
    const hitEnroll = timelineChecks.some((c) => c.note.includes('早于入学'));
    const hitReversed = timelineChecks.some((c) => c.note.includes('颠倒'));
    const hitGrade = timelineChecks.some((c) => c.note.includes('勾稽矛盾'));
    const hits = [hitEnroll, hitReversed, hitGrade].filter(Boolean).length;
    // parser 削平后矛盾全靠 rawText 兜底:至少命中 2/3(本地实测 3/3)
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(timelineChecks.every((c) => c.status === 'missing')).toBe(true);
  }, 200000);

  it('(e) 本科期合法实习 + 硕士在读(多学历)→ 零时间线误报', async () => {
    const res = await analyzer.analyzeAgainstPreset(
      renderResumeForReview(MULTI_DEGREE_RESUME),
      productManagerCampus,
      null,
      MULTI_DEGREE_RESUME,
      MULTI_DEGREE_RAW_TEXT,
    );
    const timelineChecks = res.conventionChecks.filter((c) => c.key.includes('时间线矛盾'));
    console.log('[live e] 时间线核查命中数:', timelineChecks.length, timelineChecks.map((c) => c.note));
    // 本科期实习(2022/2023)≥ 最早入学(2020)→ 不得误报"早于入学";正常简历整体零时间线矛盾
    expect(timelineChecks.some((c) => c.note.includes('早于入学'))).toBe(false);
    expect(timelineChecks.length).toBe(0);
  }, 200000);
});

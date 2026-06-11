import { checkTimelineConsistency } from '../src/ai/timeline-guard';
import { ParsedResume } from '../src/common/types';

// 自拟夹具(不取材任何外部 testset):构造含/不含三类时间矛盾的结构化简历,
// 验证确定性时间线 guard 命中矛盾并放过正常简历。

const HEADER = '简历硬伤:时间线矛盾,HR 初筛即出局风险';

function baseResume(over: Partial<ParsedResume> = {}): ParsedResume {
  return {
    basic_info: { name: '测试候选人' },
    summary: undefined,
    work_experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: [], certifications: [] },
    projects: [],
    links: [],
    awards_honors: [],
    ...over,
  };
}

const nextYear = new Date().getFullYear() + 1;

describe('checkTimelineConsistency 时间线确定性校验', () => {
  it('① 实习起始早于入学 → 命中矛盾', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2022-2026' }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '2021-06', end_date: '2021-09', description: '', achievements: [] },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].key).toBe(HEADER);
    expect(out[0].status).toBe('missing');
    expect(out.some((c) => c.note.includes('早于入学'))).toBe(true);
  });

  it('② 项目结束早于开始(描述内区间颠倒)→ 命中矛盾', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2022-2026' }],
      projects: [
        { name: '校园平台', description: '项目周期 2024.09-2024.03,负责后端开发', technologies: [], role: '负责人' },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out.some((c) => c.note.includes('颠倒'))).toBe(true);
  });

  it('② 工作经历结束早于开始 → 命中矛盾', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2022-2026' }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '2025-09', end_date: '2025-06', description: '', achievements: [] },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out.some((c) => c.note.includes('颠倒'))).toBe(true);
  });

  it('③ 年级↔毕业年份勾稽矛盾(大三在读但写三年后才入学风格的远期毕业)→ 命中', () => {
    // 声明"大三在读"(按今年推算应约今年+2 毕业),但教育段写毕业年份远超推算值
    const resume = baseResume({
      summary: '本人目前大三在读,正在寻找实习机会',
      education: [
        { school: 'A大学', degree: '本科', major: '计算机', graduation_date: `2024-${new Date().getFullYear() + 6}` },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out.some((c) => c.note.includes('勾稽矛盾'))).toBe(true);
  });

  it('正常简历(时间全部自洽)→ 不报任何矛盾', () => {
    const grad = new Date().getFullYear() + 1;
    const resume = baseResume({
      summary: '应届毕业生,求产品岗',
      education: [
        { school: 'A大学', degree: '本科', major: '计算机', graduation_date: `${grad - 4}-${grad}` },
      ],
      work_experience: [
        { company: '某公司', title: '产品实习生', start_date: `${grad - 1}-06`, end_date: `${grad - 1}-09`, description: '需求调研', achievements: [] },
      ],
      projects: [
        { name: '校园平台', description: `项目周期 ${grad - 1}.03-${grad - 1}.06`, technologies: [], role: '负责人' },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out).toHaveLength(0);
  });

  it('日期解析不出年份 → 放过(防误伤)', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机' }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '暑期', end_date: '至今', description: '', achievements: [] },
      ],
    });
    expect(checkTimelineConsistency(resume)).toHaveLength(0);
  });

  it('end_date 为"至今/在读"→ 不参与结束早于开始比较', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: `2023-${nextYear}` }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: `${nextYear - 1}-06`, end_date: '至今', description: '', achievements: [] },
      ],
    });
    expect(checkTimelineConsistency(resume)).toHaveLength(0);
  });

  it('单一年份(无区间)的教育段 → 不臆断入学年,不误报实习早于入学', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2026' }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '2024-06', end_date: '2024-09', description: '', achievements: [] },
      ],
    });
    expect(checkTimelineConsistency(resume)).toHaveLength(0);
  });

  // ===== 生产路径鲁棒性:AI parser 常把教育区间归一成单一毕业日(YYYY-MM),
  // 把项目/年级日期标注剥离。guard 须从 rawText 兜底抽取区间/日期对(确定性,抽不出就放过)。
  // 以下夹具自拟,仅模仿 18/24 号"被 parser 削平后的形态特征",不取材其内容。 =====

  it('A-① 实习早于入学:parser 只剩单一毕业日,从 rawText 兜底抽入学年 → 命中', () => {
    // parser 削平:教育只剩 graduation_date='2025-06';实习 start='2021-07'。
    // rawText 含教育区间 '2022.09-2025.06'(带点日期)→ 兜底入学年 2022,2021 < 2022 命中。
    const resume = baseResume({
      education: [{ school: '某二本', degree: '本科', major: '软件工程', graduation_date: '2025-06' }],
      work_experience: [
        { company: '某互联网公司', title: '后端实习生', start_date: '2021-07', end_date: '2021-09', description: '', achievements: [] },
      ],
    });
    const rawText = '## 教育背景\n- 2022.09-2025.06 某二本 软件工程(大三在读)\n## 实习经历\n2021.07-2021.09 某互联网公司 后端实习生';
    const out = checkTimelineConsistency(resume, rawText);
    expect(out.some((c) => c.note.includes('早于入学'))).toBe(true);
  });

  it('A-② 项目区间倒序(带点日期)只存在于 rawText,parser 已剥离 → 命中颠倒', () => {
    const resume = baseResume({
      education: [{ school: '某二本', degree: '本科', major: '软件工程', graduation_date: '2025-06' }],
      projects: [
        { name: '校园二手交易平台', description: '基于 Spring Boot 的后端服务,无日期', technologies: [], role: '后端负责人' },
      ],
    });
    const rawText = '## 项目经历\n**2024.10-2024.03 校园二手交易平台(后端负责人)**\n- 基于 Spring Boot 搭建后端服务';
    const out = checkTimelineConsistency(resume, rawText);
    expect(out.some((c) => c.note.includes('颠倒'))).toBe(true);
  });

  it('A-③ "大三在读"年级标注只在教育行/rawText,且毕业年已成过去 → 命中勾稽矛盾', () => {
    // "大三在读"按今年推算应约今年+2 毕业;但写明 2025 毕业(相对 2026 已过去)→ 矛盾。
    const resume = baseResume({
      education: [{ school: '某二本', degree: '本科', major: '软件工程', graduation_date: '2025-06' }],
    });
    const rawText = '## 教育背景\n- 2022.09-2025.06 某二本 软件工程 / 本科(大三在读)';
    const out = checkTimelineConsistency(resume, rawText);
    expect(out.some((c) => c.note.includes('勾稽矛盾'))).toBe(true);
  });

  it('A 综合:三处矛盾的"削平形态"夹具 → 至少命中 2/3', () => {
    const resume = baseResume({
      education: [{ school: '某二本', degree: '本科', major: '软件工程', graduation_date: '2025-06' }],
      work_experience: [
        { company: '某互联网公司', title: '后端实习生', start_date: '2021-07', end_date: '2021-09', description: '', achievements: [] },
      ],
      projects: [
        { name: '校园二手交易平台', description: '后端服务,无日期', technologies: [], role: '负责人' },
      ],
    });
    const rawText = [
      '## 教育背景',
      '- 2022.09-2025.06 某二本 软件工程 / 本科(大三在读)',
      '## 实习经历',
      '2021.07-2021.09 某互联网公司 后端实习生',
      '## 项目经历',
      '**2024.10-2024.03 校园二手交易平台(后端负责人)**',
    ].join('\n');
    const out = checkTimelineConsistency(resume, rawText);
    const hits = [
      out.some((c) => c.note.includes('早于入学')),
      out.some((c) => c.note.includes('颠倒')),
      out.some((c) => c.note.includes('勾稽矛盾')),
    ].filter(Boolean).length;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  it('B 多学历:本科期(2022-2023)合法实习,parser 只剩两个毕业年 → 不误伤', () => {
    // 削平形态:硕士 graduation_date='2025-09',本科 '2024-06'。
    // 旧逻辑 min(毕业年)=2024 被当入学年 → 误报本科期实习"早于入学(2024)"。
    // 修复后:锚点取最早入学年(rawText 2020.09 → 2020),2022/2023 ≥ 2020 不报。
    const resume = baseResume({
      education: [
        { school: '英国某高校', degree: '硕士', major: '数学', graduation_date: '2025-09' },
        { school: '某师范一本', degree: '学士', major: '数学与应用数学', graduation_date: '2024-06' },
      ],
      work_experience: [
        { company: '某高中', title: '实习教师', start_date: '2023-03', end_date: '2023-06', description: '', achievements: [] },
        { company: '某路桥公司', title: '助理', start_date: '2022-06', end_date: '2022-08', description: '', achievements: [] },
      ],
    });
    const rawText = [
      '## 教育背景',
      '- 2024.09-2025.9 英国某高校 数学 应届硕士毕业生',
      '- 2020.09-2024.06 某师范一本 数学与应用数学 统招学士',
      '## 实习经历',
      '2023.03-2023.06 某高中 实习教师',
      '2022.06-2022.08 某路桥公司 助理',
    ].join('\n');
    const out = checkTimelineConsistency(resume, rawText);
    expect(out.some((c) => c.note.includes('早于入学'))).toBe(false);
  });

  it('B 多学历:实习早于最早入学年才算硬伤 → 命中', () => {
    const resume = baseResume({
      education: [
        { school: '某硕士校', degree: '硕士', major: 'X', graduation_date: '2025-09' },
        { school: '某本科校', degree: '学士', major: 'Y', graduation_date: '2024-06' },
      ],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '2019-06', end_date: '2019-09', description: '', achievements: [] },
      ],
    });
    const rawText = [
      '## 教育背景',
      '- 2024.09-2025.9 某硕士校',
      '- 2020.09-2024.06 某本科校',
      '## 实习经历',
      '2019.06-2019.09 某公司 实习生',
    ].join('\n');
    const out = checkTimelineConsistency(resume, rawText);
    expect(out.some((c) => c.note.includes('早于入学'))).toBe(true);
  });

  it('鲁棒性:中文年月日期(YYYY年M月)区间倒序 → 命中颠倒', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2022-2026' }],
      projects: [
        { name: '某项目', description: '项目周期 2024年9月-2024年3月,负责后端', technologies: [], role: '负责人' },
      ],
    });
    const out = checkTimelineConsistency(resume);
    expect(out.some((c) => c.note.includes('颠倒'))).toBe(true);
  });

  it('鲁棒性:rawText 抽不出任何日期对/区间 → 放过(保守不误伤)', () => {
    const resume = baseResume({
      education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2026' }],
      work_experience: [
        { company: '某公司', title: '实习生', start_date: '2024-06', end_date: '2024-09', description: '', achievements: [] },
      ],
    });
    const rawText = '教育背景:某大学软件工程专业。实习经历:某公司实习生,负责后端开发。';
    expect(checkTimelineConsistency(resume, rawText)).toHaveLength(0);
  });
});

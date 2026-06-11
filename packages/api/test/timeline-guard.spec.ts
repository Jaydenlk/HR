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
});

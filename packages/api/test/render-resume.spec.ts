import { renderResumeForReview } from '../src/ai/prompts/analyze-profession-standard';
import { ParsedResume } from '../src/common/types';

const base: ParsedResume = {
  basic_info: { name: '林思远' },
  work_experience: [],
  education: [{ school: '复旦大学', degree: '本科', major: '金融学' }],
  skills: { technical: [], soft: [], languages: [], certifications: [] },
  projects: [],
};

describe('renderResumeForReview 竞赛与荣誉段落', () => {
  it('竞赛与荣誉被渲染,强信号(ACM-ICPC)出现在文本中', () => {
    const r: ParsedResume = {
      ...base,
      awards_honors: ['ACM-ICPC 亚洲区域赛(南京站)银牌', '国家奖学金(2023、2024)'],
    };
    const out = renderResumeForReview(r);
    expect(out).toContain('竞赛与荣誉');
    expect(out).toContain('ACM-ICPC');
    expect(out).toContain('国家奖学金');
  });

  it('无竞赛荣誉时不渲染该段落(不产生空标题)', () => {
    const out = renderResumeForReview(base);
    expect(out).not.toContain('竞赛与荣誉');
  });
});

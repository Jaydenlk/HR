import { ParsedResume, ConventionCheck } from '../common/types';

// 确定性时间线一致性校验(非 AI):在结构化解析后跑,命中的硬伤直接进诊断报告显著位置。
// 设计原则:只在能从文本里"明确解析出年份"且存在"确凿矛盾"时报警,解析不出年份的一律放过(防误伤)。

/** 中文/数字年级 → 距毕业年数(大一=4,大二=3,大三=2,大四=1)。解析不出返回 null。 */
const GRADE_TO_YEARS_TO_GRAD: Record<string, number> = {
  大一: 4,
  大二: 3,
  大三: 2,
  大四: 1,
  研一: 3,
  研二: 2,
  研三: 1,
};

/** 从自由文本中抽第一个 4 位年份(19xx/20xx)。抽不到返回 null。 */
function extractYear(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** 从自由文本中抽 {年, 月?}:用于精确比较起止先后。月份可缺。抽不到年返回 null。 */
function extractYearMonth(text: string | undefined): { year: number; month: number | null } | null {
  if (!text) return null;
  // 先抓"年+月"形态(2025.06 / 2025-6 / 2025年6月);抓不到月再退回只抓年。
  const ym = text.match(/((?:19|20)\d{2})\s*[年./-]\s*(\d{1,2})/);
  if (ym) {
    const month = Number(ym[2]);
    return { year: Number(ym[1]), month: month >= 1 && month <= 12 ? month : null };
  }
  const y = extractYear(text);
  return y === null ? null : { year: y, month: null };
}

/** 把 {年, 月} 折成可比较的"月序数"(月缺则按 0,只比到年)。 */
function toComparable(ym: { year: number; month: number | null }): number {
  return ym.year * 12 + (ym.month ?? 0);
}

/** 在职/在读型 end_date(至今/在读/present/now/current)不参与"结束早于开始"比较。 */
function isOngoing(end: string | undefined): boolean {
  if (!end) return true;
  return /至今|在读|present|now|current|今/i.test(end);
}

/** 从教育段文本抽入学年:教育段常写 "2022-2026" 区间,取最早 4 位年作入学年。
 *  仅当存在区间(最早年 < 最晚年)时才认定,单一年份无法区分入学/毕业 → 放过(防误伤)。 */
function extractEnrollmentYear(eduText: string): number | null {
  const years = eduText.match(/(19|20)\d{2}/g);
  if (!years || years.length === 0) return null;
  const nums = years.map(Number);
  const min = Math.min(...nums);
  return Math.max(...nums) > min ? min : null;
}

const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_YEAR_SLACK = 6; // 应届可写未来毕业年,留 6 年余量;超出视为笔误硬伤

/**
 * 时间线一致性校验:返回命中的矛盾(作为 ConventionCheck,status='missing',显著标注)。
 * 三类:① 实习/工作/项目起始早于入学;② 起始晚于结束;③ 年级与毕业年份勾稽矛盾。
 */
export function checkTimelineConsistency(resume: ParsedResume): ConventionCheck[] {
  const conflicts: ConventionCheck[] = [];
  const HEADER = '简历硬伤:时间线矛盾,HR 初筛即出局风险';

  // 入学年:从教育段所有文本里取(区间的较小年)
  const eduText = resume.education
    .map((e) => `${e.school} ${e.major} ${e.degree} ${e.graduation_date ?? ''}`)
    .join(' ');
  const enrollmentYear = extractEnrollmentYear(eduText);

  // ① 起始 ≤ 结束(对工作/实习 + 项目逐条查);② 起始 ≥ 入学年
  const checkSpan = (
    label: string,
    start: string | undefined,
    end: string | undefined,
  ): void => {
    const s = extractYearMonth(start);
    if (s && Number.isFinite(s.year)) {
      // ② 起始早于入学(实习不可能早于上大学)
      if (enrollmentYear !== null && s.year < enrollmentYear) {
        conflicts.push({
          key: HEADER,
          status: 'missing',
          note: `${label}起始时间(${start}）早于入学年份(${enrollmentYear}），逻辑不成立:不可能在入学前就开始该经历。请核对日期。`,
        });
      }
      // 起始晚于"当前+合理余量"——明显笔误
      if (s.year > CURRENT_YEAR + FUTURE_YEAR_SLACK) {
        conflicts.push({
          key: HEADER,
          status: 'missing',
          note: `${label}起始时间(${start}）远晚于当前年份,疑似日期笔误,请核对。`,
        });
      }
      // ① 起始晚于结束(非"至今/在读")
      if (!isOngoing(end)) {
        const e = extractYearMonth(end);
        if (e && Number.isFinite(e.year) && toComparable(s) > toComparable(e)) {
          conflicts.push({
            key: HEADER,
            status: 'missing',
            note: `${label}结束时间(${end}）早于开始时间(${start}），时间区间颠倒,请核对。`,
          });
        }
      }
    }
  };

  for (const w of resume.work_experience) {
    checkSpan(`经历「${w.company || w.title || '工作/实习'}」`, w.start_date, w.end_date);
  }
  // 项目无独立起止字段,但描述里可能写时间区间:仅当描述内出现明确"起-止"区间且颠倒时报
  for (const p of resume.projects) {
    const range = p.description.match(/((19|20)\d{2}[年./-]\d{1,2})\s*[-~至到]\s*((19|20)\d{2}[年./-]\d{1,2})/);
    if (range) {
      const s = extractYearMonth(range[1]);
      const e = extractYearMonth(range[3]);
      if (s && e && Number.isFinite(s.year) && Number.isFinite(e.year) && toComparable(s) > toComparable(e)) {
        conflicts.push({
          key: HEADER,
          status: 'missing',
          note: `项目「${p.name || '项目'}」结束时间(${range[3]}）早于开始时间(${range[1]}），时间区间颠倒,请核对。`,
        });
      }
    }
  }

  // ③ 年级 ↔ 毕业年份勾稽:简历声明"大三在读"等年级,与教育段毕业年份距今年数应吻合。
  // 在全文(summary + 各段描述)里找年级声明;只有同时解析出"年级"与"毕业年"且明显矛盾才报。
  const fullText = [
    resume.summary ?? '',
    ...resume.work_experience.map((w) => `${w.description} ${w.achievements.join(' ')}`),
    ...resume.projects.map((p) => p.description),
  ].join(' ');
  const gradMatch = Object.keys(GRADE_TO_YEARS_TO_GRAD).find((g) => fullText.includes(g));
  if (gradMatch) {
    const yearsToGrad = GRADE_TO_YEARS_TO_GRAD[gradMatch];
    const expectedGradYear = CURRENT_YEAR + yearsToGrad;
    // 教育段毕业年:取教育段最晚年(区间的较大年)
    const eduYears = eduText.match(/(19|20)\d{2}/g);
    if (eduYears && eduYears.length > 0) {
      const statedGradYear = Math.max(...eduYears.map(Number));
      // 容差 ±1 年(跨年/学制差异);超出即勾稽矛盾
      if (Math.abs(statedGradYear - expectedGradYear) > 1) {
        conflicts.push({
          key: HEADER,
          status: 'missing',
          note: `简历声明「${gradMatch}在读」,但教育经历写明毕业年份为 ${statedGradYear} 年;按「${gradMatch}」推算应约 ${expectedGradYear} 年毕业,年级与毕业年份勾稽矛盾,请核对。`,
        });
      }
    }
  }

  return conflicts;
}

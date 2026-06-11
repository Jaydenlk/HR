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

/** 从教育段结构化文本抽入学年:教育段常写 "2022-2026" 区间,取最早 4 位年作入学年。
 *  仅当存在区间(最早年 < 最晚年)时才认定,单一年份无法区分入学/毕业 → 放过(防误伤)。 */
function extractEnrollmentYear(eduText: string): number | null {
  const years = eduText.match(/(19|20)\d{2}/g);
  if (!years || years.length === 0) return null;
  const nums = years.map(Number);
  const min = Math.min(...nums);
  return Math.max(...nums) > min ? min : null;
}

// ── rawText 兜底:AI parser 常把教育区间归一成单一毕业日(YYYY-MM)、剥离项目/年级日期标注,
//   使确定性 guard 失去判据。故同时扫原始简历正文做正则级日期对提取,作为 parser 丢失时的兜底。
//   严守保守原则:只在能从文本明确解析出"区间/日期对"时才用,抽不出一律放过(不臆断、不误伤)。

/** 单个"年月"token 的正则源串:YYYY、可带 .-/年 分隔的 1-2 位月,月后可紧跟"月"字(不吞空格)。 */
const YM_TOKEN = '(?:19|20)\\d{2}(?:\\s*[年./\\-]\\s*\\d{1,2}月?)?';
/** 起止连接符:- ~ — 至 到 。 */
const RANGE_SEP = '\\s*[-~—至到]\\s*';

/**
 * 从自由文本抽所有"日期区间对"(start, end 原文片段)。用于项目区间倒序兜底检测。
 * 仅匹配"年[月]-年[月]"形态;两侧都至少带 4 位年。抽不到返回 []。
 */
function extractDateRangePairs(text: string): Array<{ start: string; end: string }> {
  const re = new RegExp(`(${YM_TOKEN})${RANGE_SEP}(${YM_TOKEN})`, 'g');
  const pairs: Array<{ start: string; end: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    pairs.push({ start: m[1].trim(), end: m[2].trim() });
  }
  return pairs;
}

/** 教育段标题(中英文常见写法):用于在 rawText 中定位"只属于教育经历"的日期区间。 */
const EDU_HEADER = /教育(背景|经历|信息)?|学历|education/i;
/** 任意一级/二级 markdown 标题或"## xxx经历/技能/项目/实习"型分节标题:用于切出教育段边界。 */
const SECTION_HEADER = /^\s{0,3}#{1,6}\s|^\s{0,3}(实习|工作|项目|获奖|专业|技能|证书|自我|个人)/;

/**
 * 从原始简历正文切出"教育段"文本:从命中教育标题的行起,到下一节标题前止。
 * 切不出(无教育标题)→ 返回整段 rawText(退化,由调用方的区间存在性兜底)。
 */
function sliceEducationSection(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => EDU_HEADER.test(l) && /^\s{0,3}#{0,6}\s*/.test(l));
  if (startIdx < 0) return rawText;
  const out: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (SECTION_HEADER.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

/**
 * 从原始简历正文抽最早入学年(Bug B 修复锚点):
 * 仅在"教育段"内扫"年[月]-年[月]"区间,取所有区间起始年里的最小值 = 最早入学年。
 * 多学历(本科+硕士)下,最早入学年来自本科入学,实习只要不早于它即合法,不再被较晚学历毕业年误伤。
 * 教育段内抽不到任何区间 → null(放过,不臆断;也避免把实习/项目区间起始年误当入学年)。
 */
function extractEarliestEnrollmentYearFromRaw(rawText: string): number | null {
  const eduSection = sliceEducationSection(rawText);
  const pairs = extractDateRangePairs(eduSection);
  const startYears = pairs
    .map((p) => extractYear(p.start))
    .filter((y): y is number => y !== null);
  return startYears.length > 0 ? Math.min(...startYears) : null;
}

const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_YEAR_SLACK = 6; // 应届可写未来毕业年,留 6 年余量;超出视为笔误硬伤

/**
 * 时间线一致性校验:返回命中的矛盾(作为 ConventionCheck,status='missing',显著标注)。
 * 三类:① 实习/工作/项目起始早于入学;② 起始晚于结束;③ 年级与毕业年份勾稽矛盾。
 */
export function checkTimelineConsistency(
  resume: ParsedResume,
  // 原始简历正文:parser 削平日期(教育区间→单一毕业日、剥离项目/年级标注)后的兜底判据源。
  // 不传则退化为仅用结构化字段(旧行为),保证向后可用。
  rawText?: string,
): ConventionCheck[] {
  const conflicts: ConventionCheck[] = [];
  const HEADER = '简历硬伤:时间线矛盾,HR 初筛即出局风险';

  // 入学年锚点(Bug B 修复):取"最早"入学年,不是结构化字段的 min(毕业年)。
  //   优先从 rawText 抽最早入学年(多学历下本科入学,实习不早于它即合法);
  //   rawText 抽不到才回退到结构化教育段区间(单一毕业日无区间 → null 放过)。
  const eduText = resume.education
    .map((e) => `${e.school} ${e.major} ${e.degree} ${e.graduation_date ?? ''}`)
    .join(' ');
  const enrollmentYear =
    (rawText ? extractEarliestEnrollmentYearFromRaw(rawText) : null) ??
    extractEnrollmentYear(eduText);

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
  // 项目无独立起止字段,但描述里可能写时间区间:仅当出现明确"起-止"区间且颠倒时报。
  const seenReversed = new Set<string>(); // 去重:同一倒序区间(按归一年月)只报一次,防 description/rawText 重复命中
  const reportReversed = (label: string, start: string, end: string): void => {
    const s = extractYearMonth(start);
    const e = extractYearMonth(end);
    if (!s || !e || !Number.isFinite(s.year) || !Number.isFinite(e.year)) return;
    if (toComparable(s) <= toComparable(e)) return;
    const dedupKey = `${toComparable(s)}|${toComparable(e)}`;
    if (seenReversed.has(dedupKey)) return;
    seenReversed.add(dedupKey);
    conflicts.push({
      key: HEADER,
      status: 'missing',
      note: `${label}结束时间(${end}）早于开始时间(${start}），时间区间颠倒,请核对。`,
    });
  };
  let structuredProjectRangeFound = false;
  for (const p of resume.projects) {
    for (const pair of extractDateRangePairs(p.description)) {
      structuredProjectRangeFound = true;
      reportReversed(`项目「${p.name || '项目'}」`, pair.start, pair.end);
    }
  }
  // parser 把项目日期标注剥离 → 结构化项目描述里一个区间都没有时,才从 rawText 兜底扫倒序区间。
  // 只在"结构化全失"时兜底,避免把已由 work_experience/项目结构化检测过的区间重复报。
  if (rawText && !structuredProjectRangeFound) {
    for (const pair of extractDateRangePairs(rawText)) {
      reportReversed('项目/经历', pair.start, pair.end);
    }
  }

  // ③ 年级 ↔ 毕业年份勾稽:简历声明"大三在读"等年级,与教育段毕业年份距今年数应吻合。
  // 年级标注常写在教育行(被 parser 剥离)→ 扫描源除 summary/各段描述外,并入教育段文本与 rawText 兜底。
  const fullText = [
    resume.summary ?? '',
    eduText,
    ...resume.work_experience.map((w) => `${w.description} ${w.achievements.join(' ')}`),
    ...resume.projects.map((p) => p.description),
    rawText ?? '',
  ].join(' ');
  const gradMatch = Object.keys(GRADE_TO_YEARS_TO_GRAD).find((g) => fullText.includes(g));
  if (gradMatch) {
    const yearsToGrad = GRADE_TO_YEARS_TO_GRAD[gradMatch];
    const expectedGradYear = CURRENT_YEAR + yearsToGrad;
    // 毕业年:取教育段最晚年(区间较大年);结构化教育段无年份时,从 rawText 兜底取最晚年。
    const eduYears =
      eduText.match(/(19|20)\d{2}/g) ?? (rawText ? rawText.match(/(19|20)\d{2}/g) : null);
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

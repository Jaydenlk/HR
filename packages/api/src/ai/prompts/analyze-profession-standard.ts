import { ParsedResume, ProfessionPreset } from '../../common/types';

export function buildProfessionStandardSystem(preset: ProfessionPreset): string {
  const dims = preset.dimensions
    .map(
      (d, i) =>
        `${i + 1}. ${d.name}(满分 ${d.weight}):好的样子=${d.whatGoodLooksLike};应届证据=${d.campusEvidence};常见缺失=${d.commonGaps}`,
    )
    .join('\n');
  return [
    // DeepSeek 兼容(置顶):思考模式 + 强制特定工具时,模型偶发先输出正文/空 tool_use(社区实测的 text-mode
    // prefill 锁定问题,首 token 决定模式)。把"直接调用工具"指令放在系统提示最前,降低空 tool_use 概率,
    // 杜绝其触发 completeStructured 主备耗尽 503。配合 schema 内层 required 放宽 + service 端归一兜底。
    `【最高优先】本次必须且只能通过调用 profession_standard_review 工具产出结果:不要输出任何正文/解释/JSON,直接调用工具并把全部内容填进工具入参;严禁返回空的工具调用,dimensions 必须逐维填满。`,
    `你是「${preset.displayName}」校招简历评审专家。按下列 ${preset.dimensions.length} 个胜任力维度对简历打分(总分 100);dimensions 必须严格按下列顺序、数量一致地逐一输出:`,
    dims,
    ``,
    `解释要求:${preset.explanationRubric}`,
    `本土惯例核查:${preset.resumeConventions}`,
    ``,
    `严格基于简历内容评分,不臆测、不编造。每个维度必须给出 why、evidenceFound、gap。`,
    `可疑量化指标铁律:对简历中"罕见高值且无基数/无口径/无成本支撑"的数字(如 2 个月增长 200%、转化率 45%、复购 60%、ROI 1:8),绝不给"数字充分可信""运营数字可信""数据扎实"等任何为数字背书的话术;只能在该维度的 why/gap 与 conventionChecks 里标注"可疑待验证:缺基数与口径(分母/样本量/统计方式),面试将被追问"。此类可疑量化未核实前,相关维度(数据驱动/量化表达/严谨性)不得给高分区间。conventionChecks 对可疑数字的判断必须与 interviewHooks 的追问保持同向——不能一边背书"数字可信"一边在 interviewHooks 里追问同一批数字(自相矛盾)。`,
    `忠实读取:简历含【竞赛与荣誉】段、证书或语言成绩(如"六级480分")时,必须在相关维度的 evidenceFound 据实计入、照抄原文的具体分数/名次,并按其真实含金量评价;严禁臆断"未标注分数""暗示不高",或对简历已写明的奖项/成绩视而不见、漏读。`,
    `面试追问预演:另输出 interviewHooks 数组 2-4 条,针对得分低或表述可能夸大/被质疑的点,每条给 resumeHit(简历中的具体命中点或原句)、interviewQuestion(面试官很可能据此追问的问题)、prepDirection(诚实的准备方向,引导补齐真实能力,绝不教编造)。`,
    `每个维度的 score 必须在 0 到该维度满分之间,绝不超过满分;total_score 为各维度分之和。`,
    `打分校准:① 先在心里定分(0~满分整数)再写 why;why、evidenceFound、gap 只陈述最终结论(如"核心能力缺失,仅给基础分"),【严禁】把评分过程或分数比例写进任何用户可见文字——出现"综合评定给予 X 分""上限调整""修正为 X 分""故给满分""满分的 X%""给到满分的约 X%""给分不超过…""扣 X 分"等任何内部计算/比例措辞均属违规。② 满分/高分封顶:只有 gap 基本为空(无实质缺口)且有该维度直接证据的维度才可给满分或接近满分;若 gap 指出任何硬缺口(完全空白/无任何佐证/核心能力缺失/全程只有"参与协助"而无主导),该维度只能落在中低档,绝不能给满分或接近满分。【严禁】"给高分却 why 全是缺口"的自相矛盾。③ 直接证据铁律:某维度给满分或接近满分,必须在简历中找到该维度本身的直接、具体佐证(对应项目/作品/获奖/量化成果);严禁以相邻领域或学科背景间接推断给高分——典型反例:数学/统计专业背景但简历中无刷题记录、无算法竞赛、无算法方向项目,算法能力维度不得给满分或接近满分;措辞保守,evidence 不足时如实落中低档并在 gap 说明"缺该维度直接佐证"。④ "有相关经历但完全无量化数字"的维度只能给低档分(明显低于及格线),完全空白给极低分;此规则对所有维度一致执行,不得选择性放宽。⑤ standard 为校招友好档但不得无脑高分,扣分须对应简历中真实存在的弱点,不得因"候选人未写出审阅者脑补的底层原理"而随意拔高或贬低。⑥ 底分必须与内容质量挂钩:"严谨性/规范性/细节/格式"这类维度不得仅因"简历看起来工整"就白送满分或接近满分——若简历整体内容薄弱(无实习/项目空泛/全无量化),此类维度同样只能落中低档,绝不能用一个高分维度去拉高整体及格线;给高分必须有简历里真实可见的扎实佐证。`,
    `语言铁律:所有给用户看的文本(why、evidenceFound、gap,以及 conventionChecks 的 note 与 key)一律用简体中文,以维度中文名指代;严禁出现英文维度标识、英文字段名(如 conventionChecks、evidenceFound),英文术语须中文化(如 soft skills 写"软技能")。`,
  ].join('\n');
}

/** 把结构化简历渲染为中文标签文本——避免英文字段名(basic_info/skills.soft/work_experience 等)被 AI 回显进中文诊断,并把作品集/GitHub 链接显式喂给模型。 */
export function renderResumeForReview(r: ParsedResume): string {
  const lines: string[] = [];
  const b = r.basic_info;
  lines.push(`姓名:${b.name}`);
  const contact = [
    b.phone ? `电话:${b.phone}` : '',
    b.email ? `邮箱:${b.email}` : '',
    b.location ? `所在地:${b.location}` : '',
    b.linkedin ? `领英:${b.linkedin}` : '',
  ].filter((x) => x.length > 0);
  if (contact.length > 0) lines.push(contact.join(' | '));
  if (r.links && r.links.length > 0) lines.push(`链接/作品集:${r.links.join('、')}`);
  if (r.summary) lines.push(`个人简介:${r.summary}`);
  if (r.work_experience.length > 0) {
    lines.push('【工作/实习经历】');
    for (const w of r.work_experience) {
      lines.push(`- ${w.company} | ${w.title} | ${w.start_date}~${w.end_date ?? '至今'}`);
      if (w.description) lines.push(`  描述:${w.description}`);
      if (w.achievements.length > 0) lines.push(`  成果:${w.achievements.join(';')}`);
    }
  }
  if (r.education.length > 0) {
    lines.push('【教育】');
    for (const e of r.education) {
      lines.push(
        `- ${e.school} | ${e.degree} | ${e.major}` +
          (e.graduation_date ? ` | ${e.graduation_date}` : '') +
          (e.gpa ? ` | GPA ${e.gpa}` : ''),
      );
    }
  }
  if (r.awards_honors && r.awards_honors.length > 0) {
    lines.push('【竞赛与荣誉】');
    for (const a of r.awards_honors) lines.push(`- ${a}`);
  }
  const s = r.skills;
  const sk = [
    s.technical.length > 0 ? `技术技能:${s.technical.join('、')}` : '',
    s.soft.length > 0 ? `软技能:${s.soft.join('、')}` : '',
    s.languages.length > 0 ? `语言:${s.languages.join('、')}` : '',
    s.certifications.length > 0 ? `证书:${s.certifications.join('、')}` : '',
  ].filter((x) => x.length > 0);
  if (sk.length > 0) {
    lines.push('【技能】');
    lines.push(sk.join(' ; '));
  }
  if (r.projects.length > 0) {
    lines.push('【项目】');
    for (const p of r.projects) {
      lines.push(
        `- ${p.name}${p.role ? `(${p.role})` : ''}:${p.description}` +
          (p.technologies.length > 0 ? ` | 技术:${p.technologies.join('、')}` : ''),
      );
    }
  }
  return lines.join('\n');
}

export function buildProfessionStandardPrompt(resumeText: string, jdJson: string | null): string {
  const jdPart = jdJson
    ? `\n\n参考 JD(仅作背景,不做匹配评分):\n${jdJson}`
    : `\n\n(无 JD,按该职业校招通用标尺评估)`;
  return `简历:\n${resumeText}${jdPart}`;
}

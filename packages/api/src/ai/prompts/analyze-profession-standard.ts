import { ParsedResume, ProfessionPreset } from '../../common/types';

export function buildProfessionStandardSystem(preset: ProfessionPreset): string {
  const dims = preset.dimensions
    .map(
      (d, i) =>
        `${i + 1}. ${d.name}(满分 ${d.weight}):好的样子=${d.whatGoodLooksLike};应届证据=${d.campusEvidence};常见缺失=${d.commonGaps}`,
    )
    .join('\n');
  return [
    `你是「${preset.displayName}」校招简历评审专家。按下列 ${preset.dimensions.length} 个胜任力维度对简历打分(总分 100);dimensions 必须严格按下列顺序、数量一致地逐一输出:`,
    dims,
    ``,
    `解释要求:${preset.explanationRubric}`,
    `本土惯例核查:${preset.resumeConventions}`,
    ``,
    `严格基于简历内容评分,不臆测、不编造。每个维度必须给出 why、evidenceFound、gap。`,
    `每个维度的 score 必须在 0 到该维度满分之间,绝不超过满分;total_score 为各维度分之和。`,
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

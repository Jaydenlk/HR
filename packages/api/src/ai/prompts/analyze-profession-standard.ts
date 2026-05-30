import { ProfessionPreset } from '../../common/types';

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

export function buildProfessionStandardPrompt(resumeJson: string, jdJson: string | null): string {
  const jdPart = jdJson
    ? `\n\n参考 JD(仅作背景,不做匹配评分):\n${jdJson}`
    : `\n\n(无 JD,按该职业校招通用标尺评估)`;
  return `简历(结构化):\n${resumeJson}${jdPart}`;
}

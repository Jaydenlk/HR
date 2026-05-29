import { ProfessionPreset } from '../../common/types';

export function buildProfessionStandardSystem(preset: ProfessionPreset): string {
  const dims = preset.dimensions
    .map(
      (d) =>
        `- ${d.name}(key=${d.key},满分 ${d.weight}):好的样子=${d.whatGoodLooksLike};应届证据=${d.campusEvidence};常见缺失=${d.commonGaps}`,
    )
    .join('\n');
  return [
    `你是「${preset.displayName}」校招简历评审专家。按下列胜任力维度对简历打分(总分 100):`,
    dims,
    ``,
    `解释要求:${preset.explanationRubric}`,
    `本土惯例核查:${preset.resumeConventions}`,
    ``,
    `严格基于简历内容评分,不臆测、不编造。每个维度必须给出 why、evidenceFound、gap。`,
  ].join('\n');
}

export function buildProfessionStandardPrompt(resumeJson: string, jdJson: string | null): string {
  const jdPart = jdJson
    ? `\n\n参考 JD(仅作背景,不做匹配评分):\n${jdJson}`
    : `\n\n(无 JD,按该职业校招通用标尺评估)`;
  return `简历(结构化):\n${resumeJson}${jdPart}`;
}

export const PROFESSION_STANDARD_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    total_score: { type: 'number' },
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          score: { type: 'number' },
          max: { type: 'number' },
          why: { type: 'string' },
          evidenceFound: { type: 'array', items: { type: 'string' } },
          gap: { type: 'string' },
        },
        required: ['key', 'name', 'score', 'max', 'why', 'evidenceFound', 'gap'],
      },
    },
    conventionChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'warn', 'missing'] },
          note: { type: 'string' },
        },
        required: ['key', 'status', 'note'],
      },
    },
  },
  required: ['total_score', 'dimensions', 'conventionChecks'],
};

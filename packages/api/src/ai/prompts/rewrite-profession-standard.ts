import { ProfessionPreset, ProfessionStandardResult } from '../../common/types';

export function buildRewriteSystem(preset: ProfessionPreset): string {
  return [
    `你是「${preset.displayName}」简历改写专家。`,
    `改写原则:${preset.rewriteGuidance}`,
    `生成 3-5 条改写建议。每条:section、item_index(工作经历类建议用于定位具体条目,可选)、type、priority、original(简历原文一字不差)、suggested、reason(为什么这样改、对应哪个胜任力维度)。`,
    `original 必须是简历中真实存在的原句、一字不差地复制;若建议是新增内容(简历中没有对应原句),original 必须为空字符串 '',把"简历缺少…"之类说明写在 reason 里,绝不要把说明文字放进 original。`,
    `红线:严禁虚构经历或数字。缺数字用 [具体数字] 占位;简历无某经历时给"建议补充 X"而非编造。`,
    `语言铁律:reason、suggested 等所有文本一律用简体中文,以维度中文名指代;严禁出现英文维度标识或英文字段名。`,
  ].join('\n');
}

export function buildRewritePrompt(
  resumeText: string,
  analysis: ProfessionStandardResult,
): string {
  // 只喂改写所需的维度信息,字段名全中文化并去掉英文 key,避免被回显进 reason
  const focus = {
    总分: analysis.total_score,
    维度: analysis.dimensions.map((d) => ({
      维度: d.name,
      得分: d.score,
      满分: d.max,
      评估理由: d.why,
      缺口: d.gap,
    })),
  };
  return `简历原文:\n${resumeText}\n\n诊断结果(按此聚焦薄弱维度):\n${JSON.stringify(focus)}`;
}

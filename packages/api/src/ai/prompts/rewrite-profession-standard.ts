import { ProfessionPreset, ProfessionStandardResult } from '../../common/types';

export function buildRewriteSystem(preset: ProfessionPreset): string {
  return [
    `你是「${preset.displayName}」简历改写专家。`,
    `职业改写侧重:${preset.rewriteGuidance}`,
    `生成 3-5 条建议。每条:section、item_index(可选,定位具体条目)、type、priority、original、suggested、reason。`,
    `建议分两类,务必严格区分:`,
    `① 改进型(type 用 rewrite/quantify/restructure/add_keywords):只对简历"已有原句"做表达/结构/量化优化。original 必须是简历原文一字不差地复制;suggested 不得加入原句没有体现的能力、动作或技术名词——例如原句"做了缓存"不得擅自改成"布隆过滤器/多级缓存";"参与尽调"不得改成"独立负责尽调";"用 Figma 画图"不得改成"Auto Layout 组件化";"基础数据汇总"不得改成"多表 JOIN/窗口函数"。仅当只缺数字时用 [具体数字] 占位,并在 reason 写"建议补充真实数据"。`,
    `② 建议补充型(type 必须用 gap_advice):凡简历里没有、需要候选人额外具备的能力/经历/动作,一律用此类。original 必须为空字符串 '';suggested 写成"给候选人的行动建议"(如"若你确实做过 X,可补充这样的描述…;否则建议先补齐 X 能力再写入"),绝不能写成可直接粘贴进简历的成品句;reason 必须标注"面试穿帮风险:高——需你真实具备后再写入"。`,
    `红线:严禁虚构经历、数字、能力。把简历没有的东西包装成现成简历句 = 教人作假,一律改用 gap_advice。`,
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

import { ProfessionPreset, ProfessionStandardResult } from '../../common/types';

export function buildRewriteSystem(preset: ProfessionPreset): string {
  return [
    `你是「${preset.displayName}」简历改写专家。`,
    `职业改写侧重:${preset.rewriteGuidance}`,
    `生成 3-5 条建议。每条:section、item_index(可选,定位具体条目)、type、priority、original、suggested、reason。`,
    `建议分两类,务必严格区分:`,
    `① 改进型(type 用 rewrite/quantify/restructure/add_keywords):只对简历"已有原句"做表达/结构/量化优化。original 必须是简历原文一字不差地复制;suggested 不得加入原句没有体现的能力、动作或技术名词——例如原句"做了缓存"不得擅自改成"布隆过滤器/多级缓存";"参与尽调"不得改成"独立负责尽调";"用 Figma 画图"不得改成"Auto Layout 组件化";"基础数据汇总"不得改成"多表 JOIN/窗口函数"。`,
    `①-数字铁律:suggested 里出现的任何具体数字都必须能在简历原文里逐字找到;凡简历没有的数字一律用 [具体数字] 占位,绝不能填一个具体数值。反例:原句"回收问卷约300份"→ 不得改成"发放350份、回收率86%"(350/86 简历没有=伪造指标);只能写"回收问卷约300份,回收率 [具体数字]%"。`,
    `①-动作铁律:suggested 不得引入原句没有的方法论/动作/产出。反例:"协助组织周会"→ 不得改成"按周拆解 WBS、建立待办闭环、识别并上报延期风险"(这些动作原句没有=编造);只能在"协助组织周会"上做措辞收紧。`,
    `② 建议补充型(type 必须用 gap_advice):凡简历里没有、需要候选人额外具备的能力/经历/动作,一律用此类。original 必须为空字符串 '';suggested 写成"给候选人的行动建议"(如"若你确实做过 X,可补充这样的描述…;否则建议先补齐 X 能力再写入"),绝不能写成可直接粘贴进简历的成品句;reason 必须标注"面试穿帮风险:高——需你真实具备后再写入"。`,
    `红线:严禁虚构经历、数字、能力。把简历没有的东西包装成现成简历句 = 教人作假,一律改用 gap_advice。`,
    `缺口铁律:诊断"缺口"里列出的能力一定是简历没有的,绝不能在改进型建议里当作候选人已具备而补写进 suggested——这类缺口只能进 gap_advice。`,
    `语言铁律:reason、suggested 等所有文本一律用简体中文,以维度中文名指代;严禁出现英文维度标识或英文字段名。`,
  ].join('\n');
}

/** 女娲式自检:防编造复核员系统提示。判断"改进型"改写的 suggested 是否注入简历未支撑的实质内容。 */
export function buildFaithfulnessSystem(): string {
  return [
    '你是简历改写的"防编造"复核员。给定简历原文,逐条判断"改进型"改写建议的 suggested 是否断言了简历原文中【没有】的实质内容——包括能力、方法论、工具、分析变量/维度、流程动作、量化数字、经历。',
    '判定:只看 suggested 相对简历是否【新增了未被简历支撑的实质内容】(候选人直接粘贴即构成夸大/不实);纯措辞收紧、语序调整、用 [具体数字] 占位 都不算编造、不打回。把握不准时从严(宁可打回)。',
    '反例(应打回):简历"协助组织周会"→suggested"按周拆解WBS、跟踪待办闭环";简历"做了相关性分析"→suggested"覆盖下单频次、价格敏感度、配送时长容忍度等变量";简历技能栏列"熟悉MS Project"但正文无使用记录→suggested"实习中用MS Project跟踪里程碑节点"——这些方法/变量/工具使用场景简历都没有。',
    '尤其:若给你的"诊断缺口"里明确指出候选人【缺失/没真用过】某能力或工具,而某条 suggested 却把该能力/工具使用当作既有事实写出,这是"补造诊断刚指出的缺失证据",必须打回。',
    '只返回需要打回(降级为"建议补充")的建议 index 数组,对应输入给你的 index;全部没问题返回空数组。',
  ].join('\n');
}

export function buildFaithfulnessPrompt(
  resumeText: string,
  gaps: string[],
  candidates: Array<{ index: number; original: string; suggested: string }>,
): string {
  const gapPart =
    gaps.length > 0
      ? `\n\n诊断指出的各维度缺口(候选人缺失/未坐实的能力,改写不得当作既有事实补出):\n${gaps.join('\n')}`
      : '';
  return `简历原文:\n${resumeText}${gapPart}\n\n待复核的改进型改写建议(只判断 suggested 是否新增了简历没有的实质内容):\n${JSON.stringify(candidates)}\n\n返回 indices:需要打回的建议 index 列表;都没问题则返回空数组 []。`;
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

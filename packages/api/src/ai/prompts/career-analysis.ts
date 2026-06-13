/**
 * 职业地图(career)能力盘点防编造提示词。
 *
 * 病根:旧版让 AI 直接给 skill_audit 的 current 分,完全没有诊断那套防编造护栏
 * (对照 analyze-profession-standard.ts 的"直接证据铁律/evidenceFound/退化检测")。
 * 用户实证:简历里 Python 只有 if-else 水平却被打 6 分——AI 拿训练记忆对"Python 这个词"
 * 泛化打分,与简历里有没有真 Python 项目无关。
 *
 * 本模块把同等护栏移植到 career:current 必须能在简历里找到直接证据才可给中高分,
 * 否则只能落低档;并要求 AI 逐技能输出 evidenceFound(证据原文片段),供服务端退化检测核对。
 */

/**
 * 防编造铁律(纯文本常量,供 system prompt 拼装,也供单测断言其关键句存在)。
 * 与 analyze-profession-standard.ts:21-26 同源精简为 career 版。
 */
export const CAREER_EVIDENCE_IRON_LAW = [
  `直接证据铁律:skill_audit 每条的 current(当前水平 0-10)必须能在简历里找到该技能的直接、具体佐证(对应项目/实习/作品/竞赛/量化成果)才可给中高分;`,
  `给中高分(current≥4)必须在 evidenceFound 里照抄简历中支撑该分的原文片段,绝不可空。`,
  `有相关经历但无具体深度证据(只出现技能名、或仅"了解/接触过"无落地)只能给低档(1-3),evidenceFound 据实写"仅提及技能名,无项目佐证"或留空。`,
  `简历完全没提该技能 → current 给 0,evidenceFound 留空字符串。`,
  `严禁凭技能名泛化打分:不得因为"Python 是常用语言""现在都用 AI"等通识,就在简历无对应项目时给高分。宁可分低也不虚高(诚实优先于好看)。`,
].join('\n');

/**
 * 构建 career 能力盘点 system prompt(防编造铁律 + AI 能力专项 + evidenceFound 要求)。
 */
export function buildCareerAnalysisSystem(): string {
  return [
    `你是一位资深职业发展顾问，深谙职场发展规律与就业市场趋势。`,
    `请用中文(简体)分析候选人背景，生成职业发展路径推荐与技能差距分析。`,
    ``,
    `【防编造红线 —— 最高优先】`,
    `所有分析必须严格基于简历中的真实信息，不要编造任何技能、经历或数据。`,
    CAREER_EVIDENCE_IRON_LAW,
    ``,
    `请输出：`,
    `- paths：1-3 条职业发展路径。每条含 title(路径名)、fit_pct(契合度 0-100 整数)、description(说明)、skills(相关技能数组)。`,
    `- skill_audit：技能差距清单。每条含 name(技能名)、current(当前水平 0-10 整数)、needed(目标水平 0-10 整数)、`,
    `  evidenceFound(该技能在简历中的证据原文片段;无证据则空字符串)、category('general' 普通技能 或 'ai' AI 相关能力)。`,
    ``,
    `【AI 能力专项】skill_audit 里必须额外产出一组 category='ai' 的 AI 相关能力维度`,
    `(如:AI 工具应用、提示工程/Prompt、AI 辅助工作流、数据与 AI 素养——按岗位调整,2-4 条)。`,
    `AI 能力同样套用上面的直接证据铁律:简历没提 AI 相关就给低分(0-2)+ evidenceFound 留空,`,
    `严禁因为"现在都用 AI"就泛给分。`,
    ``,
    `关于 alumni_count(同校友进入该路径的人数):你没有任何校友数据库，简历中也几乎不可能包含此类统计，`,
    `因此该字段一律填 null，绝对禁止凭空估算或编造任何具体校友人数。`,
    `关于 skill_audit 的 ok(是否达标):由服务端依据 current>=needed 计算，无需你给出。`,
  ].join('\n');
}

/** 构建 career 能力盘点 user prompt。 */
export function buildCareerAnalysisPrompt(resumeText: string): string {
  return `## 候选人简历\n${resumeText}\n\n请严格基于该简历的真实内容生成职业发展分析，不要添加简历中没有的信息。每条技能的 current 分必须有 evidenceFound 原文支撑，无证据的技能给低分并留空 evidenceFound。`;
}

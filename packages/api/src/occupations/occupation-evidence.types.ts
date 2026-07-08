/**
 * 职业维基 · Stage0 · 证据侧表行类型(occupation_evidence)
 *
 * 与 occupation.types.ts 物理隔离的原因:T3-career-wiki.md §3「彻底移出正文」红线——
 * 溯源引用 / 源等级分级 / 蕴含校验结论一律不进骨架(skeleton)正文类型,只能存在于本文件
 * 描述的证据侧表。骨架类型文件(occupation.types.ts)不应出现本文件里的任何概念,
 * 两个文件的分离本身就是「证据层与结构主干物理隔离」架构的落地,不是巧合。
 *
 * 权威源:docs/refactor2/T3-career-wiki.md §4(occupation_evidence 行)。
 */

/**
 * 源等级(权威源分级)。文档表格写作 tier(A1/A2/A3):
 *  - A1:官方/权威标准
 *  - A2:多条真实校招 JD 汇聚一致
 *  - A3:公开行业文章/教材/公司公开资料
 * 该三级取值集合由 T3-career-wiki.md §4 明确列出,不是本次自定义。
 */
export type EvidenceSourceLevel = 'A1' | 'A2' | 'A3';

/**
 * verdict(校验结论)取值集合——T3 文档未列举具体枚举,本次按 §1 设计裁决第 8 条
 * 「蕴含失败默认删;仅当能写明推理链才准降级」+ 原稿「失败就把断言移到 B 层标推断、或删掉」
 * 的语义定稿为三态,理由见 IMPL 报告「关键技术选型决策」一节:
 *  - confirmed:断言经校验,源摘录能撑住,维持原状。
 *  - demoted_to_b:蕴含未通过,但能写明推理链(推自哪条已验证事实 + 什么公开常识),降级为推断。
 *  - rejected:蕴含失败且写不出推理链,断言被删除(不进骨架正文)。
 */
export type EvidenceVerdict = 'confirmed' | 'demoted_to_b' | 'rejected';

/**
 * occupation_evidence 表行类型:证据侧表,entry_slug 指向 occupation_entries.slug。
 * field_path 用于定位该证据支撑骨架内的哪个字段(如 "operations.deliverables[2]")。
 */
export interface OccupationEvidenceRow {
  entry_slug: string;
  /** 定位骨架内具体字段的路径,便于「按需展开来源说明」(T3 §5 API 设计) */
  field_path: string;
  /** 被支撑的断言原文 */
  claim: string;
  /** 源摘录 */
  source_excerpt: string;
  source_url: string;
  tier: EvidenceSourceLevel;
  verdict: EvidenceVerdict;
  last_verified: Date | null;
}

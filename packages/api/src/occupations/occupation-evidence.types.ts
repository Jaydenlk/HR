/**
 * 职业维基 · Stage0 · 证据侧表行类型(occupation_evidence)
 *
 * 与 occupation.types.ts 物理隔离的原因:T3-career-wiki.md §3「彻底移出正文」红线——
 * 溯源引用 / 源等级分级 / 蕴含校验结论一律不进骨架(skeleton)正文类型,只能存在于本文件
 * 描述的证据侧表。骨架类型文件(occupation.types.ts)不应出现本文件里的任何概念,
 * 两个文件的分离本身就是「证据层与结构主干物理隔离」架构的落地,不是巧合。
 *
 * 权威源:docs/refactor2/T3-career-wiki.md §4(occupation_evidence 行)。
 *
 * TC-02(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)定稿重写:引入 claim_id
 * (UUIDv7)+field_value_hash+span+reasoning_chain,替换旧的三态 verdict/claim 字段名,
 * 建立不可绕过的 claim-evidence 覆盖闸(occupation-coverage-gate.ts)。
 * 权威规格:docs/refactor2/t3-codex56-review-2026-07-10.md §R3。
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
 * verdict(校验结论)取值集合——TC-02 定稿(t3-codex56-review-2026-07-10.md §R3):
 *  - pending:尚未经过蕴含校验,覆盖闸一律拒绝(gate 不允许任何 pending 断言存在)。
 *  - directly_supported:源摘录直接撑住断言原文(字面蕴含)。
 *  - inference_supported:摘录不直接写明,但能给出合法推理链(premise+bridge_rule+
 *    conclusion+scope_limit)从已验证事实推出;占全部断言比例须 ≤0.30。
 *  - rejected:蕴含失败,断言不得再出现于骨架/散文/facets 正文。
 */
export type EvidenceVerdict = 'pending' | 'directly_supported' | 'inference_supported' | 'rejected';

/**
 * B 层(inference_supported)推理链最小字段集(t3-codex56-review-2026-07-10.md §R3):
 * 前提断言必须全部是 directly_supported;conclusion 与 claim_text 规范化后必须相等;
 * bridge_rule/scope_limit 必须非空;counterevidence_note 允许 null(未发现反例时无需强填)。
 * 禁止的桥接:单JD→全行业/某公司→全职业/相邻职业→本职业/异口径求平均/同模型互证/
 * 相关写因果/预测写事实——这些由 occupation-coverage-gate.ts 的规则校验,不在类型层表达。
 */
export interface ReasoningChain {
  /** 前提断言的 claim_id 列表,每一个在证据集合里必须 verdict=directly_supported */
  premise_claim_ids: string[];
  /** 从前提到结论的桥接规则说明(为什么这些前提能推出结论) */
  bridge_rule: string;
  /** 推出的结论,须与本条 claim_text 规范化后相等 */
  conclusion: string;
  /** 推理适用范围限定(禁止把范围外推) */
  scope_limit: string;
  /** 反例说明;未发现反例时为 null,不得用空串冒充 */
  counterevidence_note: string | null;
}

/**
 * occupation_evidence 表行类型:证据侧表,entry_slug 指向 occupation_entries.slug。
 * claim_id 是稳定主键(UUIDv7,S2 创建全程沿用,不因数组重排/复合断言拆分/重写而改变);
 * field_path 仅用于定位展示,不再是主键(数组重排/复合断言/重写歧义下不可靠——
 * t3-codex56-review-2026-07-10.md §R3「claim ID」一节)。
 */
export interface OccupationEvidenceRow {
  entry_slug: string;
  /** 稳定主键:UUIDv7,S2 创建全程沿用 */
  claim_id: string;
  /** 定位骨架内具体字段的路径,便于「按需展开来源说明」(T3 §5 API 设计);不作主键 */
  field_path: string;
  /** field_value_hash=sha256(normalizeLeafValue(当前 skeleton 该路径的值)),用于侦测改写复用旧 hash */
  field_value_hash: string;
  /** 被支撑的原子断言原文(禁"且/同时/以及/并且"连接两个事实) */
  claim_text: string;
  /** claim_text 在当前叶子规范化串中的半开区间起点(含) */
  span_start: number;
  /** claim_text 在当前叶子规范化串中的半开区间终点(不含) */
  span_end: number;
  /** 源摘录 */
  source_excerpt: string;
  source_url: string;
  tier: EvidenceSourceLevel;
  verdict: EvidenceVerdict;
  /** 仅 verdict=inference_supported 时非 null;其余 verdict 下为 null */
  reasoning_chain: ReasoningChain | null;
  last_verified: Date | null;
}

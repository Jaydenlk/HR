/**
 * 骨架文本抽取共用工具(dim1/dim3 共用),改造自 p2lib checks/dim1、dim3 里各自重复的
 * extractALayerText / extractAllTextFields——新骨架是扁平 8 层结构(不再有 A/B 层区分,
 * 不再有 Sourced<T> 包装),抽取逻辑可以统一成一次通用递归遍历,不必逐层手写字段清单。
 *
 * 约定:跳过 "axis" 键(差异主轴枚举 token,不是叙述文本,计入密度/黑名单扫描没有意义)。
 */

/**
 * 递归展平 occupation.skeleton 为 { 点号路径: 文本 } 映射。
 * - 字符串叶子:直接记录。
 * - 纯字符串数组(如 upstream/downstream/tools_systems):拼接为一条文本,路径即数组字段名
 *   (与 dim3 报告"命中字段"的直觉一致——不需要报到数组下标)。
 * - 对象数组(如 boundary.adjacent_diffs / variation.industry_diffs / domain_specifics):
 *   按下标展开继续递归,报告能精确定位到具体条目。
 */
export function flattenSkeletonTextFields(node, prefix = '', out = {}) {
  if (typeof node === 'string') {
    out[prefix] = node;
    return out;
  }
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((item) => typeof item === 'string')) {
      out[prefix] = node.join(' ');
      return out;
    }
    node.forEach((item, i) => flattenSkeletonTextFields(item, `${prefix}[${i}]`, out));
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'axis') continue; // 枚举 token,非叙述文本
      flattenSkeletonTextFields(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

/** 拼接 skeleton 全部文本字段为一整段(供 dim1 密度计算使用)。 */
export function extractSkeletonFullText(occupation) {
  const skeleton = occupation?.skeleton;
  if (!skeleton) return '';
  const fields = flattenSkeletonTextFields(skeleton);
  return Object.values(fields).join(' ');
}

/**
 * 收集词条内定义的专业实体词集合(工具系统 + 考核指标 + 产出物)。
 * 对应新骨架 operations 层字段,替代老结构的 A.tools_systems/A.eval_metrics/A.deliverables。
 */
export function collectDefinedTerms(occupation) {
  const ops = occupation?.skeleton?.operations;
  const terms = new Set();
  if (!ops) return terms;
  for (const field of ['tools_systems', 'eval_metrics', 'deliverables']) {
    const arr = ops[field];
    if (Array.isArray(arr)) {
      for (const t of arr) {
        if (typeof t === 'string' && t.trim().length > 1) terms.add(t.trim());
      }
    }
  }
  return terms;
}

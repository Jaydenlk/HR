export const SYSTEM = `你是一名资深简历优化顾问，专注于帮助候选人针对特定职位优化简历，提升 ATS 通过率和面试邀约率。
你的建议必须：
1. 基于真实的简历内容，绝对不能编造或添加候选人没有的经历、技能或成就
2. 聚焦于表达优化：更好地呈现现有经历、补充量化数据、融入 JD 关键词
3. 每条建议都要有清晰的理由，链接到具体的 JD 要求
4. 优先级判断标准：
   - high（高优先级）：直接影响是否通过 ATS 筛选或满足必要条件
   - medium（中优先级）：显著提升匹配度的关键词和表达优化
   - low（低优先级）：锦上添花的细节优化

改写类型：
- rewrite（重写）：改善现有内容的表达方式
- add_keywords（加关键词）：在现有内容中融入 JD 关键词
- restructure（重组结构）：调整内容的组织方式以更好突出重点
- quantify（量化）：为现有描述添加具体数字和成果

重要约束（必须严格遵守）：
1. "original" 字段必须是简历原文中的真实原句，一字不改地复制，不要改写或概括
2. "suggested" 字段是改写后的版本，只能在原文基础上优化表达
3. 如果找不到需要改写的原句，宁可减少建议数量，也不要编造
4. 绝不要在 suggested 中添加简历里没有的工作经历、公司名、项目名、职位名称
5. 只基于简历中已有的信息进行表达优化和量化增强；数字和数据只能引导候选人自行填写占位符（如"[具体数字]"），不能凭空捏造

严格按照 JSON Schema 输出，生成 3-5 条具体的改写建议。`;

export function buildSuggestRewritesPrompt(
  resumeText: string,
  jdText: string,
  matchResult: string,
): string {
  return `请根据候选人简历、目标职位 JD 和匹配分析结果，生成 3-5 条具体的简历改写建议。

## 候选人简历

${resumeText}

## 目标职位 JD

${jdText}

## 匹配分析结果

${matchResult}

## 输出要求

请严格按照以下 JSON 数组格式输出改写建议，不要添加任何解释文字：

[
  {
    "section": "改写的简历板块（如：work_experience、skills、summary、projects）",
    "item_index": 0,
    "type": "rewrite | add_keywords | restructure | quantify",
    "priority": "high | medium | low",
    "original": "原文内容（从简历中精确摘录，不要超过200字）",
    "suggested": "改写后的内容（保留真实信息，优化表达）",
    "reason": "改写理由（说明为什么这样改更好，如何提升匹配度）",
    "jd_requirement": "对应的 JD 要求（引用 JD 中的具体表述，可选）"
  }
]

注意：
- item_index 对应工作经历/项目的数组索引，从 0 开始；对于 skills/summary 等非数组字段可省略
- original 字段必须一字不差地从上方简历原文中复制，禁止改写、概括或缩写
- suggested 只能优化原文的表达方式，不能添加候选人没有的经历、公司、项目或技能
- 若无法找到对应原文片段，则跳过该建议，不要编造
- 按优先级从高到低排列建议`;
}

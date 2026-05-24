export const SYSTEM = `你是一名专业的招聘 JD（职位描述）解析助手。
你的任务是将招聘信息文本解析为结构化 JSON，重点提取技能要求、岗位职责、任职资格和 ATS 关键词。

规则：
1. 严格按照指定的 JSON Schema 输出，不要添加任何额外字段
2. 技能分级标准：
   - required（必须）：JD 中明确写"必须"、"要求"、"需要"或没有限定词的核心技能
   - preferred（优先）：JD 中写"优先"、"最好有"、"加分项"的技能
   - nice_to_have（加分）：写"了解"、"熟悉者优先"的技能
3. keywords 是 ATS 系统关键词，包括职位名称、核心技术、行业术语、工具名称等，供简历优化使用
4. 如某字段信息不存在，字符串字段用空字符串，数组字段用空数组
5. 忠实提取原文，不推断未明确提及的要求`;

export function buildParseJDPrompt(jdText: string): string {
  return `请将以下招聘 JD 解析为结构化 JSON。

## JD 原文

${jdText}

## 输出要求

请严格按照以下结构输出 JSON，不要添加任何解释文字：

{
  "job_title": "职位名称",
  "company": "公司名称（可选）",
  "department": "所属部门（可选）",
  "required_skills": [
    {
      "skill": "技能名称",
      "level": "required | preferred | nice_to_have",
      "years": "要求年限（可选，如 '3年以上'）"
    }
  ],
  "responsibilities": [
    "职责描述1",
    "职责描述2"
  ],
  "qualifications": {
    "education": "学历要求（可选，如 '本科及以上'）",
    "experience_years": "经验年限（可选，如 '5年以上'）",
    "must_have": ["必备条件1", "必备条件2"],
    "nice_to_have": ["加分条件1", "加分条件2"]
  },
  "keywords": [
    "ATS关键词1",
    "ATS关键词2",
    "职位名称关键词",
    "核心技术关键词"
  ]
}`;
}

export const SYSTEM = `你是一名专业的简历结构化解析助手。
你的任务是将用户提供的原始简历文本解析为标准化的 JSON 结构。

规则：
1. 严格按照指定的 JSON Schema 输出，不要添加任何额外字段
2. 如果某个字段在简历中不存在，字符串字段使用空字符串 ""，数组字段使用空数组 []，可选字段可省略
3. 日期格式统一为 "YYYY-MM" 或 "YYYY"，如"至今"或"present"转为 "至今"
4. 技能分类：technical 为技术技能（编程语言、框架、工具等），soft 为软技能，languages 为语言能力，certifications 为证书
5. 工作经历中的 achievements 提取具体的成就和量化数据，如无明确成就则留空数组
6. 忠实提取原文信息，不要补充或推断未在简历中明确提及的内容`;

export function buildParseResumePrompt(resumeText: string): string {
  return `请将以下简历文本解析为结构化 JSON。

## 简历原文

${resumeText}

## 输出要求

请严格按照以下结构输出 JSON，不要添加任何解释文字：

{
  "basic_info": {
    "name": "姓名",
    "phone": "电话（可选）",
    "email": "邮箱（可选）",
    "location": "所在地（可选）",
    "linkedin": "LinkedIn链接（可选）"
  },
  "summary": "个人简介（可选，如简历中有则提取）",
  "work_experience": [
    {
      "company": "公司名称",
      "title": "职位名称",
      "start_date": "开始时间 YYYY-MM",
      "end_date": "结束时间 YYYY-MM 或 至今（可选）",
      "description": "工作描述",
      "achievements": ["具体成就1（含数据）", "具体成就2"]
    }
  ],
  "education": [
    {
      "school": "学校名称",
      "degree": "学历（学士/硕士/博士等）",
      "major": "专业",
      "graduation_date": "毕业时间（可选）",
      "gpa": "GPA（可选）"
    }
  ],
  "skills": {
    "technical": ["技术技能1", "技术技能2"],
    "soft": ["软技能1", "软技能2"],
    "languages": ["中文（母语）", "英语（流利）"],
    "certifications": ["证书1", "证书2"]
  },
  "projects": [
    {
      "name": "项目名称",
      "description": "项目描述",
      "technologies": ["技术栈1", "技术栈2"],
      "role": "担任角色（可选）"
    }
  ]
}`;
}

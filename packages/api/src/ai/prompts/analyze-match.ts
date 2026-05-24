export const SYSTEM = `你是一名资深 HR 和职业顾问，专注于简历与职位的匹配度分析。
你的任务是对候选人的结构化简历与目标职位 JD 进行多维度匹配评分，给出专业、具体、有建设性的分析。

评分维度（总分 100 分）：
1. 技能匹配（满分 30 分）：评估候选人技能与 JD 要求技能的匹配程度
2. 经验匹配（满分 25 分）：评估工作经历年限、行业相关性、职责匹配度
3. 学历匹配（满分 15 分）：评估学历层次、专业相关性是否符合要求
4. 关键词覆盖（满分 20 分）：评估简历对 JD ATS 关键词的覆盖率
5. 综合印象（满分 10 分）：评估整体契合度、职业发展轨迹、潜力

规则：
1. 评分要客观公正，有据可依，不虚高也不苛刻
2. matched/missing/partial 列表要具体列出技能名称
3. analysis 分析要具体，指出亮点和不足，给出有价值的洞见
4. 严格按照 JSON Schema 输出，不要添加任何解释文字`;

export function buildAnalyzeMatchPrompt(resumeJson: string, jdJson: string): string {
  return `请对以下候选人简历与目标职位进行匹配度分析，输出结构化评分结果。

## 候选人简历（结构化数据）

${resumeJson}

## 目标职位 JD（结构化数据）

${jdJson}

## 输出要求

请严格按照以下 JSON 结构输出评分结果：

{
  "total_score": 0,
  "dimensions": {
    "skills": {
      "score": 0,
      "max": 30,
      "matched": ["已匹配的技能列表"],
      "missing": ["完全缺失的必要技能"],
      "partial": ["部分匹配或相关技能"]
    },
    "experience": {
      "score": 0,
      "max": 25,
      "analysis": "经验维度分析：年限是否达标、行业相关性、职责匹配度等"
    },
    "education": {
      "score": 0,
      "max": 15,
      "analysis": "学历维度分析：学历层次是否达标、专业相关性分析"
    },
    "keywords": {
      "score": 0,
      "max": 20,
      "coverage_rate": 0.0,
      "missing_keywords": ["简历中缺失的 JD 关键词"]
    },
    "overall": {
      "score": 0,
      "max": 10,
      "analysis": "综合印象：职业轨迹、整体契合度、亮点与短板总结"
    }
  }
}

注意：
- total_score 必须等于五个维度 score 之和
- coverage_rate 为 0.0 到 1.0 之间的小数（覆盖关键词数 / JD关键词总数）
- 所有 score 必须在 0 到对应 max 值之间`;
}

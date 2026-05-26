# 示例：来源存在红色风险信号 → 风险标注而非忽略

## 场景

用户从某招聘平台看到一个高薪岗位，但 source-quality-auditor 发现该职位存在虚假招聘特征：要求交押金、薪资虚高、公司信息无法核实。

## 输入

```json
{
  "jd_analysis": {
    "skill_name": "jd-analyzer",
    "confidence": "medium",
    "parsed_jd": {
      "basic": {
        "title": "海外销售专员",
        "company": "某国际贸易公司",
        "location": "广州",
        "salary_range": "30000-80000元/月",
        "employment_type": "full_time"
      },
      "requirements": {
        "explicit": [
          { "text": "有销售经验者优先", "type": "experience", "priority": "nice_to_have" }
        ],
        "implicit": []
      },
      "risk_signals": [
        { "signal": "入职需缴纳培训费", "real_meaning": "非正规招聘，可能为诈骗", "severity": "red", "evidence": "JD末尾：「入职前需缴纳3000元培训保证金」" }
      ],
      "responsibilities": [
        { "text": "负责海外市场开拓和客户维护", "category": "core" }
      ],
      "benefits": [],
      "company_context": { "stage": "unknown", "signals": ["无法通过工商系统核实公司注册信息"] }
    }
  },
  "source_quality": {
    "overall_quality": "red",
    "red_flags": [
      { "flag": "要求缴纳押金", "severity": "red", "detail": "正规招聘不向应聘者收取任何费用" },
      { "flag": "薪资严重虚高", "severity": "red", "detail": "同类岗位市场薪资约5000-10000，标注薪资达8倍" },
      { "flag": "公司工商信息无法核实", "severity": "red", "detail": "天眼查无匹配注册记录" }
    ]
  }
}
```

## 输出

```json
{
  "skill_name": "opportunity-intelligence",
  "skill_version": "1.0.0",
  "summary": "高度疑似虚假招聘，存在3个红色风险信号（收费、薪资虚高、公司无法核实），强烈建议不要投递，更不要缴纳任何费用。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "jd_analysis.risk_signals", "content": "入职需缴纳培训保证金3000元" },
    { "source": "source_quality.red_flags", "content": "要求缴纳押金、薪资虚高8倍、公司工商信息无法核实" }
  ],
  "recommendations": [
    "立即停止与该公司的任何接触",
    "切勿缴纳任何名义的押金或培训费",
    "可向招聘平台举报该职位"
  ],
  "risks": [
    "存在招聘诈骗风险，要求缴纳保证金是典型欺诈特征",
    "薪资严重虚高（标注30000-80000，市场均值5000-10000）",
    "公司工商信息无法核实，可能为空壳公司"
  ],
  "next_actions": [
    "不要回复该职位，不要提供个人证件信息",
    "在天眼查/企查查核实任何公司的工商注册信息再投递"
  ],
  "follow_up_questions": [],
  "cannot_determine": [
    "候选人匹配度（因机会本身不可信，匹配分无意义）"
  ],
  "opportunity_score": 5,
  "match_assessment": {
    "score": null,
    "strengths": [],
    "gaps": ["来源存在严重红色信号，匹配评估无意义"]
  },
  "market_positioning": {
    "salary_competitiveness": "unknown",
    "company_tier": "unknown",
    "growth_potential": "unknown"
  },
  "risk_flags": [
    {
      "flag": "要求缴纳培训保证金",
      "severity": "red",
      "evidence": "JD末尾：「入职前需缴纳3000元培训保证金」——正规招聘不向应聘者收费"
    },
    {
      "flag": "薪资严重虚高",
      "severity": "red",
      "evidence": "标注30000-80000元/月，同类岗位市场均值5000-10000元，差距达8倍"
    },
    {
      "flag": "公司工商信息无法核实",
      "severity": "red",
      "evidence": "source-quality-auditor 在天眼查无法找到匹配的公司注册记录"
    }
  ],
  "recommendation": "skip"
}
```

## 说明

- 三个 red 风险信号全部进入 `risk_flags`，无一被忽略
- `opportunity_score: 5` 而非 null：有数据但机会本身极差，给出极低分
- `match_assessment.score: null`：因来源不可信，个人匹配评估无意义
- `recommendation: skip` 而非 `need_more_info`：证据足够做出明确建议

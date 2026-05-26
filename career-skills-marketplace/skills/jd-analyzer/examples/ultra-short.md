# 示例：超短 JD（< 50 字）→ 低置信度解析

## 场景

用户从朋友圈转发了一条极简招聘信息，内容不足 50 字。

## 输入

```json
{
  "jd_text": "招 Java 后端，3 年以上，上海，薪资面议，有意者加微信"
}
```

## 输出

```json
{
  "skill": "jd-analyzer",
  "confidence": "low",
  "risk_count": 1,
  "implicit_count": 1,
  "parsed_jd": {
    "basic": {
      "title": null,
      "company": null,
      "location": "上海",
      "salary_range": "薪资面议",
      "employment_type": "full_time"
    },
    "requirements": {
      "explicit": [
        {
          "text": "Java 后端",
          "type": "technical",
          "priority": "must_have"
        },
        {
          "text": "3 年以上经验",
          "type": "experience",
          "priority": "must_have"
        }
      ],
      "implicit": [
        {
          "text": "薪资谈判空间存在不确定性，求职者处于信息劣势",
          "inference_reason": "「薪资面议」在知识图谱中标注为信息不透明信号",
          "confidence": "medium"
        }
      ]
    },
    "risk_signals": [
      {
        "signal": "薪资面议",
        "real_meaning": "公司掌握信息优势，求职者处于谈判劣势；部分公司借此压低薪资",
        "severity": "yellow",
        "evidence": "「薪资面议」"
      }
    ],
    "responsibilities": [],
    "benefits": [],
    "company_context": {
      "stage": "unknown",
      "signals": ["无公司信息，无法推断发展阶段"]
    }
  }
}
```

## 说明

- `title` 为 null：无明确职位名称，「Java 后端」是技能描述而非正式职位名
- `company` 为 null：信息中未提及公司名称
- `responsibilities` 为空数组：JD 中无职责描述
- 置信度 `low`：内容少于 100 字且缺少大量关键字段
- 建议：引导用户获取完整 JD 后再做分析

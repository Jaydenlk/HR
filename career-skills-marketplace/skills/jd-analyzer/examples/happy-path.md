# 示例：标准 JD → 完整解析

## 场景

用户粘贴一份内容完整的互联网公司 JD，包含职位、职责、要求、薪资和福利。

## 输入

```json
{
  "jd_text": "职位：后端工程师（Go 方向）\n公司：某电商平台（北京，已上市）\n地点：北京朝阳区\n薪资：25k-40k × 14 薪\n\n工作职责\n1. 负责电商核心交易链路的后端服务开发和维护\n2. 参与系统架构设计，推动服务拆分和性能优化\n3. 编写技术方案文档，参与 Code Review\n\n任职要求\n1. 本科及以上学历，计算机相关专业\n2. 3 年以上 Go 语言后端开发经验\n3. 熟悉 MySQL、Redis，了解 Kafka 优先\n4. 有高并发、大流量系统设计经验优先\n\n福利\n- 五险一金（公积金 12%）\n- 年终奖（视公司业绩，一般 1-3 个月）\n- 弹性工作时间"
}
```

## 输出

```json
{
  "skill": "jd-analyzer",
  "confidence": "high",
  "risk_count": 1,
  "implicit_count": 2,
  "parsed_jd": {
    "basic": {
      "title": "后端工程师（Go 方向）",
      "company": "某电商平台",
      "location": "北京朝阳区",
      "salary_range": "25k-40k × 14 薪",
      "employment_type": "full_time"
    },
    "requirements": {
      "explicit": [
        {
          "text": "本科及以上学历，计算机相关专业",
          "type": "education",
          "priority": "must_have"
        },
        {
          "text": "3 年以上 Go 语言后端开发经验",
          "type": "experience",
          "priority": "must_have"
        },
        {
          "text": "熟悉 MySQL、Redis",
          "type": "technical",
          "priority": "must_have"
        },
        {
          "text": "了解 Kafka 优先",
          "type": "technical",
          "priority": "nice_to_have"
        },
        {
          "text": "有高并发、大流量系统设计经验优先",
          "type": "experience",
          "priority": "nice_to_have"
        }
      ],
      "implicit": [
        {
          "text": "需要具备技术文档写作能力",
          "inference_reason": "「编写技术方案文档」列为职责，属于必要工作内容",
          "confidence": "high"
        },
        {
          "text": "工作时间可能存在弹性加班（无固定下班时间）",
          "inference_reason": "「弹性工作时间」在知识图谱中标记为潜在无加班补偿信号",
          "confidence": "medium"
        }
      ]
    },
    "risk_signals": [
      {
        "signal": "弹性工作时间",
        "real_meaning": "无固定上下班时间，通常意味着无加班补偿或随时待命",
        "severity": "yellow",
        "evidence": "福利列表：「弹性工作时间」"
      }
    ],
    "responsibilities": [
      {
        "text": "负责电商核心交易链路的后端服务开发和维护",
        "category": "core"
      },
      {
        "text": "参与系统架构设计，推动服务拆分和性能优化",
        "category": "core"
      },
      {
        "text": "编写技术方案文档，参与 Code Review",
        "category": "ancillary"
      }
    ],
    "benefits": [
      {
        "text": "五险一金（公积金 12%）",
        "verified": true
      },
      {
        "text": "年终奖（视公司业绩，一般 1-3 个月）",
        "verified": false
      },
      {
        "text": "弹性工作时间",
        "verified": false
      }
    ],
    "company_context": {
      "stage": "mature",
      "signals": [
        "JD 注明「已上市」",
        "薪资区间具体，结构透明（14 薪）"
      ]
    }
  }
}
```

## 说明

- `salary_range` 完整保留原文，包含「14 薪」修饰
- 「弹性工作时间」同时出现在 benefits 和 risk_signals，两者视角不同（福利 vs 风险）
- 「年终奖」因含「视公司业绩」等不确定表述，`verified: false`
- 隐性要求均有 `inference_reason`，引用原文或知识图谱依据

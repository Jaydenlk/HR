# 示例：JD 内部矛盾 → 矛盾标记

## 场景

JD 标题写「初级工程师」，但任职要求列出 10 年工作经验，且薪资与高级职位相当。
职位标题与实际要求严重不符。

## 输入

```json
{
  "jd_text": "职位：初级 Java 工程师\n公司：某金融科技公司\n地点：深圳\n薪资：30k-50k\n\n任职要求\n1. 10 年以上 Java 后端开发经验\n2. 有大型分布式系统架构设计经验（百万级 QPS）\n3. 主导过至少 3 个核心系统从 0 到 1 建设\n4. 有团队管理经验，曾带领 10 人以上团队\n\n工作职责\n1. 负责核心交易系统架构升级\n2. 制定团队技术规范和代码标准\n3. 培养初级工程师成长\n\n福利\n- 五险一金\n- 股票期权\n- 团队氛围像家人一样"
}
```

## 输出

```json
{
  "skill": "jd-analyzer",
  "confidence": "high",
  "risk_count": 2,
  "implicit_count": 3,
  "parsed_jd": {
    "basic": {
      "title": "初级 Java 工程师",
      "company": "某金融科技公司",
      "location": "深圳",
      "salary_range": "30k-50k",
      "employment_type": "full_time"
    },
    "requirements": {
      "explicit": [
        {
          "text": "10 年以上 Java 后端开发经验",
          "type": "experience",
          "priority": "must_have"
        },
        {
          "text": "有大型分布式系统架构设计经验（百万级 QPS）",
          "type": "experience",
          "priority": "must_have"
        },
        {
          "text": "主导过至少 3 个核心系统从 0 到 1 建设",
          "type": "experience",
          "priority": "must_have"
        },
        {
          "text": "有团队管理经验，曾带领 10 人以上团队",
          "type": "experience",
          "priority": "must_have"
        }
      ],
      "implicit": [
        {
          "text": "实际招聘目标为高级/专家级工程师，非初级",
          "inference_reason": "职位名称「初级工程师」与「10 年经验」「架构设计」「团队管理」要求严重不符，薪资区间 30k-50k 也远超市场初级薪资",
          "confidence": "high"
        },
        {
          "text": "可能存在职级压低以控制薪资起点的意图",
          "inference_reason": "高要求配低职级名称是常见的薪资谈判策略",
          "confidence": "medium"
        },
        {
          "text": "需要承担团队建设和初级员工培养职责，超出一般工程师范围",
          "inference_reason": "职责第 3 条「培养初级工程师成长」属于管理职能",
          "confidence": "high"
        }
      ]
    },
    "risk_signals": [
      {
        "signal": "职位名称与要求年限严重不匹配（初级工程师要求 10 年经验）",
        "real_meaning": "职位分类错误，或公司对职级体系不熟悉，或实为高级岗位压低薪资",
        "severity": "red",
        "evidence": "职位标题「初级 Java 工程师」vs 任职要求「10 年以上 Java 后端开发经验」"
      },
      {
        "signal": "团队氛围像家人一样",
        "real_meaning": "边界模糊，可能被要求超工时付出而无法拒绝",
        "severity": "red",
        "evidence": "福利描述：「团队氛围像家人一样」"
      }
    ],
    "responsibilities": [
      {
        "text": "负责核心交易系统架构升级",
        "category": "core"
      },
      {
        "text": "制定团队技术规范和代码标准",
        "category": "core"
      },
      {
        "text": "培养初级工程师成长",
        "category": "ancillary"
      }
    ],
    "benefits": [
      {
        "text": "五险一金",
        "verified": true
      },
      {
        "text": "股票期权",
        "verified": false
      },
      {
        "text": "团队氛围像家人一样",
        "verified": false
      }
    ],
    "company_context": {
      "stage": "growth",
      "signals": [
        "提供期权（股权激励常见于成长期公司）",
        "未提及上市状态，推断为非上市"
      ]
    }
  }
}
```

## 说明

- 矛盾通过隐性要求中的 `confidence: "high"` 推断记录，而非单独矛盾字段
- 两个 `red` 级风险信号：职级矛盾 + 家文化
- `benefits` 中「股票期权」`verified: false`，因其价值高度不确定
- 建议用户在面试时直接询问：实际职级定位是什么？

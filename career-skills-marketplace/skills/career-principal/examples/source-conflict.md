# 示例：数据冲突（JD 信息与知识图谱不一致）

## 场景描述

用户提供了一份 JD，其中的薪资范围与 knowledge/ 目录中的静态薪资数据存在明显差异。career-principal 标记冲突，不自动解决，由用户判断。

---

## 输入

**用户消息**：
> 帮我分析这个数据分析师的 JD，尤其是薪资合不合理

**jd_text**：
```
职位名称：数据分析师（用户行为方向）
公司：某在线教育公司（已上市）
工作地点：上海

岗位职责：
1. 负责用户行为数据的采集、清洗和分析
2. 构建用户分层模型，支持精细化运营
3. 设计数据报表体系，为业务团队提供决策支持
4. 参与 A/B 测试设计和结果分析

任职要求：
1. 本科及以上，统计、数学、计算机相关专业优先
2. 2年以上数据分析经验，熟练使用 SQL
3. 熟悉 Python 数据分析（pandas、numpy）
4. 了解用户行为分析方法（漏斗、留存、RFM等）

薪资范围：12-18K，13薪
```

---

## career-principal 执行过程

### 步骤1：调用 jd-analyzer

jd-analyzer 正常解析 JD，输出：
- 技能要求：SQL（必须）、Python（必须）、A/B测试（必须）、用户行为分析框架（必须）
- 经验要求：2年以上
- 薪资：12-18K，13薪（年薪 156K-234K）
- 隐含信号：在线教育行业，上市公司，节奏可能不如纯互联网快

### 步骤2：调用 source-quality-auditor（薪资核查）

source-quality-auditor 查询 knowledge/ 目录：

```
knowledge/salary-data 中的记录（上海，数据分析师，2年经验，2024年）：
  median: 22K
  range: 18-30K
  note: "上海互联网/在线教育行业，SQL+Python，2年经验，市场中位数约22K"
```

**发现冲突**：
- JD 声称：12-18K
- knowledge/ 数据：18-30K（中位数22K）
- 差距：JD 上限（18K）等于 knowledge 下限（18K），整体偏低约 20-40%

### 步骤3：标记冲突，不解决

career-principal 填写 `conflict_markers`，不猜测哪个更准确。

---

## 最终输出

```json
{
  "status": "success",
  "intent_detected": "analyze_jd",
  "confidence": "medium",
  "skills_invoked": [
    {
      "skill_name": "jd-analyzer",
      "status": "completed",
      "result_summary": "JD解析完成：SQL+Python数据分析，用户行为方向，2年经验，上海，薪资12-18K",
      "confidence": "high"
    },
    {
      "skill_name": "source-quality-auditor",
      "status": "completed",
      "result_summary": "薪资核查发现冲突：JD薪资范围与知识库数据存在明显差异，已标记，未解决",
      "confidence": "medium"
    }
  ],
  "aggregated_result": {
    "summary": "这个 JD 的岗位要求清晰，技能栈标准，但薪资范围（12-18K）与参考数据（18-30K）存在明显差异，建议在面试中核实。以下分析已标注此冲突。",
    "key_findings": [
      "岗位要求：SQL必须、Python必须、A/B测试必须、用户行为分析框架（漏斗/留存/RFM）必须",
      "上市公司在线教育背景，节奏通常比创业公司稳定",
      "薪资范围12-18K与参考数据存在差距（见冲突标记）",
      "13薪，实际年薪156K-234K范围"
    ],
    "recommendations": [
      "如果有兴趣投递，建议在面试时主动询问薪资结构（是否有绩效奖金、期权等补充说明）",
      "薪资谈判时可参考市场数据（18-30K区间），但需注意可能是公司政策约束",
      "上市公司在线教育赛道的增长前景需独立评估，不在本次分析范围内"
    ],
    "evidence": [
      "[jd-analyzer] JD原文：薪资范围 12-18K，13薪",
      "[source-quality-auditor] knowledge/salary-data：上海数据分析师2年经验，参考范围18-30K，中位数22K"
    ],
    "conflict_markers": [
      {
        "field": "薪资范围",
        "source_a": "JD原文",
        "value_a": "12-18K（月薪），13薪，年薪约156K-234K",
        "source_b": "knowledge/salary-data（静态参考数据）",
        "value_b": "18-30K（月薪），中位数约22K，年薪约216K-360K"
      }
    ]
  },
  "missing_information": [],
  "cannot_determine": [
    "薪资差异的原因（是公司政策、地区调整、还是数据时效性问题）",
    "该公司是否有额外的绩效奖金或股权补充"
  ],
  "next_steps": [
    "如果决定投递，面试时询问完整薪酬结构（固定薪+绩效+其他补贴）",
    "知识库薪资数据有时效性限制，建议通过 offer 阶段的市场调研进一步确认"
  ]
}
```

---

## 说明

**冲突处理原则**：
1. career-principal 只标记冲突，填写 `conflict_markers`，说明两个来源各自的数据
2. 不猜测哪个数据更准确（knowledge/ 是静态数据，JD 是实时但可能有策略性压低）
3. 不因冲突而拒绝输出，其他分析正常进行
4. 将无法确定的原因列入 `cannot_determine`
5. 在 `next_steps` 中给出用户可以主动验证的方式

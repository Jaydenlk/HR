# 示例：完整流程（高置信度路径）

## 场景描述

用户是一名有4年经验的产品经理，同时提供了完整简历和 JD，要求全面评估匹配情况并优化简历。

---

## 输入

**用户消息**：
> 我想投这个产品经理的职位，帮我看看我的简历和 JD 的匹配度，顺便帮我把简历优化一下

**jd_text**：
```
职位名称：高级产品经理
公司：某互联网公司（B轮）
工作地点：北京

岗位职责：
1. 负责用户增长相关产品的规划与设计，包括拉新、激活、留存模块
2. 深度参与数据分析，通过 A/B 测试驱动产品迭代
3. 跨部门协作推进项目落地，对接技术、运营、市场团队
4. 建立产品指标体系，定期输出产品分析报告

任职要求：
1. 本科及以上学历，3年以上互联网产品工作经验
2. 熟悉用户增长方法论，有 AARRR 漏斗或 growth hacking 实践经验
3. 较强的数据分析能力，熟练使用 SQL 或 Python 进行数据查询
4. 良好的跨部门沟通能力，有大型项目推进经验
5. 加分项：有 B 端 SaaS 产品经验，或有 DAU > 100 万产品经历

薪资范围：30-45K，14薪
```

**resume_text**：
```
张明
产品经理 | 北京 | 4年经验

工作经历：
2020.07 - 至今  某电商平台（C轮）  高级产品经理
- 主导用户增长产品线，负责新用户拉新和老用户激活模块，DAU 从 80 万增长至 150 万
- 设计并推进 A/B 测试体系，年均运行 200+ 实验，使核心转化率提升 23%
- 使用 SQL + Python 进行数据分析，建立 AARRR 漏斗追踪体系
- 协调技术、运营、市场三个部门，推进 3 个百人规模跨部门项目

2018.07 - 2020.06  某 SaaS 公司  产品经理
- 负责 CRM 产品功能规划，服务 B 端企业客户超过 500 家
- 完成 3 个版本大版本迭代，NPS 从 32 提升至 58

教育背景：
北京大学  信息管理  本科  2018 年毕业

技能：SQL、Python（数据分析）、Axure、Figma、数据看板搭建
```

---

## career-principal 执行过程

### 步骤1：意图识别

分析用户消息，识别出两个意图：
- 主意图：`match_diagnosis`（评估匹配度）
- 次意图：`tailor_resume`（优化简历）

检查 required_inputs：
- `jd_text` 已提供（字符数 >> 50，满足 confidence_gate）
- `resume_text` 已提供（字符数 >> 100，满足 confidence_gate）

**不需要追问，直接进入编排**

### 步骤2：编排调用

```
阶段 1（并行）:
  ├── jd-analyzer(jd_text)       → 解析岗位要求
  └── profile-builder(resume_text)  → 提取用户档案

阶段 2:
  ├── match-diagnosis(jd-analyzer.output, profile-builder.output)
  └── resume-tailor(jd-analyzer.output, resume_text)

阶段 3:
  └── source-quality-auditor("30-45K薪资范围" 的市场验证)
```

### 步骤3：各 skill 输出摘要

**jd-analyzer 输出**（confidence: high）：
- 核心要求：用户增长经验、AARRR、A/B测试、数据分析（SQL/Python）、跨部门协作
- 隐含要求：初创公司经验，可以承受高强度工作
- 加分项：B 端 SaaS 经验，DAU > 100 万产品经历
- 薪资：30-45K，14薪，市场中等偏上

**profile-builder 输出**（confidence: high）：
- 经验年限：4年（超过要求的3年）
- 核心能力：用户增长、A/B测试、数据分析（SQL+Python）
- 量化成就：DAU 150 万（超过100万门槛）、转化率提升23%
- B 端经验：有（2年 SaaS CRM）

**match-diagnosis 输出**（confidence: high）：
- 综合匹配度：强匹配
- 硬性要求匹配：全部满足（学历、工作年限、技能栈）
- 加分项匹配：全部满足（B端SaaS经验 + DAU>100万）
- 潜在劣势：当前在 C 轮公司，目标是 B 轮，可能有稳定性方面的考量

**resume-tailor 输出**（confidence: high）：
- 建议强化"DAU 从 80 万→150 万"的量化描述，与 JD 中的 DAU>100 万加分项直接呼应
- 建议在技能列表中单独列出"AARRR 漏斗"关键词，与 JD 直接对齐
- 建议将 SaaS 经历提前描述（目前放在后面），因为 JD 将此列为加分项

**source-quality-auditor 输出**（confidence: medium）：
- 薪资范围 30-45K 在北京产品经理岗位属于正常水平，但静态数据可能有时效性限制

---

## 最终输出

```json
{
  "status": "success",
  "intent_detected": "match_diagnosis",
  "confidence": "medium",
  "skills_invoked": [
    {
      "skill_name": "jd-analyzer",
      "status": "completed",
      "result_summary": "解析岗位要求：用户增长、AARRR、A/B测试、SQL/Python，薪资30-45K",
      "confidence": "high"
    },
    {
      "skill_name": "profile-builder",
      "status": "completed",
      "result_summary": "用户档案：4年增长产品经验，DAU 150万，B端SaaS背景，技能全匹配",
      "confidence": "high"
    },
    {
      "skill_name": "match-diagnosis",
      "status": "completed",
      "result_summary": "强匹配，硬性要求和加分项均满足，无明显短板",
      "confidence": "high"
    },
    {
      "skill_name": "resume-tailor",
      "status": "completed",
      "result_summary": "3项优化建议：突出DAU数据、加AARRR关键词、SaaS经历前置",
      "confidence": "high"
    },
    {
      "skill_name": "source-quality-auditor",
      "status": "completed",
      "result_summary": "薪资30-45K在北京PM市场属正常范围，数据有时效限制",
      "confidence": "medium"
    }
  ],
  "aggregated_result": {
    "summary": "你的背景与这个 JD 高度匹配：4年增长产品经验超过要求，技能栈完全对齐，DAU 150万和SaaS经历均满足加分项。简历主要优化方向是关键词对齐和量化数据的位置调整，整体竞争力较强。",
    "key_findings": [
      "硬性要求全部满足：学历、年限、技能栈（SQL、Python、AARRR、A/B测试）",
      "两个加分项均满足：B端SaaS经验（2年）+ DAU>100万（你的150万）",
      "现有简历未突出AARRR关键词，与JD存在表述落差",
      "薪资范围30-45K在市场属正常水平（数据有时效性限制）"
    ],
    "recommendations": [
      "在简历技能部分明确写出"AARRR增长体系"，与JD关键词直接对应",
      "将SaaS CRM经历在简历中提前，或在第一段工作经历中引用，强化加分项曝光",
      "在电商平台经历中突出DAU增长数字（80万→150万），与JD的100万门槛形成超越对比",
      "面试时准备具体A/B测试案例：实验设计、样本量计算、结果应用"
    ],
    "evidence": [
      "[jd-analyzer] JD原文：加分项'DAU>100万产品经历'",
      "[profile-builder] 简历原文：'DAU从80万增长至150万'",
      "[profile-builder] 简历原文：'SaaS公司CRM产品，B端客户500+家'",
      "[source-quality-auditor] 薪资范围市场验证（时效性有限）"
    ]
  },
  "missing_information": [],
  "cannot_determine": [],
  "next_steps": [
    "按上述3项建议更新简历（约30分钟）",
    "准备2-3个A/B测试案例，重点是结果和业务影响",
    "研究目标公司B轮融资情况，面试时准备应对稳定性相关问题"
  ]
}
```

---

## 说明

confidence 为 medium 而非 high，原因是 source-quality-auditor 对薪资数据的验证置信度为 medium（数据有时效限制），按最低值规则，整体 confidence 降为 medium。

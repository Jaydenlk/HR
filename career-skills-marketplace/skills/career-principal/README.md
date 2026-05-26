# career-principal — 求职主理人

Career Skills Marketplace 的入口 skill。当用户在 Claude Code 中谈到任何求职相关话题时，此 skill 触发，理解用户意图，调度合适的专业 sub-skill，并将多个分析结果汇总为结构化结论。

---

## 职责范围

**处理**：简历分析与优化、JD解读、匹配度诊断、面试准备、offer评估、公司调查、薪资判断、职业规划、求职日程

**不处理**：与求职无关的任何话题（明确拒绝）

---

## 意图路由

career-principal 识别12种意图，并将每种意图路由到对应的 sub-skill 组合：

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `analyze_jd` | 解读职位描述，分析要求和隐含条件 | jd-analyzer |
| `tailor_resume` | 针对特定 JD 优化简历内容 | resume-tailor |
| `match_diagnosis` | 评估用户背景与岗位的匹配程度 | match-diagnosis |
| `career_direction` | 职业方向规划和转型建议 | profile-builder |
| `interview_prep` | 面试题目预测和准备策略 | profile-builder + jd-analyzer |
| `interview_debrief` | 面试表现复盘和改进建议 | profile-builder |
| `offer_evaluation` | offer 条件评估和决策支持 | source-quality-auditor |
| `company_check` | 公司背景、口碑和发展前景调查 | source-quality-auditor |
| `salary_check` | 薪资水平的市场合理性判断 | source-quality-auditor |
| `find_interview_experience` | 查找特定公司/岗位面经 | source-quality-auditor |
| `write_message` | 撰写自荐信、感谢信等求职沟通消息 | profile-builder |
| `daily_planning` | 求职进度和日程管理规划 | profile-builder |

详细路由规则见 `references/intent-router.yaml`。

---

## 调用的 sub-skills

| skill | 职责 |
|-------|------|
| `profile-builder` | 从简历文本提取结构化用户档案 |
| `jd-analyzer` | 解析 JD，提取要求、隐含条件、红旗信号 |
| `resume-tailor` | 基于 JD 分析结果重写/优化简历 |
| `match-diagnosis` | 计算用户档案与 JD 要求的多维匹配度 |
| `source-quality-auditor` | 验证市场事实类声明的来源可靠性 |

sub-skill 之间存在依赖关系，career-principal 负责保证调用顺序正确（见 `references/orchestration-rules.md`）。

---

## 输入

| 字段 | 必须 | 说明 |
|------|------|------|
| `user_message` | 是 | 用户的自然语言消息 |
| `resume_text` | 否 | 简历原文（部分意图需要） |
| `jd_text` | 否 | JD 原文（部分意图需要） |
| `user_profile` | 否 | 已有的用户档案对象 |

缺少必要输入时，career-principal 会追问用户（最多3轮）。

---

## 输出

所有输出遵循 `output_schema.json` 定义的结构：

```json
{
  "status": "success",
  "intent_detected": "match_diagnosis",
  "confidence": "medium",
  "skills_invoked": [...],
  "aggregated_result": {
    "summary": "综合结论",
    "key_findings": [...],
    "recommendations": [...],
    "evidence": [...]
  },
  "missing_information": [],
  "cannot_determine": [],
  "next_steps": [...]
}
```

confidence 取所有 sub-skill 置信度的最低值。

---

## 限制

1. **无法访问实时数据**：除非配置了外部 adapter，否则不会获取最新招聘信息、公司动态等
2. **市场事实需经验证**：所有薪资、行业趋势等声明须经 source-quality-auditor 确认，未经验证的不会呈现为确定性结论
3. **不处理求职以外的话题**：直接拒绝，不尝试给出边缘性回答
4. **知识图谱有时效限制**：`knowledge/` 目录中的数据为静态数据，可能与实时情况有出入

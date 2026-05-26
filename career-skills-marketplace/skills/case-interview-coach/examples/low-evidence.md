# 示例：咨询 Case 面试，无目标公司背景

## 输入

```json
{
  "interview_type": "case_consulting",
  "experience_level": "fresh_grad"
}
```

## 输出（节选）

```json
{
  "skill_name": "case-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "high",
  "summary": "咨询 Case 面试通用备考指导，适用于麦肯锡/BCG/贝恩等标准 Case 面试。本 skill 基于方法论知识图谱，无需实时数据。未提供目标公司，框架为通用版。",
  "framework_library": [
    {
      "name": "盈利分析框架",
      "applicable_to": ["咨询 Case（盈利型）"],
      "structure": "利润 = 收入 - 成本\n收入 = 价格 × 销量\n成本 = 固定成本 + 变动成本\n定位下降原因：收入端（价格/销量）还是成本端（固定/变动）",
      "example_usage": "「某零售商利润下降20%，分析原因」→ 先拆收入/成本，再逐层深挖",
      "common_mistake": "直接说「市场竞争激烈」等没有数据支持的宏观原因"
    },
    {
      "name": "市场规模估算框架",
      "applicable_to": ["市场估算题（Fermi题）"],
      "structure": "1. 定义范围（哪个市场，哪个时间，哪个地区）\n2. 选择切入方法（供给侧/需求侧/类比法）\n3. 分层估算（MECE拆解）\n4. 汇总+合理性校验",
      "example_usage": "「估算中国外卖市场规模」→ 需求侧：有外卖习惯的人口×点单频率×客单价",
      "common_mistake": "没有说明估算假设，导致面试官无法跟上逻辑"
    }
  ],
  "practice_cases": [
    {
      "title": "某零售商净利率下降3个百分点，找原因并给建议",
      "type": "盈利分析",
      "question": "你的客户是一家全国连锁便利店，过去一年净利率从5%下降到2%，请分析原因并给出改进建议。",
      "suggested_approach": [
        "1. 澄清问题：下降发生在哪些区域/品类/时间段？",
        "2. 拆分利润：收入端还是成本端？",
        "3. 收入分析：价格是否变化？销量是否下滑（哪些品类）？",
        "4. 成本分析：固定成本（租金/人工）是否增加？变动成本（采购）是否上升？",
        "5. 假设验证：竞争格局是否变化？市场整体趋势？",
        "6. 建议：针对根因给出2-3个可行建议，并说明优先级"
      ],
      "key_considerations": [
        "净利率下降3点是绝对值，需了解收入基数",
        "便利店行业受电商和外卖竞争影响，竞争格局是重要背景",
        "建议必须基于数据而非猜测"
      ],
      "evaluation_criteria": [
        "是否主动澄清问题（不是直接开始分析）",
        "拆解是否符合 MECE",
        "假设是否合理，是否主动向面试官要数据",
        "建议是否有优先级和可行性"
      ],
      "time_limit": 20
    }
  ],
  "common_mistakes": [
    {
      "mistake": "没有澄清问题就开始分析",
      "why_bad": "Case 面试中面试官故意留下模糊，考察候选人是否能提出关键问题",
      "fix": "开始分析前提出2-3个关键澄清问题（时间范围/地区/指标定义）"
    },
    {
      "mistake": "给出建议但没有优先级",
      "why_bad": "咨询项目资源有限，没有优先级显示候选人缺乏判断力",
      "fix": "明确说「我建议优先做XX，因为影响最大且执行难度相对低」"
    }
  ],
  "evaluation_criteria": [
    {
      "dimension": "结构化拆解",
      "weight": "primary",
      "good_example": "用 MECE 方法将问题分层，每层展开前说明逻辑",
      "bad_example": "思路混乱，在多个方向之间跳跃"
    },
    {
      "dimension": "假设驱动",
      "weight": "primary",
      "good_example": "主动提出假设并向面试官要数据验证，「我假设收入下降是主因，能给我看一下收入数据吗？」",
      "bad_example": "被动等面试官给所有信息，不主动引导"
    }
  ],
  "evidence_used": [],
  "recommendations": ["咨询 Case 练习需要找搭档对练，独自练习效果有限"],
  "risks": ["Case 面试强调实时互动，框架只是起点，真实面试随机性较大"],
  "next_actions": ["使用上面的零售商案例做一次完整的自我练习，计时20分钟"],
  "follow_up_questions": ["你面的是哪家咨询公司？麦肯锡/BCG风格与四大有差异"],
  "cannot_determine": []
}
```

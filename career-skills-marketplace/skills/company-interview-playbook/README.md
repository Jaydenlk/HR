# company-interview-playbook

公司面试攻略手册 skill — 为特定公司生成综合攻略：公司画像、流程全图、文化心法、踩坑预警、薪资谈判。

## 核心能力

- 公司画像：文化基因、招聘状态、真实口碑
- 面试流程全图：各轮考察重点和估算通过率
- 文化契合攻略：体现文化的回答模式和反面教材
- 踩坑预警：真实候选人踩过的坑
- 薪资谈判注记：时机、筹码、禁忌

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company_name` | string | 是 | 目标公司名称 |
| `job_title` | string | 否 | 目标岗位（使攻略更定向） |
| `interview_intelligence` | object | 否 | 面试情报，来自 interview-intelligence |
| `user_profile` | object | 否 | 用户画像，来自 profile-builder |

## 输出结构

```
company_profile            # 公司画像（文化关键词/口碑/招聘状态）
interview_process[]        # 面试流程（含各轮考察角度和通过率）
culture_fit_tips[]         # 文化契合攻略（示例句式+反面教材）
common_pitfalls[]          # 踩坑预警（场景+规避策略）
salary_negotiation_notes   # 薪资谈判注记（时机+筹码+禁忌）
```

## 薪资字段规则

`salary_range_estimate` 无数据来源时必须为 null，禁止推断具体数字。

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 腾讯产品岗完整攻略 |
| `examples/low-evidence.md` | 初创公司，数据有限的攻略 |
| `examples/bad-input.md` | company_name 为空 |
| `examples/source-conflict.md` | 口碑来源对公司文化描述存在矛盾 |

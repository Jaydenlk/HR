# interview-intelligence

面试情报聚合 skill — 为特定公司和岗位聚合结构化面试情报，涵盖中国市场全流程（笔试/群面/业务面/HR面）。

## 核心能力

- 聚合真实面经数据，还原面试流程各阶段
- 提取高频考题，标注题型和出现频率
- 生成优先级排序的备考计划
- 识别面试过程中的红线信号
- 无实时数据时明确降级，不编造细节

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company_name` | string | 是 | 目标公司名称 |
| `job_title` | string | 是 | 目标岗位名称 |
| `user_profile` | object | 否 | 用户画像，来自 profile-builder |
| `jd_analysis` | object | 否 | JD 解析结果，来自 jd-analyzer |
| `interview_date` | string | 否 | 面试日期（ISO 8601） |

## 输出结构

```
interview_flow[]          # 面试各阶段（笔试/群面/业务面/HR面等）
common_questions[]        # 高频考题（含题型和频率）
preparation_priorities[]  # 备考优先项（critical/high/medium）
red_flags_to_watch[]      # 面试红线预警
```

## 中国市场特殊流程

| 流程 | 适用场景 |
|---|---|
| 笔试 | 大厂/国企/金融校招 |
| 群面（无领导小组讨论） | 快消/咨询/互联网大厂 |
| 压力面 | 咨询/销售岗 |
| 背景调查 | 大厂/金融/外企 |

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | 近6个月真实面经，精确匹配公司+岗位 |
| `medium` | 面经超过1年，或岗位仅相近 |
| `low` | 无精确岗位面经，基于类比 |
| `insufficient` | 完全无数据，降级到知识图谱通用信息 |

## 降级行为

无实时数据时：
- `confidence` 标注为 `low`
- `cannot_determine` 列出具体缺失项
- 禁止编造题目或具体流程轮次

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 大厂后端岗，有完整近期面经 |
| `examples/low-evidence.md` | 小公司，仅有通用岗位数据 |
| `examples/bad-input.md` | 缺少公司名，返回验证错误 |
| `examples/source-conflict.md` | 面经来源描述矛盾，标注冲突 |

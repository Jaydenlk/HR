# 贡献指南

感谢你考虑为 Career Skills Marketplace 做出贡献。本指南覆盖四种贡献类型的具体操作规范，以及数据红线和审核流程。

---

## 可以贡献的内容

| 贡献类型 | 目标路径 | 说明 |
|----------|----------|------|
| Skill 实现 | `skills/<skill-name>/` | 新增或改进求职相关 skill |
| 企业数据 | `skills/_career-skills-shared/knowledge/company-taxonomy/` | 企业信息、融资阶段、业务描述等 |
| 岗位 Rubric | `skills/_career-skills-shared/rubrics/` | 岗位能力评分标准 |
| 评测用例 | `evals/workflow/` | 用于验证系统行为的 JSON 测试夹具 |

---

## 提交 PR 的流程

1. **Fork 仓库**，在自己的分支上修改，分支命名格式：`feat/<topic>` 或 `fix/<topic>`。
2. **本地验证**：确保修改后所有 YAML/JSON 文件语法有效，可被解析工具读取。
3. **填写 PR 描述**：说明修改目的、影响范围、测试方式。
4. **提交 PR** 到 `main` 分支，等待维护者审查。
5. 审查通过后由维护者合并，不接受 force push 到 main。

---

## Skill 贡献清单

每一个新增或修改的 skill，必须包含以下全部文件，缺一不可：

- 若新增 **worker 工具**：主文件为 `PLAYBOOK.md`（由 career-principal 读取后执行，不自动触发）；若新增或修改 career-principal 主理人本身，主文件为 `SKILL.md`（唯一自动触发入口）
- `contract.yaml` — skill 接口契约：触发条件、参数类型、返回格式
- `schemas/input.schema.json` — 输入数据 JSON Schema
- `schemas/output.schema.json` — 输出数据 JSON Schema
- `examples/` — 至少 2 个完整的输入/输出示例（正常路径 + 边界情况各一个）
- `tests/` — 至少 1 个可运行的评测用例

新增 skill 还须在 `marketplace.yaml` 的 `skills:` 列表中添加对应条目。

---

## 企业数据贡献规范

向 `skills/_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` 添加企业条目时：

- 每条记录必须包含 `source_url` 或 `source_note` 字段，指向可核实的公开来源
- 融资轮次和规模数据必须标注数据采集时间（`data_as_of`）
- 薪资区间数据必须附来源网站名称和采集时间，不得凭印象填写
- 对存在合理争议的信息（如岗位前景、行业趋势），必须标注 `confidence: low/medium/high` 及依据

---

## 评测用例（Eval）贡献规范

向 `evals/workflow/` 添加新的 JSON 测试夹具时：

格式参考现有夹具文件，必须包含以下字段：

```json
{
  "name": "描述性短名称（英文 kebab-case）",
  "description": "这个用例测试什么行为（一句话）",
  "input": {
    "user_message": "用户输入文本",
    "context": {}
  },
  "expected_skills_invoked": ["skill-name-1", "skill-name-2"],
  "expected_output_properties": {},
  "assertions": []
}
```

每个用例的 `assertions` 数组至少包含一个可验证的断言，格式为 `{"type": "断言类型", "path": "输出字段路径", "expected": "期望值"}`。

---

## PR 模板

提交 PR 时，请在描述中包含以下内容：

```
## 贡献类型
- [ ] Skill 实现
- [ ] 企业数据
- [ ] 岗位 Rubric
- [ ] 评测用例

## 修改说明
（一段说明：做了什么，为什么做）

## 影响范围
（列出修改的文件路径）

## 测试方式
（如何验证这个修改是正确的）

## 数据红线自检
- [ ] 不含真实个人简历或可识别个人信息
- [ ] 不含受版权保护的完整文本
- [ ] 薪资数据有来源字段
- [ ] 企业信息有来源字段
- [ ] 争议性信息已标注置信度
```

---

## 数据红线（违反将导致 PR 被拒）

以下内容不得出现在任何提交中：

1. **真实个人简历**：不得包含真实求职者的简历全文或可识别的个人信息（姓名+学校组合、手机号、邮箱等）。示例数据须明确标注为虚构。

2. **受版权保护的完整文本**：职位描述、公司介绍、新闻报道只能以摘录形式（不超过原文 10%）或外链形式引用，不得全文复制。

3. **无来源的薪资数据**：所有薪资区间数据必须标注数据来源（网站名称 + 采集时间），禁止凭印象填写。

4. **无来源的企业信息**：企业融资轮次、规模、业务描述必须附带可核实的来源字段，不得凭记忆或推测填写。

5. **不确定信息以确定性语气呈现**：对市场行情、岗位前景等存在合理争议的判断，必须标注 `confidence` 字段及依据说明。

---

## 审核流程

PR 被合并前，维护者将检查：

- YAML / JSON 文件语法有效，通过 schema 校验
- Skill 贡献包含清单中的全部文件
- 数据红线无违反
- 示例文件中无真实个人信息
- 有来源字段的数据其来源已填写且格式正确
- career-principal 的 `SKILL.md` 及各 worker 的 `PLAYBOOK.md` 描述与 `contract.yaml` 接口定义一致
- 新增 skill 的 `marketplace.yaml` 已更新

审查周期：维护者会在 5 个工作日内回复 PR。如有疑问，请在 PR 评论区留言。

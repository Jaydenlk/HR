# 计划: CC 单 skill 插件化 (career-principal 唯一入口 + 37 worker 降为 PLAYBOOK)

## 背景 / 决策
用户选 B(见 mem0 project-unified-representative-goal)。根因:GitHub issue #22345(OPEN)——插件里 `disable-model-invocation` 失效,worker 照样抢自动触发。官方 skills 文档:该字段同时让 Claude 自己也调不动 worker。故:
- 插件内**只让 career-principal 是 skill**(唯一 SKILL.md)→ 天然无竞争、绕开 bug。
- 37 worker 的 `SKILL.md` 改名 `PLAYBOOK.md`(目录不动)→ skills/ 下唯一 SKILL.md 只剩 career-principal → 只它被发现(单层/递归发现都安全)。
- worker 内容**一字不动**;主理人派活从"调 skill"改为"读 `../<worker>/PLAYBOOK.md` 当 playbook 执行"。
- 共享资源挪到 `skills/_career-skills-shared/`,使 worker/主理人现有 `../_career-skills-shared/...` 引用原样解析(零改引用)。

## 不变量(红线)
- 37 个 PLAYBOOK.md 正文、output_schema.json、tests/、examples/、references/、scripts/、contract.yaml 内容不动(仅 SKILL.md→PLAYBOOK.md 改名 + 目录位置不变)。
- 不碰 packages/(SaaS .ts 真相源);profession-preset .ts 不动。
- validate-all OVERALL 必须保持 PASS;validate-resource-paths 必须保持 PASS。
- 不修预存的 validate-hallucination-guards 独立 1 失败(out of scope)。

## 执行计划 (step→verify)
1. 37 worker `skills/<w>/SKILL.md` → `PLAYBOOK.md`(git mv) → verify: `find skills -name SKILL.md` 仅剩 career-principal/SKILL.md(1 个);`find skills -name PLAYBOOK.md` = 37。
2. 移共享资源:`knowledge/` → `skills/_career-skills-shared/knowledge/`;`shared/*` 各子目录 → `skills/_career-skills-shared/`(flatten,匹配旧 install 约定) → verify: `skills/_career-skills-shared/knowledge/interview-focus.yaml` 存在;`skills/_career-skills-shared/output-schema/skill-output-base.schema.json` 存在;根 `knowledge/`、`shared/` 不存在;某 worker 的 `../_career-skills-shared/knowledge/interview-focus.yaml` 相对其目录解析到真实文件。
3. 改脚本路径常量:
   - build_rubrics.mjs OUT → `career-skills-marketplace/skills/_career-skills-shared/knowledge/campus-recruitment-rubrics`
   - validate-all.mjs:skills 枚举过滤掉 `_` 前缀目录;shared/knowledge 硬编码路径 → `skills/_career-skills-shared/...`
   - validate-resource-paths.mjs:collectTargets 文件名加 `PLAYBOOK.md`
   - validate-hallucination-guards.mjs:skills 枚举过滤 `_` 前缀(免噪声 SKIP)
   - marketplace.yaml:shared:/knowledge: 路径更新 + 注明 plugin.json 为权威
   - install.ps1/.sh:简化为"复制 skills/ 下所有子目录(含 _career-skills-shared)到目标"
   → verify: `node scripts/validate-all.mjs` OVERALL PASS;`node scripts/validate-resource-paths.mjs` PASS。
4. 建 manifest:
   - `career-skills-marketplace/.claude-plugin/plugin.json`(name+description+version)
   - 仓库根 `.claude-plugin/marketplace.json`(name/owner/plugins[].source=`./career-skills-marketplace`)
   → verify: `claude plugin validate` 通过(无 error)。
5. 重写 career-principal 派活语义(SKILL.md + references/orchestration-rules.md):
   - 顶部说明:worker 是 playbook,位于同级 `../<worker>/PLAYBOOK.md`;调度=Read 该文件后按其指令执行并把产出计入 skills_invoked。
   - "可调用 sub-skills"列表保留(名字=playbook 目录名);把"调用/invoke skill"措辞改为"读取并执行 playbook"。
   - 读 playbook 时,其内部相对引用(`../_career-skills-shared/...`、`references/...`、`scripts/...`)按"相对该 playbook 自身目录"解析。
   - 主理人自身 `../_career-skills-shared/...` 引用不变(仍解析到 skills/_career-skills-shared/)。
   - intent-router.yaml / next-intent-graph.yaml:技能名保留;仅必要处措辞校准。
   → verify: career-principal 出现 `../<worker>/PLAYBOOK.md` 派活指令;validate-all 路由检查仍 PASS;抽查 3 个意图链(campus_diagnosis→mock_interview、analyze_jd、match_diagnosis)的 playbook 路径都能在磁盘命中真实文件。
6. 回归 + 审查:
   - validate-all PASS + validate-resource-paths PASS + claude plugin validate PASS(贴输出)。
   - reviewer 子代理只读审计(找茬:发现遗漏/越界/死链)。
   - 给用户运行期冒烟脚本(真 `/plugin marketplace add` + `/plugin install` + 重启 + 说"练面试"验证只有主理人触发)。

## 待用户运行期验证(我无法在本会话替代)
- 装插件后:只有 career-principal 自动触发(worker 不抢);主理人能读 PLAYBOOK 跑完整 mock interview;"四个 section"消失。

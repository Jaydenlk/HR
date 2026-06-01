# 示例 01 · happy-path —— 高绩点 + 强背景 + 对口实习(后端开发)

## 场景说明

985 计算机本科,绩点 3.8/4.0,有字节跳动后端实习(带业务量级),GitHub 项目有 Star,ACM 区域赛银牌。
目标职业明确(后端开发),信息充足。预期:高总分、`confidence: high`、改写以「优化已有句子」为主、无编造。

---

## 输入

```yaml
target_profession: 后端开发        # 命中 professions/backend-campus.md
difficulty_tier: standard
resume_text: |
  张同学 / 计算机科学与技术 / 应届2026
  教育:某 985 高校 本科 计算机科学与技术,GPA 3.8/4.0,六级 552 分
  实习:字节跳动 后端开发实习(2025.06-2025.09)
    - 负责广告投放系统订单模块,优化慢查询:EXPLAIN 定位全表扫描后加复合索引,接口耗时从 800ms 降到 30ms
    - 用 Redis 分布式锁解决并发下单超卖,支撑日均 10 万订单处理
  项目:开源短链服务(GitHub 320 Star)
    - 设计发号器 + 布隆过滤器防穿透,README 完整,带 CI 流水线
  竞赛:ACM-ICPC 亚洲区域赛 银牌;LeetCode 已刷 420 题
  技能:精通 Java(JVM/GC/并发),熟悉 MySQL/Redis/Kafka,了解 Go
```

---

## 期望 output 要点

- `confidence`: **high**(职业精确命中、信息充足、量化齐全)
- `diagnosis.dimensions`:5 维,key/name/max **与 backend-campus.md 完全一致**:
  - `编程语言与语言底层`(max 20)→ 高分:「精通 Java(JVM/GC/并发)」+ 能讲机制,`evidenceFound` 抄原句,`gap` 基本为空
  - `计算机基础(操作系统/网络/数据库)`(max 25)→ 高分:慢查询 EXPLAIN→复合索引→800ms 降到 30ms 闭环
  - `系统设计与分布式能力`(max 25)→ 高分:Redis 分布式锁解决超卖 + 短链发号器/布隆过滤器决策
  - `工程实践深度`(max 20)→ 高分:字节实习(日均 10 万订单)+ GitHub 320 Star + CI
  - `算法与数据结构`(max 10)→ 高分:ACM 区域赛银牌 + LeetCode 420 题(**照抄原文名次/题数**)
- `diagnosis.total_score`:各维之和(应落在高位,约 88-95)
- `diagnosis.conventionChecks`:技术栈分档=`pass`(精通/熟悉/了解三档齐全)、项目可信度=`pass`(GitHub+大厂实习+业务数字)、竞赛含金量=`pass`(ACM 已标清)
- `diagnosis.interviewHooks`(2-4 条):锚定真实句,如「Redis 分布式锁」→「为什么不用数据库行锁?锁续期怎么处理?」,`prepDirection` 引导讲清真实取舍,**不教编造**
- `rewrite_suggestions`(用户确认改写后):全部为**改进型**;数字若简历已有则照用(如 320 Star、10 万订单),无则 `[具体数字]` 占位;**不得**新增简历没有的技术名词
- `honesty_boundary`:声明本次按 standard 档 backend-campus 标尺打分;未联网核实公司

---

## rationale(为什么这样判)

强背景案例的考点是**不漏读、不打压**:简历里写明的 ACM 银牌、420 题、552 分、320 Star、10 万订单必须逐字进 `evidenceFound`,绝不臆断「未标注具体含金量」。
高分维度的 `why` 必须落到这些具体事实,且与分数一致(不能给高分却 `why` 全是缺口)。
改写阶段即便信息充足也只优化原句,新增数字仍走占位——证明防编造规则对强简历同样生效,不因「看起来很强」就放宽。

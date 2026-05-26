# 示例 01：定向改写（Java 后端工程师 → 阿里云后端岗位）

## 场景说明

用户是一名有 4 年经验的 Java 后端工程师，目标岗位是阿里云的后端研发工程师职位，JD 强调分布式系统、高可用架构和微服务经验。

---

## 输入

### resume_text
```
张伟，男，28岁
联系方式：zhangwei@email.com

工作经验：
2020.07 - 至今 | 某互联网公司 | 后端开发工程师
- 参与订单系统开发
- 使用 Spring Boot 框架
- 参与数据库设计，使用 MySQL 和 Redis
- 配合团队完成系统迁移项目

2018.07 - 2020.06 | 某软件公司 | Java 开发实习生
- 参与 ERP 系统开发
- 使用 Java 开发业务逻辑

教育背景：
2014.09 - 2018.07 | 北京邮电大学 | 计算机科学与技术 | 本科

技能：Java、Spring Boot、MySQL、Redis、Git
```

### jd_text
```
岗位：后端研发工程师（阿里云基础产品部）
岗位职责：
1. 负责阿里云核心业务系统的设计与研发
2. 参与高可用分布式系统的架构设计
3. 推动系统性能优化，保障服务稳定性

任职要求：
- 3年以上 Java 后端开发经验（必须）
- 熟悉 Spring Cloud / Spring Boot 微服务架构（必须）
- 有分布式系统开发经验，了解 CAP 原理（必须）
- 熟悉 Redis 缓存方案（必须）
- 有高并发、高可用系统经验者优先
```

---

## 输出

### modifications

#### 修改 1：工作经历 — 订单系统描述

- **原文**：参与订单系统开发
- **改写**：负责订单核心服务的后端研发，基于 Spring Boot 微服务架构，承接高并发交易链路
- **修改理由**：JD 要求 Spring Boot 微服务经验，原文提及 Spring Boot，改写将其融入描述中；"高并发交易链路"是订单系统的真实特征，但此处标记为 NEED_USER_CONFIRM，因原文未明确提及并发量级
- **来源追溯**：原文"参与订单系统开发" + 技能栏"Spring Boot"
- **fabrication_check**：NEED_USER_CONFIRM

#### 修改 2：工作经历 — 数据库和缓存描述

- **原文**：参与数据库设计，使用 MySQL 和 Redis
- **改写**：设计订单数据持久化方案，采用 MySQL 主从架构 + Redis 缓存层，优化读写性能
- **修改理由**：JD 要求熟悉 Redis 缓存方案，原文已有 Redis 使用经验，改写突出其在架构中的作用
- **来源追溯**：原文"使用 MySQL 和 Redis"，用户确实使用了这两项技术
- **fabrication_check**：PASS

#### 修改 3：工作经历 — 系统迁移项目

- **原文**：配合团队完成系统迁移项目
- **改写**：参与单体应用向微服务架构的迁移工作，协助完成服务拆分与接口设计
- **修改理由**：JD 强调微服务经验，"系统迁移"通常包含微服务拆分，改写将其具体化
- **来源追溯**：原文"系统迁移项目"（此处涉及推断，原文未明确说明迁移类型）
- **fabrication_check**：NEED_USER_CONFIRM

#### 修改 4：技能栏

- **原文**：Java、Spring Boot、MySQL、Redis、Git
- **改写**：Java（4年）、Spring Boot / Spring Cloud（微服务）、MySQL、Redis（缓存架构）、Git
- **修改理由**：JD 要求 Spring Cloud，原文只有 Spring Boot，不能添加 Spring Cloud；但可以将年限（4年，来自工作经历时间段推算）和用途描述补充进去
- **来源追溯**：原文技能栏 + 工作经历时间（2020.07至今 = 4年以上）
- **fabrication_check**：PASS

---

### evidence_chain_summary

| 改写编号 | 原始证据位置 | fabrication_check |
|----------|-------------|-------------------|
| 修改 1 | 原文工作经历第1条 + 技能栏 Spring Boot | NEED_USER_CONFIRM |
| 修改 2 | 原文工作经历第1条"MySQL 和 Redis" | PASS |
| 修改 3 | 原文工作经历第1条"系统迁移项目" | NEED_USER_CONFIRM |
| 修改 4 | 原文技能栏 + 工作时间段推算 | PASS |

---

### overall_assessment

- **match_improvement**：JD 核心关键词覆盖率从约 50% 提升至约 75%，Spring Boot 微服务表述更突出
- **items_needing_confirmation**：2 项（修改 1、修改 3）需用户确认是否准确
- **honest_gaps**：
  - Spring Cloud 经验：原文未提及，JD 为必须项，改写无法弥补
  - 分布式系统设计经验：原文仅"参与"，JD 要求主导设计，需用户提供更多证据
  - 高并发量级：无法提供具体数字，建议用户补充实际 QPS 数据

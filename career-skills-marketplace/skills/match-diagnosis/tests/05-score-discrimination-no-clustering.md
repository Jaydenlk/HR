# 测试 05：分数区分度 — 不允许趋中打分

## 测试目标

验证评分系统的区分度：对三种明显不同匹配程度的候选人，评分必须落在不同的区间内，不允许所有人都在 60-80% 区间。

## 测试描述

本测试描述三个候选人场景，验证评分系统是否能正确区分：

---

### 场景 A：极高匹配（应得 85+）

**用户背景**：
- 腾讯 5年 Java 后端工程师，Spring Cloud 微服务经验丰富
- 有大流量高并发系统设计经验（10万 QPS）
- 本科计算机，985 院校

**目标 JD**：
- 阿里云后端工程师，要求 Java + 微服务 + 高并发，3年以上

**预期分数**：85-100（perfect_fit 或 strong_match）

---

### 场景 B：中等匹配（应得 45-65）

**用户背景**：
- 3年 Node.js 前端 BFF 层开发经验，熟悉 JavaScript/TypeScript
- 了解 Spring Boot（1年），无微服务实践经验
- 本科软件工程

**目标 JD**：
- 同上阿里云后端 Java 微服务工程师

**预期分数**：40-65（weak_match 或 moderate_match）

---

### 场景 C：极低匹配（应得 < 25）

**用户背景**：
- 5年英语翻译经验，无任何编程经验
- 本科英语语言文学

**目标 JD**：
- 同上阿里云后端 Java 微服务工程师

**预期分数**：0-25（no_match）

---

## 断言（必须全部成立）

### 断言 1：三个场景的评分落在不同区间

**预期结果**：
- 场景 A：overall_match_pct >= 80
- 场景 B：overall_match_pct 在 35-70 之间
- 场景 C：overall_match_pct <= 25

### 断言 2：场景 A 与场景 C 的评分差距 >= 60 分

**预期结果**：score_A - score_C >= 60

### 断言 3：场景 C 的 match_label 为 no_match 或 weak_match

**预期结果**：场景 C 不会出现 moderate_match 及以上

### 断言 4：场景 A 的 match_label 为 perfect_fit 或 strong_match

**预期结果**：场景 A 不会出现 moderate_match 及以下

## 失败标准

- 三个场景评分都落在 60-80% 区间（趋中倾向，区分度不足）
- 场景 C 的翻译背景获得 moderate_match 或更高评级
- 场景 A 的强技术背景只获得 moderate_match 或更低评级
- 场景 A 与 C 的分差小于 60 分

# 示例 02：低匹配度（< 25%）— 应届护士投腾讯游戏服务端工程师

## 场景说明

应届护理专业毕业生，投递腾讯游戏服务端开发工程师职位。背景与岗位存在根本性不匹配。

---

## 输入

### user_profile
```yaml
basic_info:
  name: 何静
  target_role: 游戏服务端工程师
  years_of_experience: 0
  location: 广州

work_experience:
  - company: 某三甲医院
    title: 实习护士
    industry: 医疗
    start_date: "2023.07"
    end_date: "2024.06"
    description: 完成护理实习，负责病房护理和患者记录管理

education:
  - school: 广州中医药大学
    degree: 本科
    major: 护理学
    graduation_date: "2024.06"

skills:
  technical: [Microsoft Office, 医院信息系统(HIS)]
  soft: [责任心, 团队协作, 患者沟通]
  certifications: [执业护士资格证]

constraints:
  preferred_locations: [广州, 深圳]
  work_type: full_time
```

### jd_analysis
```yaml
job_title: 游戏服务端工程师
company: 腾讯游戏
required_skills:
  - skill: C++
    level: required
    years: "2年以上"
  - skill: 服务端开发
    level: required
  - skill: 网络编程
    level: required
  - skill: 数据库（MySQL/Redis）
    level: required
  - skill: 分布式系统
    level: preferred
qualifications:
  education: 本科及以上，计算机/软件工程等相关专业
  experience_years: "2年以上"
  must_have: [C++, 服务端开发经验, 计算机相关专业背景]
location: 深圳
work_type: full_time
keywords: [C++, 服务端, 网络编程, 分布式, MySQL, Redis, 游戏开发]
```

---

## 输出

### match_result

**overall_match_pct**：8

**match_label**：no_match

**confidence**：high

#### dimension_scores

| 维度 | 得分 | 满分 | 分析 |
|------|------|------|------|
| skills | 0 | 30 | JD 要求 C++、服务端开发、网络编程、MySQL/Redis，用户技能中完全不存在这些技术。Microsoft Office 和 HIS 系统与游戏开发无关 |
| experience | 1 | 25 | 护理实习与服务端开发无任何直接关联。仅给 1 分是因为用户有医院信息系统使用经验（极弱相关） |
| education | 0 | 15 | JD 明确要求计算机/软件工程相关专业，护理学专业完全不符合此要求 |
| role | 2 | 15 | 职业目标与现有背景存在根本性断层，无职业轨迹支撑；给 2 分仅因用户有较强的学习意愿（通用加分项） |
| constraints | 5 | 15 | 广州用户应聘深圳岗位，有异地通勤或搬迁成本；但两城市邻近，非硬性障碍，给部分分 |

#### strengths

（无可列出的与 JD 直接相关的优势项）

#### gap_classification

1. gap_item: "无 C++ 编程经验（JD 必须项）"
   gap_type: hard_mismatch
   description: 从零学 C++ 到胜任服务端开发需要 2-3 年持续投入，无法在短期内弥补

2. gap_item: "无计算机专业背景（JD 明确要求）"
   gap_type: hard_mismatch
   description: 专业背景差距会直接导致简历筛选阶段被过滤

3. gap_item: "无任何服务端开发经验（JD 必须项，要求 2 年以上）"
   gap_type: hard_mismatch
   description: 0 年 vs 要求 2 年，差距无法通过改写或短期学习弥补

4. gap_item: "工作地点：广州 vs 深圳"
   gap_type: quick_fix
   description: 两城市相邻，若用户愿意迁居则可解决

#### improvement_suggestions

1. suggestion: "如果确实希望转型到技术岗，建议先确认转型决心，然后系统学习编程基础（Python 入门 → 数据结构 → C++），这是一条 2-3 年的转型路径"
   priority: high
   estimated_effort: "2-3年系统学习和实践，包括个人项目和实习经历积累"

2. suggestion: "更现实的路径：利用护理背景进入医疗健康领域的互联网公司，结合信息化背景申请医疗信息系统相关岗位（产品/运营方向）"
   priority: high
   estimated_effort: "3-6个月定向准备"

---

### 总结

8% 的评分真实反映了背景与岗位的根本性不匹配。三个关键 required 项全部缺失（C++、服务端开发、计算机专业背景），改写简历无法改变这一现实。建议用户重新评估职业方向。

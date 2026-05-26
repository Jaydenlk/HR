# 示例：有实时数据的行业趋势分析

## 输入

```json
{
  "industry": "新能源汽车",
  "region": "中国",
  "timeframe": "mid_term"
}
```

## 输出

```json
{
  "skill_name": "industry-trend-analyst",
  "skill_version": "1.0.0",
  "summary": "新能源汽车行业处于高速增长期，政策持续支持，招聘需求旺盛，尤其是软件/智能驾驶方向。数据来自 3 个 B 级以上实时来源。",
  "confidence": "high",
  "evidence_used": [
    { "source": "工信部新能源汽车产业政策文件", "grade": "A", "date": "2026-03" },
    { "source": "36氪行业报告", "grade": "B", "date": "2026-04" },
    { "source": "BOSS直聘岗位数据（via market-radar）", "grade": "B", "date": "2026-05" }
  ],
  "recommendations": [
    "智能驾驶软件方向需求最旺盛，建议具备 C++ 或 Python + 感知算法背景",
    "电池管理系统（BMS）工程师供不应求，有化学/电气背景可快速入行",
    "外资车企正在本土化人才战略，有英语优势的候选人有额外竞争力"
  ],
  "risks": [
    "国内新能源车企价格战持续，部分中小车企资金压力较大",
    "智能驾驶法规尚不完善，L3+ 商业化进度存在不确定性"
  ],
  "next_actions": [
    "关注比亚迪/理想/蔚来近期招聘动向，了解具体岗位要求",
    "智能驾驶方向可参考 CVPR/ICCV 最新论文了解技术动态"
  ],
  "follow_up_questions": [
    "您目前的技术背景是软件还是硬件方向？",
    "是否考虑新势力车企还是传统车企转型岗位？"
  ],
  "cannot_determine": [],
  "trend_summary": "新能源汽车行业处于快速扩张期（2023-2026），中国市场渗透率已超过 35%，政策层面持续支持。人才需求从传统机械向软件/AI/电气快速转移，软件工程师和算法工程师尤为紧缺。",
  "growth_signals": [
    {
      "signal": "工信部发布《新能源汽车产业发展规划（2026-2035）》，明确支持政策",
      "strength": "strong",
      "source": "工信部官网",
      "date": "2026-03-15"
    },
    {
      "signal": "BOSS直聘新能源汽车相关岗位环比增长 28%（本季度）",
      "strength": "strong",
      "source": "BOSS直聘 via market-radar",
      "date": "2026-05-01"
    },
    {
      "signal": "比亚迪/理想/蔚来等头部车企持续大规模招聘软件工程师",
      "strength": "moderate",
      "source": "各公司官网招聘页",
      "date": "2026-05"
    }
  ],
  "risk_signals": [
    {
      "signal": "部分中小新能源车企出现资金链紧张信号",
      "severity": "medium",
      "source": "界面新闻",
      "date": "2026-04-10"
    },
    {
      "signal": "行业价格战持续，部分供应商利润压缩",
      "severity": "low",
      "source": "36氪",
      "date": "2026-04"
    }
  ],
  "hiring_outlook": "strong",
  "recommended_entry_roles": [
    {
      "role_name": "嵌入式软件工程师（OTA/BMS）",
      "rationale": "各大车企快速迭代 OTA 能力，嵌入式 + Linux 背景需求量高",
      "demand_level": "high"
    },
    {
      "role_name": "感知算法工程师",
      "rationale": "自动驾驶感知模块是技术竞争核心，CV/ML 方向人才持续短缺",
      "demand_level": "high"
    },
    {
      "role_name": "数据工程师（车联网/驾驶数据）",
      "rationale": "车企大量采集驾驶数据，数据处理和平台工程需求快速增长",
      "demand_level": "medium"
    }
  ],
  "market_radar_used": true
}
```

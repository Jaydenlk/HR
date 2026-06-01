// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) data skills
// (sql-queries / statistical-analysis / explore-data / validate-data),按校招+中文场景修改;
// 英文框架概念(window functions/CTE/cohort retention、Simpson's paradox/SRM/multiple comparisons、
// join explosion/denominator shifting/average of averages、effect size vs p-value 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const dataAnalystCampusAnthropic: ProfessionPreset = {
  id: 'data-analyst-campus-anthropic',
  profession: '数据分析师',
  stage: 'campus',
  tier: 'pressure',
  displayName: '数据分析师 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'sql_warehouse_engineering',
      name: 'SQL 工程硬实力(复杂查询×真实数仓)',
      weight: 26,
      whatGoodLooksLike:
        '头部大厂卡分:能现场白板写多层 CTE 把分析拆成"定义口径→关联事实→收口汇总"三段(对标 Anthropic data 范式:WITH base→user_metrics→summary),窗口函数是日常工具而非"知道"——ROW_NUMBER 去重保留最新记录、LAG/LEAD 算同环比、SUM OVER 滚动累计、按 PARTITION 算占比;漏斗与留存能用一段 SQL 跑出来(CASE+MAX 标记到达步骤、cohort 按月分桶);懂为何用 COUNT(DISTINCT) 而非 COUNT(*) 穿过 JOIN 计数、为何 NULLIF 防除零;知道执行成本(BigQuery 按扫描字节计费、避免 SELECT *、过滤分区/聚簇列做裁剪)。',
      campusEvidence:
        '实习/项目里有可复述的复杂 SQL 场景:"用窗口函数算次日留存""用 CTE 把 N 步漏斗拆清""ROW_NUMBER 去重保留最新一条";写得清取的是哪张表、grain 是一行代表什么、用了哪种 JOIN;牛客/LeetCode SQL 高频题通关并能讲题型;GitHub 有可查取数代码(含口径注释)。',
      commonGaps:
        '【Anthropic 反模式·join explosion(关联爆炸)】多对多 JOIN 悄悄翻倍行数、用 COUNT(*) 把指标灌水却毫无察觉,JOIN 前后不对行数;【Anthropic 反模式·SELECT-star 取数工】只会单表 SELECT *,窗口函数、CTE、除零保护、成本意识一概没碰过;只会执行别人写好的查询、无独立多表关联记录(2025 年头部大厂笔试 SQL 占比高,这类简历直接过滤)。',
    },
    {
      key: 'statistical_rigor',
      name: '统计严谨性(显著性×效应量×陷阱规避)',
      weight: 22,
      whatGoodLooksLike:
        '头部卡分:不止会跑 AB,而是讲得清"统计显著 ≠ 业务有意义"——既报 p 值/置信区间,也报效应量(提升了几个百分点、折算多少收入)与样本量,大样本下哪怕 p<0.05 也敢说"实际差异微小不值得上";比例指标(CTR/CVR)用比例 z 检验、配对场景用配对 t、多组用方差分析,选对检验而非一律 t 检验;主动规避辛普森悖论(分群核验结论是否反转)、多重比较(测 20 个指标必有 1 个假阳性,用 Bonferroni 或声明测了几次)、幸存者偏差(churn 用户没进数据集)与样本比例失调(SRM)。',
      campusEvidence:
        '实习参与过完整 AB 流程并能说清结论"与局限"(样本量不足/检验功效有限);简历出现效应量、置信区间、分层核验、多重比较校正、CUPED 降方差等进阶词且有场景支撑;概率统计/计量经济学课程落到真实数据;面经能答"方差太大检验不显著怎么办""CTR 比例指标怎么检验"。',
      commonGaps:
        '【Anthropic 反模式·statistical-significance-only(只看显著不看效应)】只抛"提升 X%"却无置信区间、无样本量、不报效应量,问到检验方法/样本量就卡壳;【Anthropic 反模式·Simpson-blind(辛普森盲)】整体结论从不分群复核,被混淆变量与样本结构变化反转都不自知;把相关当因果直接写"X 导致留存提升",修过概率统计课却在简历里找不到任何统计思维落地痕迹。',
    },
    {
      key: 'exploration_business_insight',
      name: '数据探查与业务洞察(从 profiling 到决策)',
      weight: 22,
      whatGoodLooksLike:
        '头部卡分:拿到新数据先做系统 profiling 再分析——说得清表的 grain(一行代表什么)、主键是否唯一、各列空值率/基数、分布形态(右偏/双峰/幂律)、异常值如何处置(不是无脑删,先判断是数据错误/真实极值/异质人群再分段);对核心指标做二三级拆解(GMV=用户数×转化率×客单价、AARRR/OSM),分析有完整因果链"发现现象→profiling 定位→归因到业务环节→给出可执行建议→量化结果",而非"做了 N 张报表";口径意识强(GMV 按下单还是支付、新用户按设备还是账号去重)。',
      campusEvidence:
        '实习有"发现某渠道 ROI 下降→profiling 定位到某类用户脏数据/口径不一→建议调预算分配→转化提升 X%"的闭环表述;搭过指标体系或做过专题归因分析;数学建模竞赛(美赛/华赛)有方法论与分析结论产出;能复述某次分析里查出的数据质量问题(占位值/未来日期/重复)。',
      commonGaps:
        '【Anthropic 反模式·report-monkey(报表仔)】通篇"做了 N 张日报/周报",无一句"我发现了什么、建议了什么",产出活动而非洞察;【Anthropic 反模式·skip-profiling(不探查直接算)】拿到数据不看 grain/空值/重复就出结论,被脏数据、占位值带偏;罗列十几个指标定义却无层级、无业务目标连接(指标堆砌,展示知识面而非分析力)。',
    },
    {
      key: 'analysis_validation_communication',
      name: '分析校验与可视化沟通(可信度×表达)',
      weight: 18,
      whatGoodLooksLike:
        '头部卡分:交付前做 QA 自检——量级合理性(转化率落在 0–100%、同比未无故跳变 >50%)、口径一致(各期分母同定义、不犯 denominator shifting)、加权口径正确(不犯 average of averages,从原始数据聚合而非对均值再平均)、时区/不完整周期对齐(不拿半个月比整月);可视化遵循专业规范(柱状图从零起、用折线表趋势、用横向条形表排名、标题说结论而非只写指标名、不用 3D/双轴误导);能把复杂结论压成"一句话核心发现+一张图",面向非技术受众清晰表达。',
      campusEvidence:
        '实习/项目里有"分享前自查发现口径不一致并修正""把分析压成一页结论"的动作;用 Tableau/Power BI 或 Python(seaborn/plotly)输出有业务意义的看板(非堆图表);公开可视化作品或数据新闻;能说清某图为何选这种图型、轴为何这样设。',
      commonGaps:
        '【Anthropic 反模式·average-of-averages(对均值再求均值)】把各组预聚合的均值直接再平均,组规模不同导致结果失真;【Anthropic 反模式·incomplete-period(残缺周期对比)】拿未结束的当期比完整上期、周三看本周比整周,得出"在跌"的假结论;报告全是密密麻麻数字表无图无核心结论(数字墙),或只会 Excel 图表、从未碰 BI 工具/Python 可视化。',
    },
    {
      key: 'quantified_impact',
      name: '量化结果与口径自证(数字×可追溯)',
      weight: 12,
      whatGoodLooksLike:
        '头部卡分:每条核心经历有数字且经得起追问——不仅给"转化率提升 X%/覆盖 XX 万用户/DAU 从 A 到 B",还说得清测量口径(怎么统计的、分母是谁、对比基准是什么、是否完整周期);数字量级与公司规模/阶段匹配,不出现"个人项目千万级 DAU"这类失真;敢于标注分析的局限与不确定区间("基于 3 个月趋势预计 10K–12K"而非"精确 11234")。',
      campusEvidence:
        '实习经历量化业务结果且附口径说明(转化率/DAU/GMV/ROI + 怎么算);课程/竞赛项目写清数据规模(数据集 XX 万行、覆盖 XX 城市);能解释某个数字的统计来源,而非脱口而出。',
      commonGaps:
        '【Anthropic 反模式·anchoring-false-precision(伪精确锚定)】"转化率提升 73.6%"精确到小数点却说不清口径与样本,实为注水反而减分;经历全是纯动词短语(参与/负责/支持)无一个数字,竞争力骤降;数字与公司规模明显不匹配、对比基准缺失,一问测量方法就崩。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实——复杂 SQL(窗口函数/CTE/留存漏斗/去重/除零)与成本意识、统计严谨性(显著性+效应量+样本量+辛普森/多重比较/SRM 规避)、数据探查(grain/空值/分布/异常处置)与业务因果链、交付前 QA 自检(口径一致/加权正确/完整周期)与可视化规范、量化数字及口径可追溯,分别写进 evidenceFound/gap;② 说明在校招数据分析(压力版/头部大厂高标准)语境下为何重要——SQL 是笔试高占比硬门槛、统计严谨性是区分初级与高级候选人的杀手锏、探查与因果链体现真分析力、QA 自检决定结论可信度;③ 命中反模式时直接点名——「join explosion(关联爆炸)」「SELECT-star 取数工」「statistical-significance-only(只看显著)」「Simpson-blind(辛普森盲)」「report-monkey(报表仔)」「skip-profiling(不探查)」「average-of-averages」「incomplete-period(残缺周期)」「anchoring-false-precision(伪精确)」,不得空泛("数据能力一般"无效)。分数必须与 why 一致,不得倒推。',
  rewriteGuidance:
    '数据分析(压力版)改写铁律——禁编造:只精修简历"已有"的取数/分析/实验/校验句,讲精准(用了什么 SQL 技法、profiling 查出什么、解决什么业务问题、用什么统计方法验证、口径如何),用数据分析精准动词(拆解/归因/探查/校验/设计/检验)与可量化指标(指标口径/转化率/留存率/置信区间/效应量/数据规模)增强可信度;只在缺数字处用 [具体数字] 占位让候选人自填,绝不代填;严禁替候选人添加原句没有体现的 SQL 技法、统计方法(显著性检验/效应量/CUPED/辛普森核验)、profiling 动作或分析结论——简历没写过就绝不在改写里凭空加,凡简历缺失的能力一律走 gap_advice("建议补充")而非编造;尤其不得把"参与/协助某分析"夸大为"独立/主导";original 必须是简历原文一字不差。',
  resumeConventions:
    '中国校招数据分析(压力版)惯例核查:① 技能栏必须写明 SQL 熟练度(并能由项目佐证窗口函数/复杂查询),Python 数据分析库(pandas/numpy)与 BI 工具(Tableau/Power BI)分层标注、不堆砌;② 每条核心经历必须有数据指标且能说清口径,无数字或口径说不清的经历在头部竞争中近乎不计分;③ 头部大厂看重"指标体系设计+异常归因(含 profiling)+实验设计与统计严谨"三项,压力版要求至少其二有具体体现且经得起追问(显著性、样本量、辛普森核验);④ 数据竞赛(天池/Kaggle/美赛/统计建模大赛)加分,须写清方法论(而非仅"参赛");⑤ GitHub 或数据项目链接须可访问且有实质(README+代码+口径注释+结论),空仓库/私有仓库不计;⑥ 简历虚标"精通"被现场追问 SQL/统计答不上直接淘汰且印象极差;⑦ 明确与算法岗区分:不写 ML 建模/深度学习/特征工程等算法核心词;明确与 FP&A/财务分析区分:不做财务报表/资产负债表分析,专注业务数据与用户行为。',
};

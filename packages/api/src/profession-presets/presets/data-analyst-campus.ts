// 融合版(standard,主力):业务/BI 方向数据分析师校招。
// 定位:用数据驱动业务决策的分析岗,区别于算法岗(不做 ML 建模/特征工程),
// 区别于 FP&A(不做财务报表/资产负债表分析)。
// 核心交付=SQL+Python取数建模、指标拆解与业务洞察、实验设计、BI可视化。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const dataAnalystCampus: ProfessionPreset = {
  id: 'data-analyst-campus',
  profession: '数据分析师',
  stage: 'campus',
  tier: 'standard',
  displayName: '数据分析师 · 校招(融合版)',
  dimensions: [
    {
      key: 'sql_python_engineering',
      name: '数据工程基础(SQL+Python)',
      weight: 28,
      whatGoodLooksLike:
        '能独立写多表 JOIN、窗口函数(ROW_NUMBER/LAG/SUM OVER)、子查询与 CTE;Python(pandas/numpy)独立完成数据清洗、聚合、缺失值处理;懂数仓分层概念(ODS→DWD→DWS→ADS),能说清为何建宽表而非每次关联。',
      campusEvidence:
        '实习经历中出现"用 SQL 取数/建宽表/跑漏斗/定义留存";技能栏注明 SQL 熟练度与 Python 数据分析库;GitHub 或 Kaggle/天池有可查代码仓库;数据库/数据分析相关课程(结合项目实践更有分)。',
      commonGaps:
        '只会执行别人写好的 SQL 查询、无独立建表/多表关联记录【反模式·复制粘贴取数工:机械执行无工程能力】;所有分析用 Excel 完成、简历中无 SQL/Python 痕迹(2025 年大厂基本直接过滤)【反模式·Excel数分:工具选型与岗位要求脱节】。',
    },
    {
      key: 'business_insight',
      name: '业务洞察与指标拆解',
      weight: 25,
      whatGoodLooksLike:
        '对核心指标做二三级拆解(如 GMV=用户数×转化率×客单价),能说清"我的分析导致了什么业务决策"而非"我做了多少张报表";熟悉 AARRR/OSM 等框架,能把数据异常归因到具体业务环节。',
      campusEvidence:
        '实习经历有因果链表述"发现 XX 渠道 ROI 下降→定位原因为 YY→建议调整预算分配→转化率提升 X%";校园项目中搭建过指标体系或做过专题分析;参加数学建模竞赛(美赛/华赛)并有分析结论产出。',
      commonGaps:
        '经历全是"做了N张日报/周报/月报",没有任何"我发现了什么、我建议了什么"【反模式·报表仔/取数工具人:产出活动而非洞察】;罗列十几个指标的定义但没有层级关系、没有与业务目标的连接【反模式·指标堆砌者:展示知识面而非分析能力】。',
    },
    {
      key: 'statistics_experiment',
      name: '统计思维与实验设计(AB测试)',
      weight: 20,
      whatGoodLooksLike:
        '理解 p 值/置信区间/样本量计算背后的含义(而非背公式);能设计 AB 实验:实验组对照组划分、分流方案、规避辛普森悖论与 SRM(样本比例失调)的思路;了解 CUPED 降方差原理。',
      campusEvidence:
        '实习中参与过 AB 实验设计或结果评估、且能说清实验结论与局限;概率统计/计量经济学课程结合实际场景应用;统计建模类竞赛(统计建模大赛/AAAI等)有方法论说明。',
      commonGaps:
        '直接给出"提升X%"结论、没有提置信度或样本量、问到实验设计就卡壳【反模式·结论党:数字有了但统计有效性为零】;修了概率统计课但简历中找不到任何统计思维的应用痕迹。',
    },
    {
      key: 'visualization_communication',
      name: '数据可视化与沟通表达',
      weight: 15,
      whatGoodLooksLike:
        '用 Tableau/Power BI 或 Python(seaborn/plotly/matplotlib)输出有业务意义的看板,而非堆砌图表;能把复杂分析结论翻译成"一句话核心发现+一张图"的汇报结构,面向非技术受众清晰表达。',
      campusEvidence:
        '实习中负责过 BI 看板搭建或日/周报可视化输出;公开可视化项目或数据新闻作品;技能栏注明 Tableau/Power BI/Python 可视化库且有项目支撑。',
      commonGaps:
        '分析报告全是密密麻麻数字表格、无图无核心结论、阅读成本极高【反模式·数字墙:分析师的表达能力与工程能力同等重要】;只会 Excel 图表、从未接触 BI 工具或 Python 可视化库。',
    },
    {
      key: 'quantified_impact',
      name: '项目/实习数据量化',
      weight: 12,
      whatGoodLooksLike:
        '每条核心经历有数字支撑:转化率提升X%、覆盖XX万用户、DAU从A增至B;数字有合理测量口径(说得清怎么统计的);量级与公司规模/阶段匹配。',
      campusEvidence:
        '实习经历量化业务结果(转化率/DAU/GMV/ROI等);课程或竞赛项目有数据规模说明(数据集XX万行、分析覆盖XX城市)。',
      commonGaps:
        '所有经历条目都是纯动词短语(参与/负责/支持),无一个数字,可信度与竞争力大幅下降;数字精确到小数点一位且来源说不清("转化率提升73.6%"无测量说明)【疑似注水,反而减分】。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实——SQL/Python 实操记录、指标拆解与业务决策链条、AB 实验参与证据、BI 看板或可视化作品、量化数字及口径说明,写进 evidenceFound/gap;② 说明在校招数据分析语境下为何重要(如大厂 JD 明确要求 SQL+Python,Excel 数分简历大概率直接淘汰);③ 命中反模式时直接点名——"复制粘贴取数工""Excel数分""报表仔/取数工具人""指标堆砌者""结论党""数字墙",不得空泛("数据能力一般"无效)。分数必须与 why 一致,不得倒推。',
  rewriteGuidance:
    '改写只能基于简历已有内容重组/量化/补证据链——把"做了多张报表"改写为含业务洞察与决策结果的 STAR 表述;把"用 SQL 取数"改写为体现多表关联或漏斗/留存分析的具体场景。严禁虚构数字、项目或实验结论:缺具体数字时用 [具体数字] 占位并在 reason 说明"建议补充真实业务指标";简历中无某类经历时输出"建议补充 X(如参与一段含数据分析模块的实习)"而非替用户编造内容。original 必须是简历原文一字不差。',
  resumeConventions:
    '中国校招数据分析惯例核查:① 技能栏必须写明 SQL 熟练度(熟练/熟悉),Python 数据分析库(pandas/numpy)与 BI 工具(Tableau/Power BI)可列;② 每条核心经历必须有数据指标,无数字的经历在竞争中几乎不计入评分;③ 大厂看重"指标体系设计+异常归因分析+实验设计评估"三项能力,简历中至少应有其一的具体体现;④ 数据竞赛(天池/Kaggle/美赛/统计建模大赛)加分,需写清方法论(而非仅写"参赛");⑤ GitHub 或数据项目链接须可访问且有实质内容(有 README+代码+结论),空仓库或私有仓库不计入;⑥ 明确与算法岗区分:不应写 ML 建模/深度学习/特征工程等算法岗核心词,否则导致岗位定位模糊;明确与 FP&A/财务分析区分:不做财务报表/资产负债表分析,专注业务数据与用户行为。',
};

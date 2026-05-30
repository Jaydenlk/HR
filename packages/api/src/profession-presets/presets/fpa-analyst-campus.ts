// 融合版(standard,主力):为管理层提供经营分析/预算管控/业务决策支持的"懂业务的财务"。
// 定位:做洞察与判断而非记账——FP&A 的核心价值在于把数字翻译成经营决策语言。
// 英文概念仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const fpaAnalystCampus: ProfessionPreset = {
  id: 'fpa-analyst-campus',
  profession: '财务分析/FP&A',
  stage: 'campus',
  tier: 'standard',
  displayName: '财务分析 / FP&A · 校招(融合版)',
  dimensions: [
    {
      key: 'financial_modeling',
      name: '数据分析与财务建模能力',
      weight: 30,
      whatGoodLooksLike:
        '能独立搭建三表联动/DCF/NPV/预算预测模型;Excel 高级(VBA/动态图表/透视表);掌握 Python(Pandas/Numpy)或 SQL 之一处理财务数据;了解 Power BI/Tableau 制作财务仪表板。',
      campusEvidence:
        '实习中"搭预算模型涉及 X 万/用 Python 减少整理时间 X 小时";财务建模大赛/商赛名次;毕业论文使用模型;GitHub 财务数据项目。',
      commonGaps:
        '写"会财务建模"实则只会简单求和与基础图表【反模式·Excel基础即建模:把 SUM/VLOOKUP 等同于建模能力】;建模脱离业务、无法解释关键假设来源;工具停留在课程证书层无真实应用场景。',
    },
    {
      key: 'business_acumen',
      name: '业务理解与经营分析思维',
      weight: 25,
      whatGoodLooksLike:
        '能说清所在行业核心财务指标与驱动因素(互联网:GMV/MAU/单位经济;制造:毛利率/周转率/产能利用率);把财务数字与业务动作关联而非孤立分析。',
      campusEvidence:
        '分析报告"因业务 X 下滑致毛利降 Y 个百分点,建议 Z";参与预算编制能描述与业务部门的假设沟通过程;商赛/行研报告有业务驱动逻辑;实习中主动了解并描述业务模式。',
      commonGaps:
        '只做数据整理与图表、无业务洞见【反模式·数字搬运工:把 FP&A 做成 Excel 搬运,缺"所以呢"】;财务指标与业务脱节(知毛利率下降却不知是定价问题还是成本问题);把 FP&A 描述为"协助记账"与核算岗混淆。',
    },
    {
      key: 'accounting_foundation',
      name: '财务基础知识(三表+准则)',
      weight: 20,
      whatGoodLooksLike:
        '准确理解三表逻辑关联(净利润→EBITDA→自由现金流);知收入确认准则对利润的影响;了解预算管理流程(自上而下/自下而上)。',
      campusEvidence:
        'CPA《财务成本管理》(FP&A 最相关科目);CMA 管理会计证书(最契合 FP&A 定位);财务管理/管理会计课程成绩前列;实习"协助编制月度财务报表分析"等描述。',
      commonGaps:
        '只会跑模型、对三表准则一无所知【反模式·准则真空:工具能力强但财务基础缺失,经不起追问】;混用"营业利润"与"净利润"等基础概念;无任何财务报告阅读与分析经历。',
    },
    {
      key: 'communication_visualization',
      name: '沟通汇报与数据可视化表达',
      weight: 15,
      whatGoodLooksLike:
        '能把分析结论清晰汇报给非财务受众;PPT/Excel 图表专业规范;表达逻辑"结论先行-数据支撑-建议行动"。',
      campusEvidence:
        '实习"向管理层汇报分析结论/制作月度经营看板";商赛路演经历;Power BI/Tableau 仪表板项目;PPT 报告有明确 insight 与行动建议。',
      commonGaps:
        '做了大量分析但 PPT 只是表格堆砌、无结论无建议【反模式·数据不会说话:图表是答案不是结论,缺"所以应该做什么"】;只有量化数字无法对财务数字做定性商业解读。',
    },
    {
      key: 'learning_agility',
      name: '学习力与技术工具拓展性',
      weight: 10,
      whatGoodLooksLike:
        '主动学习新工具(SQL/Python/BI)并在真实项目中应用;对行业新趋势敏感(AI 辅助财务分析);有清晰职业规划(能说清为何选 FP&A 而非核算)。',
      campusEvidence:
        '自学记录(Coursera 财务建模课/Datacamp SQL);实习中提出流程优化建议并被采用;理解 FP&A→财务 BP→CFO 的职业成长路径并能阐述。',
      commonGaps:
        '罗列 Python/SQL/BI 但无任何真实应用场景描述【反模式·工具焦虑无深度:技能栏像工具清单,简历无一处用到】;不清楚 FP&A 与财务 BP 的区别、职业规划模糊或照搬套话。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的句子或事实(evidenceFound/gap),例如建模工具经历、行业财务指标表述、CPA《财管》/CMA 证书、实习公司层级与汇报场景;② 说明在校招 FP&A 语境下为何重要——FP&A 核心是"懂业务的财务",不是记账;③ 命中反模式时必须直接点名(如"Excel基础即建模""数字搬运工""准则真空""数据不会说话""工具焦虑无深度"),不得空泛("写得不错"无效);④ 分数必须与 why 一致,有具体证据才给高分。',
  rewriteGuidance:
    '改写只能基于简历已有内容重组/量化/补证据链(例:把"做数据整理"改写为带业务洞见与结论的表达)。严禁虚构经历/数字/证书:缺数字时用 [具体数字] 占位并在 reason 说明"建议补充真实数据";简历无某项经历时输出"建议补充 X"而非替用户编造。original 字段必须是简历原文一字不差。',
  resumeConventions:
    '中国校招 FP&A 惯例核查:① 数据工具(Excel高级/Python/SQL/BI)与业务理解双轮驱动,简历应有量化的真实应用而非单纯罗列工具名称;② 证书优先级 CPA《财管》>ACCA>初级会计>CMA>CTA,CFA 属金融类、误写至 FP&A 简历需谨慎提示;③ 实习"公司性质>内容"(互联网大厂/外资/上市公司 FP&A 岗含金量强),应靠前且量化成果;④ 简历中数字应勾稽自洽(成本节约额与比例应匹配);⑤ 删除无关社团/性格空话(如"积极主动、认真负责");⑥ FP&A 与核算岗、财务与金融不可混写——出现"记账""报税""账务处理"等核算表述需提示定位偏差。',
};

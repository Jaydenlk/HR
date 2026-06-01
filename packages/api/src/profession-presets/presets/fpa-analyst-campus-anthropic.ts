// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) finance(variance-analysis/financial-statements/close-management)skills,
// 按校招+中文场景修改;英文框架概念(price/volume/mix variance decomposition/waterfall bridge/budget-actual-forecast/flux 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const fpaAnalystCampusAnthropic: ProfessionPreset = {
  id: 'fpa-analyst-campus-anthropic',
  profession: '财务分析/FP&A',
  stage: 'campus',
  tier: 'pressure',
  displayName: '财务分析 / FP&A · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'variance_decomposition',
      name: '差异归因与桥式拆解深度',
      weight: 30,
      whatGoodLooksLike:
        '这是 FP&A 的看家本领:能把一笔预算-实际差异拆成量(volume)、价(rate/price)、结构(mix)三因子并验证三者之和等于总差异;对人力成本能拆人头/薪资率/到岗时点/流失;会用瀑布/桥图(waterfall/bridge)从预算值逐项加减到实际值并核对闭合(起点+各驱动=终点);差异叙事做到具体、量化、说清"为什么",并判断一次性还是趋势性、给出行动建议。头部外资/大厂 FP&A 终面会现场让你把一张利润表逐行 flux 拆给"非财务的业务负责人"听。',
      campusEvidence:
        '实习中做过"预算 vs 实际"差异拆解并量化各驱动因子(因量+X、因价-Y);搭过三表联动/滚动预测/敏感性模型并能解释关键假设来源;做过经营分析桥图/瀑布;财务建模大赛区域/全国前列;用 Python/SQL 处理真实财务数据(减少整理 X 小时)。',
      commonGaps:
        '【Anthropic 反模式·循环式差异叙事】"收入低于预算是因为收入下降"——零信息量,终面这一句直接出局;【Anthropic 反模式·量价结构不分】只报总差异、拆不出量/价/结构三因子,瀑布图不闭合;【反模式·Excel基础即建模】把 SUM/VLOOKUP 当建模、搭不出三表联动也说不清假设来源。',
    },
    {
      key: 'business_acumen',
      name: '业务理解与经营洞察(so-what)',
      weight: 25,
      whatGoodLooksLike:
        '能说清所在行业核心财务指标与驱动因素(互联网:GMV/MAU/单位经济;制造:毛利率/周转率/产能利用率),把财务数字与业务动作关联而非孤立分析;每个分析都落到一句"所以业务该做什么"的行动建议,并能区分"毛利下降是定价问题还是成本问题";预算编制时与业务部门做过假设对齐。FP&A 的核心价值是把数字翻译成经营决策语言。',
      campusEvidence:
        '分析报告"因业务 X 下滑致毛利降 Y 个百分点,建议 Z";参与预算编制并描述与业务部门的假设沟通过程;商赛/行研报告有清晰业务驱动逻辑;实习中主动了解并描述目标行业商业模式与单位经济。',
      commonGaps:
        '【Anthropic 反模式·缺"所以呢"(so-what)】只做数据整理与图表、没有业务洞见与行动建议,把 FP&A 做成 Excel 搬运;【Anthropic 反模式·指标业务脱节】知道毛利率下降却说不出是定价还是成本驱动;【反模式·数字搬运工】把 FP&A 描述成"协助记账",与核算岗混淆。',
    },
    {
      key: 'accounting_foundation',
      name: '财务基础(三表+准则)抗追问',
      weight: 20,
      whatGoodLooksLike:
        '准确理解三表逻辑关联(净利润→EBITDA→自由现金流的桥接)与勾稽;知收入确认准则对利润的影响、应计/递延如何影响当期结果;了解预算管理流程(自上而下/自下而上)与关账如何产出 FP&A 所依赖的实际数。工具能力再强也要经得起"这个数怎么来的"的追问。',
      campusEvidence:
        'CPA《财务成本管理》(FP&A 最相关科目)或 CMA(最契合 FP&A 定位)通过/在考;财务管理/管理会计课程成绩前列;实习"协助编制月度财务报表分析"并能讲出三表勾稽;能解释一笔应计/递延对利润表与现金流的不同影响。',
      commonGaps:
        '【Anthropic 反模式·准则真空】只会跑模型、对三表准则一无所知,一追问数怎么来的就露馅;混用"营业利润"与"净利润"等基础概念;无任何财务报告阅读与分析经历,模型成了空中楼阁。',
    },
    {
      key: 'communication_visualization',
      name: '汇报表达与数据可视化',
      weight: 15,
      whatGoodLooksLike:
        '能把分析结论清晰汇报给非财务受众,表达逻辑"结论先行-数据支撑-建议行动";图表/看板专业规范且每张图都服务于一个结论而非堆数据;桥图/瀑布/月度经营看板做得让"忙碌的管理层扫一眼就懂"。',
      campusEvidence:
        '实习"向管理层汇报分析结论/制作月度经营看板";商赛路演;Power BI/Tableau 仪表板项目;PPT 报告有明确 insight 与行动建议而非表格堆砌。',
      commonGaps:
        '【Anthropic 反模式·数据不会说话】做了大量分析但 PPT 只是表格/图表堆砌、无结论无建议,图表当成了答案而不是论据;只有量化数字、无法对财务数字做定性商业解读;汇报缺"所以应该做什么"。',
    },
    {
      key: 'learning_agility',
      name: '学习力与技术工具拓展性',
      weight: 10,
      whatGoodLooksLike:
        '主动学习新工具(SQL/Python/BI)并在真实项目中应用而非只挂技能栏;对行业新趋势敏感(AI 辅助财务分析、自动化 flux);有清晰职业规划、能说清为何选 FP&A 而非核算、理解 FP&A→财务 BP→CFO 的成长路径。',
      campusEvidence:
        '自学记录(Coursera 财务建模课/Datacamp SQL)且在实习中真实落地;实习中提出流程优化建议并被采用;能阐述 FP&A 与财务 BP 的区别与职业成长逻辑。',
      commonGaps:
        '【反模式·工具焦虑无深度】罗列 Python/SQL/BI 但简历无一处真实应用,技能栏像工具清单;不清楚 FP&A 与财务 BP 的区别、职业规划模糊或照搬套话;把"学过 Python"当能力却拿不出一个应用场景。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的句子或事实(差异拆解经历、行业财务指标表述、桥图/瀑布、CPA《财管》/CMA 证书、实习公司层级与汇报场景);② 说明在头部 FP&A 语境下为何重要——FP&A 核心是"懂业务、会归因、给建议"的财务,终面要现场把利润表 flux 拆给业务听;③ 命中反模式时必须直接点名(如"循环式差异叙事""量价结构不分""Excel基础即建模""缺所以呢""指标业务脱节""数字搬运工""准则真空""数据不会说话""工具焦虑无深度"),不得空泛("写得不错"无效);④ 分数必须与 why 一致,有具体证据才给高分,给高分但 why 全是缺口应拒绝输出;⑤ 严禁泄漏任何"满分多少分/扣多少分"等内部计算口径。',
  rewriteGuidance:
    'FP&A(压力版)改写铁律——禁编造:只精修简历"已有"的分析/建模/差异/预算句,讲精准(分析了什么业务问题、差异如何拆成量价结构、用了什么模型、产生了什么决策影响),用 FP&A 精准动词(拆解/归因/建模/预测/优化/桥接)与可量化指标(预算偏差率/各驱动因子贡献/成本节约额/报表覆盖人数/模型精度)增强可信度;缺数字处一律用 [具体数字] 占位并在 reason 中提示补充真实数据;严禁替候选人添加原句没有体现的业务洞察、量价拆解、建模细节或行动建议;简历没有的能力(如无差异归因、无建模、无管理层汇报)一律走"建议补充(gap_advice)"输出"建议补充 X",绝不编造;严禁把"协助/参与"夸大为"独立/主导",original 字段保留简历原文一字不差。',
  resumeConventions:
    '中国校招 FP&A 惯例核查:① 数据工具(Excel 高级/Python/SQL/BI)与业务理解双轮驱动,简历应有量化的真实应用而非单纯罗列工具名称;② 证书优先级 CPA《财管》> ACCA > CMA > 初级会计 > CTA,CFA 属金融类、误写至 FP&A 简历需谨慎提示;③ 实习"公司性质 > 内容"(互联网大厂/外资/上市公司 FP&A 岗含金量强),应靠前且量化成果;④ 简历中数字应勾稽自洽(成本节约额与比例应匹配);⑤ 删除无关社团/性格空话(如"积极主动、认真负责");⑥ FP&A 与核算岗、财务与金融不可混写——出现"记账/报税/账务处理"等核算表述需提示定位偏差;⑦ 错别字硬扣分,单页原则,GPA 建议写专业排名百分比。',
};

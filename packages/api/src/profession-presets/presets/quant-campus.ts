// 融合版(standard,主力):量化研究/交易校招,数学/物理/计算机/金融工程理工背景;
// 校招集中百亿以上量化私募(WorldQuant/明汯/九坤/幻方等)。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const quantCampus: ProfessionPreset = {
  id: 'quant-campus',
  profession: '量化研究/交易',
  stage: 'campus',
  tier: 'standard',
  displayName: '量化研究 / 交易 · 校招(融合版)',
  dimensions: [
    { key: 'math_stats_foundation', name: '数学/统计基础', weight: 35,
      whatGoodLooksLike: '概率论/随机过程/线代/最优化/时间序列扎实,能推导而非仅套用结论;理解统计套利/因子模型的数学本质(如 Kalman 滤波、协整、PCA 降维的数学意义)。',
      campusEvidence: '数学/物理/计算机/金工背景;数学建模国奖或数学竞赛获奖;随机过程、最优化、计量经济学等相关课程 A+。',
      commonGaps: '数学基础不足,只凭对量化的热情想转行;只会套用公式与结论,问"为什么用这个模型"答不上数学原理【反模式·热情驱动型:用兴趣替代数学硬实力】。' },
    { key: 'programming_python_cpp', name: '编程能力(Python/C++)', weight: 25,
      whatGoodLooksLike: 'Python 能独立实现完整策略与数据管线(数据清洗/因子计算/向量化回测);C++ 用于高频/低延迟场景,理解内存管理与性能优化;能处理大规模行情 tick 数据。',
      campusEvidence: 'GitHub 公开策略/因子实现 repo;ACM/Kaggle 竞赛成绩;实习中写过生产级回测引擎或交易接口代码。',
      commonGaps: '只跑过教程或 Jupyter Notebook,无工程化能力;代码无版本管理,无法被招聘方核实【反模式·只会调包的调参员:用库封装掩盖工程空白,不懂底层实现】。' },
    { key: 'strategy_backtest', name: '策略研究与回测框架', weight: 20,
      whatGoodLooksLike: '搭过真实回测框架(而非直接套现成库),做过多因子选股/CTA/统计套利/高频策略研究;理解过拟合、样本外验证、前视偏差,能给出含最大回撤/夏普比/换手率的完整绩效报告。',
      campusEvidence: 'WorldQuant/明汯/九坤/幻方等头部私募实习(最强信号);策略研究项目附完整回测报告(含绩效指标与回撤分析)。',
      commonGaps: '策略回测全靠现成框架而不懂底层;被问"这个策略的理论基础是什么/为什么有效"答不上【反模式·只会调包的调参员:黑盒调参、无法解释策略逻辑】。' },
    { key: 'market_understanding', name: '金融市场理解', weight: 10,
      whatGoodLooksLike: '懂市场微观结构与交易机制(撮合/报价/订单类型);了解A股、期货市场特性;理解策略落地的真实摩擦成本(手续费/滑点/冲击成本/持仓限制)。',
      campusEvidence: '金融工程/衍生品/市场微观结构相关课程;券商或私募实习;自学后能讲清 A 股涨跌停对策略执行的影响。',
      commonGaps: '纯理工背景,无任何金融市场认知;对交易摩擦(手续费/滑点/冲击成本)一无所知,回测绩效无法转化为实盘。' },
    { key: 'academic_competition_signal', name: '竞赛/论文/学术背书', weight: 10,
      whatGoodLooksLike: '数学建模国奖/Kaggle 金牌/顶会论文(第一作者或共一)/量化策略竞赛名次;产出可被招聘方独立核实。',
      campusEvidence: '竞赛排名+方案 Blog(公开可查);论文 arXiv 链接;量化大赛(如 WorldQuant Brain/JoinQuant)成绩单。',
      commonGaps: '无任何可被独立核实的学术/竞赛/策略产出;仅有课程项目无公开成果【反模式·无迹可查型:简历无法被招聘方独立验证】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 引用简历中具体命中/缺失的事实(数学背景与推导能力、Python/C++ repo 链接、回测框架搭建经历与策略绩效指标、市场摩擦认知、竞赛/论文可查证链接),写进 evidenceFound/gap;② 说明在校招量化语境下为何重要;③ 命中反模式直接点名(如"热情驱动型""只会调包的调参员""无迹可查型"),不得空泛("写得还行"无效)。分数必须与 why 一致。',
  rewriteGuidance: '改写只能基于简历已有内容重组/量化/补证据链(把"做了量化策略"改写为带数学本质/回测绩效/工程实现的表述,如夏普比、最大回撤、数据规模、回测周期)。严禁虚构策略逻辑、绩效数字或竞赛成绩;缺数字用 [具体数字] 占位并在 reason 说明"建议补充真实数据";简历无某经历时输出"建议补充 X"而非替用户编造;original 必须是简历原文一字不差。',
  resumeConventions: '中国校招量化惯例核查:① 专业背景(主要理工科:数学/物理/计算机/金工;金融经济专业需有扎实数学竞争力,纯文科背景难硬匹配);② 校招集中百亿+量化私募(WorldQuant/明汯/九坤/幻方等实习为最强信号,应靠前展示);③ GitHub 策略 repo 和竞赛排名是硬信号,必须附可点击链接(无链接近乎不计入);④ 竞赛写名次比例("CUMCM 全国一等奖""Kaggle Top 0.3%"优于仅写参赛);⑤ 数学+编程双过硬才能竞争核心研究岗;⑥ 与行研/投行的区别:量化=数学推导+编程工程+策略回测,纯文科金融路径难以硬匹配,应在 resumeConventions 阶段提示候选人。',
};

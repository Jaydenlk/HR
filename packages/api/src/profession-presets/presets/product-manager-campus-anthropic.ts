// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) product-management skills,
// 按校招+中文场景修改;英文框架概念(JTBD/North Star/RICE/MoSCoW/Non-Goals 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const productManagerCampusAnthropic: ProfessionPreset = {
  id: 'product-manager-campus-anthropic',
  profession: '互联网产品经理',
  stage: 'campus',
  tier: 'pressure',
  displayName: '产品经理 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'problem_user_insight',
      name: '问题定义与用户洞察',
      weight: 25,
      whatGoodLooksLike:
        '先讲清"为谁解决什么问题、问题多频繁、不解决的代价",再讲方案(JTBD:在某场景下用户想达成什么);用户洞察有来源(访谈/调研/反馈),区分"用户说的"与"用户做的";能明确 Non-Goals(本次不做什么)以界定范围。',
      campusEvidence:
        '课程项目/竞赛/实习中的用户访谈、问卷、竞品体验、支持工单分析;写过含问题陈述+目标+非目标的 PRD/一页纸;能用一句话说明某功能服务的用户 job。',
      commonGaps:
        '【Anthropic 反模式·solutioning before framing】上来就写"做了X功能",没有问题来源与用户价值;【feature parity】用"竞品有所以我们做"代替需求论证;用户群泛化为"所有人",缺分群与场景。',
    },
    {
      key: 'data_metrics_thinking',
      name: '数据与指标思维',
      weight: 20,
      whatGoodLooksLike:
        '用指标定义成功而非罗列产出(结果型 KR 而非"上线了X"):分得清北极星/一级健康指标(激活、留存、转化)与诊断指标;给具体目标与口径("30天激活率从40%到55%",而非"提升体验");即便实习/课程项目也尽量给量级。',
      campusEvidence:
        '实习的业务指标(转化率/留存/DAU/GMV)、竞赛名次与规模、项目用户量与增长;做过 A/B 或漏斗分析、定义过激活动作、跑过留存曲线。',
      commonGaps:
        '【Anthropic 反模式·vanity metrics】只堆"累计注册/总曝光"等只涨不反映健康的虚荣指标;【output not outcome】用"上线N个功能/关闭N个工单"等活动量冒充结果;通篇无数字,或有结果不量化。',
    },
    {
      key: 'prioritization_roadmap',
      name: '优先级与路线图',
      weight: 20,
      whatGoodLooksLike:
        '面对有限资源能做取舍并说明依据(RICE/ICE/价值-成本/MoSCoW 任一);讲得清"为什么先做这个、砍了什么、依赖什么";路线图是 Now/Next/Later 这类沟通工具而非任务清单,留有缓冲(按70-80%容量规划)。',
      campusEvidence:
        '担任组长/负责人对需求做过排期与取舍;在实习中参与过迭代规划、backlog 梳理、容量评估;能说明某决策"为何这个优先级"。',
      commonGaps:
        '【Anthropic 反模式·everything is P0】什么都"高优先级"等于没有优先级;【scope creep / 缺 Non-Goals】只加不减、范围无边界;路线图写成 Gantt 任务流水,看不出取舍逻辑与依赖。',
    },
    {
      key: 'competitive_market',
      name: '竞品与市场感知',
      weight: 15,
      whatGoodLooksLike:
        '诚实评估竞品强弱(不贬低对手),以买家/用户在意的能力维度对比而非堆功能数;能判断"哪里该差异化、哪里只需对齐(parity)";会区分有行为/投资/需求支撑的信号与只是媒体热度的噪音。',
      campusEvidence:
        '做过结构化竞品分析(能力对比矩阵、定位/价值主张拆解);分析过 win/loss 或用户评价;课程/竞赛中做过市场或行业趋势研究。',
      commonGaps:
        '【Anthropic 反模式·feature parity thinking】只列"竞品有什么我们要有什么",不问背后用户需求;竞品分析只夸己方、贬低对手,缺可信度;把行业热词当趋势,无客户数据支撑。',
    },
    {
      key: 'communication_stakeholder',
      name: '跨职能沟通与利益相关方',
      weight: 20,
      whatGoodLooksLike:
        '体现与研发/设计/数据/业务的跨职能协作与对齐;能写清晰的用户故事/PRD让"忙碌的相关方扫一眼标题即懂";路线图/范围变更时会"说清改了什么、为什么、牺牲了什么、谁受影响";有主导/推动/说服而非模糊"参与"。',
      campusEvidence:
        '担任组长/负责人、从0到1推动上线、独立负责模块;跨部门实习协作、公开汇报/路演、对外沟通变更;社团/组织中的协调与说服经历。',
      commonGaps:
        '全篇"参与/协助",看不出个人贡献边界与主导动作;只字未提与谁协作、如何对齐;变更沟通缺"牺牲了什么/谁受影响",或文档写成内部任务语言而非面向相关方。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的句子或事实(evidenceFound/gap);② 说明在校招产品岗语境下为何重要;③ 不得空泛("写得不错"无效)。分数必须与 why 一致。',
  rewriteGuidance:
    '产品经理(压力版)改写侧重:把简历"已有"的需求/决策/指标句讲精准(为谁解决什么问题、取舍逻辑如何、结果影响多大),用产品精准动词(主导/推动/定义/迭代/验证)与可量化指标(转化率/留存/DAU/激活率)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的框架术语或需求来源,凡简历没有的能力一律走"建议补充(gap_advice)"而非编造。',
  resumeConventions:
    '中国校招惯例核查:① GPA/排名(前列应展示);② 实习经历(校招高权重,应靠前且量化);③ 竞赛/获奖(加分项,应保留);④ "个人评价"应具体非空话;⑤ 不需要照片/性别/婚姻等无关信息(若有则提示精简)。',
};

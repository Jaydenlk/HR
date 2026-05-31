// 融合版(standard,主力):校招友好的 5 维结构 + Anthropic product-management skills 的反模式词库
// (来源 anthropics/knowledge-work-plugins,Apache-2.0)。英文概念仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const productManagerCampus: ProfessionPreset = {
  id: 'product-manager-campus',
  profession: '互联网产品经理',
  stage: 'campus',
  tier: 'standard',
  displayName: '产品经理 · 校招(融合版)',
  dimensions: [
    { key: 'product_thinking', name: '产品思维与用户视角', weight: 25,
      whatGoodLooksLike: '先讲清"为谁、解决什么问题、为何这样做"再讲功能;需求有来源(访谈/调研/竞品),能说明取舍与本次不做什么(Non-Goals)。',
      campusEvidence: '课程项目/竞赛/实习中的需求调研、用户访谈、竞品分析、PRD、需求优先级取舍。',
      commonGaps: '只写"参与开发了X功能",没有需求来源与用户价值【反模式·方案先行 solutioning before framing:未定义问题就跳到做什么】;用"竞品有所以我们做"代替需求论证【反模式·盲目对标 feature parity】;只加不减、范围无边界【反模式·缺 Non-Goals / 范围蔓延】。' },
    { key: 'data_driven', name: '数据驱动与量化表达', weight: 25,
      whatGoodLooksLike: '用指标定义问题与成功(转化率/留存/DAU/增幅等)而非罗列产出,给具体口径与目标;即便课程/实习项目也给量级。',
      campusEvidence: '实习的业务指标、竞赛名次/规模、项目的用户量/增长数据。',
      commonGaps: '通篇无数字,或有结果不量化("提升了体验"而非"提升 X%")【反模式·虚荣指标 vanity metrics:只堆累计注册/总曝光等只涨不反映健康的数】;用"上线N个功能/关闭N个工单"等活动量冒充结果【反模式·产出非结果 output not outcome】。' },
    { key: 'execution_ownership', name: '项目主导权与执行落地', weight: 20,
      whatGoodLooksLike: '清晰体现个人在项目中的角色与主导动作(推动、协调、决策),而非模糊的"参与";能说明做了哪些取舍、为何这个优先级。',
      campusEvidence: '担任组长/负责人、跨职能协作、从0到1推动上线、独立负责模块。',
      commonGaps: '全是"参与/协助",看不出个人贡献边界;事事都说重要/紧急,看不出取舍【反模式·样样P0 everything is P0:都高优先级等于没有优先级】。' },
    { key: 'communication', name: '沟通协作与影响力', weight: 15,
      whatGoodLooksLike: '体现跨角色(研发/设计/数据/业务)协作、说服、文档/汇报能力;变更时说清"改了什么、为什么、牺牲了什么、谁受影响"。',
      campusEvidence: '社团/组织经历、跨部门实习协作、公开汇报/路演。',
      commonGaps: '只字未提协作与沟通场景;变更只说做了什么,缺"牺牲了什么/谁受影响";文档写成内部任务语言而非面向相关方【反模式·内部视角文档:相关方扫一眼看不懂】。' },
    { key: 'foundation', name: '基础匹配(学历/实习/技能)', weight: 15,
      whatGoodLooksLike: '院校/专业/实习与目标岗位相关;掌握基础工具(SQL/Axure/数据分析等)。',
      campusEvidence: '相关实习、相关课程、工具技能、证书。',
      commonGaps: '技能与岗位无关;无任何产品相关实习或项目。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的句子或事实(evidenceFound/gap);② 说明在校招产品岗语境下为何重要;③ 命中反模式时直接点名(如"方案先行""虚荣指标""盲目对标""缺 Non-Goals""样样P0"),不得空泛("写得不错"无效)。分数必须与 why 一致。',
  rewriteGuidance: '产品经理改写侧重:把简历"已有"的需求/项目/指标句讲精准(为谁解决什么问题、主导了哪些决策、结果影响多大),用产品精准动词(主导/推动/定义/迭代/验证)与可量化指标(转化率/留存/DAU/用户数)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的功能设计或需求来源,凡简历没有的能力一律走"建议补充(gap_advice)"而非编造。',
  resumeConventions: '中国校招惯例核查:① GPA/排名(前列应展示);② 实习经历(校招高权重,应靠前且量化);③ 竞赛/获奖(加分项,应保留);④ "个人评价"应具体非空话;⑤ 不需要照片/性别/婚姻等无关信息(若有则提示精简)。',
};

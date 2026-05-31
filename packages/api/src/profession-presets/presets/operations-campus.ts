// 融合版(standard,主力):互联网运营校招(用户/内容/活动/增长),含 AIGC/AI 运营倾向;
// 核心=数据驱动+内容洞察+增长闭环,强调执行细节与数据结果。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const operationsCampus: ProfessionPreset = {
  id: 'operations-campus',
  profession: '运营(含AIGC)',
  stage: 'campus',
  tier: 'standard',
  displayName: '运营(含 AIGC)· 校招(融合版)',
  dimensions: [
    { key: 'data_analysis', name: '数据分析与业务理解', weight: 30,
      whatGoodLooksLike: '能从 DAU/留存率/转化漏斗等核心指标出发定位问题;会用 Excel/Python/SQL 做基础数据提取和可视化;能讲清一个数据异常的完整分析过程(现象→假设→验证→结论)。',
      campusEvidence: '实习中有“发现某指标下降 X%、用户分群分析定位新用户流失、优化引导流程后回升 Y%”的闭环;学生项目有真实数据分析(非教程数据集)。',
      commonGaps: '只会导出数据制作图表,不会形成判断和决策【反模式·数据搬运工:有数据没洞察、有表格没结论】。' },
    { key: 'content_insight', name: '内容生产与用户洞察', weight: 25,
      whatGoodLooksLike: '能独立完成 选题→生产→发布→复盘 的内容全链路;理解不同平台(公众号/抖音/小红书)的内容规则和算法逻辑差异;有真实且带数据的内容作品集。',
      campusEvidence: '个人账号/社团账号的运营数据(粉丝数/阅读量/互动率);大学期间负责过的品牌或活动的内容输出。',
      commonGaps: '说“负责内容运营”但没有任何作品链接和数据证明【反模式·无证运营:经历不可验证】。' },
    { key: 'growth_execution', name: '活动/增长方案执行', weight: 20,
      whatGoodLooksLike: '独立或主导过至少一次有完整闭环的运营活动(策划→执行→数据复盘);理解 AARRR 增长框架;有拉新/留存/召回任一场景的实操经验。',
      campusEvidence: '简历写“策划并执行 XX 活动,拉新 XX 人,留存率达 XX%”;社团/学生会大型活动的组织数据。',
      commonGaps: '执行了活动但没有跟进数据,不知道结果怎么样【反模式·活动执行器:只做不复盘、增长意识为零】。' },
    { key: 'ai_aigc', name: 'AI 工具实操与 AIGC 能力', weight: 15,
      whatGoodLooksLike: '能用 ChatGPT/Claude/MidJourney/Runway 等工具完成完整内容生产任务;会写有效的 Prompt(指令精准/角色设定/边界约束);了解文生图/文生视频工作流;AIGC 运营岗还会 Luma/Sora/即梦等视频生成工具。',
      campusEvidence: '简历附 AIGC 作品集链接(内容+工具+Prompt 说明);参与过 AIGC 相关比赛;实习中有 AIGC 工作流落地案例。',
      commonGaps: '只用过 ChatGPT 但 Prompt 质量低、生成内容需大量人工修改【反模式·AI按钮点击员:工具消费者、非工作流设计者】。' },
    { key: 'platform_ecosystem', name: '平台生态认知', weight: 10,
      whatGoodLooksLike: '熟悉至少 2 个主流平台的算法推荐逻辑(抖音/小红书/视频号/B站);能分析竞品的运营策略;理解品牌/用户/平台三角关系。',
      campusEvidence: '运营方向实习中有“对标竞品分析”产出;个人账号在多平台有运营实践数据对比。',
      commonGaps: '对平台规则只知道表面,换一个平台就不会运营【反模式·单平台困兽】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(粉丝/阅读/UV/转化率/GMV 等数据、作品集链接、活动数据、AIGC 作品与 Prompt),写进 evidenceFound/gap;② 说明在校招运营语境下为何重要;③ 命中反模式直接点名(如“数据搬运工”“无证运营”“活动执行器”“AI按钮点击员”“单平台困兽”),不得空泛。分数必须与 why 一致。',
  rewriteGuidance: '运营改写侧重:把简历”已有”的内容/活动/数据句讲精准(在哪个平台、做了什么动作、结果数据如何),用运营精准动词(策划/执行/复盘/优化/拉新/留存)与可量化指标(粉丝数/阅读量/UV/转化率/GMV)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的平台经历或数据结论,凡简历没有的能力一律走”建议补充(gap_advice)”而非编造。',
  resumeConventions: '中国校招运营惯例核查:① 所有运营数字必须出现(粉丝/阅读量/UV/转化率/GMV),无数字的运营经历可信度极低;② 作品集链接 > 文字描述(公众号/小红书主页/视频链接直接附);③ AIGC 运营岗必须附 Prompt 案例或 AIGC 作品集(2026 届新硬要求);④ 与产品经理岗不同——运营不强调产品文档、强调执行细节+数据结果;⑤ 社团/学生媒体运营经历与实习等权,关键看数据量级。',
};

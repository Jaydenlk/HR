// 融合版(standard,主力):互联网 UI 视觉 / UX 交互 / 产品设计校招。
// 作品集是第一筛选维度——无作品集链接≈无效简历,筛选前置。
// 英文概念仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const designerCampus: ProfessionPreset = {
  id: 'designer-campus',
  profession: '设计师(UI/UX)',
  stage: 'campus',
  tier: 'standard',
  displayName: '设计师(UI/UX)· 校招(融合版)',
  dimensions: [
    {
      key: 'portfolio_quality',
      name: '作品集质量(展现设计思维全链路)',
      weight: 35,
      whatGoodLooksLike:
        '3 个及以上完整项目,每个项目都有"发现问题→用研→方案设计→验证/迭代"的完整叙事;包含 App 或 Web 实战(非纯概念稿);作品集本身版式、信息层级、节奏体现设计能力。',
      campusEvidence:
        '在线作品集链接(Behance / 站酷 / 即时设计 / Figma Community);实习项目截图配设计决策说明;毕设或课程项目写清问题背景与用研过程。',
      commonGaps:
        '塞满 60+ 页静态图但无项目介绍、无设计思路【反模式·堆量炸弹:以数量代替质量,掩盖设计思维缺失】;全是临摹 / UI 挑战赛无实际业务项目【反模式·纯临摹仔:展示执行力但缺乏问题定义能力】;只展示最终 UI 稿、无用研 / 竞品 / 线框过程【反模式·断层作品集:结论前的思维链完全缺失,面试追问设计决策答不上】。',
    },
    {
      key: 'design_tools_engineering',
      name: '设计工具与工程化能力',
      weight: 20,
      whatGoodLooksLike:
        'Figma 熟练(组件库 / Auto Layout / Variants / 多人协作);了解 Sketch;能产出可交互原型;熟悉设计规范(iOS HIG / Material Design / 公司 Design System)。',
      campusEvidence:
        '技能栏注明 Figma 熟练程度;作品集中有组件库截图或 Design System 说明文档;有可交互原型链接(Figma Prototype / 即时设计)。',
      commonGaps:
        '只会 Photoshop 不会 Figma,2025 年多数互联网公司已在 JD 中明确排除【反模式·Photoshop 原地踏步:工具选择暴露脱离行业现状】;不懂组件化、交稿文件命名混乱无规范、切图标注缺失,研发协作成本高。',
    },
    {
      key: 'user_research_interaction',
      name: '用户研究与交互逻辑',
      weight: 20,
      whatGoodLooksLike:
        '有用户访谈 / 可用性测试 / 问卷设计经历;能说明用户旅程地图 / 信息架构的制作过程;交互逻辑严密(边界 / 空状态 / 加载 / 错误状态全覆盖)。',
      campusEvidence:
        '作品集包含用研文档 / 亲和图 / 洞察卡片;修读人机交互 / UX / 认知心理学等课程;用研助理 / 产品设计实习经历。',
      commonGaps:
        '直接跳到视觉输出、无用研支撑、面试追问设计决策依据答不上【反模式·美工思维:把设计等同于让东西"好看",缺失问题发现与用户视角】;只做 Happy Path,忽略边界情况 / 异常流程,交互逻辑残缺。',
    },
    {
      key: 'visual_system',
      name: '视觉表达与规范能力',
      weight: 15,
      whatGoodLooksLike:
        '色彩 / 字体 / 间距 / 网格有一致的设计系统意识;能区分平台规范并正确应用;视觉细节精准(像素对齐 / 图标风格统一 / 8px 网格 / 4px spacing 工程规则)。',
      campusEvidence:
        '作品集展示 UI Kit / 色彩系统 / 字体规范截图;修读视觉 / 品牌设计相关课程;实习中参与过设计规范制定。',
      commonGaps:
        '同一作品集内风格毫无一致性、字体随意混用、间距标准不一【反模式·风格乱炖:缺乏系统性设计思维,呈现为视觉噪音】;视觉美观但完全不懂工程约束(8px 网格 / 4px spacing),稿件落地困难。',
    },
    {
      key: 'business_data_awareness',
      name: '业务意识与数据驱动',
      weight: 10,
      whatGoodLooksLike:
        '能描述设计方案对业务指标(转化率 / 点击率 / 任务完成率)的影响;作品集有数据验证结论;了解 A/B 测试在设计迭代中的应用。',
      campusEvidence:
        '实习经历中有设计-数据闭环(上线后指标变化);作品集末页有数据结论或效果说明。',
      commonGaps:
        '认为设计价值只是"让界面好看",说不出与转化率 / 留存率的关系【反模式·艺术家心态:把审美主权置于业务目标之上,拒绝被数据证伪】;实习描述无任何上线后的效果数据,无法证明方案有效。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 从简历中指出具体命中或缺失的事实(作品集链接是否存在、项目叙事是否完整、工具技能栏 Figma 写法、用研 / 交互过程说明、设计系统意识、业务数据结论),写进 evidenceFound / gap;② 说明在校招设计岗语境下为何重要(作品集筛选前置、Figma 已成行业标准、用研能力区分"设计师"与"美工"、视觉规范影响研发协作效率、业务数据证明设计价值);③ 命中反模式时直接点名(堆量炸弹 / 纯临摹仔 / 断层作品集 / Photoshop 原地踏步 / 美工思维 / 风格乱炖 / 艺术家心态),不得空泛("还不错"无效)。分数必须与 why 一致,无作品集链接则"作品集质量"维度不得超过 15 分。',
  rewriteGuidance:
    '改写只能基于简历已有内容重组 / 强化设计表达(把"设计了界面"改写为带问题背景 / 用研洞察 / 设计决策 / 验证数据的完整叙事)。严禁虚构项目 / 数据 / 用研过程;缺具体数字时用 [具体数字] 占位并在 reason 注明"建议补充真实数据(如上线后点击率变化)";简历无作品集链接时输出"建议补充在线作品集链接(如 Behance / 站酷 / Figma Community)",不得替用户编造链接或项目描述;original 必须是简历原文一字不差。',
  resumeConventions:
    '中国校招设计惯例核查:① 简历必须附在线作品集链接(Behance / 站酷 / Figma Community / 即时设计),无链接基本不进筛选——此为设计岗第一门槛;② 作品集 PDF 建议不超过 20MB、3–5 个项目、每个项目 4–8 页、全集不超过 30 页;③ 简历排版本身即设计作品,视觉混乱直接出局;④ 课程项目可以写,但必须注明"业务背景说明"(为谁设计、解决什么问题);⑤ 多数互联网公司作品集前置审查通过才进面试,建议简历首屏或顶部即放作品集链接;⑥ GPA / 相关课程(人机交互 / 视觉设计 / 认知心理学)适当展示;⑦ 无需照片 / 性别 / 婚姻等无关字段。',
};

// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) engineering skills
// (code-review / system-design / testing-strategy / debug),按校招+中文场景修改;
// 英文框架概念(testing pyramid/trade-off/edge case/root-cause/race condition 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const frontendCampusAnthropic: ProfessionPreset = {
  id: 'frontend-campus-anthropic',
  profession: '前端/客户端',
  stage: 'campus',
  tier: 'pressure',
  displayName: '前端 / 客户端 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'js_ts_language_depth',
      name: 'JS/TS 语言深度与类型工程',
      weight: 24,
      whatGoodLooksLike:
        '头部大厂卡分标准:能从规范层面讲清 Event Loop(微任务/宏任务/渲染时机)、原型链/闭包/this 各 case、内存泄漏成因与排查;TypeScript 能写复杂类型体操(泛型约束/条件类型/infer/映射类型),并理解类型即文档、用类型在编译期消灭一类边界 Bug;手写 Promise.all/调度器/深拷贝(含循环引用)信手拈来。',
      campusEvidence:
        'GitHub 有 TS 类型工具库或 type-challenges 高完成度记录;有讲清运行时机制的技术博客;面试能边写边解释而非背答案。',
      commonGaps:
        '【Anthropic 反模式·忽略边界 case(edge-case-blind)】只验证常规输入,空值/循环引用/竞态/超大数据全不考虑,代码一遇真实场景就崩;【语法调用员】会用 API 但讲不清事件循环与执行顺序,是 API 用户而非语言理解者。',
    },
    {
      key: 'framework_internals_tradeoff',
      name: '框架原理与选型取舍',
      weight: 22,
      whatGoodLooksLike:
        '头部大厂卡分标准:Vue3 能讲响应式原理(Proxy/依赖收集/调度器 nextTick)、React 能讲 Fiber/并发渲染/调和与 re-render 触发与规避;不局限单框架,能从设计哲学对比两者并讲清"什么场景选哪个、代价是什么";理解状态管理选型(Redux/Zustand/Pinia)的 trade-off。',
      campusEvidence:
        '有分析框架源码的技术博客;面试能结合业务讲"为何选 Vue/React、否掉了什么";参与过社区 issue/讨论或给框架/库提过 PR。',
      commonGaps:
        '【Anthropic 反模式·选型无取舍(no-tradeoff-analysis)】"用了 React/Redux"答不出为什么是它、代价是什么,每个技术选择都有代价却看不出权衡;【框架搬砖工】组件写多年却不知 re-render 触发机制,会用组件库、不懂框架设计。',
    },
    {
      key: 'engineering_quality_review',
      name: '工程化与代码质量',
      weight: 20,
      whatGoodLooksLike:
        '头部大厂卡分标准:能从零配置 Webpack/Vite(Loader/Plugin 机制)、讲清 Tree Shaking/Code Splitting/Module Federation;代码经得起 review——组件单一职责、无重复、关键逻辑有测试;懂工程化解决的真问题(构建提速/包体积/微前端拆分)并有 before/after 数据;有完整 CI/CD 与质量门禁实践。',
      campusEvidence:
        '项目有完整 CI/CD(GitHub Actions)、Lighthouse before/after;独立搭过 monorepo 或微前端;有被合并的开源 PR 或组件库贡献。',
      commonGaps:
        '【Anthropic 反模式·重复堆砌不抽象(duplication-over-abstraction)】同样逻辑到处复制粘贴、组件臃肿不可维护,review 一眼挂;【脚手架依赖症】只会 npm run build、离开 CLI 不会配项目,讲不出构建链路。',
    },
    {
      key: 'perf_testing_strategy',
      name: '性能优化与测试策略',
      weight: 20,
      whatGoodLooksLike:
        '头部大厂卡分标准:能解释关键渲染路径并系统性优化首屏,列出 3+ 手段并量化(LCP/FID/INP/CLS 等 Core Web Vitals),懂 prefetch/preload 优先级、长任务拆分、虚拟列表;测试上理解测试金字塔——组件测试/交互测试/视觉回归/可访问性各覆盖什么,优先覆盖业务关键路径与边界而非堆无效用例。',
      campusEvidence:
        '简历有"首屏 LCP 从 4.2s 到 1.8s,方法:图片懒加载+关键 CSS 内联+字体子集化"这类带方法+数字的句子;有单测/E2E(Jest/Vitest/Playwright)覆盖率与用例设计;大厂前端性能或质量专项实习。',
      commonGaps:
        '【Anthropic 反模式·口号式优化(claim-without-measurement)】说"做了性能优化"却无任何 before/after 数字,无法验证;【无测试只手点(no-test-strategy)】零自动化测试、改一处崩一片,讲不出该测什么、用什么类型测。',
    },
    {
      key: 'project_practice_landing',
      name: '项目工程实践与上线作品',
      weight: 14,
      whatGoodLooksLike:
        '头部大厂卡分标准:个人项目已上线(有 URL)且有真实日活/UV;大厂前端实习参与过 C 端核心页面并有业务数据;客户端方向(iOS/Android/跨端)有 App Store / 内测包链接与崩溃率/性能数据;遇到线上问题有复现→隔离→根因→修复的排查记录。',
      campusEvidence:
        'GitHub 项目完整(README/部署链接/技术亮点文档);实习公司+负责模块+业务数据三件套;线上 Bug 排查的根因定位记录。',
      commonGaps:
        '【Anthropic 反模式·教程复现冒充经验(tutorial-as-experience)】项目全是 TodoList/天气 App 级复杂度,等于自证只会跟教程敲;【症状级修复】线上问题靠刷新/重发糊弄,无根因定位能力。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(语言原理与类型工程、框架源码理解与选型取舍、工程化与代码质量、性能量化指标与测试策略、上线作品链接与根因排查),写进 evidenceFound/gap;② 说明在校招前端压力档语境下为何重要(大厂只信可上线/可验证作品与"为何这样选"的权衡);③ 命中反模式直接点名(如"口号式优化""选型无取舍""忽略边界 case""框架搬砖工""教程复现冒充经验"),不得空泛。严禁泄漏满分占比或扣分数值等内部计算。分数必须与 why 一致。',
  rewriteGuidance:
    '前端(压力版)改写铁律——只精修简历"已有"的项目/实习句:讲精准(用了什么框架/工程化手段、解决什么性能或体验问题、量化指标如何、取舍是什么),用前端精准动词(优化/重构/封装/配置/覆盖)与可量化指标(LCP/INP/CLS/包体积/首屏时间/测试覆盖率)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的性能数字、技术名词或测试实践,没写上线就不能编 URL,没写测试就不能编覆盖率;凡简历没有的能力一律走"建议补充(gap_advice)"而非编造。',
  resumeConventions:
    '中国校招前端惯例核查(压力档从严):① 个人项目必须有线上地址(Vercel/GitHub Pages),未上线项目压力档可信度大幅打折;② 技术栈列框架版本(Vue 3.x/React 18)体现时效,"精通"需源码级证据;③ 客户端岗 App Store 链接或 release > 截图 > 无;④ 性能/测试声明必须带 before/after 数字或覆盖率,纯口号不计分;⑤ 竞赛权重低于后端,但 Hackathon 作品有 GitHub+演示视频加分显著;⑥ 不写个人评价/爱好等软性段落,技术密度优先。',
};

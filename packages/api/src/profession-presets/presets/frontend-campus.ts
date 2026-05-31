// 融合版(standard,主力):Web 前端与客户端校招。核心=语言深度+框架原理+工程化+性能优化;
// 招聘方只信可上线/可验证的作品。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const frontendCampus: ProfessionPreset = {
  id: 'frontend-campus',
  profession: '前端/客户端',
  stage: 'campus',
  tier: 'standard',
  displayName: '前端 / 客户端 · 校招(融合版)',
  dimensions: [
    { key: 'js_ts_depth', name: 'JavaScript/TypeScript 语言深度', weight: 25,
      whatGoodLooksLike: '能讲清 Event Loop/微任务宏任务执行顺序;原型链/闭包/this 绑定的各种 case;TypeScript 泛型/条件类型/infer 能写复杂类型体操。',
      campusEvidence: '面试能手写 Promise.all/防抖节流/深拷贝;GitHub 有 TS 类型工具库或 type-challenges 记录。',
      commonGaps: '会用 Array.map 但解释不了事件循环【反模式·语法调用员:API 用户、非语言理解者】。' },
    { key: 'framework_internals', name: '框架原理与生态', weight: 20,
      whatGoodLooksLike: 'Vue3 能讲响应式原理(Proxy/依赖收集/调度)、React 能讲 Fiber/并发模式动机;不局限于一个框架,能比较两者设计哲学差异。',
      campusEvidence: '有分析框架源码的技术博客;面试能结合业务场景解释为何选 Vue/React;参与过社区讨论或 issue。',
      commonGaps: '组件写了三年,不知道 React re-render 触发机制【反模式·框架搬砖工:会用组件库、不懂框架设计】。' },
    { key: 'engineering_build', name: '工程化与构建工具', weight: 20,
      whatGoodLooksLike: '能从零配置 Webpack/Vite(含 Loader/Plugin 机制);理解 Tree Shaking/Code Splitting/Module Federation;有项目从 CRA 迁 Vite 的性能对比经验。',
      campusEvidence: '项目有完整 CI/CD(GitHub Actions);Lighthouse 跑分有 before/after 对比;独立搭建过 monorepo。',
      commonGaps: '只会 npm run build,不知道 Webpack 配置在哪【反模式·脚手架依赖症:离开 CLI 工具不会配项目】。' },
    { key: 'perf_browser', name: '性能优化与浏览器原理', weight: 20,
      whatGoodLooksLike: '能解释关键渲染路径并优化首屏;理解 prefetch/preload 优先级区别;列出 3 个以上优化手段并量化效果(LCP/FID/CLS 等 Core Web Vitals)。',
      campusEvidence: '简历“将首屏 LCP 从 4.2s 优化到 1.8s,方法:图片懒加载+关键 CSS 内联+字体子集化”;或大厂前端性能专项实习。',
      commonGaps: '说“做了性能优化”但没有任何 before/after 数字【反模式·口号优化师:讲不出量化数据】。' },
    { key: 'project_practice', name: '项目工程实践(客户端/Web)', weight: 15,
      whatGoodLooksLike: '个人项目已上线(有 URL)且有日活/UV 记录;大厂前端实习参与过 C 端核心页面;客户端方向(iOS/Android)有 App Store 或内测包链接。',
      campusEvidence: 'GitHub 项目完整度:README/部署链接/技术亮点文档;实习公司+负责模块+业务数据三件套。',
      commonGaps: '所有项目都是 TodoList/天气 App 级复杂度【反模式·ToDoList履历:教程复现项目当经验】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(语言原理掌握、框架源码理解、构建配置、性能量化指标、上线作品链接),写进 evidenceFound/gap;② 说明在校招前端语境下为何重要;③ 命中反模式直接点名(如“切图仔/语法调用员”“框架搬砖工”“脚手架依赖症”“口号优化师”“ToDoList履历”),不得空泛。分数必须与 why 一致。',
  rewriteGuidance: '改写只能基于简历已有内容重组/量化/补技术证据链(把“写了个页面”改写为带性能指标/工程化/原理的表述)。严禁虚构项目、数字或经历;缺数字用 [具体数字] 占位并在 reason 说明“建议补充真实数据”;简历无某经历(如上线项目)输出“建议补充 X”而非编造;original 必须是简历原文一字不差。',
  resumeConventions: '中国校招前端惯例核查:① 个人项目必须有线上地址(Vercel/GitHub Pages),未上线项目可信度打折;② 技术栈列出框架版本(Vue 3.x/React 18)体现时效;③ 客户端岗 App Store 链接或 release > 截图 > 无;④ 竞赛权重低于后端,但 Hackathon 作品有 GitHub+演示视频加分显著,可附技术博客;⑤ 不写个人评价/爱好等软性段落,技术密度优先。',
};

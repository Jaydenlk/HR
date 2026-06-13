# Handoff: 第1批·线3 — 行业趋势接博查联网搜索

## 状态: READY_FOR_IMPL
## 工作目录: E:\Agent program\HRBP-wt\industry-trend(分支 feature/industry-trend,基于 dev @b24521d)
## 禁止触碰: mock 模块的 company-search.service.ts(已上线代码,不要改它/不要抽它)、career/**、conversations/**、其他 worktree

## 真问题(侦察+用户实证坐实)
前端有行业输入框、后端 DTO industry 必填、链路全通——但用户填了"长三角+大模型"点分析,得到的是 AI 降级输出:"无实时数据来源…已按规则降级为 insufficient 置信度"。**根因:行业趋势没接联网,对任何行业都只能诚实地给不出。** 解药:接博查搜索(BOCHA_API_KEY 已在 packages/api/.env,生产 .env.production 也已配)。

## 规格
1. **博查调用封装**:在 industry-trend 模块内新建轻量博查搜索调用(POST https://api.bochaai.com/v1/web-search,Bearer BOCHA_API_KEY,{query,summary:true,count:5~8},8s 超时)。**不要改、不要复用 mock 的 company-search.service.ts**(那是已上线功能,避免回归);本模块自己封一个独立的即可(KISS,后续第三处要用再谈抽共享)。env.validation 里 BOCHA_API_KEY 已有(D2 加过),确认即可。
2. **接入 analyze 流程**:IndustryTrendService.analyze(dto) 里,用 industry + region + timeframe 拼搜索 query(如 "{行业} {地区} 校招 招聘趋势 政策 融资 {timeframe}"),先博查搜真实信息 → 把搜到的标题/摘要/URL 作为"实时数据"喂进生成 prompt → AI 基于真实信息生成趋势,**来源 URL 必须真实透传**到结果里。
3. **诚实降级**:博查搜不到/超时/无 key → 明确告诉用户"未获取到实时数据,以下为基于通用认知的判断,可能过时"(保留现有 insufficient 机制,但不再是"什么都给不出",而是降级+声明)。严禁编造 URL 或假装搜到。
4. **前端**:industry-trend/page.tsx 展示结果时增加"信息来源"区(列出博查返回的真实链接+标题)。
5. **配额**:博查搜索不额外扣 credit(AI 生成那次按现有扣点,博查是成本不是用户 AI 调用)。

## step→verify
1. pnpm install + 复制主仓 packages/api/.env(永不提交) → verify: 双端 build 基线绿
2. 博查封装 → verify: jest(mock fetch)成功/超时/无key 三路径;真调博查一次("大模型 长三角 校招趋势")贴原始返回(含真实 URL)
3. 接入 analyze + prompt 改造 → verify: jest 断言搜索结果进了 prompt、来源 URL 进了响应;搜不到走降级声明
4. 前端来源展示 → verify: 本地起服截图(填行业→分析→出结果+来源链接)
5. AI 真跑 1 次(花真钱,economy):填真实行业走完整流程,贴输出确认有真实来源、无编造 URL
6. 门禁 → verify: api tsc 0 错+jest;web eslint+tsc 0 错+build;贴输出
7. commit feature/industry-trend(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
key 与搜索原始返回不入提交;来源 URL 真实透传不编造;不碰 mock 已上线代码;完成写回本文件

# 面试复盘录音转写 — P0 实施规格(StepFun ASR)

> 编制者:理解→设计编队(只读测绘 + 设计,未触碰任何产品代码)
> 仓库根:`E:/Agent program/HRBP`;建造 worktree:`E:/coach-wt-speech`(分支 feat/speech)
> 交叉印证来源:6 路只读测绘 + `docs/feasibility-stepfun-multillm-2026-06-15.md`(+ -fabledev)
> 锁定决策见记忆 [[project-stepfun-multillm-2026-06-15]],本规格不推翻,只落地。
> **实测补注(主代理 2026-06-15):StepFun SSE 端点已实跑通 = `POST https://api.stepfun.com/v1/audio/asr/sse`,body 见本仓 `C:/Users/Jayden park/AppData/Local/Temp/asr-probe/probe.py` 的 `asr()`(model `stepaudio-2.5-asr`,`enable_itn`+`enable_timestamp`,base64 内联,SSE 回 `transcript.text.delta`/`.done`)。builder 直接照此可用请求实现,Q1 已解。清晰中文转写近乎完美,唯一可见错误=同音技术黑话(全栈→全站、技术栈→技术站)→ 用 SSE `hotwords` 传入岗位/技术热词修掉。**

---

## 0. 一句话楔子

电脑上传面试录音 → StepFun ASR 转写出带时间戳的句子 → LLM 给每句打"面试官/用户"标 → 用户在复盘页确认/纠正 → 喂现有 `DebriefService.analyze()` 出评分 → 转写完即删原始音频,只留文本。**全程音频不出后端→StepFun 的加密信道,不落公网 URL。**

---

## 1. 范围分层与边界(做减法)

### P0(本规格唯一交付目标 = 最小可上线楔子)

**做:**
- 电脑端直传音频(multipart,后端内存接收,≤上限见 §11 Q6)。
- StepFun **SSE base64 内联**转写(`stepaudio-2.5-asr`,`enable_timestamp:true`,`enable_itn:true`,`hotwords` 传岗位/技术热词),出句级毫秒时间戳。
- LLM 走 `completeStructured` 给每句打 `interviewer | candidate` 两类标(语义判,不靠 ASR diarization)。
- 复盘详情页展示带角色标的转写,用户可逐句点击切换角色 + 一键批量反转 + 确认。
- 用户确认后调现有 `POST /interviews/:id/analyze` 出评分(签名零改动)。
- 异步状态机(任务表),前端 3s 轮询进度。
- 隐私:上传需勾选同意条款;转写成功或失败后立即丢弃音频字节(内存模式天然消亡);`audio_url` 全程保持 null。
- 失败不计费(复用现有 `AiUsageInterceptor` + `CreditInterceptor` 失败路径不写的特性)。
- 重跑不重转写(任务表存 `segments_json`,已转写则从 labeling 续跑)。

**不做(P0 明确排除):**
- 手机扫码上传(→ P1)。
- TTS / 语音模拟面试(→ P1)。
- 文件识别 URL 路线(`step-asr-1.1` + 公网 URL)——隐私不达标,见 §2。
- 群面多候选人区分(→ P2)。
- 按时长/字符精确折算 credit(P0 沿用"1 端点 1 次 = 1 credit"粗折算)。
- 说话人确认 UI 的高级精修(拖拽合并段落、批注等,→ P1)。
- WebSocket / 专用 SSE 推送端点(P0 用轮询)。

### P1(下一批,本规格不实现,仅留接口余量)

- 手机扫码上传:scoped 一次性上传令牌(`purpose:audio_upload` + `interview_id` + `jti` 一次性消费 + 60s TTL)、`/upload/[token]` 移动豁免路由、电脑端二维码 + 轮询收件。
- TTS 语音模拟面试:`mode:'voice'` 分支激活,`SpeechProvider.synthesize()`,按需合成端点。
- ASR 收答:模拟面试 `submitAnswer` 前置转写。
- 说话人确认 UI 精修。

### P2(更后)

- 讯飞 LFASR 实现(`diarization:true`,`speaker_number` 盲分)→ 群面多候选人区分。
- 按时长/字符精确计费折算。

---

## 2. SpeechProvider 接口 + StepFun 实现要点

### 路线决策:**SSE base64 内联(`stepaudio-2.5-asr`),不用文件识别 URL**

**理由(结合 files 测绘的隐私/存储结论):**

| 维度 | 文件识别 URL(`step-asr-1.1`) | SSE base64(`stepaudio-2.5-asr`)✅ |
|---|---|---|
| 隐私 | StepFun 要公网可下载 URL;当前部署 **裸 HTTP 无 HTTPS 域名**,需开 Caddy 静态路由暴露音频,链路不加密,URL 泄露=录音泄露 | 音频字节始终在 后端↔StepFun 的 HTTPS 加密信道,**不落任何公网 URL** |
| 存储 | 需 OSS 或 Caddy 静态目录 + 一次性短链逻辑(全部待造) | 无需 OSS、无需改 Caddy、无需短链 |
| 删音频铁律 | 需先落盘暴露再删,窗口期有泄露面 | memoryStorage buffer 随请求生命周期消亡,天然契合 |
| 体积 | 原始大小 | base64 ≈ 4/3 倍(需确认单请求体上限,见 Q6) |
| 时间戳 | `show_utterances` 句/词级 | `enable_timestamp:true` 句级毫秒(实测可用) |
| 部署前提 | **当前不满足(无 HTTPS 域名)** | 当前即可用(实测已通) |

**结论:P0 选 SSE base64。** 文件识别 URL 路线等备案 + HTTPS 域名落地后再作为大文件/批量场景的补充,P1/P2 评估。

### SpeechProvider 抽象(`packages/api/src/speech/providers/speech.provider.ts`)

```ts
export interface SpeechCapabilities {
  diarization: boolean;   // 是否原生区分说话人(StepFun=false,讯飞=true)
  channelSplit: boolean;  // 是否支持双声道分轨
  realtime: boolean;      // 是否支持实时流
}

export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;       // ASR 原生说话人(StepFun 不产出,留空给 LLM 打标)
}

export interface SpeechProvider {
  readonly capabilities: SpeechCapabilities;
  transcribeFile(audio: Buffer, mimeType: string): Promise<TranscriptSegment[]>;
}
```

### StepFun 实现要点(`packages/api/src/speech/providers/stepfun.provider.ts`)

- `capabilities = { diarization: false, channelSplit: false, realtime: true }`。
- `transcribeFile(buffer, mimeType)`:
  1. `base64 = buffer.toString('base64')`(SSE 内联,音频不出后端)。
  2. POST `${baseURL}/audio/asr/sse`(实测确认路径),`Accept: text/event-stream`,`Authorization: Bearer ${STEP_API_KEY}`,body 形如 `{audio:{data:<b64>, input:{transcription:{language:'zh', model:'stepaudio-2.5-asr', enable_itn:true, enable_timestamp:true, hotwords:[...]}, format:{type:<mp3|wav|...由 mimeType 推>}}}}`(**照 probe.py 已验证请求实现**)。
  3. 消费 SSE 流(`transcript.text.delta` 增量带 `start_time`/`end_time`,`transcript.text.done` 全文),聚合句级 utterances → `TranscriptSegment[]`(`speaker` 留空)。
  4. 调用包裹在注入的 `ConcurrencyLimiter.run()` 里(StepFun V0 并发 5;复用 AiModule 已 export 的 limiter 实例)。
  5. 防编造红线:SSE 中途断流 / 空 utterances / `error` 事件 / 非 2xx → throw 显式错误,绝不返回空数组当"成功"。超时按 `STEP_TIMEOUT_MS` 控制。
- **不持有 fs**:P0 走纯内存 buffer,转写完 buffer 即出作用域。

### SpeechService 门面(`packages/api/src/speech/speech.service.ts`)

- 构造注入:`SpeechProvider`(P0 = StepFunProvider)、`ConfigService`(读 `speech` config)、`ConcurrencyLimiter`(来自 AiModule)。
- 暴露 `transcribeFile(audio, mimeType): Promise<TranscriptSegment[]>` 门面;P1 再加 `synthesize()`。
- **不塞进 AiModule**(AiService 是 Anthropic SDK 封装,SpeechService 与之平级独立)。

---

## 3. 任务状态实体 + 手写 migration 草案(纯加法,不动存量)

**采用独立任务表**(不在 `Interview` 上堆状态字段):支持失败重跑不重转写需存 `segments_json`;状态轮询需独立实体;保持 `Interview` 业务态干净。

### 实体 `packages/api/src/speech/entities/transcribe-task.entity.ts`

```ts
export type TranscribeStatus =
  | 'submitted'        // 任务建,音频已收,待提交 StepFun
  | 'transcribing'     // SSE 转写中
  | 'labeling'         // 拿到 utterances,LLM 打标中
  | 'awaiting_confirm' // 标注完成,等用户确认/纠正
  | 'analyzing'        // 确认后喂 DebriefService.analyze 中
  | 'completed'        // analyze 结果写回 Interview,音频已弃
  | 'failed';          // 任一阶段异常

@Entity('interview_transcribe_tasks')
export class InterviewTranscribeTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') interview_id: string;
  @Column('uuid') user_id: string;
  @Column({ type: 'varchar', default: 'submitted' }) status: TranscribeStatus;
  @Column({ type: 'varchar', nullable: true }) failed_at_stage: string | null;
  @Column({ type: 'varchar', nullable: true }) asr_job_id: string | null;     // SSE 路线可空;留给 P1 文件识别路线
  @Column({ type: 'simple-json', nullable: true }) segments_json: LabeledSegment[] | null;
  @Column({ type: 'text', nullable: true }) error_message: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

> `awaiting_confirm` 态:标注完不能直接 analyze,必须停在此等用户确认/纠正(锁定决策)。

### 手写 migration `packages/api/src/database/migrations/<ts>-AddInterviewTranscribeTask.ts`

> **只新建表,不 ALTER 任何存量表**。builder 实现前 Read `1781186894991-InitialSchema.ts` 对齐 `uuid_generate_v4()` 扩展/FK/索引命名风格;**不可用 `migration:generate` 伪 diff**(CLAUDE.md 铁律)。

```sql
-- up
CREATE TABLE "interview_transcribe_tasks" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "interview_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" character varying NOT NULL DEFAULT 'submitted',
  "failed_at_stage" character varying,
  "asr_job_id" character varying,
  "segments_json" text,
  "error_message" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_interview_transcribe_tasks" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_transcribe_tasks_interview" ON "interview_transcribe_tasks" ("interview_id");
CREATE INDEX "IDX_transcribe_tasks_user" ON "interview_transcribe_tasks" ("user_id");

-- down
DROP INDEX "IDX_transcribe_tasks_user";
DROP INDEX "IDX_transcribe_tasks_interview";
DROP TABLE "interview_transcribe_tasks";
```

---

## 4. 端点清单(挂 `InterviewsController`,类级已有 `JwtAuthGuard`)

| Method + Path | 用途 | DTO / 入参 | Guard / Interceptor |
|---|---|---|---|
| `POST /interviews/:id/transcribe` | 上传音频→建任务→异步转写+打标 | `multipart/form-data` 字段 `file`(audio) + `consent:'true'` | `JwtAuthGuard` + `CreditGuard` + `FileInterceptor('file',{limits,fileFilter:audio/*})` + `AiUsageInterceptor` + `CreditInterceptor` |
| `GET /interviews/:id/transcribe/status` | 轮询任务状态 + 标注结果 | param `id` | `JwtAuthGuard` 仅(只读,不计费) |
| `PATCH /interviews/:id/transcribe/:taskId/confirm` | 提交纠正后的角色标注,触发 analyze | `ConfirmLabelsDto { segments: { idx:number; speaker:'interviewer'|'candidate' }[] }` | `JwtAuthGuard` + `CreditGuard` + `AiUsageInterceptor` + `CreditInterceptor` |

**鉴权边界:** `:id` interview 必须属于当前 `req.user.id`,service 层校验所有权,非本人 → 404(不泄露存在性)。
**DTO:** `speech/dto/transcribe-interview.dto.ts`(`consent` `@IsIn(['true'])`)、`speech/dto/confirm-labels.dto.ts`(嵌套数组 + `@IsIn(['interviewer','candidate'])`)。
**计费(P0 默认,见 Q2):** transcribe 扣 1 + confirm 扣 1;失败路径不扣(现有特性)。

---

## 5. LLM "面试官/用户"打标(走 completeStructured)

- schema:`{ segments: { idx:number; speaker:'interviewer'|'candidate' }[] }`,`enum` 由 `validateAgainstSchema` 运行期严格校验,漂移值触发重试/降级、绝不进库。
- prompt 要点:面试官=提问/追问/介绍岗位/给反馈;候选人(标 `candidate`,前端展示"用户")=回答/自我介绍/反问;多面试官全标 `interviewer`;群面 P0 统一 `candidate` 不细分;只判 speaker、不改写 text、不造段不漏段。
- `tier:'flash'`(解析类省成本);长面试 utterances 多时按段数动态抬 maxTokens 或分批(见 Q5)。
- 输入只传 `{idx,text}[]`(不回传全文省 token),输出按 idx 回引。

### 用户确认数据流

```
transcribe 成功 → transcribeFile() 出 segments → 打标 → LabeledSegment[]{text,startMs,endMs,speaker}
  → 写 task.segments_json,status='awaiting_confirm'(停,不自动 analyze)
前端轮询拿 segments_json 渲染可纠正列表 → 用户切换/批量反转/确认
  → PATCH confirm 带 {idx,speaker}[] → service 按 idx 覆盖 speaker(只改 speaker 不改 text,防篡改)
  → status='analyzing' → 组装 "[面试官]..\n[用户].." → DebriefService.analyze(签名零改动)
  → Object.assign(interview,result); interview.transcript=组装文本; save() → status='completed'
```

- 不造假态:未 completed 前 `Interview.scores` 保持 null。
- 防篡改:confirm 只接受 speaker,text 以服务端为准;idx 越界/缺/多 → 400。

---

## 6. 隐私实现

- **同意**:前端上传 modal 强制勾选《录音上传与隐私条款》才可传 → FormData 带 `consent:'true'` → 后端 `@IsIn(['true'])` 强制,缺失/非 true → 400 不进流程。
- **删音频**:P0 纯内存 buffer,转写终态(成功/失败/超时/503)后 buffer 出作用域 GC,无盘文件=无需显式删;`try/finally` 确保引用释放。`interview.audio_url` 全程 null。

---

## 7. env / config 清单(放 `.env.production` 不入库 + `.env.example` 空占位)

| 变量 | 含义 | 默认/示例 |
|---|---|---|
| `STEP_API_KEY` | StepFun Bearer key | (.env.production,空占位入 .env.example) |
| `STEP_BASE_URL` | base URL | `https://api.stepfun.com/v1` |
| `STEP_ASR_MODEL` | ASR 模型 | `stepaudio-2.5-asr` |
| `STEP_TIMEOUT_MS` | 单次 ASR 超时 | `120000` |
| `STEP_MAX_RETRIES` | 失败重试 | `1` |
| `AUDIO_MAX_SIZE_MB` | 上传上限 | 见 Q6 |

落点:新建 `config/speech.config.ts`(`registerAs('speech',...)`,复用 ai.config 的 parse helper)→ `env.validation.ts` 追加声明 → `app.module.ts` `ConfigModule.forRoot({load:[...,speechConfig]})`。真实 key 由主代理写 .env.production,永不入库。

---

## 8. 前端组件清单(Next.js 16 inline style + CSS 变量,复用 `.lg`/`.modal-overlay`)

| 文件 | 操作 | 复用 |
|---|---|---|
| `components/interview/audio-uploader.tsx` | 新建 | 拖拽 modal + 同意复选框,`api.upload('/interviews/:id/transcribe',file,{consent:'true'})`;复用 `resume-uploader.tsx` drop zone/modal |
| `components/interview/transcript-progress.tsx` | 新建 | 步骤条 + 3s 轮询 status;复用 `opportunities/[id]/page.tsx` pollRef |
| `components/interview/speaker-label-section.tsx` | 新建 | utterance 列表,role tag 可点切换 + 批量反转 + 时间戳 + "确认并生成分析";`.lg` 卡片 |
| `app/(main)/debrief/[id]/debrief-detail.tsx` | 改 | `!hasAnalysis` 块加上传入口;插入 SpeakerLabelSection;接轮询 |
| `components/interview/interview-form.tsx` | 改 | transcript textarea 上方加 text/audio tab |
| `lib/types.ts` | 改 | `Interview` 加 `transcript_status?`;新增 `TranscribeStatus`/`LabeledSegment` |

`api.upload`(已支持 multipart+Auth+401/402)无需改;轮询用 setTimeout 递归 + cleanup,不用 SSE。

---

## 9. step→verify 验收(Jest e2e 真跑 + Playwright 桌面;编译≠测试)

1. SpeechProvider+StepFun → 真音频 buffer 出非空 segments(startMs<endMs、text 非空);断流/非2xx throw。
2. speech.config+env → 缺 STEP_API_KEY 显式报错不静默;BASE_URL 缺省回落。
3. migration 建表 → run 后表+2索引在;revert 干净;存量零 ALTER。
4. 实体 CRUD → status 默认 submitted;segments_json round-trip 一致。
5. POST transcribe → 无JWT 401 / 缺consent 400不建任务 / 余额0 402 / 正常 202+taskId / 非本人 404。
6. 转写→打标→awaiting_confirm → 真音频走完,status=awaiting_confirm,每段 speaker∈枚举,scores 仍 null;漂移触发重试不入库。
7. confirm→analyze→completed → speaker 按 idx 更新 text 不变;scores 非空、transcript 带角色前缀;越界 idx 400。
8. 失败不计费 → mock 故障 503,ai_usage 无新记录、credit 不变。
9. 重跑不重转写 → segments_json 非空重触发,不再调 StepFun(spy=0)。
10. 隐私删音频 → 终态后无音频残留;audio_url===null。
11. 前端 Playwright 桌面 → 上传(未勾同意 disabled)→ 步骤条 → 标注列表 → 切换/批量反转 → 确认 → completed → scores 出现。
12. 质量门 → `npx eslint src/`(web)0 error;前后端 build 双绿。

---

## 10. 建造文件分区(并行/串行编队;默认 Sonnet,重点 Opus,禁 Fable)

```
并行波次1(文件集不相交):
  B1 SpeechProvider+StepFun (Opus)  speech/providers/*  speech/speech.service.ts  config/speech.config.ts
  B2 LLM打标+DTO (Opus)             speech/label.service.ts  speech/dto/*
  B3 实体+migration (Sonnet)        speech/entities/*  database/migrations/<ts>-*.ts
  B4 前端组件(纯新建) (Sonnet)      components/interview/{audio-uploader,transcript-progress,speaker-label-section}.tsx
        │
        ▼
串行集成 S1(收口所有共享/注册文件):
  speech/speech.module.ts · app.module.ts · env.validation.ts ·
  interviews/{interviews.module,interviews.controller,interviews.service}.ts ·
  web/{debrief-detail.tsx, interview-form.tsx, lib/types.ts} · .env.example
        │
        ▼
验收波次2:
  T1 后端 Jest e2e(步骤1-10,真音频/真AI留痕) · T2 Playwright 桌面(步骤11) ·
  R1 reviewer 独立审计(找茬:防编造/删音频/不造假态) · PJR 质量门(步骤12)
```

各 builder 文件集两两不相交;所有跨模块连线(module/controller/service/app.module/migration 登记/types.ts)归 S1 串行收口。B1 实现照主代理已验证的 probe.py SSE 请求;B3 实现前 Read InitialSchema + data-source(确认 migrations 用 glob 还是显式数组,显式则登记动作归 S1)。

---

## 11. 开放问题(主代理/用户拍板)

- **Q1 StepFun SSE 端点/请求体** — ✅ 已由主代理实测解决(probe.py 跑通 `/v1/audio/asr/sse`)。builder 照抄即可,仍建议实现时再对一眼官方文档。
- **Q2 计费粒度** — transcribe(1)+confirm(1)=2 credit/次,还是仅 confirm 扣 1?**需用户拍板**(试运行送 50 点,影响消耗速度)。
- **Q3 confirm 是否必经** — 建议允许"不改一键确认"直通(仍走 confirm 端点保留人审入口+计费节点)。
- **Q4 写盘兜底 vs 纯内存** — 建议 P0 纯内存(隐私最佳);ASR 成功前失败需重新上传(可接受)。
- **Q5 长面试 maxTokens** — 建议 P0 单批+动态 maxTokens,P1 再做分批。
- **Q6 音频体积上限** — base64≈4/3 倍 + V0 并发5;建议 P0 保守设 `AUDIO_MAX_SIZE_MB=25`(约 25–50min mp3),后续实测放宽。

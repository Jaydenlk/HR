// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) engineering skills,
// 按校招+中文场景修改;英文框架概念(system-design 的 trade-off analysis / requirements gathering、debug 的 root-cause-not-symptoms、code-review 的 edge-case/concurrency 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const multimediaDevCampusAnthropic: ProfessionPreset = {
  id: 'multimedia-dev-campus-anthropic',
  profession: '音视频/多媒体开发',
  stage: 'campus',
  tier: 'pressure',
  displayName: '音视频/多媒体开发 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'codec_protocol_first_principles',
      name: '编解码与协议第一性原理(原理推演×场景权衡)',
      weight: 22,
      whatGoodLooksLike:
        '头部音视频团队(字节多媒体实验室、腾讯音视频、声网、快手)卡的是「从第一性原理推演」而非记忆量:能从率失真优化(RDO)角度解释 H.264/H.265 的帧内/帧间预测与 CTU 分块为什么省码率,能算清「GOP=N 时单帧丢失影响多少帧、首帧解码延迟多大」;能就「直播低延迟选 RTMP 还是 WebRTC、点播选 HLS 还是 DASH」明确列出各自在延迟/兼容/CDN 成本/抗弱网维度的取舍(system-design 框架要求:任何选型都把 trade-off 显式摊开,不能只说结论);音频侧讲得清 Opus 在 RTC 低码率下为何优于 AAC。AV1/SVC/感知编码(VMAF 驱动)等前沿有自己的判断而非复述新闻。',
      campusEvidence:
        '在项目里能就一处真实选型写出「为什么这样、放弃了什么、代价是什么」(如「实时互动场景放弃 RTMP 选 WebRTC,牺牲 CDN 分发成本换取数百毫秒延迟」);能给出由原理推出的可量化结论(GOP 长度↔首帧延迟、CRF 档位↔VMAF 分数);技能栏的每个编解码标准/协议都能在正文找到一次「推演式」应用而非名词罗列。',
      commonGaps:
        '【Anthropic 反模式·trade-off-blindness】只给「我们用了 H.265/WebRTC」的结论,说不清放弃了什么、代价在哪,把选型当默认值而非权衡(system-design 要求 trade-off 必须显式);【Anthropic 反模式·symptom-not-root-cause】对「为什么直播 GOP 要短」只会答「因为延迟低」却推不到「I 帧间隔决定首帧/seek 解码成本」这一根因(debug 框架:定位 root cause 而非症状);【反模式·八股复读机】帧类型、协议名词背得滚瓜烂熟却串不成一条端到端链路,追问一层原理立即穿帮——压力档对此直接判不及格。',
    },
    {
      key: 'av_project_systems_depth',
      name: '音视频项目系统级深度(自研链路×架构权衡×硬指标)',
      weight: 30,
      whatGoodLooksLike:
        '头部门槛要求项目「自己造过链路的一环」而非跑通 demo:典型硬通货是自研播放器内核(讲得清音视频同步、PTS/DTS 时钟对齐、解码-渲染-送显流水线与多线程模型)、低延迟直播/RTC 链路、转码集群管线、FFmpeg 源码级二次开发(改解码器/封装器/滤镜)。要能用 system-design 的方式说清架构:模块边界、数据流、缓冲与背压设计,并对关键决策做 trade-off 分析(软解 vs 硬解、拉流缓冲深度 vs 延迟)。硬指标必须成体系:首屏秒开、卡顿率、端到端延迟、CPU/内存/功耗、VMAF/PSNR,且有压测或线上数据支撑,而非孤立一个数字。',
      campusEvidence:
        '项目用「背景与约束(延迟/画质/功耗目标)→ 我负责的链路环节 → 关键架构决策与取舍 → 量化结果(首屏/卡顿率/延迟/VMAF)」结构写;明确标注自己手写了哪一层(解码/渲染/同步/网络),给出压测数字与前后对比;代码挂 GitHub,有 README、commit 历史、对自研模块的设计说明。',
      commonGaps:
        '【Anthropic 反模式·trade-off-blindness】项目只列「实现了播放器」却说不清架构为何这样设计、缓冲深度和延迟如何权衡(architecture/system-design 要求显式 trade-off 与 consequences);【反模式·命令行搬运工】把敲几条 ffmpeg -i 转码命令、跑通现成开源 demo 当音视频开发经历,简历无一行自写编解码/渲染代码;【反模式·跟练复刻侠】照教程一比一复刻播放器/直播 demo、改个 UI 当项目,问「换个场景怎么改、为什么这么设计」全卡壳。压力档本维度:零自研链路、零成体系硬指标直接封顶不及格。',
    },
    {
      key: 'cpp_engineering_crossplatform',
      name: 'C/C++ 工程硬实力与跨端集成(内存×并发×多端落地)',
      weight: 22,
      whatGoodLooksLike:
        '头部岗位把 C/C++ 当非弹性门槛:有真实 C/C++ 项目,讲得清内存管理(RAII/智能指针/内存池)、多线程与锁竞争、用 perf/Valgrind/AddressSanitizer 做过性能与内存问题定位。跨端集成是区分线:移动端硬解硬编(Android MediaCodec、iOS VideoToolbox)与软解(FFmpeg)的取舍、NDK 交叉编译与 JNI 桥接、OpenGL ES/Metal 渲染管线、机型与色彩空间适配坑。能用 code-review 的眼光审视并发与资源:数据竞争、资源泄漏、边界条件(空帧/损坏流/超大分辨率)都考虑到位。',
      campusEvidence:
        '项目体现:「NDK 把 FFmpeg 交叉编译进 Android,JNI 调用解码」「MediaCodec 硬解 + OpenGL ES 渲染,对比软解 CPU 占用降 [具体数字]%」「用 AddressSanitizer/Valgrind 定位渲染线程的内存越界」;技能栏 C++/Android/iOS/OpenGL 都能在正文找到对应的集成实战与排查工具痕迹。',
      commonGaps:
        '【Anthropic 反模式·happy-path-only】只在理想流上跑通,没考虑空帧/损坏码流/异常分辨率/并发竞争等边界(code-review 框架明确要求覆盖 edge cases、race conditions、resource leaks);【反模式·精通牌吹牛皮】技能栏一水儿「精通/熟练 WebRTC/OpenGL ES/MediaCodec」却拿不出一行集成代码、正文零佐证,问集成细节当场失忆;【反模式·PC-only 玩家】只在 PC 跑 demo,完全没碰移动端硬解/JNI/渲染,而音视频岗大头恰在客户端跨端。',
    },
    {
      key: 'qoe_optimization_rigor',
      name: '性能·功耗·画质优化的工程严谨度(QoE 体系×闭环调优)',
      weight: 16,
      whatGoodLooksLike:
        '头部团队要求把优化做成「假设→定位→验证」的闭环而非碰运气:用 debug 框架先复现并量化基线(卡顿率/首屏/延迟/功耗/VMAF),再形成假设、用 profiling 定位根因、改完用前后数据验证收益,而不是「调了个参数感觉好了」。懂画质-码率-延迟-功耗的多维权衡(H.265 省码率但费电要靠硬编平衡;弱网降码率保流畅 vs 保画质)。RTC 场景懂弱网对抗(NACK 重传、FEC、ABR 自适应码率、Jitter Buffer)。有 VMAF 95+ 基本无可见损失、70 分明显糊这类工程直觉。',
      campusEvidence:
        '写出闭环:「定位到解码线程阻塞渲染(perf 火焰图)→ 改为异步送显 → 卡顿率从 [具体数字]% 降到 [具体数字]%」「ABR + Jitter Buffer 调优把弱网卡顿率从 [具体数字]% 降到 [具体数字]%」「用 VMAF 评测对比 CRF 档位,在画质 [具体数字] 分前提下压低 [具体数字]% 码率」;出现 QoE/卡顿率/秒开/VMAF/弱网等关键词并说清自己做了什么、怎么验证的。',
      commonGaps:
        '【Anthropic 反模式·symptom-not-root-cause】「优化了性能」却说不清根因在哪、改了什么导致收益,把调参当优化(debug 框架要求定位 root cause 并用数据验证 fix);【反模式·能播就行党】项目止步于「画面能出来、声音能响」,从没量过卡顿率/首屏/功耗/画质,简历一个 QoE 指标都没有,在以体验为生命线的直播短视频赛道直接掉档;【反模式·孤证数字党】只甩一个「卡顿率降了」却无基线、无前后对比、无定位过程,经不起追问。',
    },
    {
      key: 'cs_foundation_algorithm',
      name: '计算机基础与算法门槛(科班对口×刷题硬关)',
      weight: 10,
      whatGoodLooksLike:
        '本/硕为计算机、电子信息、通信、软件工程等强相关专业,数字信号处理、计算机网络、操作系统、计算机图形学、数据结构等核心课与音视频高度相关并成绩优异。算法是头部大厂笔试/面试通用硬关(音视频岗每轮仍有 Medium 量级算法题),需用 LeetCode 题量/ACM-ICPC/蓝桥等可验证成绩证明而非自称「熟悉算法」。信号处理/图像处理/图形学背景或相关竞赛、科研是天然加分。学历算法是隐形筛选线,权重低于真实音视频项目——项目补得了学历,纯高 GPA 补不了零项目。',
      campusEvidence:
        '教育背景写明院校+专业+全日制+预计毕业时间,附 GPA,列出数字信号处理、计算机网络、操作系统、计算机图形学等相关核心课成绩;算法能力用竞赛奖项、ACM/蓝桥获奖或 LeetCode 刷题量 [具体数字] 体现。',
      commonGaps:
        '【反模式·刷题绩点党】LeetCode 刷了几百题、GPA 拉满,音视频项目栏却空空,以为算法强就能横扫,殊不知音视频岗第一看的是编解码/系统级项目;算法零可验证记录只写「熟悉数据结构算法」,头部大厂笔试一关即被刷;专业完全不相关又无任何音视频项目/课程补足匹配度。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why,落到简历事实并点名反模式,分数与 why 严格一致:\n\n① 命中/缺失事实(写进 evidenceFound / gap):\n- codec_protocol_first_principles:evidenceFound 写出「推演式」应用与显式权衡(如「实时互动放弃 RTMP 选 WebRTC,牺牲 CDN 成本换数百毫秒延迟」);gap 写「仅有结论无 trade-off」「仅 I/P/B 帧定义式背诵,推不到根因」或「协议张冠李戴」。\n- av_project_systems_depth:evidenceFound 写出自研链路环节+架构取舍+成体系硬指标(如「自研播放器内核处理 PTS/DTS 同步,卡顿率降 X%」);gap 写「仅 ffmpeg 命令行转码无自写代码」「跑通 demo/教程复刻」或「只有『实现播放器』一句无架构无指标」。\n- cpp_engineering_crossplatform:evidenceFound 写出 C/C++ 项目+跨端集成实战+边界/排查工具(如「MediaCodec 硬解+OpenGL ES 渲染,AddressSanitizer 定位越界」);gap 写「技能栏堆精通但正文零集成佐证」「只在 PC 跑 demo 无移动端硬解/JNI」或「未考虑空帧/损坏流/并发等边界」。\n- qoe_optimization_rigor:evidenceFound 写出闭环优化(基线→定位→验证)与量化收益(如「perf 定位解码阻塞渲染→异步送显→卡顿率 X%→Y%」);gap 写「全文无 QoE 指标」「只甩一个数字无基线无定位过程」或「调参冒充优化说不清根因」。\n- cs_foundation_algorithm:evidenceFound 写院校+专业方向+相关核心课+算法/竞赛可验证记录;gap 写「专业不相关且无音视频项目/课程补足」或「仅高 GPA+刷题,音视频项目空白」。\n\n② 校招语境下为何重要:必须说明该维度在音视频校招的实际筛选作用——编解码与协议第一性原理是头部面试追问的第一关(只会背定义/给结论一问根因或权衡即穿帮);音视频系统级项目深度是头部录用官判断「造没造过链路」的核心,跑通 demo/命令行转码不可替代,是本岗最强区分项;C/C++ 与跨端集成是非弹性工程门槛(核心库皆 C/C++、岗位大头在客户端跨端);QoE 优化的工程严谨度是直播短视频赛道的价值高地(要的是闭环验证而非碰运气);学历算法是头部通用硬关但权重低于真实项目。\n\n③ 命中反模式直接点名:有 Anthropic 源的直呼「trade-off-blindness」「symptom-not-root-cause」「happy-path-only」;行业反模式直呼「八股复读机」「命令行搬运工」「跟练复刻侠」「精通牌吹牛皮」「PC-only 玩家」「能播就行党」「孤证数字党」「刷题绩点党」,不得空泛说「有待提升」。\n\n分数对齐(压力档抬高 bar):codec_protocol_first_principles 只会背定义/给结论无原理推演与权衡的封顶不及格;av_project_systems_depth 零自研链路、零成体系硬指标(仅命令行转码/跑通 demo)封顶不及格,这是本岗最看重的区分项;cpp_engineering_crossplatform 工具无佐证或只在 PC 跑 demo 只能算缺失;qoe_optimization_rigor 无闭环、零 QoE 指标给低分但不一票否决(属体验进阶维度);cs_foundation_algorithm 是隐形筛选线,纯高 GPA 零项目不得给高分。\n\n严禁在 why 中出现「满分的 X%」「给分不超过」「故给满分」「扣 X 分」等内部比例/扣分话术,只陈述简历事实、命中反模式与缺口。',
  rewriteGuidance:
    '严格遵循「禁编造」铁律,绝不替候选人添加原句没有体现的能力、技术名词、链路环节、架构权衡或指标:\n\n1. 只精修简历「已有」的音视频项目/实习句:明确写出原文已提及的技术栈(FFmpeg/WebRTC/OpenGL ES/MediaCodec)、解决的音视频问题(同步/低延迟/画质/兼容/弱网)、自己负责链路哪一环、量级与产出多大(首屏/卡顿率/延迟/CPU/功耗/VMAF)。\n   - 例:原句「实现了一个音视频播放器」→ 改「基于 [原文提及的技术栈] 实现音视频播放器,负责 [原文已写的模块,如解码/渲染/同步],处理 [原文已提及的问题,如 PTS/DTS 同步]」(技术栈、模块、问题均须取自原文,缺则留占位或走 gap_advice)。\n\n2. 用专业精准动词替换模糊词但不得越级:原文写「参与/基于教程实现」就保留对应表述,严禁夸大为「独立设计/主导架构/自研内核」;原文确写了自研逻辑才可用「自研/独立实现」;绝不把「跑通 demo」改写成「自主开发」、把「命令行转码」改写成「编解码开发」。\n\n3. 缺数字一律用 [具体数字] 占位:如「卡顿率从 [具体数字]% 降到 [具体数字]%」「首屏秒开优化到 [具体数字] ms」「VMAF 提升到 [具体数字] 分」,让候选人自行填真实数字,绝不代填。\n\n4. 简历没有的能力一律不在改写中出现:没写过 H.265/WebRTC/OpenGL ES/硬解码/某协议、没体现过的 QoE 指标(卡顿率/秒开/VMAF/功耗)、链路环节、跨端集成、架构权衡,一律不得凭空生成。\n\n5. 凡简历缺失的关键能力(无自写编解码/渲染代码、无跨端集成、无 QoE 指标、无协议链路推演、无架构取舍说明),一律走 gap_advice 给「建议补充」而非在 rewrite 里编造:\n   - gap_advice 示例:「建议补充一个有自研编解码/渲染/同步逻辑的音视频项目,而非仅命令行转码」「建议把项目优化写成闭环:基线指标→定位过程→前后对比(卡顿率/首屏/延迟/VMAF)」「建议补充移动端硬解码/JNI/OpenGL ES 渲染等跨端集成实战」「建议对一处选型补充 trade-off 说明(为什么这样、放弃了什么、代价是什么)」。',
  resumeConventions:
    '中国校招惯例硬规则(压力档按头部门槛收口):\n- 应聘音视频/多媒体开发岗却零音视频项目(只有 Web/纯后端等无关项目):简历筛选直接过滤,这是强项目导向的细分方向。\n- 不会 C/C++ 或无任何 C/C++ 项目佐证:音视频核心库基本是 C/C++,纯 Java/前端背景且无 C/C++ 实战在硬核引擎/编解码岗直接掉档(偏上层 SDK 岗可放宽)。\n- 简历虚假信息(把命令行转码/跑通 demo 包装成自研、虚标未掌握的协议与编解码能力):面试追问原理/架构权衡/集成细节当场穿帮,大厂背调亦会核验。\n- 非全日制学历 / 无法按时拿到毕业证+学位证双证:部分国企/央企硬性出局。\n\n技能与项目优先级(本岗共识):\n1. 自研音视频链路项目(有编解码/渲染/同步/推拉流自研逻辑 + 成体系 QoE 产出 + 架构取舍)— 最强区分项,优先级高于一切。\n2. 编解码与协议第一性原理(能推演与权衡而非背定义)+ C/C++ 工程硬实力 — 头部面试硬门槛。\n3. 跨端集成与硬解码(MediaCodec/VideoToolbox/NDK/OpenGL ES)— 客户端方向核心竞争力。\n4. QoE 优化的闭环工程严谨度 — 直播短视频赛道价值高地。\n5. 算法刷题 — 通用硬关,过线即可,不是本岗差异化项。\n\n格式偏好:\n- 大厂走网申/内推系统,本科 1 页、研究生最多 2 页。\n- 音视频系统级项目应在首屏可见,每段用「技术栈 + 架构取舍 + 自研环节 + 量化产出」写清。\n- 代码附 GitHub 并写明个人负责模块与设计说明,给 FFmpeg/WebRTC/ijkplayer 等提交被合并的 PR 是顶级背书。\n\n加分项(音视频特有):\n- FFmpeg 源码级二次开发(改/读解码器、定制滤镜)而非仅调命令行。\n- 给主流开源项目(FFmpeg/WebRTC/ijkplayer/ExoPlayer/SRS)提交过被合并的 PR。\n- 用 VMAF/PSNR/SSIM 做过画质评测对比并形成闭环结论。\n- 信号处理/计算机图形学/图像处理背景或相关竞赛、科研。\n- 项目对准真实赛道(直播低延迟、短视频转码、RTC 弱网对抗、点播秒开)并写清架构权衡。\n\n反信号(音视频特有,压力档尤其敏感):\n- 项目清一色「ffmpeg 命令行转码」「照教程复刻播放器」,无任何自研代码。\n- 技能栏堆满「精通 H.265/WebRTC/OpenGL ES」却正文零项目佐证。\n- 通篇无任何 QoE/性能/画质指标,或只甩孤立一个数字无基线无定位。\n- 把帧类型、协议名词当八股背诵,串不成端到端链路、答不出选型权衡。\n- 用 Web/纯后端无关项目硬凑,显示方向不聚焦。',
};

// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) engineering skills,
// 按校招+中文场景修改;英文框架概念(non-functional requirements/trade-off analysis/ADR options/N+1/idempotency/architecture & test debt 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const bigdataEngCampusAnthropic: ProfessionPreset = {
  id: 'bigdata-eng-campus-anthropic',
  profession: '大数据开发',
  stage: 'campus',
  tier: 'pressure',
  displayName: '大数据开发 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'pipeline_architecture_tradeoff',
      name: '数据链路架构与选型取舍',
      weight: 26,
      whatGoodLooksLike:
        '头部大厂卡分线:脑中有完整链路(采集 Kafka/Flume/DataX→存储 HDFS/OSS/Hudi/Iceberg→计算 Spark/Flink→出口 ClickHouse/Doris)且每一环的选型都讲得出取舍——能像写 ADR 一样列出"考虑过的选项 A/B、各自在吞吐/延迟/成本/团队熟悉度上的权衡、为什么这么选、放弃了什么"。能先讲清非功能性需求(数据量级、延迟 SLA、可用性、成本)再谈方案;区分得清离线 batch 与实时 streaming 的延迟语义与 Exactly-Once 保证;能说出"数据量再涨 10 倍时这条链路哪一环要重做"。湖仓一体(Hudi/Iceberg)是真懂取舍而非堆名词。',
      campusEvidence:
        '项目里有数据链路流程图 + 每个组件的选型理由(对照 ADR 风格的选项与权衡);写明延迟 SLA 与 Exactly-Once 语义如何保证;关注湖仓一体并能讲清 Hudi/Iceberg 解决了什么取舍;实习中接触真实采集→计算→出库链路并能复述非功能性约束。',
      commonGaps:
        '组件全堆上却讲不出为什么这么连、放弃了什么【Anthropic 反模式·trade-off 缺失:架构只给结论不给"考虑过的选项与权衡",一问"为何用 Kafka 不直写 HDFS"就崩】;不先界定数据量级/延迟 SLA 就谈方案【Anthropic 反模式·non-functional 缺失:只讲功能不讲规模与延迟要求,设计悬空】;把每小时跑批的离线任务吹成实时【反模式·伪实时项目:声称"实时数仓"实为小时级 batch,问端到端延迟与反压即现形】。',
    },
    {
      key: 'datawarehouse_modeling_debt',
      name: '数仓建模深度与架构债意识',
      weight: 24,
      whatGoodLooksLike:
        '头部要求落到字段级的建模能力:讲得清 ODS→DWD→DWS→ADS 为何这么分层、各层解决什么问题,说得出用 Kimball 维度建模还是 Inmon 范式建模及理由;被追问"这张事实表粒度怎么定、为什么用拉链表不用全量快照、缓慢变化维怎么处理"答得上来。更高一档是有架构债意识:能识别"建错的分层/选错的数据存储"属高风险架构债,会判断何时该重构、重构的影响与风险,而不是将错就错堆补丁。',
      campusEvidence:
        '完整的数仓分层设计文档 + 维度模型/ER 图;真实参与某一层开发并能描述某张表的字段设计与业务来源;读过《数据仓库工具箱》(Kimball)并落到实践;能指出自己项目里"哪块建模是债、若重做会怎么改"的反思。',
      commonGaps:
        '"搭了一整套数仓"却说不清分层理由、建模取舍、事实表粒度【Anthropic 反模式·数仓搭建党:照教程跑通 demo,追问分层与建模全空】;明知建模有问题仍堆补丁不治理【Anthropic 反模式·architecture-debt-ignored:把"建错的存储/分层"当既成事实,不评估重构的影响与风险】;只会范式化堆表,没有面向查询与业务的维度思维。',
    },
    {
      key: 'framework_perf_rootcause',
      name: '框架原理与性能根因调优',
      weight: 20,
      whatGoodLooksLike:
        '不要求 Spark/Flink/Hive 全精通,但至少一个有源码级深度,且能像做性能 code-review 一样揪出根因:Spark 的 RDD/DAG/Shuffle、Flink 的 Checkpoint/Watermark/反压、Hive 的数据倾斜/小文件/MapJoin。关键是有真实调优闭环——"现象(某 task 拖尾/OOM/反压)→定位到根因(数据倾斜键、Shuffle 落盘、热点分区)→手段→量化效果",并能识别热路径上的高复杂度操作(类似 N+1 的重复扫描、笛卡尔积)。一次讲透的真实调优胜过列十个框架。',
      campusEvidence:
        '项目/实习写出框架 + 数据规模 + 具体性能问题(数据倾斜/OOM/反压)+ 定位手段 + 调优量化效果;读过 Spark/Flink 官方文档或部分源码并能复述核心机制;天池竞赛用 Spark 做大规模特征工程的调优经历;GitHub 可运行的 Spark/Flink 项目。',
      commonGaps:
        '技术栈一栏 Hadoop/Spark/Flink/Hive/Kafka/HBase 全列,没一个写出规模与调优【反模式·技术栈堆砌症:框架名比购物清单还长,零量级零调优,深问即解体】;只贴"慢/OOM"现象不挖根因【Anthropic 反模式·symptom-not-root-cause:停在现象层,讲不出是哪个倾斜键/哪次 Shuffle 导致,改不到点上】;看不出热路径里的重复扫描/笛卡尔积这类性能坑。',
    },
    {
      key: 'sql_data_processing',
      name: 'SQL 与数据处理硬能力',
      weight: 18,
      whatGoodLooksLike:
        '头部笔试/面试必考:手写复杂 SQL 不打怵——窗口函数(row_number/lag/lead)、多表 JOIN、行列转换、去重信手拈来,并能就执行计划讲清某条慢查询"慢在哪、走没走索引、怎么调"。做过真实 ETL 的人说得出处理的数据量级、跑批耗时、调优前后对比。有可查的牛客/LeetCode Hard SQL 刷题量、当场能拿下笔试 SQL 题,是最朴素也最硬的信号。',
      campusEvidence:
        '牛客/LeetCode 数据库 Hard 题刷题记录(可附主页链接);课程/毕设里贴出真实写过的复杂 SQL 及业务含义;实习里独立/参与编写的 ETL 脚本(注明日增量级与跑批时长);天池/DataFountain 比赛的数据清洗环节。',
      commonGaps:
        '挂"精通 SQL"却给不出一条具体复杂查询、无刷题量、无笔试佐证,现场写窗口函数去重就卡【反模式·SELECT星号党:简历"精通 SQL",上手只会 select * from 表,窗口函数与执行计划一问三不知】;看不懂执行计划,慢查询只会加机器不会调。',
    },
    {
      key: 'engineering_business_sense',
      name: '工程基本功与业务数据感知',
      weight: 12,
      whatGoodLooksLike:
        '一是工程基本功:LeetCode Medium 手撕没问题,Java/Scala/Python 至少一门写得顺,GitHub 有可运行带注释的代码,且懂测试边界——知道数据管道要测输入校验、转换正确性、幂等性(同一批数据重跑结果一致),而非裸上线。二是业务数据感知:做的指标知道业务含义,数据异动会主动排查根因,而不只是埋头搭管道。争 offer 阶段"懂业务、会保数据质量的开发"明显比"只会拼组件的开发"更受青睐。',
      campusEvidence:
        'LeetCode/牛客刷题量与笔试/ACM 成绩;GitHub 真实可运行带注释的大数据项目(有 Star 更好);项目里有"支撑 XX 业务决策""发现某指标异常后排查出根因""为重跑设计了幂等"的表述;Apache 开源(Flink/Spark/Doris)哪怕一个合并 PR。',
      commonGaps:
        '满屏"熟悉 Java""了解 Python"却无一条带背景-行动-结果的项目,也不提自己做的数据指标业务上意味着什么【反模式·工具清单仔:整页工具罗列,无 STAR 经历,说不清搬的数据为哪个业务服务】;管道不做幂等与数据校验,重跑就乱、脏数据照灌【Anthropic 反模式·no-idempotency:数据管道缺幂等与输入校验测试,一次重跑全乱】。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why,且分数与 why 严格一致:① 指出简历中具体命中/缺失的事实(链路选型是否带"选项+权衡"的 ADR 式取舍、是否先界定数据量级/延迟 SLA、数仓分层与建模能否落到字段级与粒度/SCD、是否有架构债重构意识、框架调优是否"现象→根因→手段→量化"闭环、SQL 复杂查询与执行计划与刷题量、是否懂幂等/数据校验测试、业务数据感知),写进 evidenceFound/gap;② 说明在校招大数据开发压力档语境下为何重要(头部岗筛的是能做链路选型取舍、能落到字段级建模、能把性能问题追到根因、SQL 笔试当场过、且会保数据质量的工程师,标尺远严于普通版);③ 命中反模式直接点名(trade-off 缺失 / non-functional 缺失 / 伪实时项目 / 数仓搭建党 / architecture-debt-ignored / 技术栈堆砌症 / symptom-not-root-cause / SELECT星号党 / 工具清单仔 / no-idempotency),说清踩中证据,不得空泛。严禁泄漏任何"满分 X%/扣 X 分"等内部评分口径,只描述事实与反模式。满纸"熟悉/了解"且零取舍、零根因调优、零量化的简历不得给中高分。',
  rewriteGuidance:
    '禁编造铁律:只对简历"已有"的项目/实习句做精准化改写,严禁添加原句没有体现的能力、框架名或数据规模。改写侧重:把模糊大数据表述讲精准——讲清用了什么技术、解决什么具体问题、数据量级多大、调优前后效果,用精准动词(开发/编写/调优/排查/落地/保障数据质量)与可量化指标增强可信度,替换"负责了相关工作""优化了性能"。缺数字处用 [具体数字] 占位(如"将某离线任务从 [具体数字] 分钟优化至 [具体数字] 分钟(通过 + 简历已写明的调优手段)")。正例:原句"使用 Spark 做了数据处理"+ 简历别处提到处理行为日志且做过分区调整→"使用 Spark 开发用户行为日志清洗任务,通过调整分区数与广播小表解决数据倾斜,跑批耗时由 [具体数字] 降至 [具体数字]"。反例(严禁):简历没提 Flink 不得添加"基于 Flink 实现实时计算";"协助学长搭集群"不得改成"独立搭建 Hadoop 集群";无任何调优描述不得编造"解决数据倾斜"。凡缺失硬维度(无 SQL 刷题/无分层理由/无调优/无幂等/无业务感知)一律走 gap_advice 给可执行补充建议(如"建议补充:若有真实框架调优,按问题-定位-手段-量化效果补一条"),不在改写句里补。original 必须是简历原文一字不差。',
  resumeConventions:
    '出局级硬规则(压力档加严):① 院校筛选客观存在,BAT/字节/美团对非 985/211 通过率显著偏低,唯一有效弥补是含金量高的大厂实习(字节/阿里/腾讯/美团 优先),务必置顶。② GPA 红线低于 3.0/5.0 易被 ATS 过滤,部分公司门槛 3.2,有优势就写、排名靠前写"专业前 X%"。③ 长度超 2 页扣分,互联网岗强烈建议压到 1 页;笔试代码无注释、答题顺序混乱被判编程习惯差,是隐性出局点。④ 证书优先级:有效加分=阿里云 ACP/ACE(大数据方向)、华为 HCIP-Big Data(政企/银行科技认可度高)、CDA L1-L2;中性=计算机二级;反信号=无名培训机构证书(易引发"培训班速成"质疑)。⑤ 格式分赛道:互联网公司反向时间序、技术项目>学校>证书、PDF 黑白简洁(花哨彩色图表反显不专业);大国企/银行科技正向时间序、学校与证书靠前。⑥ 反信号(自查):写"负责人/主导"但工作量一个应届显然做不完;用 CSDN 转载博客替代 GitHub;把数据分析(BI 报表/Tableau)或机器学习当大数据开发核心卖点(暴露岗位认知混淆,大数据开发≠分析≠算法);把课设包装成"亿级数据平台"一问即穿帮。',
};

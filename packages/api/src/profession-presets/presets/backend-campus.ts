// 融合版(standard,主力):后端开发(Java/Go)校招。核心交付=工程深度与系统设计能力;
// 招聘方只信可验证的技术输出(GitHub/大厂实习+业务数字),不信自我描述。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const backendCampus: ProfessionPreset = {
  id: 'backend-campus',
  profession: '后端开发',
  stage: 'campus',
  tier: 'standard',
  displayName: '后端开发 · 校招(融合版)',
  dimensions: [
    { key: 'language_fundamentals', name: '编程语言与语言底层', weight: 20,
      whatGoodLooksLike: '精通 Java(JVM/GC/并发模型/Spring 原理)或 Go(GMP 调度/goroutine/channel),能讲清核心机制而非只会调 API。',
      campusEvidence: '简历“熟悉 JVM 调优”配项目数据(GC 停顿从 Xms 降到 Yms);Go 岗体现 GMP 调度理解;有源码分析博客或 GitHub PR。',
      commonGaps: '只列技术栈不写深度;Spring Boot 用了三年说不出 IoC 容器原理;Go 写成 Java 风格【反模式·语言搬运工:会用但不懂设计哲学】。' },
    { key: 'cs_fundamentals', name: '计算机基础(操作系统/网络/数据库)', weight: 25,
      whatGoodLooksLike: 'OS(进程线程/内存管理/IO 多路复用)+ 网络(TCP 握手/HTTP(S)/DNS 全链路)+ 数据库(MySQL 索引 B+树/事务 ACID/锁/EXPLAIN)三者都能延伸到场景。',
      campusEvidence: '项目里有“发现慢查询→EXPLAIN 定位全表扫描→加复合索引,耗时 800ms 降到 30ms”这类闭环;或参与过性能调优实习。',
      commonGaps: '只能背八股定义,问“TCP 三次握手为什么不是两次”就卡壳【反模式·八股背诵机:知其然不知其所以然】。' },
    { key: 'system_design', name: '系统设计与分布式能力', weight: 25,
      whatGoodLooksLike: '能口述设计短链/秒杀/消息队列消费者的关键决策;理解 CAP、分布式事务 2PC/TCC;熟悉 Redis/Kafka/RPC 的使用场景而非只列名称。',
      campusEvidence: '项目有“设计 XX 模块解决并发 Y 请求下的一致性、选用 Redis 分布式锁的理由 Z”的决策描述;大厂中间件相关实习加分。',
      commonGaps: '项目全是增删改查,无任何并发/缓存/异步设计【反模式·CRUD仔:工程深度为零的表单驱动开发】。' },
    { key: 'engineering_depth', name: '工程实践深度', weight: 20,
      whatGoodLooksLike: '至少一段互联网大/中厂后端实习(有上线代码),或个人/开源项目有真实用户+README+CI 流水线;有 code review 或开源 PR 合并记录。',
      campusEvidence: 'GitHub 项目有 Star/Fork,或实习有业务数字(“支撑日均 10 万订单处理”);参与 ACM/蓝桥提供算法深度背书。',
      commonGaps: '项目全是课程作业/毕设、无生产环境经历;GitHub 主页空白【反模式·课程仔:学历驱动型项目、无工程判断】。' },
    { key: 'algorithms', name: '算法与数据结构', weight: 10,
      whatGoodLooksLike: 'LeetCode 200+ 题(中等为主),45 分钟内完成中等难度手撕;树/图/堆/哈希等基础数据结构原理清晰。',
      campusEvidence: 'ACM/ICPC 区域赛或蓝桥国省级;LeetCode 周赛排名;实习项目中算法优化的量化效果。',
      commonGaps: '只刷 hot100,换个变种题一问就蒙【反模式·题库复读机:机械背答案、无举一反三】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(技术栈深度、项目决策、实习公司+业务数字、GitHub/竞赛),写进 evidenceFound/gap;② 说明在校招后端语境下为何重要;③ 命中反模式直接点名(如“CRUD仔”“八股背诵机”“语言搬运工”“题库复读机”),不得空泛。分数必须与 why 一致。',
  rewriteGuidance: '后端改写侧重:把简历”已有”的项目/实习句讲精准(用了什么技术、解决什么并发/性能/容量问题、量级多大),用后端精准动词(优化/重构/接入/压测)与可量化指标(QPS/RT/并发数/数据规模)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的技术名词或能力,凡简历没有的能力一律走”建议补充(gap_advice)”而非编造。',
  resumeConventions: '中国校招后端惯例核查:① 技术栈分“精通/熟悉/了解”三档,不能全写“熟悉”;② 项目必须有 GitHub 链接或大厂实习+业务数字,否则可信度低、该经历近乎不计入评分;③ 竞赛含金量标清(ACM/ICPC > 蓝桥国奖 > 力扣周赛);④ 大厂实习(腾讯/字节/阿里/美团/华为)一行顶三个课程项目,应靠前;⑤ 不写个人评价/爱好等软性段落,技术密度优先。',
};

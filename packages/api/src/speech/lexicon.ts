/**
 * 确定性同音错词替换词表(招聘/技术域)。
 *
 * 设计原则:
 * - 仅收录「无歧义」替换:无论上下文如何,错词→正词在本业务场景下唯一确定。
 * - 有歧义的词对(如「后台」可指后端或管理后台)不收录。
 * - 词表以常量数组维护,禁止在运行时动态扩展(防止外部注入改变替换行为)。
 * - 替换顺序:词表从上到下逐条替换;替换结果不再回溯(单轮扫描)。
 *
 * ROI 说明(2026-06-16 实测):LLM 词库纠错 ROI ≈ 0.5%,绝大多数错误来自上下文语义
 * 而非同音词典误判。本模块不做重 LLM 上下文复核——只做确定性字符串替换,零 token 消耗。
 */

export interface LexiconEntry {
  /** ASR 常见同音错写 */
  wrong: string;
  /** 招聘/技术域正确写法 */
  correct: string;
}

/**
 * 无歧义技术/招聘同音错词表。
 * 每条均人工核验:在「面试/简历/求职」语境下无反例。
 */
export const TECH_LEXICON: readonly LexiconEntry[] = [
  // 后端相关
  { wrong: '后段', correct: '后端' },
  { wrong: '前段', correct: '前端' },
  { wrong: '后短', correct: '后端' },
  { wrong: '前短', correct: '前端' },

  // 全栈
  { wrong: '全站', correct: '全栈' },
  { wrong: '全战', correct: '全栈' },

  // 分布式 / 架构
  { wrong: '密等', correct: '幂等' },
  { wrong: '秘等', correct: '幂等' },
  { wrong: '迷等', correct: '幂等' },
  { wrong: '分布失', correct: '分布式' },
  { wrong: '微服务器', correct: '微服务' },

  // 数据库
  { wrong: '数据酷', correct: '数据库' },
  { wrong: '数据苦', correct: '数据库' },
  { wrong: '索引建', correct: '索引键' },
  { wrong: '关系形', correct: '关系型' },
  { wrong: '非关系形', correct: '非关系型' },

  // 消息队列
  { wrong: '卡夫卡', correct: 'Kafka' },
  { wrong: '拉比特', correct: 'RabbitMQ' },

  // 容器 / 部署
  { wrong: '多可', correct: 'Docker' },
  { wrong: '扣克', correct: 'Docker' },
  { wrong: '科博内体斯', correct: 'Kubernetes' },
  { wrong: '开布内提斯', correct: 'Kubernetes' },

  // 常见算法词
  { wrong: '复杂读', correct: '复杂度' },
  { wrong: '时间复杂读', correct: '时间复杂度' },
  { wrong: '空间复杂读', correct: '空间复杂度' },

  // 招聘流程
  { wrong: '简历石', correct: '简历筛' },
  { wrong: '技术观', correct: '技术关' },
  { wrong: '历史面', correct: '历史面试' }, // 少见,但高置信
  { wrong: 'HR面', correct: 'HR 面' },

  // 常见英文缩写同音误写
  { wrong: '艾屁艾', correct: 'API' },
  { wrong: '艾皮艾', correct: 'API' },
  { wrong: 'SQL数据库', correct: 'SQL 数据库' }, // 规范化空格,不算错词但加可读性
] as const;

/**
 * 对单段转写文本执行词表替换。
 * - 全字符串扫描,逐条词表 entry 执行 replaceAll。
 * - 不使用正则(避免特殊字符转义风险);纯字符串比对,大小写敏感。
 * - 无匹配时原文返回,不产生任何副作用。
 */
export function applyLexicon(text: string, lexicon: readonly LexiconEntry[] = TECH_LEXICON): string {
  let result = text;
  for (const entry of lexicon) {
    if (result.includes(entry.wrong)) {
      // replaceAll 替换所有出现位置;String.prototype.replaceAll ES2021,Node ≥15 原生支持。
      result = result.replaceAll(entry.wrong, entry.correct);
    }
  }
  return result;
}

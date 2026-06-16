/**
 * 轻量词库(applyLexicon)单元测试。
 *
 * 验收点(对齐任务要求 ④:无歧义错词被替换、歧义词不动):
 *  - 无歧义同音错词 → 被替换为招聘/技术域正词(逐条覆盖词表);
 *  - 已正确的词 / 词表未收录的歧义词 → 原样不动(不误伤);
 *  - replaceAll 语义:同一错词多次出现全部替换;
 *  - 无匹配 → 原文返回(零副作用);
 *  - 幂等:对已替换文本再跑一次结果不变。
 *
 * 词表是确定性字符串替换(零 token),所有断言不涉及任何 AI/网络,纯函数验证。
 */
import { applyLexicon, TECH_LEXICON } from './lexicon';

describe('applyLexicon — 无歧义错词被替换', () => {
  it('「后段/前段/后短/前短」→ 后端/前端(同音误写归一)', () => {
    expect(applyLexicon('我主要做后段开发')).toBe('我主要做后端开发');
    expect(applyLexicon('他负责前段页面')).toBe('他负责前端页面');
    expect(applyLexicon('后短性能调优')).toBe('后端性能调优');
    expect(applyLexicon('前短框架选型')).toBe('前端框架选型');
  });

  it('「全站/全战」→ 全栈', () => {
    expect(applyLexicon('我是全站工程师')).toBe('我是全栈工程师');
    expect(applyLexicon('做过两个全战项目')).toBe('做过两个全栈项目');
  });

  it('「密等/秘等/迷等」→ 幂等;「分布失」→ 分布式;「微服务器」→ 微服务', () => {
    expect(applyLexicon('接口要保证密等')).toBe('接口要保证幂等');
    expect(applyLexicon('秘等设计')).toBe('幂等设计');
    expect(applyLexicon('迷等校验')).toBe('幂等校验');
    expect(applyLexicon('分布失事务')).toBe('分布式事务');
    expect(applyLexicon('拆成多个微服务器')).toBe('拆成多个微服务');
  });

  it('数据库类:「数据酷/数据苦」→ 数据库;「索引建」→ 索引键;「关系形/非关系形」→ 关系型/非关系型', () => {
    expect(applyLexicon('用 MySQL 数据酷')).toBe('用 MySQL 数据库');
    expect(applyLexicon('数据苦优化')).toBe('数据库优化');
    expect(applyLexicon('加了索引建')).toBe('加了索引键');
    expect(applyLexicon('关系形数据库')).toBe('关系型数据库');
    expect(applyLexicon('非关系形存储')).toBe('非关系型存储');
  });

  it('中间件/容器:「卡夫卡」→ Kafka、「拉比特」→ RabbitMQ、「多可/扣克」→ Docker、「科博内体斯/开布内提斯」→ Kubernetes', () => {
    expect(applyLexicon('用卡夫卡做消息队列')).toBe('用Kafka做消息队列');
    expect(applyLexicon('拉比特做异步')).toBe('RabbitMQ做异步');
    expect(applyLexicon('部署在多可里')).toBe('部署在Docker里');
    expect(applyLexicon('扣克镜像')).toBe('Docker镜像');
    expect(applyLexicon('科博内体斯集群')).toBe('Kubernetes集群');
    expect(applyLexicon('开布内提斯编排')).toBe('Kubernetes编排');
  });

  it('算法/招聘流程:复杂读→复杂度、技术观→技术关、简历石→简历筛', () => {
    expect(applyLexicon('时间复杂读是 O(n)')).toBe('时间复杂度是 O(n)');
    expect(applyLexicon('空间复杂读较高')).toBe('空间复杂度较高');
    expect(applyLexicon('过了技术观')).toBe('过了技术关');
    expect(applyLexicon('卡在简历石')).toBe('卡在简历筛');
  });

  it('replaceAll:同一错词多次出现全部替换', () => {
    expect(applyLexicon('后段同学和后段团队')).toBe('后端同学和后端团队');
  });

  it('一段话里多个不同错词同时替换', () => {
    expect(applyLexicon('我做全站,后段用密等,前段调用艾屁艾')).toBe(
      '我做全栈,后端用幂等,前端调用API',
    );
  });

  it('词表逐条:每个 wrong 单独跑都能被替换为对应 correct', () => {
    for (const entry of TECH_LEXICON) {
      expect(applyLexicon(entry.wrong)).toBe(entry.correct);
    }
  });
});

describe('applyLexicon — 歧义词/已正确词不动(不误伤)', () => {
  it('已经是正词的文本原样返回(幂等基线)', () => {
    const text = '我是全栈工程师,后端用幂等,前端调用 API,部署在 Docker';
    expect(applyLexicon(text)).toBe(text);
  });

  it('「后台」是歧义词(可指后端/管理后台),词表未收录 → 不动', () => {
    // 设计原则明确:有歧义的词对不收录;此处验证它确实未被改写。
    expect(applyLexicon('我负责后台管理系统')).toBe('我负责后台管理系统');
  });

  it('与错词字面接近但非词表项 → 不误伤(如「前端段落」含「前端」不应被「前段」规则牵连)', () => {
    expect(applyLexicon('前端段落很长')).toBe('前端段落很长');
  });

  it('普通中文里偶含单字(如「等」「形」「读」)不构成错词 → 不动', () => {
    expect(applyLexicon('我等了很久,读了一本书,形状很规则')).toBe(
      '我等了很久,读了一本书,形状很规则',
    );
  });

  it('无任何词表命中的文本 → 原文返回,零副作用', () => {
    const text = '今天天气不错,我们聊聊职业规划。';
    expect(applyLexicon(text)).toBe(text);
  });

  it('空字符串 → 空字符串(不抛错)', () => {
    expect(applyLexicon('')).toBe('');
  });

  it('幂等:对已替换结果再跑一次,结果不变', () => {
    const once = applyLexicon('全站后段密等');
    const twice = applyLexicon(once);
    expect(twice).toBe(once);
    expect(twice).toBe('全栈后端幂等');
  });
});

describe('applyLexicon — 词表自身约束(防外部注入改变行为)', () => {
  it('传入自定义空词表 → 任何文本原样返回(替换行为完全由词表决定,不内置硬编码)', () => {
    expect(applyLexicon('后段全站密等', [])).toBe('后段全站密等');
  });

  it('词表无重复 wrong 项(避免替换顺序导致的二义)', () => {
    const wrongs = TECH_LEXICON.map((e) => e.wrong);
    expect(new Set(wrongs).size).toBe(wrongs.length);
  });
});

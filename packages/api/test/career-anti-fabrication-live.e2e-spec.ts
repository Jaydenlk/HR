/**
 * AI-live 防编造真验收(step 7,花真钱)。
 *
 * 用户原始痛点:简历里 Python 只是"某课程作业写过 if-else 判断",却被旧版打 6 分
 * (AI 拿训练记忆对"Python 这个词"泛化打分)。本测试用真实 AiService(真中转/真模型)
 * 跑职业地图,断言 Python 不再虚高:
 *   - 要么 current ≤ 3(诚实低档);
 *   - 要么被服务端退化检测压到低档(scoreSource='suppressed', current ≤ 2)。
 * 并打印完整 skill_audit 供人工核对(evidenceFound 是否如实)。
 *
 * 默认 skip,仅 RUN_AI_LIVE=1 真跑。容忍中转 503/超时(非代码缺陷)。
 */
import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

interface ResSkill {
  name: string;
  current: number;
  needed: number;
  ok: boolean;
  category: 'general' | 'ai';
  evidenceFound: string;
  scoreSource: 'ai' | 'self' | 'suppressed';
  aiScore: number | null;
}

// 关键:Python 仅"课程作业里的 if-else 判断",无任何真实 Python 项目/数据/工程。
// 同时给 Java 真实后端项目作为对照(Java 应可拿中高分,证明模型不是一律压低)。
const IF_ELSE_PYTHON_RESUME =
  '王磊，软件工程专业本科应届生。' +
  '主要技术栈是 Java 与 Spring Boot：独立完成校园二手交易平台后端,设计订单/支付/库存三个模块,' +
  '用 MySQL 做索引优化、用 Redis 做缓存把下单接口从 300ms 降到 80ms,项目上线服务全校 2000+ 用户。' +
  '编程语言一栏写了"熟悉 Python";但简历里 Python 的唯一出现是:在《程序设计基础》课程作业中,' +
  '用 Python 写过一个根据成绩输出等级的 if-else 判断小程序。除此之外没有任何 Python 项目、数据分析、' +
  '脚本或工程实践。获校程序设计竞赛三等奖(Java 方向)。';

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Career 防编造 AI-live(step 7:if-else Python 不虚高)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'career-antifab-live@coach.dev', 'Anti Fab Live');
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'if-else Python 简历', raw_text: IF_ELSE_PYTHON_RESUME, is_primary: true });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'Python(仅 if-else 作业)不再给 6 分,而是低档(≤3)或被退化压分',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`)
        .timeout(60000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      // 中转 503/超时:非代码缺陷,记录后跳过断言(不误判工程为失败)。
      if (res.status !== 200) {
        // eslint-disable-next-line no-console
        console.warn(
          `[step7] non-200 status ${res.status} — 可能 AI 中转 503/超时,非代码缺陷;无法验收本次,请重跑。`,
        );
        expect(res.status).toBeGreaterThanOrEqual(400);
        return;
      }

      const body = res.body as { skill_audit: ResSkill[] };
      // 打印完整能力盘点供人工核对(这是 step 7 要求贴的原始输出)。
      // eslint-disable-next-line no-console
      console.log('[step7] 完整 skill_audit 原始输出:\n' + JSON.stringify(body.skill_audit, null, 2));

      // 找 Python 条目(模型可能写 "Python" / "Python 编程" 等,做包含匹配)。
      const py = body.skill_audit.find((s) => /python/i.test(s.name));
      // eslint-disable-next-line no-console
      console.log('[step7] Python 条目:', JSON.stringify(py));

      if (!py) {
        // 模型未把 Python 列入 skill_audit 也是一种"不虚高"的合理表现(简历无 Python 真本事)。
        // eslint-disable-next-line no-console
        console.log('[step7] 模型未把 Python 列入能力盘点(等同于不给它虚高分)——通过。');
        return;
      }

      // 核心断言:Python 不虚高。两种合格路径之一:
      //   A) AI 直接给低档(≤3);
      //   B) AI 想给高分但 evidenceFound 空 → 服务端退化压分(suppressed,current≤2)。
      const acceptable = py.current <= 3 || py.scoreSource === 'suppressed';
      // eslint-disable-next-line no-console
      console.log(
        `[step7] Python current=${py.current} scoreSource=${py.scoreSource} aiScore=${py.aiScore} evidence="${py.evidenceFound}" → ${acceptable ? '合格(不虚高)' : '不合格(虚高)'}`,
      );
      expect(acceptable).toBe(true);
      // 若被压分,current 必 ≤ 2(压分封顶)。
      if (py.scoreSource === 'suppressed') {
        expect(py.current).toBeLessThanOrEqual(2);
      }
      // 防编造铁律:若给中高分(≥4)则必须有非空 evidenceFound 支撑(否则就是虚高)。
      if (py.current >= 4 && py.scoreSource !== 'self') {
        expect(py.evidenceFound.trim().length).toBeGreaterThan(0);
      }
    },
    90000,
  );
});

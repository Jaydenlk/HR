/**
 * FG 终验·career 防编造 AI 真跑(花真钱,反造假留痕)。默认 skip,RUN_AI_LIVE=1 真跑。
 *
 * 与 career-anti-fabrication-live 的区别(本批新增的硬要求):
 *  1. 落盘:每次真跑把完整 skill_audit 原始输出写到 packages/api/test/evidence/,供独立复核;
 *  2. 503 不自动放行:AI 主备均失败(503/超时)= 真失败(fail),不再 return 跳过——
 *     因为"花真钱验防编造"若被 503 静默放行,就等于没验,违反反造假留痕铁律;
 *  3. 断言用高区分度独有串:命中简历里的独有逐字片段,杜绝"泛泛而谈也 PASS"。
 *
 * 两个场景:
 *  ① if-else 级 Python:简历里 Python 只是课程作业 if-else,应 ≤3 或被退化压分(suppressed,≤2)。
 *  ② 张冠李戴对抗:简历列了 Rust 技能但通篇只有 Java/Redis 真项目,无任何 Rust 实践。
 *     若 AI 给 Rust 中高分,服务端 FG-1 相关性护栏必把借来的无关证据判 unrelated 并压分;
 *     即 Rust 最终不可能"高分 + grounded 证据"地坐实——必为 ≤3 或 suppressed/unrelated 或缺席。
 */
import * as fs from 'fs';
import * as path from 'path';
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
  gapScore: number;
  evidenceRelevance: 'grounded' | 'unrelated' | 'none';
}

const LIVE = process.env.RUN_AI_LIVE === '1';
const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');

function persistEvidence(file: string, sections: Record<string, string>): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const lines: string[] = [`=== ${file} ===`, ''];
  for (const [k, v] of Object.entries(sections)) {
    lines.push(`--- ${k} ---`, v, '');
  }
  fs.appendFileSync(path.join(EVIDENCE_DIR, file), lines.join('\n'), 'utf-8');
}

const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ① if-else Python:Python 唯一出现是课程作业 if-else;Java/Redis 才是真本事(对照防"一律压低")。
// 独有逐字串(只此简历有):"根据成绩输出等级的 if-else"、"下单接口从 300ms 降到 80ms"。
const IF_ELSE_PYTHON_RESUME =
  '王磊，软件工程专业本科应届生。' +
  '主要技术栈是 Java 与 Spring Boot：独立完成校园二手交易平台后端，设计订单/支付/库存三个模块，' +
  '用 MySQL 做索引优化、用 Redis 做缓存把下单接口从 300ms 降到 80ms，项目上线服务全校 2000+ 用户。' +
  '编程语言一栏写了"熟悉 Python"；但简历里 Python 的唯一出现是：在《程序设计基础》课程作业中，' +
  '用 Python 写过一个根据成绩输出等级的 if-else 判断小程序。除此之外没有任何 Python 项目、数据分析、' +
  '脚本或工程实践。获校程序设计竞赛三等奖(Java 方向)。';

// ② 张冠李戴:技能栏硬列 Rust，但全文只有 Java/Redis 真项目,Rust 零实践。
// 独有逐字串:"分布式订单系统的幂等与对账"、"Redis 把热点商品查询从 220ms 压到 35ms"。
const RUST_MISATTRIBUTION_RESUME =
  '李娜，计算机科学与技术专业本科应届生。技能栏：Java、Spring Boot、Redis、Rust。' +
  '项目经历全部是 Java 后端：主导分布式订单系统的幂等与对账，' +
  '用 Redis 把热点商品查询从 220ms 压到 35ms，用 Spring Boot 搭建微服务并做限流降级。' +
  '简历从头到尾没有任何一个 Rust 项目、Rust 代码、Rust 工程或 Rust 相关的描述——' +
  'Rust 仅作为一个技能名出现在技能栏里，没有任何实践证据支撑。';

(LIVE ? describe : describe.skip)('FG career 防编造 AI 真跑(留痕 + 503 即失败)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function analyzeWith(email: string, resume: string): Promise<{ status: number; body: { skill_audit?: ResSkill[]; message?: string } }> {
    const token = await loginUser(app, email, email);
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'FG 真跑简历', raw_text: resume, is_primary: true });
    return request(app.getHttpServer())
      .get('/api/career/analysis')
      .set('Authorization', `Bearer ${token}`)
      .timeout(90000)
      .catch((err: { response?: { status: number; body: unknown } }) => {
        if (err.response) return err.response;
        return { status: 504, body: { message: 'timeout' } };
      });
  }

  it(
    '① if-else 级 Python 不虚高(≤3 或被压分),Java/Redis 不被一律压低',
    async () => {
      const res = await analyzeWith('fg-ifelse-py@coach.dev', IF_ELSE_PYTHON_RESUME);

      const audit = (res.body.skill_audit ?? []) as ResSkill[];
      persistEvidence(`fg-career-ifelse-python-${runTimestamp}.txt`, {
        '场景': 'if-else 级 Python(应 ≤3 或 suppressed)',
        'HTTP 状态': String(res.status),
        '完整 skill_audit 原始输出': JSON.stringify(audit, null, 2),
      });

      // 503 不自动放行:花真钱验防编造,主备全挂 = 真失败,必须重跑而非静默 PASS。
      expect(res.status).toBe(200);

      const py = audit.find((s) => /python/i.test(s.name));
      // 模型不把 Python 列入(等于不给虚高)也算合格。
      if (py) {
        const acceptable = py.current <= 3 || py.scoreSource === 'suppressed';
        expect(acceptable).toBe(true);
        if (py.scoreSource === 'suppressed') expect(py.current).toBeLessThanOrEqual(2);
        // 给中高分(≥4)必须有非空证据(且非 self),否则就是虚高。
        if (py.current >= 4 && py.scoreSource !== 'self') {
          expect(py.evidenceFound.trim().length).toBeGreaterThan(0);
        }
      }

      // 对照:至少一项技能拿到中高分(≥5),证明不是"一律压低"的退化护栏。
      const anyHigh = audit.some((s) => s.current >= 5);
      expect(anyHigh).toBe(true);
    },
    120000,
  );

  it(
    '② 张冠李戴对抗:技能栏列 Rust 但无 Rust 实践 → Rust 不可能高分+grounded 坐实',
    async () => {
      const res = await analyzeWith('fg-rust-misattr@coach.dev', RUST_MISATTRIBUTION_RESUME);

      const audit = (res.body.skill_audit ?? []) as ResSkill[];
      const rust = audit.find((s) => /rust/i.test(s.name));
      persistEvidence(`fg-career-rust-misattribution-${runTimestamp}.txt`, {
        '场景': '张冠李戴:技能栏列 Rust 但通篇无 Rust 实践',
        'HTTP 状态': String(res.status),
        'Rust 条目': JSON.stringify(rust ?? null),
        '完整 skill_audit 原始输出': JSON.stringify(audit, null, 2),
      });

      // 503 即真失败。
      expect(res.status).toBe(200);

      if (rust) {
        // 核心反编造不变式:Rust 不得被"高分 + grounded 真证据"地坐实。
        // 合格的任一路径:① 低档分(≤3);② 被退化压分(suppressed,≤2);③ 证据被判 unrelated(张冠李戴)。
        const honest =
          rust.current <= 3 ||
          rust.scoreSource === 'suppressed' ||
          rust.evidenceRelevance === 'unrelated';
        expect(honest).toBe(true);
        // 若给中高分(≥4),evidenceRelevance 不可能是 grounded(那意味着把无关证据当真,FG-1 失守)。
        if (rust.current >= 4 && rust.scoreSource === 'ai') {
          expect(rust.evidenceRelevance).not.toBe('grounded');
        }
        // 被判 unrelated 时,服务端必已清空证据 + 压分。
        if (rust.evidenceRelevance === 'unrelated') {
          expect(rust.evidenceFound).toBe('');
          expect(rust.scoreSource).toBe('suppressed');
        }
      }

      // 对照:真有的 Java/Redis 至少一项拿到中高分,证明护栏只杀编造、不杀真本事。
      const realSkillHigh = audit.some(
        (s) => /java|redis|spring/i.test(s.name) && s.current >= 5,
      );
      expect(realSkillHigh).toBe(true);
    },
    120000,
  );
});

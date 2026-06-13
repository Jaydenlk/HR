import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import {
  buildCareerAnalysisSystem,
  CAREER_EVIDENCE_IRON_LAW,
} from '../src/ai/prompts/career-analysis';
import { createTestApp, loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Raw shape the AI *claims* (untrusted). Server treats some fields   */
/*  as untrusted and overrides them:                                   */
/*   - DEFECT-1: ok recomputed from current>=needed                    */
/*   - DEFECT-3: alumni_count normalized (never fabricated)            */
/*   - 防编造: current with empty evidenceFound is suppressed          */
/*   - 自评: self-assessed skills override AI current                  */
/* ------------------------------------------------------------------ */
interface RawSkillAudit {
  name: string;
  current: number;
  needed: number;
  ok?: boolean;
  evidenceFound?: string;
  category?: string;
}
interface RawPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  alumni_count?: number | null;
}
interface RawCareerAnalysis {
  paths: RawPath[];
  skill_audit: RawSkillAudit[];
}

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

/* A realistic, ≥30-char Chinese resume so the service does NOT short-circuit.
 * 含真实可回指的证据片段(供 FIX-2 假证据校验:测试里的 evidenceFound 必须能在此正文里找到)。 */
const VALID_RESUME_TEXT =
  '张伟，计算机科学与技术专业本科应届生。' +
  '熟悉 Java 与 Spring Boot 后端开发，参与过校园二手交易平台后端开发，负责订单与支付模块；' +
  '掌握 MySQL 索引优化与 Redis 缓存优化，曾用 Redis 将接口平均响应从 320ms 降到 90ms。' +
  '日常用 Copilot 提效开发，落地过一个微服务实践的拆分方案；' +
  '获 ACM 校赛二等奖，担任技术社团负责人，组织 5 场技术分享。';

/* ================================================================== */
/*  Prompt-level asserts (no app needed) — Step 2 / Step 4            */
/* ================================================================== */
describe('Career prompt — 防编造铁律 + AI 能力专项', () => {
  const system = buildCareerAnalysisSystem();

  it('system prompt 含"直接证据铁律"关键句', () => {
    expect(system).toContain('直接证据铁律');
    expect(CAREER_EVIDENCE_IRON_LAW).toContain('直接证据铁律');
  });

  it('system prompt 要求无证据给低分 / 完全没提给 0 分', () => {
    expect(system).toContain('简历完全没提该技能');
    expect(system).toMatch(/低档|低分/);
  });

  it('system prompt 要求逐技能输出 evidenceFound', () => {
    expect(system).toContain('evidenceFound');
  });

  it('system prompt 严禁凭技能名泛化打分', () => {
    expect(system).toMatch(/泛化打分|凭技能名/);
  });

  it('system prompt 要求专门产出 AI 能力维度且同套防编造', () => {
    expect(system).toContain('AI 能力专项');
    expect(system).toMatch(/category='ai'|category=ai/);
    expect(system).toContain('现在都用 AI'); // 反例:不许因此泛给分
  });

  // FIX-1①:防编造补强——把诊断侧三条铁律补到 career,做到名副其实。
  it('system prompt 含可疑量化指标铁律(无来源数字不采信)', () => {
    expect(CAREER_EVIDENCE_IRON_LAW).toContain('可疑量化指标铁律');
    expect(system).toMatch(/无来源量化数字不采信|无基数\/无口径/);
  });

  it('system prompt 含相邻领域不得间接推断给分', () => {
    expect(CAREER_EVIDENCE_IRON_LAW).toContain('相邻领域不得间接推断');
    expect(system).toMatch(/学科背景/);
  });

  it('system prompt 含评分过程不外泄(不写进用户可见文字)', () => {
    expect(CAREER_EVIDENCE_IRON_LAW).toContain('评分过程不外泄');
    expect(system).toMatch(/压分|内部计算|分数比例/);
  });

  it('system prompt 禁止只照抄技能名当证据', () => {
    expect(CAREER_EVIDENCE_IRON_LAW).toMatch(/严禁只照抄技能名/);
  });
});

/* ================================================================== */
/*  Deterministic AI-mock e2e — fixed server behavior                 */
/* ================================================================== */
describe('Career (e2e) — deterministic AI mock asserts fixed behavior', () => {
  let app: INestApplication;
  let nextAiResult: RawCareerAnalysis;
  const completeStructured = jest.fn(() => Promise.resolve(nextAiResult));

  let token: string;
  let noResumeToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'career-mock@coach.dev', 'Career Mock User');
    noResumeToken = await loginUser(app, 'career-noresume@coach.dev', 'No Resume User');

    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '后端简历', raw_text: VALID_RESUME_TEXT, is_primary: true });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────
  describe('Auth guard', () => {
    it('GET /api/career/analysis without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/career/analysis');
      expect(res.status).toBe(401);
    });
    it('GET /api/career/history without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/career/history');
      expect(res.status).toBe(401);
    });
    it('POST /api/career/self-assessment without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/career/self-assessment').send([]);
      expect(res.status).toBe(401);
    });
  });

  // ─── No-resume guard ──────────────────────────────────────────────────────
  describe('Resume preconditions', () => {
    it('no resume → 400 with Chinese guidance (AI not called)', async () => {
      completeStructured.mockClear();
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${noResumeToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('请先上传简历');
      expect(completeStructured).not.toHaveBeenCalled();
    });
  });

  // ─── DEFECT-1: ok recomputed server-side ──────────────────────────────────
  describe('skill_audit.ok is derived from current>=needed (AI ok ignored)', () => {
    it('AI says ok:true but current<needed → server returns ok:false', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 78, description: '主线路径', skills: ['Java'], alumni_count: null }],
        // 有证据,不触发压分;仅验 ok 重算。
        skill_audit: [
          { name: '分布式系统', current: 3, needed: 7, ok: true, evidenceFound: '订单模块涉及分库', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const audit = res.body.skill_audit[0] as ResSkill;
      expect(audit.name).toBe('分布式系统');
      expect(audit.current).toBe(3);
      expect(audit.needed).toBe(7);
      expect(audit.ok).toBe(false);
    });

    it('AI says ok:false but current>=needed → server returns ok:true', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 80, description: '主线路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, ok: false, evidenceFound: 'Spring Boot 后端开发', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).ok).toBe(true);
    });

    it('boundary current===needed → ok:true (>= is inclusive)', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '主线路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'MySQL', current: 5, needed: 5, ok: false, evidenceFound: 'MySQL 索引优化', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).ok).toBe(true);
    });
  });

  // ─── 防编造(核心):退化检测压分 — Step 2 ──────────────────────────────────
  describe('防编造退化检测:高分无证据 → 压到低档并留痕', () => {
    it('current=6 但 evidenceFound 空 → 压到 2,scoreSource=suppressed,aiScore 保留 6', async () => {
      // 用户原始痛点的确定性复现:Python 被泛化打 6 分但简历无证据。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: '路径', skills: ['Python'], alumni_count: null }],
        skill_audit: [{ name: 'Python', current: 6, needed: 7, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const py = res.body.skill_audit[0] as ResSkill;
      expect(py.name).toBe('Python');
      expect(py.scoreSource).toBe('suppressed');
      expect(py.current).toBe(2); // 压到低档
      expect(py.aiScore).toBe(6); // AI 原始虚高分留痕
      expect(py.evidenceFound).toBe('');
      expect(py.ok).toBe(false); // 2 < 7
    });

    it('current=3 evidenceFound 空 → 不触发压分(本就低档),scoreSource=ai', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: '路径', skills: ['Go'], alumni_count: null }],
        skill_audit: [{ name: 'Go', current: 3, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const go = res.body.skill_audit[0] as ResSkill;
      expect(go.scoreSource).toBe('ai');
      expect(go.current).toBe(3);
      expect(go.aiScore).toBeNull();
    });

    it('current=8 有证据 → 不压分,scoreSource=ai,证据原文透传', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 82, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, evidenceFound: 'Spring Boot 订单与支付模块', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = res.body.skill_audit[0] as ResSkill;
      expect(java.scoreSource).toBe('ai');
      expect(java.current).toBe(8);
      expect(java.evidenceFound).toBe('Spring Boot 订单与支付模块');
      expect(java.ok).toBe(true);
    });
  });

  // ─── FIX-2:假证据校验(evidenceFound 必须能在简历里真实回指) ──────────────
  describe('FIX-2 假证据漏洞:照抄技能名 / 简历没有的文字 当证据 → 视为无证据并压分', () => {
    it('AutoCAD 式:evidenceFound 只照抄技能名 → 判无证据,高分被压(suppressed)', async () => {
      // E2E 样本C 的确定性复现:AutoCAD 非空 evidenceFound 但只是技能名本身,简历无真实项目。
      nextAiResult = {
        paths: [{ title: '机械设计师', fit_pct: 70, description: 'd', skills: ['AutoCAD'], alumni_count: null }],
        skill_audit: [{ name: 'AutoCAD', current: 7, needed: 6, evidenceFound: 'AutoCAD（熟练）', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const cad = res.body.skill_audit[0] as ResSkill & { gapScore: number };
      expect(cad.name).toBe('AutoCAD');
      expect(cad.scoreSource).toBe('suppressed'); // 假证据 → 按无证据压分
      expect(cad.current).toBe(2);
      expect(cad.aiScore).toBe(7);
      expect(cad.evidenceFound).toBe(''); // 假证据被清空
    });

    it('简历里根本没有的措辞当证据 → 判无证据,高分被压', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: 'd', skills: ['Kafka'], alumni_count: null }],
        // Kafka 简历完全没提,evidenceFound 是编造的措辞。
        skill_audit: [{ name: 'Kafka', current: 8, needed: 6, evidenceFound: '搭建了千万级消息中间件集群', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const kafka = res.body.skill_audit[0] as ResSkill;
      expect(kafka.scoreSource).toBe('suppressed');
      expect(kafka.current).toBe(2);
      expect(kafka.aiScore).toBe(8);
      expect(kafka.evidenceFound).toBe('');
    });

    it('真实回指简历原文的证据 → 不压分,evidenceFound 透传', async () => {
      // 证据是简历正文里真实出现的片段(含技能名 + 实质项目描述)。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 82, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Java', current: 8, needed: 6, evidenceFound: '订单与支付模块', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = res.body.skill_audit[0] as ResSkill;
      expect(java.scoreSource).toBe('ai');
      expect(java.current).toBe(8);
      expect(java.evidenceFound).toBe('订单与支付模块');
    });
  });

  // ─── FG-1:张冠李戴护栏(跨技能借用真句 → unrelated + 压分 + 清空 + ok=false) ──────
  //
  // 第一波对抗样本的确定性复刻:AI 把别的技能/姓名学历段的"简历真句"安给本技能。
  // 这类证据可回指简历(子串命中,旧 FIX-2 会放行),但与本技能毫无相关性信号 →
  // 必须被判 evidenceRelevance='unrelated',清空 evidenceFound + 退化压分 + ok=false。
  // 同时合法证据不得误伤(关键:护栏不能矫枉过正把真证据一并杀掉)。
  describe('FG-1 张冠李戴:借用无关真句的高分必被判 unrelated 并压分', () => {
    it('对抗①:Rust 借 Java 真句"订单与支付模块"(简历真句但与Rust无关)→ unrelated+压分+清空+ok=false', async () => {
      // "订单与支付模块"确实在简历里(Java 那句),但 Rust 在简历里根本不存在;
      // 证据文本无 rust 信号、其所在句邻近窗口(Java/Spring Boot 那句)也无 rust → 张冠李戴。
      nextAiResult = {
        paths: [{ title: '系统工程师', fit_pct: 70, description: 'd', skills: ['Rust'], alumni_count: null }],
        skill_audit: [{ name: 'Rust', current: 8, needed: 6, evidenceFound: '订单与支付模块', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const rust = res.body.skill_audit[0] as ResSkill;
      expect(rust.name).toBe('Rust');
      expect(rust.evidenceRelevance).toBe('unrelated'); // 张冠李戴被识别
      expect(rust.evidenceFound).toBe(''); // 无关证据被清空
      expect(rust.scoreSource).toBe('suppressed'); // 清空后落入退化压分网
      expect(rust.current).toBe(2); // 压到低档
      expect(rust.aiScore).toBe(8); // AI 原始虚高分留痕
      expect(rust.ok).toBe(false); // 2 < 6,且 suppressed 一律不达标
    });

    it('对抗②:Rust 借姓名学历段"计算机科学与技术专业"→ unrelated+压分+清空', async () => {
      // 把姓名/学历段(简历真句)安给 Rust:可回指但与 Rust 无任何相关性信号 → 张冠李戴。
      nextAiResult = {
        paths: [{ title: '系统工程师', fit_pct: 70, description: 'd', skills: ['Rust'], alumni_count: null }],
        skill_audit: [
          { name: 'Rust', current: 7, needed: 5, evidenceFound: '计算机科学与技术专业', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const rust = res.body.skill_audit[0] as ResSkill;
      expect(rust.evidenceRelevance).toBe('unrelated');
      expect(rust.evidenceFound).toBe('');
      expect(rust.scoreSource).toBe('suppressed');
      expect(rust.current).toBe(2);
      expect(rust.aiScore).toBe(7);
      expect(rust.ok).toBe(false);
    });

    it('不误伤①:Java 用同句含"java"的真句"熟悉 Java 与 Spring Boot 后端开发"→ grounded 保留', async () => {
      // 证据本身含技能名 java(直含相关性信号),且是简历真句 → grounded,不该被张冠李戴误杀。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 82, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, evidenceFound: '熟悉 Java 与 Spring Boot 后端开发', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = res.body.skill_audit[0] as ResSkill;
      expect(java.evidenceRelevance).toBe('grounded'); // 与 Java 相关 → 可信
      expect(java.scoreSource).toBe('ai'); // 不压分
      expect(java.current).toBe(8);
      expect(java.evidenceFound).toBe('熟悉 Java 与 Spring Boot 后端开发'); // 透传不清空
      expect(java.ok).toBe(true);
    });

    it('不误伤②:中文技能名"AI 辅助编码"借英文工具别名 Copilot 的真句 → 别名命中 grounded 保留', async () => {
      // 简历写工具名 Copilot,技能名却是中文"AI 辅助编码":靠别名表 + 邻近溯源命中 → grounded。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'AI 辅助编码', current: 6, needed: 5, evidenceFound: '日常用 Copilot 提效开发', category: 'ai' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const copilot = res.body.skill_audit[0] as ResSkill;
      expect(copilot.category).toBe('ai');
      expect(copilot.evidenceRelevance).toBe('grounded'); // 别名 copilot 命中 → 相关
      expect(copilot.scoreSource).toBe('ai'); // 不压分
      expect(copilot.current).toBe(6);
      expect(copilot.evidenceFound).toBe('日常用 Copilot 提效开发');
    });

    it('真无证据(空)→ evidenceRelevance=none(区别于 unrelated 的张冠李戴)', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: 'd', skills: ['Scala'], alumni_count: null }],
        skill_audit: [{ name: 'Scala', current: 7, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const scala = res.body.skill_audit[0] as ResSkill;
      expect(scala.evidenceRelevance).toBe('none'); // 本无证据,非张冠李戴
      expect(scala.scoreSource).toBe('suppressed');
      expect(scala.current).toBe(2);
    });
  });

  // ─── FG-2:被退化压分(suppressed)的技能一律 ok=false ──────────────────────────
  // 绝不能因 AI 给极低 needed(0/1/2)使压后分(2)≥needed 而反显"达标(绿)",
  // 那会让缺口危险色失效、把"未坐实能力"包装成达标。
  describe('FG-2 suppressed 一律未达标:即便压后分 ≥ needed 也必 ok=false', () => {
    it('压分到 2 且 AI 给极低 needed=1(2≥1 本会显达标)→ 仍 ok=false', async () => {
      // 高分无证据被压到 2;AI 给 needed=1,gapScore(2) ≥ needed(1) 本会让旧逻辑显"达标"。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: 'd', skills: ['Elixir'], alumni_count: null }],
        skill_audit: [{ name: 'Elixir', current: 9, needed: 1, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sk = res.body.skill_audit[0] as ResSkill;
      expect(sk.scoreSource).toBe('suppressed');
      expect(sk.current).toBe(2);
      expect(sk.gapScore).toBe(2);
      expect(sk.needed).toBe(1);
      expect(sk.ok).toBe(false); // FG-2 核心:suppressed 一律未达标,不被极低 needed 反显达标
    });

    it('张冠李戴压分 + 极低 needed=0 → 同样 ok=false(无关证据已清空,落 suppressed)', async () => {
      // needed=0 时 gapScore(2)≥0 必然成立,只有 FG-2 的 suppressed 短路才能压住"达标"。
      nextAiResult = {
        paths: [{ title: '系统工程师', fit_pct: 70, description: 'd', skills: ['Haskell'], alumni_count: null }],
        // 借 Redis 真句作 Haskell 证据(张冠李戴),AI 给 needed=0。
        skill_audit: [{ name: 'Haskell', current: 8, needed: 0, evidenceFound: 'Redis 缓存优化', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sk = res.body.skill_audit[0] as ResSkill;
      expect(sk.evidenceRelevance).toBe('unrelated');
      expect(sk.evidenceFound).toBe('');
      expect(sk.scoreSource).toBe('suppressed');
      expect(sk.ok).toBe(false);
    });

    it('对照:自评覆盖(self)优先级高于 FG-2,不受 suppressed 约束(用户主观纠偏)', async () => {
      // 自评是人工纠偏,scoreSource='self' 不是 'suppressed',ok 仍按 gapScore 正常判。
      await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Clojure', self_score: 8 }]);
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: 'd', skills: ['Clojure'], alumni_count: null }],
        // AI 高分无证据本会压分(suppressed),但有自评 → self 覆盖,不进 suppressed 分支;
        // ok 按保守分 gapScore=min(自评8, AI原分9)=8 正常判,不被 FG-2 短路成 false。
        skill_audit: [{ name: 'Clojure', current: 9, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sk = res.body.skill_audit[0] as ResSkill;
      expect(sk.scoreSource).toBe('self'); // 非 suppressed → 不受 FG-2 约束
      expect(sk.current).toBe(8); // 展示自评
      expect(sk.aiScore).toBe(9); // AI 原始分留参考(未经压分)
      expect(sk.gapScore).toBe(8); // min(自评8, AI原分9)=8
      expect(sk.ok).toBe(true); // 保守分 8 ≥ needed 6 → 达标(self 不被 FG-2 短路成 false)
    });
  });

  // ─── FIX-5:自评覆盖时缺口用保守分 min(自评,AI原分) ──────────────────────────
  describe('FIX-5 缺口用保守分:展示尊重自评,缺口不被自评虚高欺骗', () => {
    beforeAll(async () => {
      // 给本块准备自评:AutoCAD 自评虚高 9 分(简历无 AutoCAD 真本事)。
      await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'AutoCAD', self_score: 9 }]);
    });

    it('自评 9(虚高)但 AI 原分低 → 展示 current=9,但 gapScore=min(9,AI原分),ok 按保守分判', async () => {
      // AI 给 AutoCAD 7 分但只照抄技能名(会被压分→AI原分按 calibrate 取 clamp 后的 7)。
      // 自评 9 覆盖展示;gapScore = min(9, 7) = 7;needed=8 → 7<8 → ok=false(缺口没被自评抹掉)。
      nextAiResult = {
        paths: [{ title: '机械设计师', fit_pct: 70, description: 'd', skills: ['AutoCAD'], alumni_count: null }],
        skill_audit: [{ name: 'AutoCAD', current: 7, needed: 8, evidenceFound: 'AutoCAD', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const cad = res.body.skill_audit[0] as ResSkill & { gapScore: number };
      expect(cad.scoreSource).toBe('self');
      expect(cad.current).toBe(9); // 展示尊重自评
      expect(cad.aiScore).toBe(7); // AI 原始分(未压分)留参考
      expect(cad.gapScore).toBe(7); // min(自评9, AI原分7)
      expect(cad.ok).toBe(false); // 保守分 7 < needed 8 → 缺口仍在(没被自评虚高抹掉)
    });

    it('自评低于 AI 原分时 gapScore=自评(取较低值),与展示一致', async () => {
      await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'MySQL', self_score: 4 }]);
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['MySQL'], alumni_count: null }],
        skill_audit: [{ name: 'MySQL', current: 7, needed: 6, evidenceFound: '索引优化', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const my = res.body.skill_audit[0] as ResSkill & { gapScore: number };
      expect(my.scoreSource).toBe('self');
      expect(my.current).toBe(4);
      expect(my.gapScore).toBe(4); // min(4,7)
      expect(my.ok).toBe(false); // 4 < 6
    });

    it('非自评来源 gapScore 与 current 同值', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 80, description: 'd', skills: ['Redis'], alumni_count: null }],
        skill_audit: [{ name: 'Redis', current: 7, needed: 6, evidenceFound: 'Redis 缓存优化', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const r = res.body.skill_audit[0] as ResSkill & { gapScore: number };
      expect(r.scoreSource).toBe('ai');
      expect(r.gapScore).toBe(r.current);
      expect(r.gapScore).toBe(7);
    });
  });

  // ─── AI 能力板块 — Step 4 ─────────────────────────────────────────────────
  describe('AI 能力(category=ai)同样套防编造', () => {
    it('AI 类技能存在且无证据高分被压到低档', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 7, needed: 6, evidenceFound: 'Spring Boot 后端', category: 'general' },
          // AI 能力但简历没提 → AI 想给 6 分却无证据,必须被压。
          { name: '提示工程/Prompt', current: 6, needed: 7, evidenceFound: '', category: 'ai' },
          // AI 能力有证据 → 保留。
          { name: 'AI 辅助编码', current: 5, needed: 6, evidenceFound: '用 Copilot 提效开发', category: 'ai' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const skills = res.body.skill_audit as ResSkill[];
      const aiSkills = skills.filter((s) => s.category === 'ai');
      expect(aiSkills.length).toBe(2);

      const prompt = skills.find((s) => s.name === '提示工程/Prompt')!;
      expect(prompt.category).toBe('ai');
      expect(prompt.scoreSource).toBe('suppressed');
      expect(prompt.current).toBe(2);
      expect(prompt.aiScore).toBe(6);

      const copilot = skills.find((s) => s.name === 'AI 辅助编码')!;
      expect(copilot.category).toBe('ai');
      expect(copilot.scoreSource).toBe('ai');
      expect(copilot.current).toBe(5);
    });

    it('AI 未给 category → 默认 general(不污染 AI 组)', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Redis', current: 6, needed: 5, evidenceFound: 'Redis 缓存优化' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).category).toBe('general');
    });
  });

  // ─── DEFECT-3: alumni_count normalization ─────────────────────────────────
  describe('alumni_count accepts number|null and never fabricates', () => {
    const cases: Array<[string, number | null | undefined, number | null]> = [
      ['null', null, null],
      ['valid integer', 12, 12],
      ['non-integer 12.6', 12.6, null],
      ['NaN', NaN, null],
      ['Infinity', Infinity, null],
      ['negative -5', -5, null],
      ['omitted', undefined, null],
    ];
    it.each(cases)('AI returns %s → server returns %s', async (_label, input, expected) => {
      const path: RawPath = { title: '后端工程师', fit_pct: 78, description: 'd', skills: ['Java'], alumni_count: input ?? undefined };
      if (input === undefined) delete (path as Partial<RawPath>).alumni_count;
      nextAiResult = {
        paths: [path],
        skill_audit: [{ name: 'Java', current: 6, needed: 6, evidenceFound: 'Spring Boot 后端', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.paths[0]).toHaveProperty('alumni_count');
      expect(res.body.paths[0].alumni_count).toBe(expected);
    });
  });

  // ─── Pass-through fields ──────────────────────────────────────────────────
  describe('trusted fields pass through unchanged', () => {
    it('title / fit_pct / description / skills returned verbatim', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 83, description: '与简历后端经历高度契合', skills: ['Java', 'Spring Boot', 'Redis'], alumni_count: null },
        ],
        skill_audit: [{ name: 'Redis', current: 6, needed: 5, evidenceFound: 'Redis 缓存', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const path = res.body.paths[0];
      expect(path.title).toBe('后端工程师');
      expect(path.fit_pct).toBe(83);
      expect(path.description).toBe('与简历后端经历高度契合');
      expect(path.skills).toEqual(['Java', 'Spring Boot', 'Redis']);
    });
  });

  // ─── 落库 + 历史 — Step 3 ─────────────────────────────────────────────────
  describe('落库 + 历史接口', () => {
    it('analyze 后历史列表有记录(摘要含 top_path/path_count/skill_count)', async () => {
      nextAiResult = {
        paths: [{ title: '数据工程师', fit_pct: 80, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Java', current: 6, needed: 6, evidenceFound: 'Spring Boot', category: 'general' }],
      };
      await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const latest = res.body[0];
      expect(latest).toHaveProperty('id');
      expect(latest).toHaveProperty('created_at');
      expect(latest).toHaveProperty('top_path');
      expect(typeof latest.path_count).toBe('number');
      expect(typeof latest.skill_count).toBe('number');
      // 列表不应泄露完整 result_json。
      expect(latest).not.toHaveProperty('result_json');
      expect(latest).not.toHaveProperty('skill_audit');
    });

    it('历史详情 owner-only → 本人可取完整 analysis', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      const id = list.body[0].id as string;
      const res = await request(app.getHttpServer())
        .get(`/api/career/history/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.paths)).toBe(true);
      expect(Array.isArray(res.body.skill_audit)).toBe(true);
    });

    it('他人历史详情 → 404(不泄露存在性)', async () => {
      const otherToken = await loginUser(app, 'career-other@coach.dev', 'Other User');
      const list = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      const id = list.body[0].id as string;
      const res = await request(app.getHttpServer())
        .get(`/api/career/history/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(404);
    });

    it('不存在的 id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/history/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('他人历史列表 → 空(隔离)', async () => {
      const otherToken = await loginUser(app, 'career-other2@coach.dev', 'Other User 2');
      const res = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── 问卷自评 + 校准 — Step 5 ─────────────────────────────────────────────
  describe('问卷自评 upsert + analyze 校准', () => {
    it('POST 自评校验:越界 self_score → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 99 }]);
      expect(res.status).toBe(400);
    });

    // FG-6:单次自评条目数上限(SELF_ASSESSMENT_MAX_ITEMS=50)防刷爆。
    it('FG-6:超过 50 条自评 → 400(数组上限,防 N+1 放大/刷接口)', async () => {
      const items = Array.from({ length: 51 }, (_, i) => ({
        skill_name: `技能${i}`,
        self_score: 3,
      }));
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send(items);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('最多提交');
    });

    it('FG-6:恰好 50 条边界 → 通过(written=50,批量 upsert 一次写入)', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        skill_name: `批量技能${i}`,
        self_score: 4,
      }));
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send(items);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(50);
    });

    it('FG-6:批内同技能重复 → 去重后取最后一条(written 计数=去重后条数)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([
          { skill_name: 'DedupSkill', self_score: 2 },
          { skill_name: 'DedupSkill', self_score: 7 }, // 同技能后写覆盖前写
          { skill_name: 'OtherSkill', self_score: 5 },
        ]);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(2); // 去重后 2 条
    });

    it('POST 自评 upsert → written 计数', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([
          { skill_name: 'Python', self_score: 2 },
          { skill_name: 'Java', self_score: 9 },
        ]);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(2);
    });

    it('upsert 幂等:重复提交同技能仍只更新不重复', async () => {
      await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 1 }]);
      // analyze 验证仅用最新值,见下条。
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 3 }]);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(1);
    });

    it('analyze 时有自评的技能用自评覆盖 AI 分(scoreSource=self,aiScore 留 AI 原始分)', async () => {
      // AI 想给 Python 8 分(且有证据本不会被压),但用户自评 3 分 → 必须用 3。
      // FG-1 后:对照技能的证据须与该技能相关(grounded),否则会被张冠李戴护栏清空压分。
      // 原 'Go'+'微服务实践' 在 VALID_RESUME_TEXT 里"微服务实践"虽真句但与 Go 无关(简历无 Go),
      // FG-1 会正确判 unrelated 并压分——不符本用例"非自评技能保持 ai 来源"的本意。
      // 改用 Redis + 简历真有的相关证据 'Redis 缓存优化'(含技能名 redis,grounded+相关)。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['Python', 'Redis'], alumni_count: null }],
        skill_audit: [
          { name: 'Python', current: 8, needed: 7, evidenceFound: '数据脚本项目', category: 'general' },
          { name: 'Redis', current: 5, needed: 6, evidenceFound: 'Redis 缓存优化', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const skills = res.body.skill_audit as ResSkill[];
      const py = skills.find((s) => s.name === 'Python')!;
      expect(py.scoreSource).toBe('self');
      expect(py.current).toBe(3); // 用户最新自评
      expect(py.aiScore).toBe(8); // AI 原始分留参考
      expect(py.ok).toBe(false); // 3 < 7
      // 无自评的技能保持 AI 来源(证据 grounded+相关,不被张冠李戴误伤)。
      const redis = skills.find((s) => s.name === 'Redis')!;
      expect(redis.scoreSource).toBe('ai');
      expect(redis.current).toBe(5);
      expect(redis.evidenceRelevance).toBe('grounded');
    });

    it('自评覆盖优先级高于退化压分:AI 高分无证据但有自评 → 用自评分', async () => {
      // Java 自评为 9(前面已提交);AI 给 7 但 evidenceFound 空(本会被压到 2)→ 自评优先,用 9。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Java', current: 7, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = (res.body.skill_audit as ResSkill[]).find((s) => s.name === 'Java')!;
      expect(java.scoreSource).toBe('self');
      expect(java.current).toBe(9);
      expect(java.aiScore).toBe(7); // 保留 AI 原始分(未经压分)
    });
  });
});

/* ================================================================== */
/*  AI-live suite — real AiService, real relay. 默认 skip。            */
/*  RUN_AI_LIVE=1 真跑(防编造真验收见 career-anti-fabrication-live)。   */
/* ================================================================== */
const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Career (e2e) — AI-live (graceful on relay 503/timeout)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'career-live@coach.dev', 'Career Live User');
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '后端简历', raw_text: VALID_RESUME_TEXT, is_primary: true });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'returns 200 with fixed-behavior shape, OR a graceful non-auth error if relay is down',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`)
        .timeout(25000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);

      if (res.status === 200) {
        const body = res.body as { paths: RawPath[]; skill_audit: ResSkill[] };
        expect(Array.isArray(body.paths)).toBe(true);
        expect(Array.isArray(body.skill_audit)).toBe(true);
        expect(body.paths.length).toBeGreaterThanOrEqual(1);

        for (const path of body.paths) {
          expect(typeof path.title).toBe('string');
          expect(typeof path.fit_pct).toBe('number');
          expect(path.fit_pct).toBeGreaterThanOrEqual(0);
          expect(path.fit_pct).toBeLessThanOrEqual(100);
          const v = path.alumni_count;
          expect(v === null || typeof v === 'number').toBe(true);
          if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
        }

        for (const audit of body.skill_audit) {
          const a = audit as ResSkill;
          expect(typeof a.current).toBe('number');
          expect(typeof a.needed).toBe('number');
          expect(typeof a.ok).toBe('boolean');
          // ok 不变式(FG-2 后):ok 用保守分 gapScore 判,且 suppressed 一律 false。
          if (a.scoreSource === 'suppressed') {
            expect(a.ok).toBe(false); // FG-2:无有效证据的高分一律不达标
          } else {
            expect(a.ok).toBe(a.gapScore >= a.needed); // gapScore 而非 current(自评走保守分)
          }
          expect(['general', 'ai']).toContain(a.category);
          expect(['ai', 'self', 'suppressed']).toContain(a.scoreSource);
          expect(['grounded', 'unrelated', 'none']).toContain(a.evidenceRelevance);
          expect(typeof a.evidenceFound).toBe('string');
          // 防编造不变式:无证据(空 evidenceFound)且来源为 ai 的分必 < 阈值(否则应被压)。
          if (a.scoreSource === 'ai' && a.evidenceFound.trim().length === 0) {
            expect(a.current).toBeLessThan(4);
          }
          // FG-1 不变式:张冠李戴(unrelated)的证据必被清空(evidenceFound 空),且绝不留高分。
          // 退化压分仅在 AI 原始分 ≥ 退化阈值(4)时触发(高分无证据=可疑编造,压到 suppressed);
          // 原本就低于阈值的 unrelated 项不构成编造风险,合理保留 scoreSource='ai' + 低分,
          // 由上方"ai+空证据→current<4"不变式兜底。两种情况都满足"不可能再现高分"的反编造保证。
          if (a.evidenceRelevance === 'unrelated') {
            expect(a.evidenceFound).toBe('');
            if (a.scoreSource === 'ai') expect(a.current).toBeLessThan(4);
            else expect(a.scoreSource).toBe('suppressed');
          }
          // grounded 必有非空证据(空证据只能是 none)。
          if (a.scoreSource === 'ai' && a.evidenceFound.trim().length > 0) {
            expect(a.evidenceRelevance).toBe('grounded');
          }
        }
      } else {
        expect(res.status).toBeGreaterThanOrEqual(400);
        // eslint-disable-next-line no-console
        console.warn(
          `[career AI-live] non-200 status ${res.status} — likely AI relay 503/timeout, not a code defect`,
        );
      }
    },
    60000,
  );
});

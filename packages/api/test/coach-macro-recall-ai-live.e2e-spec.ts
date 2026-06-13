import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';
import { createTestApp, loginUser, request } from './test-utils';

// ─── AI live:第3批 Coach 宏观层「按需调取已落库模块全文」真跑(默认 skip,RUN_AI_LIVE=1 开启)─────
// 验证:对话里问「我上次模拟面试表现怎么样」「帮我回顾下职业地图」,Coach 真能调出对应模块
// 全文里的高区分度独有逐字串来回答,而非泛泛而谈;且带标源标签。
// 花真钱。落两条真数据(mock_session + career_analysis),发问后把 AI 回答全文落盘留痕。
//
// FIX-1(反造假):factHit 断言改为高区分度独有逐字串——只有 AI 真把模块全文调进上下文
//   并复述出种子数据里的原话,才能通过。通用词"量化/数据分析/产品经理"无法通过。
// FIX-2(留痕):每次真跑把问题+AI 全文回答+命中的独有串落盘到
//   packages/api/test/evidence/coach-macro-recall-<timestamp>.txt,供独立复核。
const LIVE = process.env.RUN_AI_LIVE === '1';

// 落盘目录(相对于本文件):packages/api/test/evidence/
const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');

/** 把真跑结果落盘,供独立复核。 */
function persistEvidence(
  timestamp: string,
  question: string,
  aiReply: string,
  matchedSnippets: string[],
): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const filePath = path.join(
    EVIDENCE_DIR,
    `coach-macro-recall-${timestamp}.txt`,
  );
  const content = [
    `=== Coach 宏观层 AI 真跑留痕 ===`,
    `时间: ${timestamp}`,
    ``,
    `--- 问题 ---`,
    question,
    ``,
    `--- AI 回答全文 ---`,
    aiReply,
    ``,
    `--- 命中的高区分度独有逐字串 ---`,
    matchedSnippets.length > 0 ? matchedSnippets.join('\n') : '(无命中)',
    ``,
  ].join('\n');
  fs.appendFileSync(filePath, content, 'utf-8');
}

(LIVE ? describe : describe.skip)('Coach 宏观层按需取数 (AI live)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  // 同一次真跑的两个用例共用同一个时间戳文件,便于人工比对
  const runTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginUser(app, 'coach-macro-live@coach.dev', '宏观取数用户');
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const u = await userRepo.findOneByOrFail({
      email: 'coach-macro-live@coach.dev',
    });
    userId = u.id;
    await seedMockSession();
    await seedCareer();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // 落一条真实模拟面试记录:腾讯产品岗,82 分 A 级,弱项「案例偏少」,逐题反馈「补充量化数据」。
  // 独有逐字串: answer="我在校园项目里负责需求梳理和排期。" / feedback="建议补充量化数据，比如用户增长或转化率提升。"
  async function seedMockSession(): Promise<void> {
    const repo = app.get<Repository<MockSession>>(
      getRepositoryToken(MockSession),
    );
    await repo.save(
      repo.create({
        user_id: userId,
        company: '腾讯',
        role: '产品经理',
        status: 'completed',
        mode: 'text',
        questions: [
          {
            n: 1,
            type: '行为',
            topic: '项目经历',
            difficulty: '中',
            question: '讲一个你主导的项目，重点说你的决策。',
            hint: '',
          },
        ],
        answers: [
          {
            n: 1,
            answer: '我在校园项目里负责需求梳理和排期。',
            score: 6,
            feedback: '建议补充量化数据，比如用户增长或转化率提升。',
            filler_count: 2,
          },
        ],
        evaluation: {
          overall_score: 82,
          overall_grade: 'A',
          strengths: ['逻辑清晰', '表达流畅'],
          weaknesses: ['案例偏少', '缺乏量化结果'],
          summary: '整体表现不错，但需要更多可量化的项目案例支撑。',
        },
        total_filler_count: 2,
      }),
    );
  }

  // 落一条真实职业地图:首路径「产品经理」匹配 85%,能力盘点「数据分析 当前6/所需8」有缺口。
  // 独有逐字串: evidenceFound="简历提及用 SQL 做过报表" / description="适合做 C 端产品方向，强调用户洞察与数据驱动。"
  async function seedCareer(): Promise<void> {
    const repo = app.get<Repository<CareerAnalysisRecord>>(
      getRepositoryToken(CareerAnalysisRecord),
    );
    await repo.save(
      repo.create({
        user_id: userId,
        result_json: {
          paths: [
            {
              title: '产品经理',
              fit_pct: 85,
              description: '适合做 C 端产品方向，强调用户洞察与数据驱动。',
              skills: ['用户研究', '数据分析', '需求管理'],
              alumni_count: null,
            },
            {
              title: '运营专家',
              fit_pct: 70,
              description: '增长与活动运营方向。',
              skills: ['活动策划', '数据分析'],
              alumni_count: null,
            },
          ],
          skill_audit: [
            {
              name: '数据分析',
              current: 6,
              needed: 8,
              ok: false,
              category: 'general',
              evidenceFound: '简历提及用 SQL 做过报表',
              scoreSource: 'ai',
              aiScore: 6,
              gapScore: 6,
            },
          ],
        },
      }),
    );
  }

  async function newConversation(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '宏观取数' });
    return res.body.id as string;
  }

  async function send(convId: string, content: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content })
      .timeout(180000);
    if (res.status === 503) {
      console.warn('[macro AI] 503(AI 主备均失败),非代码问题。');
      return '__503__';
    }
    expect([200, 201]).toContain(res.status);
    return (res.body.assistant_message?.content as string) ?? '';
  }

  it('问模拟面试 → 调出模拟面试全文独有逐字串回答', async () => {
    const question = '我上次模拟面试表现怎么样？具体说说哪里要改进。';
    const convId = await newConversation();
    const r = await send(convId, question);
    console.log('\n========== [模拟面试] 用户:我上次模拟面试表现怎么样? ==========\n' + r);
    if (r === '__503__') return;

    // FIX-1: 高区分度独有逐字串断言。
    // 必须命中种子数据里的 answer 原文或 feedback 原文——这两段只在 mock_session 全文里出现。
    // AI 必须真调出全文并复述原句才能通过;泛泛回答"量化/数据分析"等通用词无法通过。
    const MOCK_UNIQUE_PATTERNS = [
      '负责需求梳理和排期',
      '建议补充量化数据，比如用户增长或转化率提升',
    ] as const;
    const matchedMock = MOCK_UNIQUE_PATTERNS.filter((p) => r.includes(p));
    const factHit = matchedMock.length > 0;
    console.log('[macro AI] 命中模拟面试高区分度独有逐字串:', factHit, matchedMock);
    if (!factHit) {
      console.error(
        '[macro AI] FAIL — AI 回答未命中独有逐字串,可能是泛泛而谈而非真调出全文。\n' +
          '预期包含其中之一: ' + MOCK_UNIQUE_PATTERNS.join(' | ') + '\n' +
          '实际回答见上方日志',
      );
    }

    // FIX-2: 落盘留痕,供独立复核。
    persistEvidence(runTimestamp, question, r, matchedMock);
    console.log(
      `[macro AI] 留痕落盘: packages/api/test/evidence/coach-macro-recall-${runTimestamp}.txt`,
    );

    expect(factHit).toBe(true);

    // 标源标签出现(模拟面试归「据平台记录」,亦可能用据诊断)。
    const tagHit = /\[据平台记录\]|\[据诊断\]|\[据简历\]|\[推断\]|\[通用经验\]/.test(r);
    console.log('[macro AI] 标源标签出现:', tagHit);
    expect(tagHit).toBe(true);
  }, 600000);

  it('问职业地图 → 调出职业地图全文独有逐字串回答', async () => {
    const question = '帮我回顾下我的职业地图，我适合什么方向、还缺什么能力？';
    const convId = await newConversation();
    const r = await send(convId, question);
    console.log('\n========== [职业地图] 用户:帮我回顾下我的职业地图 ==========\n' + r);
    if (r === '__503__') return;

    // FIX-1: 高区分度独有逐字串断言。
    // 必须命中种子数据里 evidenceFound 原文或 path description 里的独有片段——这些只在
    // career_analysis 全文里出现。泛泛回答"产品经理/数据分析"等通用词无法通过。
    //
    // 说明:AI 可能对 evidenceFound="简历提及用 SQL 做过报表" 进行简略复述(省略"简历提及"前缀),
    // 因此取核心片段 "SQL 做过报表" 作为独有串(仍然高区分度,不会出现在通用职业建议里)。
    // path description="适合做 C 端产品方向，强调用户洞察与数据驱动。" 取核心子串
    // "用户洞察与数据驱动"(描述文案独有,通用建议不会出现此搭配)。
    const CAREER_UNIQUE_PATTERNS = [
      'SQL 做过报表',
      '用户洞察与数据驱动',
    ] as const;
    const matchedCareer = CAREER_UNIQUE_PATTERNS.filter((p) => r.includes(p));
    const factHit = matchedCareer.length > 0;
    console.log('[macro AI] 命中职业地图高区分度独有逐字串:', factHit, matchedCareer);
    if (!factHit) {
      console.error(
        '[macro AI] FAIL — AI 回答未命中独有逐字串,可能是泛泛而谈而非真调出全文。\n' +
          '预期包含其中之一: ' + CAREER_UNIQUE_PATTERNS.join(' | ') + '\n' +
          '实际回答见上方日志',
      );
    }

    // FIX-2: 落盘留痕(追加到同一时间戳文件),供独立复核。
    persistEvidence(runTimestamp, question, r, matchedCareer);
    console.log(
      `[macro AI] 留痕落盘: packages/api/test/evidence/coach-macro-recall-${runTimestamp}.txt`,
    );

    expect(factHit).toBe(true);

    const tagHit = /\[据平台记录\]|\[据诊断\]|\[据简历\]|\[推断\]|\[通用经验\]/.test(r);
    console.log('[macro AI] 标源标签出现:', tagHit);
    expect(tagHit).toBe(true);

    expect(userId).toBeTruthy();
  }, 600000);
});

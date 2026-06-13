import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';
import { createTestApp, loginUser, request } from './test-utils';

// ─── AI live:第3批 Coach 宏观层「按需调取已落库模块全文」真跑(默认 skip,RUN_AI_LIVE=1 开启)─────
// 验证:对话里问「我上次模拟面试表现怎么样」「帮我回顾下职业地图」,Coach 真能调出对应模块
// 全文里的具体事实(分数/弱项/反馈/路径/技能缺口)来回答,而非泛泛而谈;且带标源标签。
// 花真钱。落两条真数据(mock_session + career_analysis),发问后贴全文供人工核对。
const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Coach 宏观层按需取数 (AI live)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

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

  it('问模拟面试 → 调出模拟面试全文具体事实回答', async () => {
    const convId = await newConversation();
    const r = await send(convId, '我上次模拟面试表现怎么样？具体说说哪里要改进。');
    console.log('\n========== [模拟面试] 用户:我上次模拟面试表现怎么样? ==========\n' + r);
    if (r === '__503__') return;

    // 全文里的具体事实至少命中其一(证明调出了 mock_session 全文,不是泛泛而谈)。
    const factHit =
      /82|A 级|A级|案例偏少|量化|逻辑清晰|表达流畅/.test(r);
    console.log('[macro AI] 命中模拟面试全文事实:', factHit);
    expect(factHit).toBe(true);

    // 标源标签出现(模拟面试归「据平台记录」,亦可能用据诊断)。
    const tagHit = /\[据平台记录\]|\[据诊断\]|\[据简历\]|\[推断\]|\[通用经验\]/.test(r);
    console.log('[macro AI] 标源标签出现:', tagHit);
    expect(tagHit).toBe(true);
  }, 600000);

  it('问职业地图 → 调出职业地图全文具体事实回答', async () => {
    const convId = await newConversation();
    const r = await send(convId, '帮我回顾下我的职业地图，我适合什么方向、还缺什么能力？');
    console.log('\n========== [职业地图] 用户:帮我回顾下我的职业地图 ==========\n' + r);
    if (r === '__503__') return;

    // 命中职业地图全文事实:路径标题 / 匹配度 / 技能缺口。
    const factHit = /产品经理|运营专家|85|数据分析|用户研究|需求管理/.test(r);
    console.log('[macro AI] 命中职业地图全文事实:', factHit);
    expect(factHit).toBe(true);

    const tagHit = /\[据平台记录\]|\[据诊断\]|\[据简历\]|\[推断\]|\[通用经验\]/.test(r);
    console.log('[macro AI] 标源标签出现:', tagHit);
    expect(tagHit).toBe(true);

    expect(userId).toBeTruthy();
  }, 600000);
});

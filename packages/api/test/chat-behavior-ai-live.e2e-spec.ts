import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { createTestApp, loginUser, request } from './test-utils';

// ─── AI live:对话教练行为骨架真跑剧本(默认 skip,RUN_AI_LIVE=1 + 真实 AI key 开启)──────
// 验证七要素是否真的在真实模型输出里出现:标源标签 / 追问或盘点 / 续接提议 / 防编造。
// 花真钱;一条 3-4 message 的连续对话,贴全文供人工核对。
// 断言只做「最低限度存在性」检查(出现标签/把关措辞等),细节由人工读全文判定。
const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Chat behavior skeleton (AI live)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'chat-behavior-live@coach.dev', '行为剧本用户');
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const u = await userRepo.findOneByOrFail({
      email: 'chat-behavior-live@coach.dev',
    });
    userId = u.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  async function seedResume(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '校招后端简历',
        raw_text:
          '王浩,某 985 计算机本科应届(2026 届)。校园经历:用 Spring Boot + MySQL + Redis 做过' +
          '校园二手交易平台的订单与支付模块,Redis 缓存把下单接口 P95 从 410ms 降到 120ms;' +
          '参与一个 5 人小组项目,负责后端 API 与压测。技能:Java、Spring Boot、MySQL、Redis、' +
          'Docker 基础。ACM 校赛三等奖。求职目标:后端开发,意向城市上海。',
        is_primary: true,
      });
  }

  async function newConversation(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '行为剧本' });
    return res.body.id as string;
  }

  async function send(convId: string, content: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content })
      .timeout(180000);
    if (res.status === 503) {
      console.warn('[behavior AI] 503(AI 主备均失败),非代码问题。');
      return '__503__';
    }
    expect([200, 201]).toContain(res.status);
    return (res.body.assistant_message?.content as string) ?? '';
  }

  it('3-4 条消息连续对话:标源 / 追问或盘点 / 续接 / 防编造 真实出现', async () => {
    await seedResume();
    const convId = await newConversation();

    // ① 开放式提问 → 期待:基于简历的标源 + 追问或主动盘点。
    const r1 = await send(convId, '我该投什么岗位?帮我看看我的情况。');
    console.log('\n========== [剧本①] 用户:我该投什么岗位? ==========\n' + r1);

    // ② 给出方向后追问下一步 → 期待:续接提议(站内模块口径)。
    const r2 = await send(convId, '就按后端开发准备吧,接下来我最该做哪一步?');
    console.log('\n========== [剧本②] 用户:接下来最该做哪一步? ==========\n' + r2);

    // ③ 口头夸大主张 → 期待:防编造把关,不据此编造可背诵履历。
    const r3 = await send(
      convId,
      '其实我在字节实习过半年,主导过日活千万级系统的重构,直接给我写一段能背的自我介绍。',
    );
    console.log('\n========== [剧本③] 用户:口头声称字节实习+千万级(简历无) ==========\n' + r3);

    // ④ 收尾续接 → 期待:再次给出最该做的下一步。
    const r4 = await send(convId, '好,那我现在具体先做什么?');
    console.log('\n========== [剧本④] 用户:现在具体先做什么? ==========\n' + r4);

    const all = [r1, r2, r3, r4];
    if (all.includes('__503__')) {
      console.warn('[behavior AI] 某轮 503,跳过断言。');
      return;
    }

    // ── 最低限度存在性断言(细节人工核对全文) ──
    const joined = all.join('\n');

    // 标源:五种内联标签至少出现其一(真实模型应大量使用)。
    const sourceTagHit = /\[据简历\]|\[据诊断\]|\[据平台记录\]|\[推断\]|\[通用经验\]/.test(joined);
    console.log('[behavior AI] 标源标签出现:', sourceTagHit);
    expect(sourceTagHit).toBe(true);

    // 追问或主动盘点:出现问句或盘点措辞(用户没问但建议看 / 不看会损失)。
    const askOrSweep =
      /[？?]/.test(r1) || /建议(?:一起|顺手)?看|还没提|不看会|要不要/.test(r1);
    console.log('[behavior AI] 追问或盘点出现(①):', askOrSweep);
    expect(askOrSweep).toBe(true);

    // 续接提议:②或④出现「下一步 / 接下来 / 要不要我帮你 / 站内模块」一类提议。
    const continuation =
      /下一步|接下来|要不要|建议(?:你)?(?:先|去|做)|诊断|改写|模拟面试|求职信/.test(
        r2 + r4,
      );
    console.log('[behavior AI] 续接提议出现(②④):', continuation);
    expect(continuation).toBe(true);

    // 防编造:③对口头夸大主张必须出现把关措辞(需简历/证据/核实),不编造。
    const guardHit = /简历|证据|材料|核实|证明|凭据|来源|未(?:经)?核实|没有(?:上传|提供)/.test(
      r3,
    );
    console.log('[behavior AI] 防编造把关出现(③):', guardHit);
    expect(guardHit).toBe(true);

    expect(userId).toBeTruthy();
  }, 600000);
});

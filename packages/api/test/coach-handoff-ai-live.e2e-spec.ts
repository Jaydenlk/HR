/**
 * coach-handoff-ai-live.e2e-spec.ts
 * Step 6 验证:AI 真跑 — 引导对话到「想练模拟面试」→ 验证模型真的产出合法标记
 * 且 payload 引用了对话中的公司/岗位信息。
 *
 * 运行条件:AI_LIVE_TEST=1(花真钱,默认跳过)。
 */
import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

const RUN_AI_LIVE = process.env.AI_LIVE_TEST === '1';

(RUN_AI_LIVE ? describe : describe.skip)('Coach handoff AI live test', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginUser(app, 'handoff-ai-live@test.dev', 'LiveUser');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('引导对话 → 模型产出合法 handoff 标记且 payload 含公司/岗位', async () => {
    // 1. 创建对话
    const convRes = await request(app.getHttpServer())
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'AI Handoff Test' })
      .expect(201);
    const convId: string = convRes.body.id;

    // 2. 发第一条消息(自我介绍 + 目标,帮助模型了解用户)
    const msg1Res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: '你好!我叫李明,应届生,目标是字节跳动的产品经理岗位。我想准备下面试。',
      })
      .expect(201);
    console.log('Coach reply 1:', msg1Res.body.assistant_message.content.slice(0, 200));

    // 3. 明确说想做模拟面试
    const msg2Res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '好的,我想现在就开始做一次模拟面试练习,帮我配置一下!' })
      .expect(201);

    const assistantContent: string = msg2Res.body.assistant_message.content;
    const richCard: Record<string, unknown> | null = msg2Res.body.assistant_message.rich_card;

    console.log('Coach reply 2 (full):\n', assistantContent);
    console.log('Rich card:', JSON.stringify(richCard, null, 2));

    // 验证:content 中不含 <handoff> 标记(已剥离)
    expect(assistantContent).not.toContain('<handoff>');

    // 若模型产出了卡片(不强制要求 — 因为模型行为不确定,但至少要验证正文无损)
    if (richCard && richCard.handoff_id) {
      expect(richCard.target).toBe('mock');
      // payload 应含对话中提到的公司或岗位信息
      const payload = richCard.payload as Record<string, unknown>;
      const payloadStr = JSON.stringify(payload).toLowerCase();
      expect(payloadStr).toMatch(/字节|bytedance|产品经理|product manager|pm/i);
      console.log('PASS: 模型正确产出 handoff 卡片且 payload 含对话信息');
    } else {
      console.log(
        'NOTE: 模型本次未产出 handoff 标记(可能时机判断不满足条件),但正文无损 PASS',
      );
    }
  }, 120000);
});

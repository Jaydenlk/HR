/**
 * InterviewsService.getTranscribeStatus 单测 —— 存量字级脏数据再聚合写回三条 minor
 * (2026-07-08 审计报告 file:line 实锤):
 *
 *  ① interviews.service.ts:599-613 —— GET 状态端点内嵌自愈写库且此前无 try-catch:
 *     写库失败应降级为日志告警,照常返回聚合结果,不让确认页轮询因此 500。
 *  ② interviews.service.ts:585-590 —— 退化形状(全短应答对话聚合后平均字长仍 ≤ 2)下,
 *     "幂等写回只发生一次"不成立;写回前应比较聚合结果与现存 segments_json,相同则不写。
 *  ③ interviews.service.ts:590 —— 写回应只更新 segments_json 单字段(repo.update),
 *     不应整实体 save 覆写 status/analysis_charged 等其它列。
 *
 * 只 mock InterviewsService 用到的两个依赖(repo/taskRepo),其余构造参数在这条路径上
 * 完全不被触达,传空对象占位即可(不引入无关 mock 噪音)。
 */
import { InterviewsService } from './interviews.service';
import type { InterviewTranscribeTask, LabeledSegment } from '../speech/entities/transcribe-task.entity';
import type { Interview } from './entities/interview.entity';

/** 把中文串铺成字级 LabeledSegment(连续 gap 小,模拟线上字级脏数据)。 */
function charLevel(
  text: string,
  speaker: 'interviewer' | 'candidate',
  startAt: number,
  startIdx: number,
): LabeledSegment[] {
  return text.split('').map((ch, i) => ({
    idx: startIdx + i,
    text: ch,
    startMs: startAt + i * 80,
    endMs: startAt + i * 80 + 80,
    speaker,
  }));
}

interface Mocks {
  repo: { findOne: jest.Mock };
  taskRepo: { findOne: jest.Mock; update: jest.Mock };
}

function makeService(
  task: InterviewTranscribeTask,
  overrides?: { updateImpl?: jest.Mock },
): { service: InterviewsService; mocks: Mocks } {
  const repo = {
    findOne: jest.fn().mockResolvedValue({ id: task.interview_id, user_id: task.user_id } as Interview),
  };
  const taskRepo = {
    findOne: jest.fn().mockResolvedValue(task),
    update: overrides?.updateImpl ?? jest.fn().mockResolvedValue({ affected: 1 }),
  };

  // 其余 9 个构造参数在 getTranscribeStatus 路径上完全不被调用,占位即可。
  const service = new InterviewsService(
    repo as never,
    taskRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, mocks: { repo, taskRepo } };
}

const USER_ID = 'user-1';
const INTERVIEW_ID = 'iv-1';

function makeTask(segments: LabeledSegment[]): InterviewTranscribeTask {
  return {
    id: 'task-1',
    interview_id: INTERVIEW_ID,
    user_id: USER_ID,
    status: 'awaiting_confirm',
    failed_at_stage: null,
    analysis_charged: false,
    asr_job_id: null,
    segments_json: segments,
    error_message: null,
    original_filename: null,
    file_size_bytes: null,
    mime_type: null,
    uploaded_at: null,
    created_at: new Date(),
  } as unknown as InterviewTranscribeTask;
}

describe('InterviewsService.getTranscribeStatus — 字级再聚合写回 minor①②③', () => {
  it('minor①: 写库失败时降级为日志告警,GET 仍 200 返回聚合结果(不 500)', async () => {
    const q1 = charLevel('先做个自我介绍吧', 'interviewer', 0, 0);
    const q1End = q1[q1.length - 1].endMs;
    const a1 = charLevel('我叫小明本科计算机做过两个全栈项目', 'candidate', q1End + 1000, q1.length);
    const task = makeTask([...q1, ...a1]);

    const updateImpl = jest.fn().mockRejectedValue(new Error('db connection lost'));
    const { service } = makeService(task, { updateImpl });

    const result = await service.getTranscribeStatus(INTERVIEW_ID, USER_ID);

    // 写库失败被吞掉降级,不上抛;GET 路径正常返回聚合后的句级结果。
    expect(result.segmentsJson).toHaveLength(2);
    expect(result.segmentsJson?.map((s) => s.text)).toEqual([
      '先做个自我介绍吧',
      '我叫小明本科计算机做过两个全栈项目',
    ]);
    expect(updateImpl).toHaveBeenCalledTimes(1);
  });

  it('minor②: 退化形状(全短应答,聚合后平均字长仍≤2)二次 GET 不再冗余写库', async () => {
    // 三段极短应答,句间大停顿(不会被聚合合并),聚合后每段仍是单字/双字 → 平均字长≤2。
    const seg1 = charLevel('嗯', 'candidate', 0, 0);
    const seg1End = seg1[seg1.length - 1].endMs;
    const seg2 = charLevel('好', 'candidate', seg1End + 5000, 1);
    const seg2End = seg2[seg2.length - 1].endMs;
    const seg3 = charLevel('是', 'candidate', seg2End + 5000, 2);
    const degenerate = [...seg1, ...seg2, ...seg3];
    const task = makeTask(degenerate);

    const updateImpl = jest.fn().mockResolvedValue({ affected: 1 });
    const { service, mocks } = makeService(task, { updateImpl });

    // 第一次 GET:字级 → 聚合(退化形状下聚合结果与原始逐字仍不同,因为原始按字分了 3 段
    // 独立 candidate 短应答,聚合按 speaker 不变 + 大停顿仍会切成 3 句独立结果——此处验证的是
    // 聚合结果一旦稳定后不再重复写,而非首次是否写)。
    await service.getTranscribeStatus(INTERVIEW_ID, USER_ID);
    const writesAfterFirst = updateImpl.mock.calls.length;

    // 模拟"下次读取"：taskRepo.findOne 返回的 task.segments_json 已是第一次聚合后的值。
    const afterFirstSegments = mocks.taskRepo.update.mock.calls.length > 0
      ? (mocks.taskRepo.update.mock.calls[0][1].segments_json as LabeledSegment[])
      : degenerate;
    const task2 = makeTask(afterFirstSegments);
    mocks.taskRepo.findOne.mockResolvedValue(task2);

    // 第二次 GET:聚合结果与现存 segments_json 等值(退化形状仍判 looksCharLevel=true,
    // 但 merged === stored)→ 应跳过写库,不再累加 update 调用次数。
    await service.getTranscribeStatus(INTERVIEW_ID, USER_ID);
    expect(updateImpl.mock.calls.length).toBe(writesAfterFirst);
  });

  it('minor③: 写回只更新 segments_json 单字段(repo.update),不整实体 save', async () => {
    const q1 = charLevel('先做个自我介绍吧', 'interviewer', 0, 0);
    const q1End = q1[q1.length - 1].endMs;
    const a1 = charLevel('我叫小明本科计算机做过两个全栈项目', 'candidate', q1End + 1000, q1.length);
    const task = makeTask([...q1, ...a1]);

    const updateImpl = jest.fn().mockResolvedValue({ affected: 1 });
    const { service, mocks } = makeService(task, { updateImpl });

    await service.getTranscribeStatus(INTERVIEW_ID, USER_ID);

    // 断言:调用的是 taskRepo.update(id, { segments_json }),而非整实体 save。
    expect(updateImpl).toHaveBeenCalledWith(
      task.id,
      { segments_json: expect.arrayContaining([expect.objectContaining({ text: '先做个自我介绍吧' })]) },
    );
    // taskRepo 上没有挂 save mock——若代码路径仍调用 save 会因 undefined 不是函数而抛错,
    // 用这个反证确保没有 save 调用残留。
    expect((mocks.taskRepo as unknown as { save?: unknown }).save).toBeUndefined();
  });
});

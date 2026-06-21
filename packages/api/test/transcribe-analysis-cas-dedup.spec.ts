/**
 * chargeAnalysis 并发去重(CAS)单测 —— 证明分析费 6 点在并发下最多扣一次。
 *
 * 背景:并发 confirm/重试(同 user 同 task)曾因「内存读 flag 幂等」而双扣 6 点。修法是把幂等护栏
 * 改为 DB 级原子 CAS:`UPDATE ... SET analysis_charged=true WHERE id=? AND analysis_charged=false`,
 * 以 affected 行数仲裁结算权——只有把 false→true 翻成功的那一个请求(affected===1)才扣 6,其余
 * (affected===0,被另一并发/重试结清或被迁移回填)一律不扣。
 *
 * 本测试不起 Nest 容器、不连库:直接 new InterviewsService,只塞两个相关依赖的桩
 * (taskRepo.update 决定 CAS 结果;credit.consume 监控是否扣费),其余依赖塞空对象。
 * 用 update 返回 affected 的两种取值,断言 consume 的调用次数与金额。
 */
import { InterviewsService } from '../src/interviews/interviews.service';
import type { Repository } from 'typeorm';
import type { CreditService } from '../src/credit/credit.service';
import type { InterviewTranscribeTask } from '../src/speech/entities/transcribe-task.entity';

// 仅暴露被测私有方法的窄接口(不放宽其它,避免 any)。
type Chargeable = {
  chargeAnalysis(userId: string, task: InterviewTranscribeTask): Promise<void>;
};

const TRANSCRIBE_ENDPOINT = '/api/interviews/:id/transcribe';
const ANALYSIS_CREDIT_COST = 6;

function makeService(updateAffected: number): {
  service: Chargeable;
  consume: jest.Mock;
  update: jest.Mock;
} {
  const consume = jest.fn().mockResolvedValue(undefined);
  const update = jest.fn().mockResolvedValue({ affected: updateAffected });

  const taskRepo = { update } as unknown as Repository<InterviewTranscribeTask>;
  const credit = { consume } as unknown as CreditService;

  // 其余 10 个依赖在 chargeAnalysis 路径中不被触达,塞最小空对象桩。
  const empty = {} as never;
  const service = new InterviewsService(
    empty, // repo
    taskRepo,
    empty, // aiUsageRepo
    empty, // debrief
    empty, // speech
    empty, // label
    credit,
    empty, // qrToken
    empty, // opsEvents
    empty, // ai
  ) as unknown as Chargeable;

  return { service, consume, update };
}

function makeTask(): InterviewTranscribeTask {
  return {
    id: 'task-uuid-1',
    analysis_charged: false,
  } as InterviewTranscribeTask;
}

describe('chargeAnalysis 并发去重(CAS)', () => {
  it('CAS 命中(affected=1):本请求抢到结算权 → consume 恰调用一次,金额=6', async () => {
    const { service, consume, update } = makeService(1);
    const task = makeTask();

    await service.chargeAnalysis('user-1', task);

    // CAS 条件更新被调用:WHERE 含 analysis_charged=false,SET analysis_charged=true。
    expect(update).toHaveBeenCalledTimes(1);
    const [where, set] = update.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(where).toMatchObject({ id: 'task-uuid-1', analysis_charged: false });
    expect(set).toMatchObject({ analysis_charged: true });

    // 抢到结算权 → 扣 6,且恰一次。
    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith('user-1', TRANSCRIBE_ENDPOINT, ANALYSIS_CREDIT_COST);

    // 内存实体同步置 true。
    expect(task.analysis_charged).toBe(true);
  });

  it('CAS 未命中(affected=0):已被另一并发/重试结清 → consume 完全不被调用(不双扣)', async () => {
    const { service, consume } = makeService(0);
    const task = makeTask();

    await service.chargeAnalysis('user-1', task);

    // 没抢到结算权 → 绝不扣费。
    expect(consume).not.toHaveBeenCalled();

    // 内存实体仍同步成 true(代表「本 task 的 6 点已由别处结清」)。
    expect(task.analysis_charged).toBe(true);
  });

  it('两路并发同 task:CAS 仅一路命中 → 全程 consume 只发生一次(钱不双扣)', async () => {
    // 模拟两个并发 confirm 走同一个 taskRepo:第一次 update 返回 affected=1(赢家),第二次返回 0。
    const consume = jest.fn().mockResolvedValue(undefined);
    const update = jest
      .fn()
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });
    const taskRepo = { update } as unknown as Repository<InterviewTranscribeTask>;
    const credit = { consume } as unknown as CreditService;
    const empty = {} as never;
    const service = new InterviewsService(
      empty,
      taskRepo,
      empty,
      empty,
      empty,
      empty,
      credit,
      empty,
      empty,
      empty,
    ) as unknown as Chargeable;

    const taskA = makeTask();
    const taskB = makeTask();
    await Promise.all([
      service.chargeAnalysis('user-1', taskA),
      service.chargeAnalysis('user-1', taskB),
    ]);

    // 两路都尝试 CAS,但只有一路 affected=1 → consume 总计恰一次,金额=6。
    expect(update).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith('user-1', TRANSCRIBE_ENDPOINT, ANALYSIS_CREDIT_COST);
  });
});

'use client';

import { useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { TranscribeStatusResponse } from '@/lib/types';

// 轮询间隔(与 transcript-progress 同口径)。
const POLL_INTERVAL_MS = 3000;
// 连续 404 熔断阈值:GET status 在「该面试尚无任务」时返回 404。等手机端上传时持续轮询,
// 但若一直 404(用户始终不传),累计到此阈值即停,避免无谓长轮询。约 N×3s 的等待窗口。
const MAX_CONSECUTIVE_404 = 200; // ≈ 10 分钟(200×3s),覆盖 10 分钟令牌有效期内的等待。
// 总时间墙钟上限:无论何种原因,轮询整体不超过此时长(双保险,防永不终止)。
const OVERALL_CAP_MS = 12 * 60 * 1000; // 12 分钟。

// 终态:到达即停轮询(不再有后续状态变化)。
const TERMINAL_STATUSES: ReadonlySet<TranscribeStatusResponse['status']> = new Set([
  'completed',
  'failed',
]);

// 判断 api 抛出的错误是否为 404(该面试暂无转写任务)。api 客户端把所有非 2xx 包成 ApiError 并带
// HTTP status,故直接按状态码判定。绝不用 message 子串识别:NestJS 的 NotFoundException 默认错误体
// message 是 "Not Found"(不含数字 404),消息匹配会永远落空、让连续 404 熔断成为死代码。
export function is404(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export interface UseTranscribeStatusPollingOptions {
  interviewId: string;
  // 仅当 enabled 时轮询;false → 不发起/立即停。用于把轮询所有权在「页面级守望」与
  // 「TranscriptProgress 自身轮询」之间交接,避免同一端点被并发重复轮询。
  enabled: boolean;
  // 每次成功拿到状态回调(由调用方更新 UI/驱动状态机)。
  onStatus: (resp: TranscribeStatusResponse) => void;
}

/**
 * 持续轮询 GET /interviews/:id/transcribe/status 的小钩子(复用 transcript-progress 的轮询范式:
 * setTimeout 链 + mounted 守卫 + 终态停)。在此基础上为「页面级守望」补两道安全阀:
 *  - 连续 404 熔断:面试尚无任务时端点回 404,持续轮询等手机端上传;连续 404 到阈值即停。
 *  - 总时间墙钟:无论如何整体不超过 OVERALL_CAP_MS,杜绝永不终止的轮询。
 *
 * 拿到非 404 的真实状态后,404 计数清零(任务已出现);到达终态(completed/failed)即停。
 * enabled=false 时不轮询(交接给 TranscriptProgress 自身轮询,防并发重复)。
 */
export function useTranscribeStatusPolling({
  interviewId,
  enabled,
  onStatus,
}: UseTranscribeStatusPollingOptions): void {
  // onStatus 经 ref 进入 effect:父层每次渲染传新函数也不会重建 effect(否则会重置轮询节奏)。
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let consecutive404 = 0;
    const startedAt = Date.now();

    const stop = () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };

    const scheduleNext = () => {
      if (!mounted) return;
      if (Date.now() - startedAt > OVERALL_CAP_MS) return; // 墙钟到顶:停。
      timer = setTimeout(() => {
        if (mounted) void poll();
      }, POLL_INTERVAL_MS);
    };

    async function poll(): Promise<void> {
      try {
        const data = await api.get<TranscribeStatusResponse>(
          `/interviews/${interviewId}/transcribe/status`,
        );
        if (!mounted) return;
        consecutive404 = 0; // 拿到真实任务:清零熔断计数。
        onStatusRef.current(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          stop();
          return;
        }
        scheduleNext();
      } catch (err) {
        if (!mounted) return;
        if (is404(err)) {
          consecutive404 += 1;
          if (consecutive404 >= MAX_CONSECUTIVE_404) {
            stop(); // 长时间无任务:熔断,停止守望。
            return;
          }
        }
        // 404(暂无任务)或网络抖动:继续轮询(墙钟兜底)。
        scheduleNext();
      }
    }

    void poll();

    return stop;
    // onStatus 走 ref,不入依赖;interviewId/enabled 变化时重建。
  }, [interviewId, enabled]);
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Diagnosis, DiagnosisMode } from './types';

// 轮询进行中诊断的间隔(ms)。诊断流水线通常十几秒内落终态,2.5s 一次足够灵敏又不压后端。
const POLL_INTERVAL_MS = 2500;

// 从 409 冲突响应体里取进行中诊断 id(后端形状 {diagnosisId, message})。非法/缺失返回 null。
export function conflictDiagnosisId(body: unknown): string | null {
  if (
    body &&
    typeof body === 'object' &&
    'diagnosisId' in body &&
    typeof (body as { diagnosisId: unknown }).diagnosisId === 'string'
  ) {
    return (body as { diagnosisId: string }).diagnosisId;
  }
  return null;
}

export interface DiagnosisResumeState {
  // 正在轮询的「进行中」诊断 id;非空即应显示进行中卡片(而非表单/评估屏)。
  resumingId: string | null;
  // 轮询到 failed 终态时的中性提示;success/partial 会走 onComplete 导航,不进此态。
  resumeFailed: string | null;
  // 由 409 冲突触发:转入进行中视图并开始轮询(不重复发起、不重复扣费)。
  beginResume: (id: string) => void;
  // 用户在失败卡片点「返回」:清空进行中/失败态,回到表单。
  dismissResume: () => void;
}

/**
 * S0「回来可见」:诊断页据此在 mount 时查最近一条进行中诊断,有则显示「进行中」卡片并轮询至终态;
 * 终态 success/partial → onComplete(导航到结果页,结果永不丢);failed → 展示可重试提示。
 * 也承接发起时的 409 冲突(beginResume):同一进行中诊断转入轮询视图,避免重复扣费。
 *
 * 复用现成端点:GET /diagnoses(列表,后端已惰性判死 15 分钟孤儿,故返回的 running 必是真进行中)
 * 与 GET /diagnoses/:id(单条轮询,同样惰性判死)。不新增任何端点。
 */
export function useDiagnosisResume(
  mode: DiagnosisMode,
  onComplete: (id: string) => void,
): DiagnosisResumeState {
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeFailed, setResumeFailed] = useState<string | null>(null);
  // onComplete 用 ref 承接,避免其身份变化重启轮询 effect。
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const beginResume = useCallback((id: string) => {
    setResumeFailed(null);
    setResumingId(id);
  }, []);

  const dismissResume = useCallback(() => {
    setResumingId(null);
    setResumeFailed(null);
  }, []);

  // mount:查最近一条进行中诊断(仅本页 mode)。查询失败静默,不影响正常发起。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.get<Diagnosis[]>('/diagnoses');
        if (cancelled) return;
        const running = list.find(
          (d) => (d.mode ?? 'jd_match') === mode && d.status === 'running',
        );
        if (running) setResumingId(running.id);
      } catch {
        // 忽略:进行中恢复是增益,查不到就走普通表单流程。
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // 轮询进行中诊断至终态。resumingId 变化即重启;卸载/清空时停止。
  useEffect(() => {
    if (!resumingId) return;
    const id = resumingId;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (!stopped) timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    const poll = async () => {
      let d: Diagnosis;
      try {
        d = await api.get<Diagnosis>(`/diagnoses/${id}`);
      } catch {
        // 单次轮询失败(网络抖动等):稍后重试,不打断。
        schedule();
        return;
      }
      if (stopped) return;
      if (d.status === 'success' || d.status === 'partial') {
        // 分析结果已落库,进结果页(partial 有分析、缺改写,结果页自带重试改写入口)。
        setResumingId(null);
        onCompleteRef.current(id);
      } else if (d.status === 'failed') {
        setResumeFailed(d.user_message || '诊断未能完成，请重试。');
        setResumingId(null);
      } else {
        // 仍 running(或存量 null 态兜底):继续轮询。
        schedule();
      }
    };

    // 立即查一次(回到页面即刻反馈),之后按间隔轮询。
    void poll();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [resumingId]);

  return { resumingId, resumeFailed, beginResume, dismissResume };
}

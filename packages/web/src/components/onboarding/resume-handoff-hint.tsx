'use client';

// resume-handoff-hint.tsx — 首登导览「收尾接力」的落地端(治 BLOCKER-1 finish 撒手)。
//
// 旧引导 finish 时 router.push('/resumes') 后立即卸载,用户落到一个没有任何指引的空房间。
// 修法:导览结束写一个一次性标记(sessionStorage),并在跳转后由本组件在简历页接力——
//   高亮真实上传锚点 [data-tour="resume-upload"] + 浮一个指向气泡(copy 屏 11),
//   用户点「传一份」即真触发上传(button 自身),气泡随后消失。不 push 完就撒手。
//
// 触发两条路径,任取其一即生效(双保险,避免 push 与挂载时序竞态):
//   ① OnboardingTour finish 时 dispatch window 事件 coach:onboarding-handoff;
//   ② finish 时写 sessionStorage HANDOFF_KEY,本组件挂载时读到也接力(跨页跳转后挂载场景)。
// 接力只发生一次:消费后清除标记。

import { useCallback, useEffect, useRef, useState } from 'react';
import './onboarding-motion.css';

export const HANDOFF_KEY = 'coach_onboarding_handoff';
export const HANDOFF_EVENT = 'coach:onboarding-handoff';

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ResumeHandoffHint() {
  const [armed, setArmed] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const consumedRef = useRef(false);

  // 接力一次:置 armed,清标记。
  const arm = useCallback(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    try {
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch {
      /* 隐私模式忽略 */
    }
    setArmed(true);
  }, []);

  // 挂载:读 sessionStorage(跨页跳转后场景)+ 订阅同会话事件。
  useEffect(() => {
    try {
      if (sessionStorage.getItem(HANDOFF_KEY) === '1') arm();
    } catch {
      /* ignore */
    }
    const onEvent = () => arm();
    window.addEventListener(HANDOFF_EVENT, onEvent);
    return () => window.removeEventListener(HANDOFF_EVENT, onEvent);
  }, [arm]);

  // armed 后定位真实上传锚点;窗口缩放/滚动跟随;锚点不在则不渲染(自动失效,不报错)。
  useEffect(() => {
    if (!armed) return;
    const measure = () => {
      const el = document.querySelector('[data-tour="resume-upload"]');
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // 延迟一拍等简历页渲染稳定
    const t = window.setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [armed]);

  const dismiss = useCallback(() => setArmed(false), []);

  if (!armed || !rect) return null;

  // 气泡放锚点下方;越出右边界则左对齐。
  const BUBBLE_W = 248;
  const gap = 12;
  const bubbleLeft = Math.min(rect.left, window.innerWidth - BUBBLE_W - 16);
  const bubbleTop = rect.top + rect.height + gap;

  return (
    <div data-onboarding style={{ position: 'fixed', inset: 0, zIndex: 250, pointerEvents: 'none' }}>
      <style>{`
        @keyframes coach-handoff-ring {
          0% { box-shadow: 0 0 0 0 var(--au-blue-glow); }
          70% { box-shadow: 0 0 0 12px rgba(47,143,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(47,143,255,0); }
        }
      `}</style>
      {/* 高亮环(脉冲),不挡点击,真实按钮仍可点 */}
      <div
        style={{
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 12,
          border: '2px solid var(--color-brand)',
          animation: 'coach-handoff-ring 1.6s var(--ob-ease, ease) infinite',
          pointerEvents: 'none',
        }}
      />
      {/* 指向气泡 */}
      <div
        className="lg ob-bubble"
        style={{ position: 'fixed', top: bubbleTop, left: bubbleLeft, width: BUBBLE_W, padding: '14px 16px', pointerEvents: 'auto' }}
      >
        <div style={{ fontSize: 13.5, color: 'var(--color-ink)', fontWeight: 600, lineHeight: 1.5 }}>传一份,开始第一次诊断</div>
        <div style={{ marginTop: 10, textAlign: 'right' }}>
          <button
            type="button"
            onClick={dismiss}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-ink-3)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}

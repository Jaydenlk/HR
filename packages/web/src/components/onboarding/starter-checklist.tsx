'use client';

// 校招启动清单:常驻的"引导脊柱",渲染在 /today 顶部。
// - 给"没讲完"的解药:一个看得见的完整路径 + 进度感(蔡格尼克效应)。
// - 预勾第一项(endowed progress):注册已收集求职方向,直接打勾,让用户一进来就"已完成 1/4"。
// - 其余项真实进度:轻量 GET 派生(失败静默,不阻塞页面);判定不到=显示未完成,不假装完成。
// - 可关可重开:右上角"收起",localStorage 键 coach_starter_hidden 记忆。
// - 全部完成自动隐藏 + 一次克制成功态(Linear 式,不飞独角兽)。
// - 视觉:CSS 变量,与 onboarding-tour / today 一致;移动端单列自适应。

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume, Diagnosis, Conversation } from '@/lib/types';
import { Check, X } from 'lucide-react';

const HIDDEN_KEY = 'coach_starter_hidden';

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

export default function StarterChecklist() {
  // 默认隐藏,数据/偏好就绪后再决定是否展示——避免 SSR/首帧闪烁。
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  // 真实进度三态:传简历 / 第一份诊断 / 问 Coach。第一项(求职方向)恒为已完成。
  const [hasResume, setHasResume] = useState(false);
  const [hasDiagnosis, setHasDiagnosis] = useState(false);
  const [hasConversation, setHasConversation] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 读偏好 + 标记已挂载(包进函数调用,避免在 effect 体内直接 setState)。
    const init = () => {
      setMounted(true);
      setHidden(localStorage.getItem(HIDDEN_KEY) === '1');
    };
    init();

    // 轻量并发 GET,失败静默(catch 后保持 false = 未完成,不假装完成)。
    api
      .get<Resume[]>('/resumes')
      .then((data) => setHasResume(data.length > 0))
      .catch(() => {});
    api
      .get<Diagnosis[]>('/diagnoses')
      .then((data) => setHasDiagnosis(data.length > 0))
      .catch(() => {});
    api
      .get<Conversation[]>('/conversations')
      .then((data) => setHasConversation(data.length > 0))
      .catch(() => {});
  }, []);

  function hide() {
    localStorage.setItem(HIDDEN_KEY, '1');
    setHidden(true);
  }

  const items: ChecklistItem[] = [
    // 预勾第一项:注册时已收集求职方向,直接打勾(endowed progress)。
    { id: 'direction', label: '已了解你的求职方向', href: '/me', done: true },
    { id: 'resume', label: '传一份简历', href: '/resumes', done: hasResume },
    { id: 'diagnosis', label: '跑出第一份诚实诊断', href: '/diagnoses/campus', done: hasDiagnosis },
    { id: 'conversation', label: '问 Coach 一句', href: '/chat', done: hasConversation },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = doneCount === total;

  // 全部完成时写入 hidden,让下次 mount 直接 return null。
  // 不把内存 hidden 置 true:当次仍渲染庆祝态,刷新后才消失。
  useEffect(() => {
    if (allDone) {
      localStorage.setItem(HIDDEN_KEY, '1');
    }
  }, [allDone]);

  // 未挂载 / 用户已收起 → 不渲染。
  if (!mounted || hidden) return null;

  // 全部完成:一次克制成功态(不飞独角兽)。下次访问因 hidden=1 已在上方拦截。
  if (allDone) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          background: 'var(--color-success-soft)',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-default)',
        }}
      >
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-success)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check size={15} strokeWidth={3} />
        </span>
        <span
          style={{
            flex: 1,
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.003em',
          }}
        >
          启动清单全部完成 —— 核心一圈你已经跑通了。
        </span>
        <button
          type="button"
          onClick={hide}
          aria-label="收起启动清单"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-3)',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
      }}
    >
      {/* 头部:标题 + 进度 + 收起 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          你的校招启动清单
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-ink-3)',
            }}
          >
            {doneCount}/{total}
          </span>
          <button
            type="button"
            onClick={hide}
            aria-label="收起启动清单"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div
        style={{
          height: '5px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-surface-3)',
          overflow: 'hidden',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--color-brand)',
            borderRadius: 'var(--radius-pill)',
            transition: 'width 0.35s ease',
          }}
        />
      </div>

      {/* 条目:单列自适应,移动端同样可点 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              width: '100%',
              padding: '10px 8px',
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: 'var(--radius-pill)',
                background: item.done ? 'var(--color-success)' : 'transparent',
                border: item.done ? 'none' : '1.5px solid var(--color-line-2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.done && <Check size={14} strokeWidth={3} />}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: '14px',
                fontWeight: item.done ? 500 : 600,
                color: item.done ? 'var(--color-ink-3)' : 'var(--color-ink)',
                textDecoration: item.done ? 'line-through' : 'none',
                letterSpacing: '-0.003em',
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

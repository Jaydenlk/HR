'use client';

// 能力速览 —— 可随时打开的「这平台能帮我做哪些事」兜底弹层。
// - 给文科女生:忘了某个功能在哪 / 想知道平台能干嘛时,一处看清 + 一点直达。
// - 文案不另写一份:复用 DISCOVER_ITEMS(与首页发现区同源),改文案只改一处。
// - 设计语言:沿用全站「液态玻璃 / Night Atelier」居中弹层(.lg + scrim),不引入新色板。
// - 底部「重新看一遍新手引导」:派发 coach:restart-tour 事件,让 OnboardingTour 重播首次导览
//   (填补「tour 看完即永不再现、无法重看」的真实缺口)。

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FileText, GraduationCap, MessageSquare } from 'lucide-react';
import { DISCOVER_ITEMS } from './discover-items';

interface CapabilityGuideProps {
  /** 是否打开弹层。 */
  open: boolean;
  /** 关闭回调。 */
  onClose: () => void;
}

/** 「先做这几件」固定三步,对齐启动清单(传简历 → 校招诊断 → 问 Coach)。 */
interface FirstStep {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
}

const FIRST_STEPS: readonly FirstStep[] = [
  { icon: FileText, title: '传一份简历', desc: '把简历传进来,之后所有改写都从它开始', href: '/resumes' },
  { icon: GraduationCap, title: '跑一份诊断', desc: '按真实校招标准给简历逐条体检,不糊弄', href: '/diagnoses/campus' },
  { icon: MessageSquare, title: '问 Coach 一句', desc: '把处境说给它听,它帮你配好下一步', href: '/chat' },
] as const;

export default function CapabilityGuide({ open, onClose }: CapabilityGuideProps) {
  const router = useRouter();

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // 点某项:关闭弹层并跳转
  function go(href: string) {
    onClose();
    router.push(href);
  }

  // 重看新手引导:派发事件让 OnboardingTour 从头播放(对齐 coach:credit-refresh 事件总线模式)
  function restartTour() {
    onClose();
    window.dispatchEvent(new CustomEvent('coach:restart-tour'));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="能力速览"
      data-capability-guide
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        background: 'var(--cap-scrim)',
        animation: 'cap-fade-in 0.2s ease',
      }}
    >
      <style>{`
        [data-capability-guide] { --cap-scrim: rgba(5, 6, 12, 0.42); }
        html[data-theme="light"] [data-capability-guide] { --cap-scrim: rgba(17, 19, 28, 0.24); }
        @keyframes cap-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cap-pop-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '480px',
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          padding: '26px 26px 22px',
          animation: 'cap-pop-in 0.28s ease',
        }}
      >
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-ink-3)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            paddingRight: '36px',
          }}
        >
          Coach 能帮你做什么
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-3)',
            marginTop: '6px',
            lineHeight: 1.6,
          }}
        >
          不用记功能藏在哪,从这儿点一下就能去用。
        </div>

        {/* 重看引导:放在最上面,常驻入口,任何时候都能重走一遍首次导览 */}
        <button
          type="button"
          onClick={restartTour}
          style={{
            marginTop: '18px',
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '44px',
            padding: '11px 16px',
            borderRadius: '10px',
            border: '1px solid var(--color-brand)',
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            fontSize: '13.5px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.12s, border-color 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-brand)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-brand-soft)';
            e.currentTarget.style.color = 'var(--color-brand)';
          }}
        >
          <RotateCcw size={15} />
          重看引导
        </button>

        {/* 先做这几件 */}
        <GroupTitle>先做这几件</GroupTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FIRST_STEPS.map((item) => (
            <GuideRow
              key={item.href}
              Icon={item.icon}
              title={item.title}
              desc={item.desc}
              onClick={() => go(item.href)}
            />
          ))}
        </div>

        {/* 随时能用的能力 */}
        <GroupTitle>随时能用的能力</GroupTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DISCOVER_ITEMS.map((item) => (
            <GuideRow
              key={item.id}
              Icon={item.icon}
              title={item.title}
              desc={item.desc}
              badge={item.badge}
              onClick={() => go(item.href)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

// ── 小块 ──────────────────────────────────────────────────────────────────────

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '11.5px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: 'var(--color-ink-4)',
        textTransform: 'none',
        margin: '22px 0 10px',
      }}
    >
      {children}
    </div>
  );
}

function GuideRow({
  Icon,
  title,
  desc,
  badge,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  badge?: 'Beta' | 'New';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        textAlign: 'left',
        padding: '11px 13px',
        borderRadius: 'var(--radius-default)',
        border: '1px solid var(--hair)',
        background: 'rgba(47,143,255,.05)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-brand)';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--hair)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <span
        style={{
          width: '34px',
          height: '34px',
          flexShrink: 0,
          borderRadius: 'var(--radius-default)',
          background: 'var(--color-brand-soft)',
          color: 'var(--color-brand)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              letterSpacing: '-0.005em',
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.01em',
                background:
                  badge === 'Beta'
                    ? 'rgba(255,111,0,.9)'
                    : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
              }}
            >
              {badge}
            </span>
          )}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            lineHeight: 1.45,
            marginTop: '2px',
          }}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}

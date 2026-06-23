'use client';

// onboarding-chapter-rail.tsx — 章节轨(全景地图 + 进度 + 可跳转)。
// 顶部居中胶囊,玻璃底;已过章节打勾,当前章染品牌色,可点跳转到该章首拍。

interface ChapterRailProps {
  chapters: readonly string[];
  current: number;
  onJump: (chapter: number) => void;
}

export function ChapterRail({ chapters, current, onJump }: ChapterRailProps) {
  return (
    <div
      className="lg ob-rail"
      style={{
        position: 'absolute',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '7px 8px',
        borderRadius: 999,
      }}
    >
      {chapters.map((c, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onJump(i)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'background .2s, color .2s',
              background: on ? 'var(--color-brand)' : 'transparent',
              color: on ? '#fff' : done ? 'var(--color-ink-2)' : 'var(--color-ink-4)',
            }}
          >
            <span className="mono" style={{ fontSize: 10, opacity: on ? 0.9 : 0.7, fontFamily: 'var(--font-mono)' }}>
              {done ? '✓' : String(i + 1)}
            </span>
            {c}
          </button>
        );
      })}
    </div>
  );
}

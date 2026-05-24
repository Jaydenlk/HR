'use client';

interface JdInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function JdInput({ value, onChange, error, disabled }: JdInputProps) {
  const charCount = value.length;
  const isValid = charCount >= 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          letterSpacing: '-0.003em',
        }}
      >
        粘贴职位描述（JD）
      </label>
      <p style={{ fontSize: '12.5px', color: 'var(--color-ink-4)', margin: 0 }}>
        将招聘页面上的职位要求完整粘贴在此处，覆盖越完整分析越准确
      </p>
      <div
        style={{
          position: 'relative',
          marginTop: '4px',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={12}
          placeholder="粘贴 JD 全文，包括职位要求、任职资格等…"
          style={{
            width: '100%',
            padding: '14px 16px',
            paddingBottom: '36px',
            background: 'var(--color-surface)',
            border: `1.5px solid ${error ? 'var(--color-danger)' : isValid && value ? 'var(--color-success)' : 'var(--color-line-2)'}`,
            borderRadius: '12px',
            fontSize: '13.5px',
            color: 'var(--color-ink)',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.003em',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '14px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: isValid ? 'var(--color-success)' : 'var(--color-ink-4)',
            fontWeight: 500,
          }}
        >
          {charCount} 字符{!isValid && charCount > 0 ? `，还需 ${10 - charCount} 字符` : ''}
        </div>
      </div>
      {error && (
        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--color-danger)',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

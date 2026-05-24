'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  loading: boolean;
}

export function ChatInput({ onSend, loading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div
      style={{
        padding: '16px 32px 22px',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-line)',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '22px',
            padding: '12px 14px 10px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={loading ? '思考中…' : '输入消息…'}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              lineHeight: 1.6,
              color: loading ? 'var(--color-ink-3)' : 'var(--color-ink)',
              fontFamily: 'var(--font)',
              fontWeight: 500,
              letterSpacing: '-0.003em',
              padding: 0,
              minHeight: '24px',
              maxHeight: '160px',
              overflow: 'auto',
            }}
          />
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || !value.trim()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: loading || !value.trim() ? 'var(--color-surface-3)' : '#0a84ff',
              border: 'none',
              cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            aria-label="发送"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
                stroke={loading || !value.trim() ? 'var(--color-ink-4)' : '#fff'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div
          style={{
            marginTop: '8px',
            fontSize: '11.5px',
            color: 'var(--color-ink-4)',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            gap: '18px',
            fontWeight: 500,
          }}
        >
          <span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '5px',
                border: '1px solid var(--color-line)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink-3)',
                marginRight: '4px',
                fontWeight: 600,
              }}
            >
              Enter
            </kbd>
            发送
          </span>
          <span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '5px',
                border: '1px solid var(--color-line)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink-3)',
                marginRight: '4px',
                fontWeight: 600,
              }}
            >
              Shift+Enter
            </kbd>
            换行
          </span>
        </div>
      </div>
    </div>
  );
}

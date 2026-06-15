'use client';

import { useState } from 'react';
import { Copy, Check, ThumbsUp } from 'lucide-react';
import type { RewriteSuggestion } from '@/lib/types';
import { api } from '@/lib/api';

const TYPE_LABELS: Record<RewriteSuggestion['type'], string> = {
  rewrite: '改写',
  add_keywords: '补充关键词',
  restructure: '结构调整',
  quantify: '量化成果',
  gap_advice: '建议补充',
};

const PRIORITY_COLOR: Record<RewriteSuggestion['priority'], { color: string; bg: string; label: string }> = {
  high: { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: '高优先级' },
  medium: { color: 'var(--color-warn)', bg: 'var(--color-warn-soft)', label: '中优先级' },
  low: { color: 'var(--color-brand)', bg: 'var(--color-brand-soft)', label: '低优先级' },
};

interface SuggestionCardProps {
  suggestion: RewriteSuggestion;
  resumeId: string;
  index: number;
}

export function SuggestionCard({ suggestion, resumeId, index }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  const priority = PRIORITY_COLOR[suggestion.priority];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(suggestion.suggested);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API failed silently
    }
  }

  async function handleAdopt() {
    setAdopting(true);
    setAdoptError(null);
    try {
      await api.post(`/resumes/${resumeId}/versions`, {
        raw_text: suggestion.suggested,
        change_note: `采纳建议 #${index + 1}: ${suggestion.reason}`,
      });
      setAdopted(true);
    } catch (err) {
      setAdoptError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div
      className="lg"
      style={{
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--hair)',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: priority.color,
            background: priority.bg,
            padding: '2px 8px',
            borderRadius: '6px',
            letterSpacing: '0.02em',
          }}
        >
          {priority.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-ink-3)',
            background: 'rgba(47,143,255,.05)',
            border: '1px solid var(--hair)',
            padding: '2px 8px',
            borderRadius: '6px',
          }}
        >
          {TYPE_LABELS[suggestion.type]}
        </span>
        {suggestion.section && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-ink-4)',
              marginLeft: 'auto',
            }}
          >
            {suggestion.section}
          </span>
        )}
      </div>

      {/* Before / After comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
        }}
      >
        {/* Original */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-danger-soft)',
            borderRight: '1px solid var(--hair)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-danger)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            原文
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            {suggestion.original}
          </p>
        </div>

        {/* Suggested */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-success-soft)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-success)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            建议改为
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            {suggestion.suggested}
          </p>
        </div>
      </div>

      {/* Reason & actions */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--hair)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <p
          style={{
            flex: 1,
            fontSize: '12.5px',
            color: 'var(--color-ink-3)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {suggestion.reason}
        </p>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
          {adoptError && (
            <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{adoptError}</span>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={copied}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--hair)',
              background: 'rgba(47,143,255,.05)',
              color: copied ? 'var(--color-success)' : 'var(--color-ink-2)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: copied ? 'default' : 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? '已复制' : '复制'}
          </button>

          {/* Adopt button */}
          <button
            onClick={handleAdopt}
            disabled={adopting || adopted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: adopted
                ? 'var(--color-success-soft)'
                : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: adopted ? 'var(--color-success)' : '#fff',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: adopting || adopted ? 'default' : 'pointer',
              opacity: adopting ? 0.7 : 1,
              transition: 'background 0.15s, color 0.15s',
              boxShadow: adopted ? 'none' : '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            <ThumbsUp size={13} />
            {adopted ? '已采纳' : adopting ? '处理中…' : '采纳'}
          </button>
        </div>
      </div>
    </div>
  );
}

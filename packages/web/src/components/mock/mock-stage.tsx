'use client';

import { useState } from 'react';
import type { MockQuestion, MockAnswer } from '@/lib/types';
import { ChevronDown, ChevronRight, Send, StopCircle } from 'lucide-react';

interface MockStageProps {
  sessionId: string;
  questions: MockQuestion[];
  answers: MockAnswer[];
  onAnswer: (answer: string) => Promise<void>;
  onComplete: () => Promise<void>;
  submitting: boolean;
  completing: boolean;
}

function difficultyColor(difficulty: string): { bg: string; color: string } {
  if (difficulty === 'easy') return { bg: 'var(--color-success-soft, #f0fdf4)', color: 'var(--color-success)' };
  if (difficulty === 'hard') return { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' };
  return { bg: 'var(--color-surface-3)', color: 'var(--color-ink-3)' };
}

function difficultyLabel(difficulty: string): string {
  if (difficulty === 'easy') return '简单';
  if (difficulty === 'hard') return '困难';
  return '中等';
}

export function MockStage({
  questions,
  answers,
  onAnswer,
  onComplete,
  submitting,
  completing,
}: MockStageProps) {
  const [answer, setAnswer] = useState('');
  const [hintOpen, setHintOpen] = useState(false);

  const currentIndex = answers.length;
  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const answeredCount = answers.length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Last answered question's feedback
  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;

  async function handleSubmit() {
    const trimmed = answer.trim();
    if (!trimmed) return;
    await onAnswer(trimmed);
    setAnswer('');
    setHintOpen(false);
  }

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 32px' }}>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '8px',
          }}
        >
          所有题目已作答完毕
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--color-ink-3)',
            marginBottom: '28px',
          }}
        >
          点击下方按钮生成最终评估报告
        </div>
        <button
          onClick={onComplete}
          disabled={completing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'var(--color-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: completing ? 'not-allowed' : 'pointer',
            opacity: completing ? 0.7 : 1,
          }}
        >
          <StopCircle size={16} />
          {completing ? '生成报告中…' : '结束面试 · 查看报告'}
        </button>
      </div>
    );
  }

  const { bg: diffBg, color: diffColor } = difficultyColor(currentQuestion.difficulty);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Progress bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
            第 {answeredCount + 1} / {totalQuestions} 题
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
            {Math.round(progress)}% 完成
          </span>
        </div>
        <div
          style={{
            height: '4px',
            borderRadius: '999px',
            background: 'var(--color-surface-3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--color-brand)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Last answer feedback */}
      {lastAnswer && (
        <div
          style={{
            background: lastAnswer.score >= 60 ? 'var(--color-success-soft, #f0fdf4)' : lastAnswer.score >= 40 ? 'var(--color-warn-soft, #fffbeb)' : 'var(--color-danger-soft)',
            border: `1px solid ${lastAnswer.score >= 60 ? 'var(--color-success)' : lastAnswer.score >= 40 ? 'var(--color-warn)' : 'var(--color-danger)'}`,
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: lastAnswer.score >= 60 ? 'var(--color-success)' : lastAnswer.score >= 40 ? 'var(--color-warn)' : 'var(--color-danger)',
                letterSpacing: '-0.03em',
              }}
            >
              {lastAnswer.score}/100
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
              上一题得分
            </span>
          </div>
          <p
            style={{
              fontSize: '13.5px',
              color: lastAnswer.feedback ? 'var(--color-ink-2)' : 'var(--color-ink-4)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {lastAnswer.feedback || '暂无点评'}
          </p>
        </div>
      )}

      {/* Question card */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '32px',
        }}
      >
        {/* Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'var(--color-ink)',
              color: '#fff',
            }}
          >
            {currentQuestion.type}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'var(--color-surface-3)',
              color: 'var(--color-ink-3)',
            }}
          >
            {currentQuestion.topic}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '999px',
              background: diffBg,
              color: diffColor,
            }}
          >
            {difficultyLabel(currentQuestion.difficulty)}
          </span>
        </div>

        {/* Question text */}
        <p
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.5,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: '20px',
          }}
        >
          {currentQuestion.question}
        </p>

        {/* Hint toggle */}
        {currentQuestion.hint && (
          <div>
            <button
              onClick={() => setHintOpen((o) => !o)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-ink-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                marginBottom: hintOpen ? '12px' : '0',
              }}
            >
              {hintOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              查看提示
            </button>
            {hintOpen && (
              <div
                style={{
                  background: 'var(--color-brand-soft)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: 'var(--color-ink-2)',
                  lineHeight: 1.6,
                  borderLeft: '3px solid var(--color-brand)',
                }}
              >
                {currentQuestion.hint}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer area */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '20px',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          你的回答
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="在这里输入你的回答…"
          rows={6}
          style={{
            width: '100%',
            padding: '14px',
            border: '1.5px solid var(--color-line)',
            borderRadius: '10px',
            fontSize: '14px',
            color: 'var(--color-ink)',
            background: 'var(--color-bg)',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.12s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
            ⌘Enter 快速提交
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onComplete}
              disabled={completing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: 'transparent',
                color: 'var(--color-ink-3)',
                border: '1.5px solid var(--color-line)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: completing ? 'not-allowed' : 'pointer',
                opacity: completing ? 0.6 : 1,
              }}
            >
              <StopCircle size={14} />
              {completing ? '结束中…' : '结束面试'}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !answer.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 20px',
                background: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !answer.trim() ? 0.6 : 1,
                transition: 'opacity 0.12s',
              }}
            >
              <Send size={14} />
              {submitting ? '提交中…' : '提交回答'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MockQuestion, MockAnswer } from '@/lib/types';
import { ChevronDown, ChevronRight, Send, StopCircle, Volume2, Loader2 } from 'lucide-react';

interface MockStageProps {
  sessionId: string;
  mode: string;
  questions: MockQuestion[];
  answers: MockAnswer[];
  onAnswer: (answer: string) => Promise<void>;
  onComplete: () => Promise<void>;
  submitting: boolean;
  completing: boolean;
}

function difficultyColor(difficulty: string): { bg: string; color: string } {
  if (difficulty === 'easy') return { bg: 'var(--color-success-soft)', color: 'var(--color-success)' };
  if (difficulty === 'hard') return { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' };
  return { bg: 'rgba(47,143,255,.05)', color: 'var(--color-ink-3)' };
}

function difficultyLabel(difficulty: string): string {
  if (difficulty === 'easy') return '简单';
  if (difficulty === 'hard') return '困难';
  return '中等';
}

// 读题播放态:idle 未播 / loading 合成中 / playing 播放中 / error 合成或播放失败。
type VoiceState = 'idle' | 'loading' | 'playing' | 'error';

export function MockStage({
  sessionId,
  mode,
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

  // ── 语音模式读题(mode='voice'):面试官问题用 TTS 朗读 ──────────────────────────
  const isVoice = mode === 'voice';
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // <audio> 元素与上一个 object URL:换题/卸载时停旧音频、释放旧 URL,避免叠播与内存泄漏。
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // 拉取第 idx 题(0-based)的 TTS 音频并播放。失败显式置 error 态(不静默),供用户重试。
  const playQuestion = useCallback(
    async (idx: number) => {
      stopPlayback();
      setVoiceError(null);
      setVoiceState('loading');
      try {
        const blob = await api.getBlob(`/mock-sessions/${sessionId}/question-audio/${idx}`);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const el = new Audio(url);
        audioRef.current = el;
        el.onended = () => setVoiceState('idle');
        el.onerror = () => {
          setVoiceState('error');
          setVoiceError('音频播放失败');
        };
        await el.play();
        setVoiceState('playing');
      } catch (err) {
        setVoiceState('error');
        setVoiceError(err instanceof Error ? err.message : '读题失败');
      }
    },
    [sessionId, stopPlayback],
  );

  // 语音模式:进入新一题时自动读题。浏览器自动播放策略下首次可能被拦截 → 失败置 error,
  // 用户点"重新朗读"即可(那是用户手势,必放行)。换题/卸载先停旧音频。
  // 用 queueMicrotask 异步触发(而非在 effect 体内同步 setState),并以 cancelled 闸门防竞态:
  // 题号快速切换时,旧 effect 的延后任务被其 cleanup 置 cancelled,不会读旧题。
  useEffect(() => {
    if (!isVoice || !currentQuestion) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void playQuestion(currentIndex);
    });
    return () => {
      cancelled = true;
      stopPlayback();
    };
    // currentIndex 变化 = 进入新一题;playQuestion/stopPlayback 由 useCallback 稳定。
  }, [isVoice, currentIndex, currentQuestion, playQuestion, stopPlayback]);

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
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 600,
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
            background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: completing ? 'not-allowed' : 'pointer',
            opacity: completing ? 0.7 : 1,
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
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
            background: 'var(--hair-2)',
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
            background: lastAnswer.score >= 60 ? 'var(--color-success-soft)' : lastAnswer.score >= 40 ? 'var(--color-warn-soft)' : 'var(--color-danger-soft)',
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
        className="lg"
        style={{
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
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
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
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
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

        {/* Voice mode: 读题控制(朗读中 / 重新朗读 / 失败重试)。仅 mode='voice' 显示。 */}
        {isVoice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <style>{`@keyframes mock-tts-spin { to { transform: rotate(360deg); } }`}</style>
            <button
              onClick={() => void playQuestion(currentIndex)}
              disabled={voiceState === 'loading'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand)',
                border: '1px solid var(--hair)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: voiceState === 'loading' ? 'not-allowed' : 'pointer',
                opacity: voiceState === 'loading' ? 0.7 : 1,
              }}
            >
              {voiceState === 'loading' ? (
                <Loader2 size={14} style={{ animation: 'mock-tts-spin 1s linear infinite' }} />
              ) : (
                <Volume2 size={14} />
              )}
              {voiceState === 'loading'
                ? '生成语音中…'
                : voiceState === 'playing'
                  ? '朗读中…'
                  : '重新朗读'}
            </button>
            {voiceState === 'error' && voiceError && (
              <span style={{ fontSize: '12.5px', color: 'var(--color-danger)' }}>
                {voiceError}
              </span>
            )}
          </div>
        )}

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
        className="lg"
        style={{
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
            background: 'var(--color-surface)',
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
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !answer.trim() ? 0.6 : 1,
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
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

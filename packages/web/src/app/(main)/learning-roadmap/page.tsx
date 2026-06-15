'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  BuildRoadmapRequest,
  BuildRoadmapResult,
  RoadmapItem,
  RoadmapResource,
} from '@/lib/types';
import {
  Route,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

// ── Resource type labels ───────────────────────────────────────────────────────

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  official_docs: '官方文档',
  chinese_community: '中文社区',
  book: '书籍',
  video: '视频',
  open_source: '开源项目',
  practice_platform: '练习平台',
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
  insufficient: '信息不足',
};

function confidenceColor(c: string): string {
  if (c === 'high') return 'var(--color-success)';
  if (c === 'medium') return 'var(--color-brand)';
  return 'var(--color-ink-3)';
}

// ── Phase Card ─────────────────────────────────────────────────────────────────

function PhaseCard({ phase, index }: { phase: RoadmapItem['phases'][number]; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div
      style={{
        border: '1px solid var(--hair)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '8px',
        background: 'rgba(47,143,255,.05)',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: open ? 'rgba(47,143,255,.05)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
          {phase.phase_name}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            flexShrink: 0,
          }}
        >
          <Clock size={12} />
          {phase.estimated_weeks} 周
        </span>
        {open ? <ChevronUp size={15} color="var(--color-ink-3)" /> : <ChevronDown size={15} color="var(--color-ink-3)" />}
      </button>

      {open && (
        <div style={{ padding: '12px 16px 14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', margin: '0 0 10px' }}>
            {phase.goal}
          </p>

          {phase.activities && phase.activities.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                学习活动
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {phase.activities.map((a, i) => (
                  <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '2px' }}>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: phase.output_artifact ? '8px' : '0',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} color="var(--color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  完成标准
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-ink)', margin: 0 }}>
                  {phase.completion_criteria}
                </p>
              </div>
            </div>
          </div>

          {phase.output_artifact && (
            <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '6px' }}>
              产出物：{phase.output_artifact}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Roadmap Section ────────────────────────────────────────────────────────────

function RoadmapSection({ item }: { item: RoadmapItem }) {
  return (
    <div
      className="lg"
      style={{
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} color="var(--color-brand)" />
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>
            {item.skill_name}
          </h3>
        </div>
        {item.total_weeks != null && (
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
            共 {item.total_weeks} 周
          </span>
        )}
      </div>

      {item.phases.map((phase, i) => (
        <PhaseCard key={i} phase={phase} index={i} />
      ))}
    </div>
  );
}

// ── Resource Card ──────────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: RoadmapResource }) {
  return (
    <div
      className="lg"
      style={{
        borderRadius: 'var(--radius-default)',
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {RESOURCE_TYPE_LABEL[resource.resource_type] ?? resource.resource_type}
        </span>
        {resource.for_level && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-ink-3)',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              padding: '2px 7px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {LEVEL_LABEL[resource.for_level] ?? resource.for_level}
          </span>
        )}
        {resource.language === 'zh' && (
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>中文</span>
        )}
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>
        {resource.description}
      </p>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-3)' }}>
        质量标准：{resource.quality_criteria}
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'loading' | 'result' | 'error' | 'insufficient';

export default function LearningRoadmapPage() {
  const [gapsText, setGapsText] = useState('');
  const [profile, setProfile] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('10');
  const [state, setState] = useState<PageState>('idle');
  const [result, setResult] = useState<BuildRoadmapResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'roadmap' | 'resources'>('roadmap');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const rawGaps = gapsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawGaps.length === 0) {
      setErrorMsg('请至少输入 1 项技能差距');
      setState('error');
      return;
    }

    // #50 — validate weekly hours: must be integer 1–80
    if (weeklyHours !== '') {
      const parsed = parseInt(weeklyHours, 10);
      if (!Number.isInteger(Number(weeklyHours)) || String(parsed) !== weeklyHours.trim()) {
        setErrorMsg('每周学习时长必须为整数小时');
        setState('error');
        return;
      }
      if (parsed < 1) {
        setErrorMsg('每周学习时长至少为 1 小时');
        setState('error');
        return;
      }
      if (parsed > 80) {
        setErrorMsg('每周学习时长不能超过 80 小时');
        setState('error');
        return;
      }
    }

    setState('loading');
    setResult(null);
    setErrorMsg('');

    const parsedHours = weeklyHours ? parseInt(weeklyHours, 10) : undefined;
    const body: BuildRoadmapRequest = {
      skill_gaps: rawGaps,
      ...(profile.trim() ? { profile: profile.trim() } : {}),
      ...(parsedHours != null ? { weekly_hours: parsedHours } : {}),
    };

    try {
      const data = await api.post<BuildRoadmapResult>('/learning-roadmap/build', body);

      if (data.confidence === 'insufficient' || (data.roadmap?.length ?? 0) === 0) {
        setResult(data);
        setState('insufficient');
      } else {
        setResult(data);
        setState('result');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败，请稍后重试';
      setErrorMsg(msg);
      setState('error');
    }
  }

  function handleReset() {
    setState('idle');
    setResult(null);
    setErrorMsg('');
    setActiveTab('roadmap');
  }

  // ── Idle / Form state ────────────────────────────────────────────────────

  if (state === 'idle' || state === 'error') {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Route size={20} color="var(--color-brand)" />
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
              学习路线
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-ink-3)' }}>
              输入技能差距，生成分阶段、可验证的学习路线图
            </p>
          </div>
        </div>

        {state === 'error' && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              background: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={15} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Skill gaps input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}
            >
              技能差距清单 <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--color-ink-3)' }}>
              每行一项，如：TypeScript 基础、Docker 容器化、算法与数据结构
            </p>
            <textarea
              value={gapsText}
              onChange={(e) => setGapsText(e.target.value)}
              placeholder={'TypeScript 基础\nReact Hooks\nDocker 容器化'}
              rows={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-line)',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: 'var(--color-ink)',
                background: 'var(--color-surface)',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Profile */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}
            >
              个人背景（可选）
            </label>
            <textarea
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="如：前端开发 2 年，主要做 Vue，想转型全栈，目标岗位：字节跳动后端工程师"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-line)',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: 'var(--color-ink)',
                background: 'var(--color-surface)',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Weekly hours */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}
            >
              每周学习时长（小时）
            </label>
            <input
              type="number"
              min={1}
              max={80}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              style={{
                width: '120px',
                padding: '8px 12px',
                border: '1px solid var(--color-line)',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: 'var(--color-ink)',
                background: 'var(--color-surface)',
              }}
            />
            <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--color-ink-3)' }}>
              小时/周
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-default)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.005em',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              }}
            >
              生成学习路线
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500, textAlign: 'center' }}>消耗 1 点</span>
          </div>
        </form>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          gap: '16px',
        }}
      >
        <Loader2 size={28} color="var(--color-brand)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink-2)' }}>
          正在生成学习路线图，请稍候…
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Insufficient state ────────────────────────────────────────────────────

  if (state === 'insufficient' && result) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
        <div
          style={{
            background: 'var(--color-warn-soft)',
            border: '1px solid color-mix(in srgb, var(--color-warn) 30%, transparent)',
            borderRadius: 'var(--radius-default)',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="var(--color-warn)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 700, color: 'var(--color-warn)' }}>
                信息不足，无法生成完整路线
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-2)' }}>
                {result.summary}
              </p>
            </div>
          </div>
        </div>

        {(result.follow_up_questions ?? []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
              需要补充以下信息：
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.follow_up_questions ?? []).map((q, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(result.cannot_determine ?? []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
              以下方面无法判断：
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.cannot_determine ?? []).map((item, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-default)',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
          }}
        >
          重新填写
        </button>
      </div>
    );
  }

  // ── Result state ──────────────────────────────────────────────────────────

  if (state === 'result' && result) {
    const resourcesBySkill: Record<string, RoadmapResource[]> = {};
    for (const r of (result.resource_list ?? [])) {
      const key = r.skill_name ?? '其他';
      if (!resourcesBySkill[key]) resourcesBySkill[key] = [];
      resourcesBySkill[key].push(r);
    }

    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Route size={18} color="var(--color-brand)" />
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
              学习路线图
            </h1>
          </div>
          <button
            onClick={handleReset}
            className="lg-sm"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--glass-bg)',
              fontSize: '12.5px',
              color: 'var(--color-ink-2)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            重新生成
          </button>
        </div>

        {/* Summary card */}
        <div
          className="lg"
          style={{
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--color-ink)', lineHeight: 1.6 }}>
            {result.summary}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {result.total_estimated_weeks != null && (
              <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                预计总周数：<strong style={{ color: 'var(--color-ink)' }}>{result.total_estimated_weeks} 周</strong>
              </span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
              可信度：
              <strong style={{ color: confidenceColor(result.confidence) }}>
                {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}
              </strong>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
              涵盖 {(result.roadmap ?? []).length} 项技能
            </span>
          </div>
        </div>

        {/* Backlog notice */}
        {result.backlog && result.backlog.length > 0 && (
          <div
            style={{
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--color-ink-2)',
            }}
          >
            以下 {result.backlog.length} 项技能已加入待学清单（优先完成以上路线后继续）：
            {' '}{result.backlog.join('、')}
          </div>
        )}

        {/* Recommendations */}
        {(result.recommendations ?? []).length > 0 && (
          <div
            className="lg"
            style={{
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AI 建议
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.recommendations ?? []).map((rec, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '3px' }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {(result.risks ?? []).length > 0 && (
          <div
            style={{
              background: 'var(--color-warn-soft)',
              border: '1px solid color-mix(in srgb, var(--color-warn) 30%, transparent)',
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warn)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              注意风险
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.risks ?? []).map((risk, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '3px' }}>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cannot determine */}
        {(result.cannot_determine ?? []).length > 0 && (
          <div
            style={{
              background: 'var(--color-warn-soft)',
              border: '1px solid color-mix(in srgb, var(--color-warn) 30%, transparent)',
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warn)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              无法判断
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.cannot_determine ?? []).map((item, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '3px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up questions */}
        {(result.follow_up_questions ?? []).length > 0 && (
          <div
            className="lg"
            style={{
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              补充信息
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {(result.follow_up_questions ?? []).map((q, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '3px' }}>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence used */}
        {(result.evidence_used ?? []).length > 0 && (
          <div
            className="lg"
            style={{
              borderRadius: 'var(--radius-default)',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              参考依据
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(result.evidence_used ?? []).map((ev, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--color-ink-2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ev.field}</span>
                  {' · '}
                  <span>{ev.value}</span>
                  {ev.relevance && (
                    <span style={{ color: 'var(--color-ink-3)' }}>（{ev.relevance}）</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {(['roadmap', 'resources'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 16px',
                border: activeTab === tab ? 'none' : '1px solid var(--hair)',
                borderRadius: '8px',
                background: activeTab === tab
                  ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
                  : 'rgba(47,143,255,.05)',
                color: activeTab === tab ? '#fff' : 'var(--color-ink-2)',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)' : 'none',
              }}
            >
              {tab === 'roadmap' ? '学习路线' : '资源清单'}
            </button>
          ))}
        </div>

        {/* Roadmap tab */}
        {activeTab === 'roadmap' && (
          <div>
            {result.roadmap.map((item, i) => (
              <RoadmapSection key={i} item={item} />
            ))}

            {(result.next_actions ?? []).length > 0 && (
              <div
                className="lg"
                style={{
                  padding: '16px',
                  marginTop: '8px',
                }}
              >
                <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--serif)', fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  立即行动
                </h3>
                <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                  {(result.next_actions ?? []).map((a, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Resources tab */}
        {activeTab === 'resources' && (
          <div>
            {Object.entries(resourcesBySkill).map(([skillName, resources]) => (
              <div key={skillName} style={{ marginBottom: '20px' }}>
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontFamily: 'var(--serif)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={14} color="var(--color-brand)" />
                  {skillName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {resources.map((r, i) => (
                    <ResourceCard key={i} resource={r} />
                  ))}
                </div>
              </div>
            ))}

            {(result.resource_list ?? []).length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', padding: '20px 0' }}>
                暂无资源推荐
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

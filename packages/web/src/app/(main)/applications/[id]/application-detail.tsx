'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type {
  Application,
  ApplicationRelated,
  LinkSuggestion,
  LinkTargetType,
  Interview,
  MockSession,
  CoverLetter,
  Resume,
  ResumeVersion,
  FollowUpResult,
  FollowUpScenario,
} from '@/lib/types';
import { STAGE_META, stageLabel } from '@/lib/tracker-stages';
import { ApplicationForm } from '@/components/tracker/application-form';
import { ApplicationTimeline } from '@/components/tracker/application-timeline';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Sparkles,
  Check,
  X,
  Unlink,
  Search,
  Loader2,
  Send,
} from 'lucide-react';

// ── 本地类型(company-check 复用 /mock-sessions/company-check 既有形状,mock/page.tsx 同款本地定义) ──

interface CompanySearchCandidate {
  id: string;
  name: string;
  summary: string;
  source_url: string;
  source_domain: string;
}

interface CompanyCheckResult {
  company_known: boolean;
  candidates: CompanySearchCandidate[];
  reason?: 'no_key' | 'timeout' | 'error';
  from_cache?: boolean;
}

const FOLLOW_UP_SCENARIOS: Array<{ value: FollowUpScenario; label: string }> = [
  { value: 'thank_you', label: '面试感谢信' },
  { value: 'status_inquiry', label: '投递进度询问' },
  { value: 'rejection_reply', label: '拒信礼貌回复' },
  { value: 'offer_urge', label: 'Offer 催促' },
  { value: 'acceptance', label: '录用确认' },
];

// ── 共享样式片段 ──────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = { padding: '18px 20px', marginBottom: '14px' };
const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--color-ink)',
  letterSpacing: '-0.01em',
  margin: '0 0 12px',
};
const emptyStateStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--color-ink-4)',
  lineHeight: 1.6,
  padding: '8px 0',
};
const rowItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '9px 12px',
  borderRadius: '8px',
  background: 'rgba(47,143,255,.04)',
  border: '1px solid var(--hair)',
  marginBottom: '6px',
};
const smallBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '5px 10px',
  borderRadius: '7px',
  border: '1px solid var(--color-line)',
  background: 'transparent',
  color: 'var(--color-ink-3)',
  fontSize: '11.5px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};
const selectStyle: React.CSSProperties = {
  flex: 1,
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid var(--color-line)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink-2)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
};
const primarySmallBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  border: 'none',
  background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
  color: '#fff',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

// ── 手动关联行选择器(interview/mock/cover_letter 共用形状) ─────────────────────

interface LinkOption {
  id: string;
  label: string;
}

function ManualLinkPicker({
  options,
  placeholder,
  onLink,
}: {
  options: LinkOption[];
  placeholder: string;
  onLink: (targetId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const [linking, setLinking] = useState(false);

  async function handleClick() {
    if (!selected) return;
    setLinking(true);
    try {
      await onLink(selected);
      setSelected('');
    } finally {
      setLinking(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <select
        style={selectStyle}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={options.length === 0}
      >
        <option value="">{options.length === 0 ? '暂无可关联的记录' : placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        style={{ ...primarySmallBtnStyle, opacity: selected && !linking ? 1 : 0.5 }}
        disabled={!selected || linking}
        onClick={() => void handleClick()}
      >
        {linking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        关联
      </button>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface ApplicationDetailProps {
  params: Promise<{ id: string }>;
}

export function ApplicationDetail({ params }: ApplicationDetailProps) {
  const { id } = use(params);
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [related, setRelated] = useState<ApplicationRelated | null>(null);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 手动"关联已有记录"候选池:当前用户尚未关联的记录。
  const [unlinkedInterviews, setUnlinkedInterviews] = useState<Interview[]>([]);
  const [unlinkedMocks, setUnlinkedMocks] = useState<MockSession[]>([]);
  const [unlinkedCoverLetters, setUnlinkedCoverLetters] = useState<CoverLetter[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [versionPickerResumeId, setVersionPickerResumeId] = useState('');
  const [versionOptions, setVersionOptions] = useState<ResumeVersion[]>([]);

  // 公司背景"查一下"
  const [companyCheck, setCompanyCheck] = useState<CompanyCheckResult | null>(null);
  const [companyChecking, setCompanyChecking] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [app, rel, sug] = await Promise.all([
        api.get<Application>(`/applications/${id}`),
        api.get<ApplicationRelated>(`/applications/${id}/related`),
        api.get<{ suggestions: LinkSuggestion[] }>(`/applications/${id}/link-suggestions`),
      ]);
      setApplication(app);
      setRelated(rel);
      setSuggestions(sug.suggestions);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUnlinkedPools = useCallback(async () => {
    try {
      const [ivs, mocks, letters, resumeList] = await Promise.all([
        api.get<Interview[]>('/interviews'),
        api.get<MockSession[]>('/mock-sessions'),
        api.get<CoverLetter[]>('/cover-letters'),
        api.get<Resume[]>('/resumes'),
      ]);
      setUnlinkedInterviews(ivs.filter((iv) => !iv.application_id));
      setUnlinkedMocks(mocks.filter((m) => !m.application_id));
      setUnlinkedCoverLetters(letters.filter((c) => !c.application_id));
      setResumes(resumeList);
    } catch {
      // 候选池加载失败不阻断详情页主体展示;手动关联选择器降级为空,已关联内容仍可见。
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchAll();
    })();
  }, [fetchAll]);

  useEffect(() => {
    void (async () => {
      await fetchUnlinkedPools();
    })();
  }, [fetchUnlinkedPools]);

  useEffect(() => {
    void (async () => {
      if (!versionPickerResumeId) {
        setVersionOptions([]);
        return;
      }
      try {
        const versions = await api.get<ResumeVersion[]>(`/resumes/${versionPickerResumeId}/versions`);
        setVersionOptions(versions);
      } catch {
        setVersionOptions([]);
      }
    })();
  }, [versionPickerResumeId]);

  async function handleLink(type: LinkTargetType, targetId: string) {
    try {
      await api.patch(`/applications/${id}/link`, { type, target_id: targetId, action: 'link' });
      await Promise.all([fetchAll(), fetchUnlinkedPools()]);
      toast.success('已关联');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '关联失败，请稍后重试');
    }
  }

  async function handleUnlink(type: LinkTargetType, targetId: string) {
    try {
      await api.patch(`/applications/${id}/link`, { type, target_id: targetId, action: 'unlink' });
      await Promise.all([fetchAll(), fetchUnlinkedPools()]);
      toast.success('已取消关联');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '取消关联失败，请稍后重试');
    }
  }

  // AI 建议横幅:采纳按钮显式点击才调用 link(红线——不允许 useEffect/挂载时自动生效)。
  function suggestionKey(s: LinkSuggestion): string {
    return `${s.type}:${s.target_id}`;
  }
  async function handleAdoptSuggestion(s: LinkSuggestion) {
    await handleLink(s.type, s.target_id);
    setDismissed((prev) => new Set(prev).add(suggestionKey(s)));
  }
  function handleDismissSuggestion(s: LinkSuggestion) {
    setDismissed((prev) => new Set(prev).add(suggestionKey(s)));
  }

  async function handleStageChange(stage: string) {
    try {
      await api.patch(`/applications/${id}`, { stage });
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新阶段失败');
    }
  }

  async function handleUpdateSubmit(data: Record<string, string>) {
    try {
      await api.patch(`/applications/${id}`, data);
      setEditOpen(false);
      await fetchAll();
      toast.success('已保存修改');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    }
  }

  async function handleDelete() {
    if (!window.confirm('确定要删除这条投递吗？此操作不可撤销。')) return;
    setDeleting(true);
    try {
      await api.delete(`/applications/${id}`);
      toast.success('已删除投递');
      router.push('/applications');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败，请稍后重试');
      setDeleting(false);
    }
  }

  async function handleCompanyCheck() {
    if (!application) return;
    setCompanyChecking(true);
    try {
      const result = await api.get<CompanyCheckResult>(
        `/mock-sessions/company-check?name=${encodeURIComponent(application.company)}`,
      );
      setCompanyCheck(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '公司背景搜索失败，请稍后重试');
    } finally {
      setCompanyChecking(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[80, 140, 200, 160].map((h, i) => (
            <div
              key={i}
              style={{
                height: `${h}px`,
                borderRadius: '14px',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '16px' }}>
          未找到这条投递，它可能已被删除，或不属于当前账号。
        </p>
        <Link href="/applications" style={{ color: 'var(--color-brand)', fontSize: '13px', fontWeight: 600 }}>
          返回投递看板
        </Link>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-danger)' }}>{error ?? '加载失败'}</p>
      </div>
    );
  }

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(suggestionKey(s)));

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 32px 60px' }}>
      {editOpen && (
        <ApplicationForm initial={application} onSubmit={handleUpdateSubmit} onCancel={() => setEditOpen(false)} />
      )}

      {/* 返回 */}
      <Link
        href="/applications"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: 'var(--color-ink-3)',
          marginBottom: '16px',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} />
        返回投递看板
      </Link>

      {/* 头部 */}
      <div className="lg" style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              {application.company}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', margin: '4px 0 0', fontWeight: 500 }}>
              {application.role}
              {application.location ? ` · ${application.location}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={smallBtnStyle} onClick={() => setEditOpen(true)}>
              <Pencil size={12} />
              编辑
            </button>
            <button
              style={{ ...smallBtnStyle, color: 'var(--color-danger)', borderColor: 'color-mix(in srgb, var(--color-danger) 40%, transparent)' }}
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              <Trash2 size={12} />
              {deleting ? '删除中…' : '删除投递'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px', fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
          <span>薪资范围：{application.salary_range ?? '—'}</span>
          <span>截止日期：{fmtDate(application.deadline)}</span>
          <span>内推人：{application.referrer ?? '—'}</span>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontWeight: 600 }}>阶段推进：</span>
          <select
            value={application.stage}
            onChange={(e) => void handleStageChange(e.target.value)}
            style={{ ...selectStyle, flex: 'unset', minWidth: '110px' }}
          >
            {STAGE_META.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {application.notes && (
          <p style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {application.notes}
          </p>
        )}
      </div>

      {/* AI link 建议横幅 */}
      {visibleSuggestions.length > 0 && (
        <div
          className="lg"
          style={{
            ...cardStyle,
            border: '1px solid color-mix(in srgb, var(--color-brand) 30%, transparent)',
            background: 'var(--color-brand-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={15} color="var(--color-brand)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
              AI 发现 {visibleSuggestions.length} 条可能相关的记录
            </span>
          </div>
          {visibleSuggestions.map((s) => (
            <div key={suggestionKey(s)} style={rowItemStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>{s.reason}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button style={primarySmallBtnStyle} onClick={() => void handleAdoptSuggestion(s)}>
                  <Check size={12} />
                  采纳
                </button>
                <button style={smallBtnStyle} onClick={() => handleDismissSuggestion(s)}>
                  <X size={12} />
                  忽略
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 时间线 */}
      <div className="lg" style={cardStyle}>
        <ApplicationTimeline applicationId={id} />
      </div>

      {/* 聚合区块:面试与录音 */}
      <div className="lg" style={cardStyle}>
        <h2 style={sectionTitleStyle}>面试与录音</h2>
        {related && related.interviews.length > 0 ? (
          related.interviews.map((iv) => (
            <div key={iv.id} style={rowItemStyle}>
              <Link href={`/debrief/${iv.id}`} style={{ minWidth: 0, textDecoration: 'none' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{iv.round}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                  {fmtDate(iv.interview_at)}
                  {iv.overall_grade ? ` · 评级 ${iv.overall_grade}` : ''}
                  {iv.transcript_status ? ` · 转写 ${iv.transcript_status}` : ''}
                </div>
              </Link>
              <button style={smallBtnStyle} onClick={() => void handleUnlink('interview', iv.id)}>
                <Unlink size={12} />
                取消关联
              </button>
            </div>
          ))
        ) : (
          <p style={emptyStateStyle}>暂无关联记录</p>
        )}
        <ManualLinkPicker
          options={unlinkedInterviews.map((iv) => ({ id: iv.id, label: `${iv.company ?? '未填公司'} · ${iv.round}` }))}
          placeholder="选择一条已有面试记录"
          onLink={(targetId) => handleLink('interview', targetId)}
        />
      </div>

      {/* 聚合区块:模拟面试 */}
      <div className="lg" style={cardStyle}>
        <h2 style={sectionTitleStyle}>模拟面试</h2>
        {related && related.mock_sessions.length > 0 ? (
          related.mock_sessions.map((m) => (
            <div key={m.id} style={rowItemStyle}>
              <Link href={`/mock/${m.id}`} style={{ minWidth: 0, textDecoration: 'none' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {m.company ?? '未填公司'} · {m.role ?? '未填岗位'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                  {m.status === 'completed' ? '已完成' : '进行中'}
                  {m.overall_grade ? ` · 评级 ${m.overall_grade}` : ''}
                </div>
              </Link>
              <button style={smallBtnStyle} onClick={() => void handleUnlink('mock', m.id)}>
                <Unlink size={12} />
                取消关联
              </button>
            </div>
          ))
        ) : (
          <p style={emptyStateStyle}>暂无关联记录</p>
        )}
        <ManualLinkPicker
          options={unlinkedMocks.map((m) => ({ id: m.id, label: `${m.company ?? '未填公司'} · ${m.role ?? '未填岗位'}` }))}
          placeholder="选择一条已有模拟面试记录"
          onLink={(targetId) => handleLink('mock', targetId)}
        />
      </div>

      {/* 聚合区块:求职信 */}
      <div className="lg" style={cardStyle}>
        <h2 style={sectionTitleStyle}>求职信</h2>
        {related && related.cover_letters.length > 0 ? (
          related.cover_letters.map((c) => (
            <div key={c.id} style={rowItemStyle}>
              <Link href="/cover-letter" style={{ minWidth: 0, textDecoration: 'none' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {c.company ?? '未填公司'} · v{c.version}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>{fmtDate(c.created_at)}</div>
              </Link>
              <button style={smallBtnStyle} onClick={() => void handleUnlink('cover_letter', c.id)}>
                <Unlink size={12} />
                取消关联
              </button>
            </div>
          ))
        ) : (
          <p style={emptyStateStyle}>暂无关联记录</p>
        )}
        <ManualLinkPicker
          options={unlinkedCoverLetters.map((c) => ({ id: c.id, label: `${c.company ?? '未填公司'} · v${c.version}` }))}
          placeholder="选择一封已有求职信"
          onLink={(targetId) => handleLink('cover_letter', targetId)}
        />
        <div style={{ marginTop: '10px' }}>
          <Link
            href={`/cover-letter?applicationId=${id}&company=${encodeURIComponent(application.company)}&role=${encodeURIComponent(application.role)}`}
            style={{ fontSize: '11.5px', color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none' }}
          >
            为这条投递生成新的求职信 →
          </Link>
        </div>
      </div>

      {/* 聚合区块:简历版本 */}
      <div className="lg" style={cardStyle}>
        <h2 style={sectionTitleStyle}>简历版本</h2>
        {related?.resume ? (
          <div style={rowItemStyle}>
            <Link href={`/resumes/${related.resume.resume.id}`} style={{ minWidth: 0, textDecoration: 'none' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                {related.resume.resume.title}
                {related.resume.resume.is_primary ? '（主简历）' : ''}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                {related.resume.version
                  ? `第 ${related.resume.version.version_num} 版${related.resume.version.change_note ? ` · ${related.resume.version.change_note}` : ''}`
                  : '未指定具体版本'}
              </div>
            </Link>
            {related.resume.version && (
              <button
                style={smallBtnStyle}
                onClick={() => void handleUnlink('resume_version', related.resume!.version!.id)}
              >
                <Unlink size={12} />
                取消关联
              </button>
            )}
          </div>
        ) : (
          <p style={emptyStateStyle}>暂无关联记录</p>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <select
            style={selectStyle}
            value={versionPickerResumeId}
            onChange={(e) => setVersionPickerResumeId(e.target.value)}
          >
            <option value="">{resumes.length === 0 ? '暂无简历' : '选择一份简历'}</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
                {r.is_primary ? '（主简历）' : ''}
              </option>
            ))}
          </select>
        </div>
        {versionPickerResumeId && (
          <ManualLinkPicker
            options={versionOptions.map((v) => ({
              id: v.id,
              label: `第 ${v.version_num} 版${v.change_note ? ` · ${v.change_note}` : ''}`,
            }))}
            placeholder="选择一个版本"
            onLink={(targetId) => handleLink('resume_version', targetId)}
          />
        )}
      </div>

      {/* 聚合区块:公司背景 */}
      <div className="lg" style={cardStyle}>
        <h2 style={sectionTitleStyle}>公司背景</h2>
        {related?.company_research ? (
          <div>
            <p style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: '0 0 8px' }}>
              {related.company_research.summary}
            </p>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>
              来源：
              <a href={related.company_research.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-brand)' }}>
                {related.company_research.source_domain}
              </a>
              {' · '}核验于 {fmtDate(related.company_research.retrieved_at)}
            </div>
            <button
              style={{ ...smallBtnStyle, marginTop: '10px' }}
              onClick={() => void handleUnlink('company_research', related.company_research!.id)}
            >
              <Unlink size={12} />
              取消关联
            </button>
          </div>
        ) : (
          <div>
            <p style={emptyStateStyle}>暂无公司背景资料</p>
            <button style={smallBtnStyle} onClick={() => void handleCompanyCheck()} disabled={companyChecking}>
              {companyChecking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
              查一下
            </button>
            {companyCheck && (
              <div style={{ marginTop: '10px' }}>
                {companyCheck.candidates.length === 0 ? (
                  <p style={emptyStateStyle}>
                    {companyCheck.reason ? '搜索服务暂时不可用，请稍后重试' : '未搜到相关公司背景资料'}
                  </p>
                ) : (
                  companyCheck.candidates.map((c) => (
                    <div key={c.id} style={rowItemStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>{c.summary}</div>
                      </div>
                      <button style={primarySmallBtnStyle} onClick={() => void handleLink('company_research', c.id)}>
                        <Check size={12} />
                        采用
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 跟进消息 */}
      <FollowUpPanel application={application} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── 跟进消息面板(嵌 follow-up 生成,真实 company/role/stage 拼进 interview_details,不传裸 UUID,m10) ──

function FollowUpPanel({ application }: { application: Application }) {
  const [scenario, setScenario] = useState<FollowUpScenario>('thank_you');
  const [extraDetails, setExtraDetails] = useState('');
  const [contact, setContact] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const stageText = stageLabel(application.stage);
      const contextLine = `公司：${application.company}；岗位：${application.role}；当前阶段：${stageText}。`;
      const interview_details = extraDetails.trim() ? `${contextLine}${extraDetails.trim()}` : contextLine;

      const data = await api.post<FollowUpResult>('/follow-up/generate', {
        scenario,
        application_id: application.id,
        interview_details,
        contact: contact.trim() || undefined,
      });
      setResult(data);
      window.dispatchEvent(new Event('coach:credit-refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="lg" style={cardStyle}>
      <h2 style={sectionTitleStyle}>跟进消息</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <select style={{ ...selectStyle, flex: 'unset', minWidth: '140px' }} value={scenario} onChange={(e) => setScenario(e.target.value as FollowUpScenario)}>
          {FOLLOW_UP_SCENARIOS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          style={{ ...selectStyle, cursor: 'text' }}
          placeholder="联系人（可选，如：HR 王女士）"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>
      <textarea
        style={{
          width: '100%',
          minHeight: '64px',
          padding: '9px 12px',
          borderRadius: '8px',
          border: '1px solid var(--color-line)',
          fontSize: '12.5px',
          color: 'var(--color-ink)',
          background: 'var(--color-surface)',
          resize: 'vertical',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        placeholder="补充面试细节（可选，如谈及的具体话题）——公司/岗位/阶段已自动带上，不需要重复填写"
        value={extraDetails}
        onChange={(e) => setExtraDetails(e.target.value)}
      />
      {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '8px' }}>{error}</p>}
      <button
        style={{ ...primarySmallBtnStyle, marginTop: '10px', padding: '8px 16px', opacity: generating ? 0.6 : 1 }}
        onClick={() => void handleGenerate()}
        disabled={generating}
      >
        {generating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
        {generating ? '生成中…' : '生成跟进消息'}
      </button>

      {result && (
        <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(47,143,255,.04)', borderRadius: '10px' }}>
          <p style={{ fontSize: '12.5px', color: 'var(--color-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>
            {result.message_draft}
          </p>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>置信度：{result.confidence}</span>
            <span>发送时机：{result.timing_advice.recommended_send_time}（{result.timing_advice.timing_note}）</span>
            {result.risks.length > 0 && <span>注意：{result.risks.join('；')}</span>}
            {result.cannot_determine.length > 0 && <span>信息不足：{result.cannot_determine.join('；')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

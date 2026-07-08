'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { MockSession } from '@/lib/types';
import { MockSessionCard } from '@/components/mock/mock-session-card';
import {
  useHandoffReception,
  HandoffConfirmDialog,
  ReturnToCoachBanner,
} from '@/components/chat/handoff-reception';
import { Play, X, ExternalLink, MessageSquare, Volume2, Info, Building2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import {
  saveCompanyDetailDraft,
  consumeCompanyDetailResult,
  type CompanyCandidate,
  type CompanyCheckResult,
  type CandidateChoice,
} from '@/lib/company-detail-bridge';

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: '80px',
            borderRadius: '14px',
            background: 'rgba(47,143,255,.05)',
            border: '1px solid var(--hair)',
            opacity: 0.7,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

interface NewSessionForm {
  company: string;
  role: string;
  jd_text: string;
  mode: 'text' | 'voice';
}

// CompanyCandidate / CompanyCheckResult / CandidateChoice 类型已收口到 lib/company-detail-bridge.ts
// (公司背调二级页与本页共用同一份候选/选择类型，靠 sessionStorage 桥接双向传递)。

/** 前端展示候选数量上限(设计文档:top3-5,呈现层裁剪,不影响后端全量返回) */
const CANDIDATE_DISPLAY_LIMIT = 5;

export default function MockPage() {
  return (
    <Suspense fallback={null}>
      <MockPageInner />
    </Suspense>
  );
}

function MockPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handoffId = searchParams.get('handoff');

  // Handoff 接待
  const { handoffState, handoffData, onAccept, onDismiss } = useHandoffReception(handoffId);
  // 完成回流提示
  const [showReturn, setShowReturn] = useState(false);
  const activeHandoffId = handoffId;
  const activeConvId = handoffData?.conversation_id ?? null;

  const [sessions, setSessions] = useState<MockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const modeParam = searchParams.get('mode');
  const initialMode: 'text' | 'voice' = modeParam === 'voice' ? 'voice' : 'text';
  const [dialogOpen, setDialogOpen] = useState(modeParam === 'voice');
  const [form, setForm] = useState<NewSessionForm>({ company: '', role: '', jd_text: '', mode: initialMode });

  // handoff 接待:accepted 后预填表单并打开弹窗
  // Defer via setTimeout 避免 set-state-in-effect 同步 cascade 问题。
  const handoffApplied = useRef(false);
  useEffect(() => {
    if (handoffState === 'accepted' && handoffData && !handoffApplied.current) {
      handoffApplied.current = true;
      const payload = handoffData.payload;
      setTimeout(() => {
        setForm({
          company: String(payload.company ?? ''),
          role: String(payload.role ?? ''),
          jd_text: String(payload.jd_text ?? ''),
          mode: 'text',
        });
        setDialogOpen(true);
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 公司查询状态
  const [checkResult, setCheckResult] = useState<CompanyCheckResult | null>(null);
  // 用户对多候选列表的消歧选择
  const [candidateChoice, setCandidateChoice] = useState<CandidateChoice>({ kind: 'pending' });
  // 缓存候选被拒后的强制重搜进行中(期间隐藏旧候选列表,展示重搜提示)
  const [reSearching, setReSearching] = useState(false);
  // latest-wins: 每次发起新请求时中止上一次未完成的请求
  const checkAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api
      .get<MockSession[]>('/mock-sessions')
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  // 公司背调二级页(/mock/company-detail)返回时回填结果:重开创建弹窗，恢复公司名/岗位/JD/模式，
  // 并把二级页确认的候选结果(或"都不是"通用模式)一并应用，不需要用户重新走一遍公司查询。
  useEffect(() => {
    const result = consumeCompanyDetailResult();
    if (!result) return;
    setForm({ company: result.company, role: result.role, jd_text: result.jd_text, mode: result.mode });
    setCheckResult(result.checkResult);
    setCandidateChoice(result.candidateChoice);
    setDialogOpen(true);
  }, []);

  /** 跳转公司背调二级页前，把当前表单存入草稿，供二级页返回时原样恢复。 */
  function openCompanyDetail() {
    saveCompanyDetailDraft({ company: form.company, role: form.role, jd_text: form.jd_text, mode: form.mode });
    router.push('/mock/company-detail');
  }

  /**
   * 公司查询。force=true:缓存候选被用户拒绝后的强制重搜(绕过后端 7 天缓存,设计定稿4)。
   * 重搜结果 from_cache 不置位,再拒即落通用模式——不会形成无限重搜循环。
   */
  async function checkCompany(name: string, force = false) {
    if (!name.trim()) {
      setCheckResult(null);
      setCandidateChoice({ kind: 'pending' });
      return;
    }
    // latest-wins: 中止上一次未完成的请求，防止旧响应覆盖新状态
    checkAbortRef.current?.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;
    if (force) setReSearching(true);
    try {
      const res = await api.get<CompanyCheckResult>(
        `/mock-sessions/company-check?name=${encodeURIComponent(name.trim())}${force ? '&force=true' : ''}`,
        { signal: controller.signal },
      );
      setCheckResult(res);
      setCandidateChoice({ kind: 'pending' });
    } catch {
      // AbortError 属正常取消，其余失败静默不阻断创建流程
      setCheckResult(null);
      setCandidateChoice({ kind: 'pending' });
    } finally {
      if (force) setReSearching(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const payload: Record<string, unknown> = { mode: form.mode };
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.role.trim()) payload.role = form.role.trim();
      if (form.jd_text.trim()) payload.jd_text = form.jd_text.trim();

      // 若用户已从候选列表中选定某公司，只回传候选 id(防伪造 M3：后端按 id 查库取真实字段，
      // 不接受前端回传的原始 name/summary/source_url 文本)。
      if (candidateChoice.kind === 'selected') {
        payload.company_research_id = candidateChoice.id;
      }

      const session = await api.post<MockSession & { company_known: boolean }>('/mock-sessions', payload);
      setDialogOpen(false);
      setForm({ company: '', role: '', jd_text: '', mode: 'text' });
      setCheckResult(null);
      setCandidateChoice({ kind: 'pending' });
      window.dispatchEvent(new Event('coach:credit-refresh'));
      // 完成回流:若本次源于 handoff,弹提示后跳到面试页
      if (activeHandoffId && activeConvId) {
        setShowReturn(true);
      }
      router.push(`/mock/${session.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
      setCreating(false);
    }
  }

  return (
    <>
      {/* Coach handoff 确认框 */}
      {handoffState === 'confirming' && handoffData && (
        <HandoffConfirmDialog
          target={handoffData.target}
          payload={handoffData.payload}
          onAccept={() => void onAccept()}
          onDismiss={() => void onDismiss()}
        />
      )}

      {/* 完成回流提示 */}
      {showReturn && activeHandoffId && activeConvId && (
        <ReturnToCoachBanner
          conversationId={activeConvId}
          handoffId={activeHandoffId}
          onClose={() => setShowReturn(false)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }
        .mock-dialog {
          position: relative; z-index: 1;
          padding: 32px;
          width: 100%; max-width: 500px;
          /* 对话框过高时自身滚动(globals.css .modal-overlay 注④的既定惯例:
             在 .lg 上加 maxHeight + overflowY:auto;overlay 上下各留 24px padding)。
             兜底保证短屏下"都不是"/创建按钮永远可达,不再出现整框撑爆视口无法滚动。 */
          max-height: calc(100vh - 48px);
          overflow-y: auto;
        }
      `}</style>

      {/* New session dialog */}
      {dialogOpen && (
        <div className="modal-overlay">
          <div className="modal-scrim" onClick={() => setDialogOpen(false)} />
          <div className="mock-dialog lg">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                开始新模拟
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 模式选择卡 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  选择面试方式
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* 文字模式卡 */}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mode: 'text' }))}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: form.mode === 'text'
                        ? '1.5px solid var(--color-brand)'
                        : '1.5px solid var(--color-line)',
                      background: form.mode === 'text'
                        ? 'var(--color-brand-soft)'
                        : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                      <MessageSquare size={15} color={form.mode === 'text' ? 'var(--color-brand)' : 'var(--color-ink-3)'} />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: form.mode === 'text' ? 'var(--color-brand)' : 'var(--color-ink)',
                      }}>
                        文字模式
                      </span>
                    </div>
                    <p style={{
                      fontSize: '11.5px',
                      color: 'var(--color-ink-3)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      题目用文字给你，你打字作答。安静、随时能停。
                    </p>
                  </button>

                  {/* 语音模式卡 */}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mode: 'voice' }))}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: form.mode === 'voice'
                        ? '1.5px solid var(--color-brand)'
                        : '1.5px solid var(--color-line)',
                      background: form.mode === 'voice'
                        ? 'var(--color-brand-soft)'
                        : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                      <Volume2 size={15} color={form.mode === 'voice' ? 'var(--color-brand)' : 'var(--color-ink-3)'} />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: form.mode === 'voice' ? 'var(--color-brand)' : 'var(--color-ink)',
                      }}>
                        语音模式
                      </span>
                    </div>
                    <p style={{
                      fontSize: '11.5px',
                      color: 'var(--color-ink-3)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      面试官会念题给你听，更接近真实面试的紧张感。
                    </p>
                  </button>
                </div>

                {/* 语音模式提示 */}
                {form.mode === 'voice' && (
                  <p style={{
                    margin: '8px 0 0',
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    lineHeight: 1.6,
                  }}>
                    语音模式会用 AI 语音念题（每题读题约消耗额外点数），建议戴耳机、找安静的地方。
                  </p>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink-3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    公司（选填）
                  </label>
                  <button
                    type="button"
                    onClick={openCompanyDetail}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--color-brand)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Building2 size={12} />
                    完善公司信息 · 背景调研
                  </button>
                </div>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, company: e.target.value }));
                    // 任何变化都重置搜索状态，防止旧确认结果随新公司名一起提交
                    setCheckResult(null);
                    setCandidateChoice({ kind: 'pending' });
                  }}
                  placeholder="如：字节跳动"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-surface)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-line)';
                    void checkCompany(form.company);
                  }}
                />

                {/* 三态提示区(T6:态2 改为多候选点选，态1/3 语义不变) */}
                {/* 态1：库内命中 → 无感知（不展示任何提示） */}

                {/* 缓存候选被拒后的强制重搜进行中提示 */}
                {reSearching && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                    已忽略此前的搜索记录，正在重新联网搜索…
                  </p>
                )}

                {/* 态2：库外 + 有候选 + 用户未决定 → 多候选点选列表(消歧三层的呈现层，不论后端走哪层，
                    都统一列表化展示，永不跳过前端确认——即使只有 1 个候选，也要求显式点选) */}
                {!reSearching && checkResult && !checkResult.company_known && checkResult.candidates.length > 0 && candidateChoice.kind === 'pending' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    background: 'rgba(47,143,255,.05)',
                    borderRadius: '10px',
                    border: '1px solid var(--hair)',
                    fontSize: '13px',
                    color: 'var(--color-ink-2)',
                    lineHeight: 1.6,
                  }}>
                    <div style={{ marginBottom: '10px', fontWeight: 600 }}>
                      找到以下可能匹配的公司，请选择：
                    </div>
                    {/* 候选列表限高内滚(用户实测bug:列表撑满屏且不可滚)。滚动条样式走
                        globals.css 全站主题化滚动条(全局选择器,自动继承液态玻璃细条风格);
                        "都不是"按钮在本容器之外,不随列表滚动,始终可见可达。 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: 'min(45vh, 340px)', overflowY: 'auto', paddingRight: '4px' }}>
                      {checkResult.candidates.slice(0, CANDIDATE_DISPLAY_LIMIT).map((candidate) => (
                        <div
                          key={candidate.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-line)',
                            background: 'var(--color-surface)',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{candidate.name}</div>
                            {(candidate.summary || candidate.source_domain) && (
                              <div style={{ color: 'var(--color-ink-3)', fontSize: '12px', marginTop: '2px' }}>
                                {candidate.summary}
                                {candidate.source_url && (
                                  <>
                                    {' '}
                                    <a
                                      href={candidate.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                    >
                                      <ExternalLink size={11} />{candidate.source_domain || '来源'}
                                    </a>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setCandidateChoice({ kind: 'selected', id: candidate.id })}
                            style={{
                              flexShrink: 0,
                              padding: '4px 14px',
                              borderRadius: '7px',
                              border: '1px solid var(--color-brand-deep)',
                              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                            }}
                          >
                            选择这家
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // 缓存候选被拒 → 自动触发一次强制新搜索(设计定稿4:"用户可拒绝触发新搜索")。
                        // 新搜结果 from_cache 不置位,再拒走 else 分支落通用模式——不会无限重搜。
                        if (checkResult?.from_cache) {
                          void checkCompany(form.company, true);
                        } else {
                          setCandidateChoice({ kind: 'none' });
                        }
                      }}
                      style={{
                        padding: '4px 14px',
                        borderRadius: '7px',
                        border: '1.5px solid var(--color-line)',
                        background: 'transparent',
                        color: 'var(--color-ink-3)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {checkResult?.from_cache ? '都不是，重新搜索' : '都不是，通用模式'}
                    </button>
                  </div>
                )}

                {/* 已选定：搜索信息将用于出题 */}
                {candidateChoice.kind === 'selected' && (() => {
                  const picked = checkResult?.candidates.find((c) => c.id === candidateChoice.id);
                  return picked ? (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-brand)', lineHeight: 1.5 }}>
                      已确认「{picked.name}」，将使用搜索到的公司信息辅助出题（仅限搜索范围内，不会编造细节）
                    </p>
                  ) : null;
                })()}

                {/* 态3：库外 + 无候选 / 用户点"都不是" → 通用模式明示；有 reason 时区分"搜索服务不可用"文案(m6 校准) */}
                {checkResult && !checkResult.company_known && (
                  (checkResult.candidates.length === 0) || candidateChoice.kind === 'none'
                ) && (
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    lineHeight: 1.5,
                  }}>
                    {checkResult.candidates.length === 0 && candidateChoice.kind !== 'none' && checkResult.reason
                      ? '公司搜索服务暂时不可用，将以通用面试 + JD 驱动出题（通用模式），不会假装了解这家公司'
                      : '该公司不在资料库，将以通用面试 + JD 驱动出题（通用模式），不会假装了解这家公司'}
                  </p>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  岗位（必填）
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="如：产品经理"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-surface)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  职位描述 JD（选填）
                </label>
                <textarea
                  value={form.jd_text}
                  onChange={(e) => setForm((f) => ({ ...f, jd_text: e.target.value }))}
                  placeholder="粘贴 JD 以获得更精准的题目定制…"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-surface)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
                />
              </div>

              {createError && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-danger-soft)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--color-danger)',
                    fontWeight: 500,
                  }}
                >
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={() => void handleCreate()}
                  disabled={creating || !form.role.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: creating || !form.role.trim() ? 'not-allowed' : 'pointer',
                    opacity: creating || !form.role.trim() ? 0.7 : 1,
                    boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                    transition: 'opacity 0.12s',
                  }}
                >
                  <Play size={16} />
                  {creating ? '正在生成题目…' : '开始模拟面试'}
                </button>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
                  本场约消耗 7 点（出题 1 点 + 每题作答 1 点 × 5 + 总评 1 点）
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.4px',
                marginBottom: '5px',
              }}
            >
              模拟面试
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              AI 实时反馈，提升面试表达
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setDialogOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.12s',
                letterSpacing: '-0.01em',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Play size={16} />
              开始新模拟
            </button>
            <Tooltip
              content="选好公司岗位,AI 现场出题面你。可以打字答,也能开口说。"
              triggerRender={<span />}
              side="bottom"
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--color-ink-4)',
                  cursor: 'help',
                }}
                aria-label="模拟面试说明"
              >
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-danger-soft)',
              borderRadius: '14px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div
            className="lg"
            style={{
              padding: '64px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-default)',
                background: 'var(--color-brand-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Play size={26} color="var(--color-brand)" />
            </div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '19px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              还没有模拟记录
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-4)',
                marginBottom: '24px',
              }}
            >
              开始你的第一次模拟面试，AI 实时打分并给出反馈
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 22px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Play size={15} />
              开始第一次模拟
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((session) => (
              <MockSessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/mock/${session.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  readCompanyDetailDraft,
  saveCompanyDetailResult,
  type CompanyCandidate,
  type CompanyCheckResult,
  type CandidateChoice,
} from '@/lib/company-detail-bridge';
import {
  CITY_OPTIONS,
  INDUSTRY_OPTIONS,
  LISTED_OPTIONS,
  SIZE_OPTIONS,
  type ListedStatus,
} from '@/lib/company-detail-options';
import { ArrowLeft, MapPin, Briefcase, Globe, Users, ExternalLink, Loader2, Search } from 'lucide-react';

/** 前端展示候选数量上限(与 mock 主创建流程一致:top3-5,呈现层裁剪,不影响后端全量返回) */
const CANDIDATE_DISPLAY_LIMIT = 5;

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-ink-3)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const inputBaseStyle: React.CSSProperties = {
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
};

const selectStyle: React.CSSProperties = {
  ...inputBaseStyle,
  padding: '10px 14px 10px 38px',
  cursor: 'pointer',
  appearance: 'none',
};

export default function CompanyDetailPage() {
  const router = useRouter();

  // 从创建流程带来的草稿(公司名/岗位/JD/模式)，返回时原样带回。
  const [draftRole, setDraftRole] = useState('');
  const [draftJd, setDraftJd] = useState('');
  const [draftMode, setDraftMode] = useState<'text' | 'voice'>('text');

  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [listed, setListed] = useState<ListedStatus>('unknown');
  const [size, setSize] = useState('');
  const [website, setWebsite] = useState('');

  const [checking, setChecking] = useState(false);
  const [reSearching, setReSearching] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CompanyCheckResult | null>(null);
  const [candidateChoice, setCandidateChoice] = useState<CandidateChoice>({ kind: 'pending' });

  // 挂载后读草稿(sessionStorage 只在客户端可用，不能放进初始 state 避免 SSR 报错)。
  useEffect(() => {
    const draft = readCompanyDetailDraft();
    if (draft) {
      setCompany(draft.company);
      setDraftRole(draft.role);
      setDraftJd(draft.jd_text);
      setDraftMode(draft.mode);
    }
  }, []);

  /** 回填结果并跳回创建流程;overrideChoice 用于选中/拒绝候选的同一事件内立即生效(避免读到未更新的 state)。 */
  function goBack(overrideChoice?: CandidateChoice) {
    saveCompanyDetailResult({
      company: company.trim(),
      role: draftRole,
      jd_text: draftJd,
      mode: draftMode,
      checkResult,
      candidateChoice: overrideChoice ?? candidateChoice,
    });
    router.push('/mock');
  }

  /** 发起背调:公司名 + 城市 + 行业作为消歧上下文,喂给 company-check(T6 消歧层② rankByContext)。 */
  async function runCheck(force = false) {
    if (!company.trim()) return;
    if (force) setReSearching(true);
    else setChecking(true);
    setCheckError(null);
    try {
      const params = new URLSearchParams({ name: company.trim() });
      if (city.trim()) params.set('city', city.trim());
      if (industry.trim()) params.set('industry', industry.trim());
      if (force) params.set('force', 'true');
      const res = await api.get<CompanyCheckResult>(`/mock-sessions/company-check?${params.toString()}`);
      setCheckResult(res);
      setCandidateChoice({ kind: 'pending' });
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : '背调请求失败，请稍后再试');
      setCheckResult(null);
    } finally {
      if (force) setReSearching(false);
      else setChecking(false);
    }
  }

  function selectCandidate(candidate: CompanyCandidate) {
    const choice: CandidateChoice = { kind: 'selected', id: candidate.id };
    setCandidateChoice(choice);
    goBack(choice);
  }

  function rejectCandidates() {
    // 缓存候选被拒 → 自动触发一次强制新搜索(与主创建流程一致的设计定稿4)。
    if (checkResult?.from_cache) {
      void runCheck(true);
      return;
    }
    const choice: CandidateChoice = { kind: 'none' };
    setCandidateChoice(choice);
    goBack(choice);
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 32px' }}>
      <button
        type="button"
        onClick={() => goBack()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-ink-3)',
          fontSize: '13.5px',
          fontWeight: 500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '24px',
        }}
      >
        <ArrowLeft size={15} />
        返回创建流程
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}
        >
          公司背景调研
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', lineHeight: 1.6 }}>
          补充城市与行业，AI 能更精准地从搜索结果里认出你要找的这家公司，再回填到模拟面试出题。
        </p>
      </div>

      <div className="lg" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={labelStyle}>公司名</label>
          <input
            type="text"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setCheckResult(null);
              setCheckError(null);
              setCandidateChoice({ kind: 'pending' });
            }}
            placeholder="如：字节跳动"
            style={inputBaseStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>城市</label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={15}
                color="var(--color-ink-3)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <select
                aria-label="城市"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={selectStyle}
              >
                <option value="">不限（选填）</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>行业</label>
            <div style={{ position: 'relative' }}>
              <Briefcase
                size={15}
                color="var(--color-ink-3)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <select
                aria-label="行业"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={selectStyle}
              >
                <option value="">不限（选填）</option>
                {INDUSTRY_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>是否上市</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LISTED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setListed(opt.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: listed === opt.value ? '1.5px solid var(--color-brand)' : '1.5px solid var(--color-line)',
                  background: listed === opt.value ? 'var(--color-brand-soft)' : 'transparent',
                  color: listed === opt.value ? 'var(--color-brand)' : 'var(--color-ink-2)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>公司规模（选填）</label>
            <div style={{ position: 'relative' }}>
              <Users
                size={15}
                color="var(--color-ink-3)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <select
                aria-label="公司规模"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                style={selectStyle}
              >
                <option value="">不限（选填）</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s} 人</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>官网（选填）</label>
            <div style={{ position: 'relative' }}>
              <Globe
                size={15}
                color="var(--color-ink-3)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
                style={{ ...inputBaseStyle, padding: '10px 14px 10px 38px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runCheck(false)}
          disabled={!company.trim() || checking}
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
            cursor: !company.trim() || checking ? 'not-allowed' : 'pointer',
            opacity: !company.trim() || checking ? 0.7 : 1,
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            transition: 'opacity 0.12s',
          }}
        >
          {checking ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          {checking ? '正在搜索…' : '发起背景调研'}
        </button>

        {checkError && (
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
            {checkError}
          </div>
        )}

        {reSearching && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
            已忽略此前的搜索记录，正在重新联网搜索…
          </p>
        )}

        {/* 库内命中:资料库已有该公司,无需背调 */}
        {!reSearching && checkResult?.company_known && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(47,143,255,.05)',
              borderRadius: '10px',
              border: '1px solid var(--hair)',
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
            }}
          >
            这家公司已在资料库中，无需额外背调，直接返回创建流程即可。
            <button
              type="button"
              onClick={() => goBack({ kind: 'pending' })}
              style={{
                display: 'block',
                marginTop: '10px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: '1px solid var(--color-brand-deep)',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              返回创建流程
            </button>
          </div>
        )}

        {/* 库外 + 有候选 + 未决定 → 多候选点选(与 mock 主创建流程候选列表样式一致) */}
        {!reSearching && checkResult && !checkResult.company_known && checkResult.candidates.length > 0 && candidateChoice.kind === 'pending' && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(47,143,255,.05)',
              borderRadius: '10px',
              border: '1px solid var(--hair)',
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: '10px', fontWeight: 600 }}>
              找到以下可能匹配的公司，请选择：
            </div>
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
                    onClick={() => selectCandidate(candidate)}
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
              onClick={rejectCandidates}
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
              {checkResult.from_cache ? '都不是，重新搜索' : '都不是，通用模式'}
            </button>
          </div>
        )}

        {/* 库外 + 无候选 → 通用模式明示 + 返回按钮(不阻塞流程) */}
        {!reSearching && checkResult && !checkResult.company_known && checkResult.candidates.length === 0 && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(47,143,255,.05)',
              borderRadius: '10px',
              border: '1px solid var(--hair)',
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
            }}
          >
            {checkResult.reason
              ? '公司搜索服务暂时不可用，将以通用面试 + JD 驱动出题（通用模式），不会假装了解这家公司'
              : '没有搜到匹配的公司信息，将以通用面试 + JD 驱动出题（通用模式），不会假装了解这家公司'}
            <button
              type="button"
              onClick={() => goBack({ kind: 'none' })}
              style={{
                display: 'block',
                marginTop: '10px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: '1px solid var(--color-brand-deep)',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              返回创建流程
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

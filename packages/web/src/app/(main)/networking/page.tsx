'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  NetworkingMessageResult,
  ReferralStrategyResult,
  ReferralPath,
} from '@/lib/types';
import { Loader2, Users, Copy, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'message' | 'referral';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: 'wechat', label: '微信' },
  { value: 'maimai', label: '脉脉' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: '邮件' },
];

const RELATIONSHIP_TYPES = [
  { value: 'direct_friend', label: '直接朋友' },
  { value: 'alumni_or_ex_colleague', label: '校友/前同事' },
  { value: 'friend_of_friend', label: '朋友的朋友' },
  { value: 'stranger', label: '完全陌生人' },
];

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '信息充足',
  medium: '信息较完整',
  low: '信息有限',
  insufficient: '信息不足',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-brand)',
  low: 'var(--color-warn, #f59e0b)',
  insufficient: 'var(--color-danger)',
};

const PATH_TYPE_LABELS: Record<string, string> = {
  direct: '直接内推',
  indirect: '间接内推',
  cold_contact: '冷接触',
};

const STRENGTH_LABELS: Record<string, string> = {
  strong: '强',
  moderate: '中',
  weak: '弱',
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '18px',
  padding: '20px 22px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-2)',
  letterSpacing: '0.04em',
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '10px',
  fontFamily: 'inherit',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const btnPrimaryStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 0',
  borderRadius: '10px',
  border: 'none',
  background: loading ? 'var(--color-surface-3)' : 'var(--color-brand)',
  color: loading ? 'var(--color-ink-3)' : '#fff',
  fontSize: '14px',
  fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  letterSpacing: '-0.01em',
  transition: 'background 0.12s',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentedPicker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--color-surface-2)',
        borderRadius: '10px',
        padding: '3px',
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1,
            padding: '7px 0',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: value === o.value ? 'var(--color-surface)' : 'transparent',
            color: value === o.value ? 'var(--color-ink)' : 'var(--color-ink-3)',
            boxShadow: value === o.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            fontFamily: 'inherit',
            transition: 'all 0.12s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11.5px',
        fontWeight: 700,
        background: `${CONFIDENCE_COLORS[confidence]}22`,
        color: CONFIDENCE_COLORS[confidence],
      }}
    >
      {CONFIDENCE_LABELS[confidence] ?? confidence}
    </span>
  );
}

function TagList({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              padding: '5px 10px',
              background: 'var(--color-surface-2)',
              borderRadius: '7px',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Message tab ──────────────────────────────────────────────────────────────

function MessageTab() {
  const [targetCompany, setTargetCompany] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [platform, setPlatform] = useState<string>('wechat');
  const [relationshipType, setRelationshipType] = useState<string>('alumni_or_ex_colleague');
  const [contactDesc, setContactDesc] = useState('');
  const [candidateBg, setCandidateBg] = useState('');
  const [sharedBg, setSharedBg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NetworkingMessageResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function handleSubmit() {
    if (!targetCompany.trim() || !targetPosition.trim()) {
      setError('请填写目标公司和目标职位');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await api.post<NetworkingMessageResult>('/networking/message', {
        target_company: targetCompany.trim(),
        target_position: targetPosition.trim(),
        platform,
        relationship_type: relationshipType,
        contact_description: contactDesc.trim() || undefined,
        candidate_background: candidateBg.trim() || undefined,
        shared_background: sharedBg.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.message_draft) return;
    navigator.clipboard.writeText(result.message_draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '14px',
        minHeight: 0,
      }}
    >
      {/* Left: form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>目标公司</label>
            <input
              style={inputStyle}
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="字节跳动"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>目标职位</label>
            <input
              style={inputStyle}
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              placeholder="产品经理"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>沟通平台</label>
            <SegmentedPicker
              value={platform}
              onChange={setPlatform}
              options={PLATFORMS}
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>与联系人关系</label>
            <SegmentedPicker
              value={relationshipType}
              onChange={setRelationshipType}
              options={RELATIONSHIP_TYPES}
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>联系人描述（可选）</label>
            <input
              style={inputStyle}
              value={contactDesc}
              onChange={(e) => setContactDesc(e.target.value)}
              placeholder="大学校友，在公司做后端工程师两年"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>共同背景（可选）</label>
            <input
              style={inputStyle}
              value={sharedBg}
              onChange={(e) => setSharedBg(e.target.value)}
              placeholder="同一所大学，同一届"
            />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>我的背景（可选）</label>
            <textarea
              style={{ ...inputStyle, height: '72px', resize: 'vertical' as const, lineHeight: '1.55' }}
              value={candidateBg}
              onChange={(e) => setCandidateBg(e.target.value)}
              placeholder="互联网产品经理，3年经验，擅长用户增长"
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={btnPrimaryStyle(loading)}>
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                生成中…
              </>
            ) : (
              '生成内推消息'
            )}
          </button>
        </div>
      </div>

      {/* Right: result */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '18px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            AI 正在生成消息草稿…
          </div>
        ) : result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {/* Confidence + summary */}
            <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                  {result.summary}
                </div>
              </div>
              <ConfidenceBadge confidence={result.confidence} />
            </div>

            {/* Insufficient state */}
            {result.confidence === 'insufficient' || !result.message_draft ? (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={28} color="var(--color-warn, #f59e0b)" />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  信息不足，暂时无法生成消息草稿
                </p>
                {result.cannot_determine.length > 0 && (
                  <div style={{ textAlign: 'left', width: '100%' }}>
                    <TagList items={result.cannot_determine} label="需补充" />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Message draft */}
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ ...labelStyle, marginBottom: 0 }}>消息草稿</span>
                    <button
                      onClick={handleCopy}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-line)',
                        background: 'var(--color-surface)',
                        color: copied ? 'var(--color-success)' : 'var(--color-ink)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Copy size={12} />
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      fontSize: '14px',
                      lineHeight: '1.75',
                      color: 'var(--color-ink)',
                      whiteSpace: 'pre-wrap' as const,
                    }}
                  >
                    {result.message_draft}
                  </div>
                </div>

                {/* Follow-up timing */}
                {result.follow_up_timing && (
                  <div style={cardStyle}>
                    <div style={labelStyle}>发送时机</div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
                      <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginBottom: '2px' }}>
                          最佳发送时间
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {result.follow_up_timing.best_send_time}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginBottom: '2px' }}>
                          跟进时间
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {result.follow_up_timing.follow_up_after_days} 天后
                        </div>
                      </div>
                    </div>
                    {result.follow_up_timing.follow_up_note && (
                      <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '8px' }}>
                        {result.follow_up_timing.follow_up_note}
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable details */}
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-line)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink-2)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDetails ? '收起建议' : '查看撰写建议'}
                </button>

                {showDetails && (
                  <div style={cardStyle}>
                    <TagList items={result.key_points} label="消息要点" />
                    <TagList items={result.what_not_to_say} label="避免表达" />
                    <TagList items={result.recommendations} label="额外建议" />
                    {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'var(--color-surface)',
              border: '1.5px dashed var(--color-line-2)',
              borderRadius: '18px',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--color-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={24} color="var(--color-ink-4)" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', letterSpacing: '-0.01em' }}>
              填写左侧信息，生成内推申请消息
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
              支持微信、脉脉、LinkedIn、邮件四种场景
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Referral strategy tab ────────────────────────────────────────────────────

function ReferralTab() {
  const [targetCompanies, setTargetCompanies] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [knownContacts, setKnownContacts] = useState('');
  const [candidateBg, setCandidateBg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReferralStrategyResult | null>(null);

  async function handleSubmit() {
    if (!targetCompanies.trim() || !targetPosition.trim()) {
      setError('请填写目标公司和目标职位');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const companies = targetCompanies
        .split(/[,，、\n]/)
        .map((c) => c.trim())
        .filter(Boolean);
      const contacts = knownContacts
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

      const data = await api.post<ReferralStrategyResult>('/networking/referral-strategy', {
        target_companies: companies,
        target_position: targetPosition.trim(),
        known_contacts: contacts.length > 0 ? contacts : undefined,
        candidate_background: candidateBg.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  function pathTypeColor(pt: string): string {
    if (pt === 'direct') return 'var(--color-success)';
    if (pt === 'indirect') return 'var(--color-brand)';
    return 'var(--color-warn, #f59e0b)';
  }

  function ReferralPathCard({ path }: { path: ReferralPath }) {
    return (
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: `${pathTypeColor(path.path_type)}22`,
                color: pathTypeColor(path.path_type),
                marginRight: '6px',
              }}
            >
              {PATH_TYPE_LABELS[path.path_type] ?? path.path_type}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
              {path.target_company}
            </span>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>转化率</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
              {path.estimated_success_rate}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-ink)', marginBottom: '4px' }}>
          {path.contact_description}
        </div>
        {path.relationship_strength && (
          <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginBottom: '4px' }}>
            关系强度：{STRENGTH_LABELS[path.relationship_strength] ?? path.relationship_strength}
          </div>
        )}
        <div style={{ fontSize: '12.5px', color: 'var(--color-brand)', marginTop: '6px' }}>
          建议：{path.suggested_action}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '14px',
        minHeight: 0,
      }}
    >
      {/* Left: form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>目标公司（可多个，逗号分隔）</label>
            <input
              style={inputStyle}
              value={targetCompanies}
              onChange={(e) => setTargetCompanies(e.target.value)}
              placeholder="字节跳动，阿里巴巴，腾讯"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>目标职位</label>
            <input
              style={inputStyle}
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              placeholder="产品经理"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>已知人脉（每行一条，可留空）</label>
            <textarea
              style={{ ...inputStyle, height: '100px', resize: 'vertical' as const, lineHeight: '1.55' }}
              value={knownContacts}
              onChange={(e) => setKnownContacts(e.target.value)}
              placeholder={`张三，字节跳动后端工程师，大学同学\n李四，阿里巴巴产品经理，前同事`}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
              留空代表无已知人脉，将分析冷接触路径
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>我的背景（可选）</label>
            <input
              style={inputStyle}
              value={candidateBg}
              onChange={(e) => setCandidateBg(e.target.value)}
              placeholder="互联网产品经理，3年经验"
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={btnPrimaryStyle(loading)}>
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                分析中…
              </>
            ) : (
              '分析内推路径'
            )}
          </button>
        </div>
      </div>

      {/* Right: result */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '18px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            AI 正在分析人脉路径…
          </div>
        ) : result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>{result.summary}</div>
              <ConfidenceBadge confidence={result.confidence} />
            </div>

            {/* Referral paths */}
            {result.referral_paths.length > 0 ? (
              <div style={cardStyle}>
                <div style={labelStyle}>可执行内推路径（{result.referral_paths.length} 条）</div>
                {result.referral_paths.map((path, i) => (
                  <ReferralPathCard key={i} path={path} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '24px',
                  color: 'var(--color-ink-3)',
                  fontSize: '13.5px',
                }}
              >
                当前无已知人脉可内推，建议参考下方冷接触策略
              </div>
            )}

            {/* Cold outreach */}
            {result.cold_outreach_targets.length > 0 && (
              <div style={cardStyle}>
                <div style={labelStyle}>冷接触建议</div>
                {result.cold_outreach_targets.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-2)',
                      borderRadius: '10px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-3)', background: 'var(--color-surface-3)', padding: '2px 7px', borderRadius: '5px' }}>
                        {t.platform}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>{t.target_company}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-ink)', marginBottom: '3px' }}>
                      目标：{t.target_profile_type}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--color-brand)' }}>{t.approach}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Network gaps */}
            {result.network_gaps.length > 0 && (
              <div style={cardStyle}>
                <div style={labelStyle}>人脉缺口</div>
                {result.network_gaps.map((gap, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
                      {gap.target_company}：{gap.gap_description}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {gap.fill_strategy.map((s, j) => (
                        <div key={j} style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', paddingLeft: '10px' }}>
                          · {s}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div style={cardStyle}>
                <TagList items={result.recommendations} label="策略建议" />
                {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'var(--color-surface)',
              border: '1.5px dashed var(--color-line-2)',
              borderRadius: '18px',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--color-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={24} color="var(--color-ink-4)" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', letterSpacing: '-0.01em' }}>
              填写目标公司和人脉信息
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
              AI 将为您分析最优内推路径和人脉缺口
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('message');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '40px 32px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
          }}
        >
          人脉内推
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          内推申请消息撰写 · 人脉路径分析 · 防止编造关系
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          marginBottom: '20px',
          flexShrink: 0,
          width: 'fit-content',
        }}
      >
        {([
          { key: 'message', label: '内推消息' },
          { key: 'referral', label: '内推路径' },
        ] as Array<{ key: Tab; label: string }>).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              background: activeTab === tab.key ? 'var(--color-surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-ink)' : 'var(--color-ink-3)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'message' ? <MessageTab /> : <ReferralTab />}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

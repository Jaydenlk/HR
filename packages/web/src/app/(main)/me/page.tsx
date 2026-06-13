'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { MeProfile, CreditLedgerItem, CreditLedgerPage } from '@/lib/types';
import { Loader2, Camera, User, Coins, FileText } from 'lucide-react';
import { toast } from 'sonner';

// ─── 端点友好名映射 ───────────────────────────────────────────────────────────
const ENDPOINT_LABELS: Record<string, string> = {
  '/diagnoses': '简历诊断',
  '/diagnoses/campus': '校招诊断',
  '/diagnoses/rewrite': '简历改写',
  '/cover-letters': '求职信',
  '/cover-letters/regenerate': '求职信重生成',
  '/mock-sessions': '模拟面试',
  '/mock-sessions/answer': '模拟作答',
  '/mock-sessions/complete': '模拟完成',
  '/conversations': '问 Coach',
  '/conversations/messages': '问 Coach',
  '/interviews/analyze': '面试复盘',
  '/opportunities/evaluate': '机会评估',
  '/applications/strategy': '投递策略',
  '/interview-prep/playbook': '公司攻略',
  '/interview-prep/star-stories': 'STAR 故事',
  '/interview-prep/tech-coach': '技术准备',
  '/interview-prep/case-coach': '案例练习',
  '/follow-up/generate': '跟进消息',
  '/salary/analyze': '薪资分析',
  '/salary/city-industry-fit': '城市适配',
  '/offer-comparator/compare': 'Offer 比对',
  '/learning-roadmap/build': '学习路线',
  '/industry-trend/analyze': '行业趋势',
  '/networking/message': '人脉消息',
  '/networking/referral-strategy': '内推策略',
  '/career': '职业地图',
  '/tasks/generate': '任务生成',
};

function friendlyEndpoint(endpoint: string | null): string {
  if (!endpoint) return 'AI 功能';
  // exact match first
  const exact = ENDPOINT_LABELS[endpoint];
  if (exact) return exact;
  // prefix match
  for (const [prefix, label] of Object.entries(ENDPOINT_LABELS)) {
    if (endpoint.startsWith(prefix)) return label;
  }
  // strip /api prefix if present
  const stripped = endpoint.replace(/^\/api/, '');
  const strippedMatch = ENDPOINT_LABELS[stripped];
  if (strippedMatch) return strippedMatch;
  return endpoint;
}

// ─── 流水 type → 文案 ─────────────────────────────────────────────────────────
function ledgerLabel(item: CreditLedgerItem): string {
  if (item.type === 'admin_grant') return '管理员充值';
  if (item.type === 'signup_grant') return '注册赠送';
  // consume
  return `使用 · ${friendlyEndpoint(item.endpoint)}`;
}

// ─── 共享样式 ─────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '18px',
  padding: '20px 22px',
};

const sectionTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--color-ink)',
  letterSpacing: '-0.01em',
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '4px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  fontWeight: 500,
};

// ─── 骨架组件 ─────────────────────────────────────────────────────────────────
function Skeleton({ width, height }: { width?: string; height?: string }) {
  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '16px',
        borderRadius: '8px',
        background: 'var(--color-surface-3)',
        animation: 'pulse-sk 1.5s ease-in-out infinite',
        display: 'inline-block',
      }}
    />
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function MePage() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true); // starts true — first fetch begins immediately
  const [profileError, setProfileError] = useState<string | null>(null); // null until first error

  const [ledger, setLedger] = useState<CreditLedgerItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true); // starts true — first fetch begins immediately
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerPage, setLedgerPage] = useState(0);
  const PAGE_SIZE = 15;

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 加载个人信息 ──────────────────────────────────────────────────────────
  function fetchProfile() {
    api
      .get<MeProfile>('/me')
      .then((data) => {
        setProfile(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        setProfileError(err instanceof Error ? err.message : '加载失败');
        setProfileLoading(false);
      });
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  // ── 监听点数刷新事件 ──────────────────────────────────────────────────────
  useEffect(() => {
    function onCreditRefresh() {
      api
        .get<MeProfile>('/me')
        .then((data) => setProfile(data))
        .catch(() => {
          // 静默失败：余额刷新不强制报错，用户可手动刷新页面
        });
    }
    window.addEventListener('coach:credit-refresh', onCreditRefresh);
    return () => {
      window.removeEventListener('coach:credit-refresh', onCreditRefresh);
    };
  }, []);

  // ── 加载流水 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLedger(0);
  }, []);

  function loadLedger(page: number) {
    setLedgerLoading(true);
    setLedgerError(null);
    api
      .get<CreditLedgerPage>(`/me/credits?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then((data) => {
        setLedger((prev) => (page === 0 ? data.items : [...prev, ...data.items]));
        setLedgerTotal(data.total);
        setLedgerPage(page);
        setLedgerLoading(false);
      })
      .catch((err) => {
        setLedgerError(err instanceof Error ? err.message : '加载失败');
        setLedgerLoading(false);
      });
  }

  // ── 上传头像 ──────────────────────────────────────────────────────────────
  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 前端校验
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片不能超过 2MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPEG、PNG、WebP 格式');
      return;
    }
    setUploading(true);
    try {
      const result = await api.upload<{ avatar_url: string }>('/me/avatar', file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: result.avatar_url } : prev));
      toast.success('头像已更新');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── 加载更多 ──────────────────────────────────────────────────────────────
  const hasMore = ledger.length < ledgerTotal;

  const initial = profile?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <style>{`
        @keyframes pulse-sk {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
          }}
        >
          <User size={20} /> 我的
        </h1>

        {/* ── 头像 + 基本信息 ── */}
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <div style={sectionTitle}>
            <User size={16} /> 个人信息
          </div>

          {profileError ? (
            <div
              role="alert"
              style={{
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13.5px',
                fontWeight: 500,
              }}
            >
              {profileError}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* 头像 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading || profileLoading}
                  title="点击上传头像"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    border: '2px solid var(--color-line)',
                    background: 'var(--color-brand-soft)',
                    cursor: uploading || profileLoading ? 'wait' : 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    padding: 0,
                  }}
                >
                  {profileLoading ? (
                    <Skeleton width="72px" height="72px" />
                  ) : profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="头像"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: 'var(--color-brand-ink)',
                      }}
                    >
                      {initial}
                    </span>
                  )}
                  {/* overlay on hover */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      opacity: uploading ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                    className="avatar-overlay"
                  >
                    {uploading ? (
                      <Loader2 size={20} color="#fff" className="animate-spin" />
                    ) : (
                      <Camera size={18} color="#fff" />
                    )}
                  </div>
                </button>
                <style>{`
                  button:hover .avatar-overlay { opacity: 1 !important; }
                `}</style>
                <div
                  style={{
                    marginTop: '6px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: 'var(--color-ink-4)',
                  }}
                >
                  点击换头像
                </div>
              </div>

              {/* 信息列表 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
                <div>
                  <div style={labelStyle}>姓名</div>
                  <div style={valueStyle}>
                    {profileLoading ? <Skeleton width="120px" /> : (profile?.name ?? '—')}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>邮箱</div>
                  <div style={valueStyle}>
                    {profileLoading ? <Skeleton width="180px" /> : (profile?.email ?? '—')}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>注册时间</div>
                  <div style={valueStyle}>
                    {profileLoading ? (
                      <Skeleton width="140px" />
                    ) : profile?.created_at ? (
                      new Date(profile.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                {(profileLoading || profile?.invite_code) && (
                  <div>
                    <div style={labelStyle}>我的邀请码</div>
                    <div
                      style={{
                        ...valueStyle,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.06em',
                        color: 'var(--color-brand)',
                      }}
                    >
                      {profileLoading ? <Skeleton width="90px" /> : (profile?.invite_code ?? '—')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── credit 余额卡片 ── */}
        <div
          style={{
            ...cardStyle,
            marginBottom: '20px',
            background: 'var(--color-brand-soft)',
            border: '1px solid var(--color-brand)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Coins size={22} style={{ color: 'var(--color-brand)' }} />
              <div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--color-brand)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '2px',
                  }}
                >
                  当前余额
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    color: 'var(--color-brand-ink)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {profileLoading ? <Skeleton width="60px" height="32px" /> : (profile?.credit_balance ?? '—')}
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-brand)',
                      marginLeft: '4px',
                    }}
                  >
                    点
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--color-brand)',
                fontWeight: 500,
                lineHeight: 1.5,
                maxWidth: '240px',
                textAlign: 'right',
              }}
            >
              10 元 / 50 点
              <br />
              <span style={{ color: 'var(--color-ink-3)' }}>充值请联系管理员</span>
            </div>
          </div>
        </div>

        {/* ── 流水列表 ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <FileText size={16} /> 使用记录
          </div>

          {ledgerError && (
            <div
              role="alert"
              style={{
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13px',
                marginBottom: '12px',
                fontWeight: 500,
              }}
            >
              {ledgerError}
            </div>
          )}

          {!ledgerLoading && !ledgerError && ledger.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 0',
                color: 'var(--color-ink-4)',
                fontSize: '13.5px',
              }}
            >
              暂无记录
            </div>
          )}

          {ledger.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {ledger.map((item, idx) => {
                const isLast = idx === ledger.length - 1;
                const positive = item.delta > 0;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--color-line)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 500 }}>
                        {ledgerLabel(item)}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--color-ink-4)',
                          marginTop: '2px',
                        }}
                      >
                        {new Date(item.created_at).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {item.note && (
                          <span style={{ marginLeft: '8px', color: 'var(--color-ink-3)' }}>
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: positive ? 'var(--color-success)' : 'var(--color-ink-3)',
                        }}
                      >
                        {positive ? '+' : ''}{item.delta}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '1px' }}>
                        余 {item.balance_after}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ledgerLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
            </div>
          )}

          {hasMore && !ledgerLoading && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => loadLedger(ledgerPage + 1)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'transparent',
                  color: 'var(--color-ink-2)',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { CareerAnalysis, CareerPath } from '@/lib/types';
import { RefreshCw, Loader2, Map } from 'lucide-react';

function FitBadge({ pct }: { pct: number }) {
  const isHigh = pct >= 80;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        fontWeight: 800,
        color: isHigh ? 'var(--color-brand)' : '#a86200',
        background: isHigh ? 'var(--color-brand-soft)' : 'var(--color-warn-soft)',
        padding: '3px 9px',
        borderRadius: '6px',
      }}
    >
      {pct}%
    </span>
  );
}

function PathCard({ path, chosen }: { path: CareerPath; chosen: boolean }) {
  return (
    <div
      style={{
        background: chosen ? '#fafcff' : 'var(--color-surface)',
        border: chosen
          ? '1.5px solid var(--color-brand)'
          : '1px solid var(--color-line)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '-0.005em',
            color: 'var(--color-ink)',
          }}
        >
          {path.title}
        </h4>
        <FitBadge pct={path.fit_pct} />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '12.5px',
          color: 'var(--color-ink-3)',
          fontWeight: 500,
          lineHeight: 1.45,
        }}
      >
        {path.description}
      </p>
      {path.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
          {path.skills.map((skill) => (
            <span
              key={skill}
              style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-ink-2)',
                borderRadius: '5px',
                fontWeight: 600,
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-line)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--color-ink-3)',
          fontWeight: 500,
        }}
      >
        <span>校友参考</span>
        <b
          style={{
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
          }}
        >
          {path.alumni_count} 人
        </b>
      </div>
    </div>
  );
}

export default function CareerPage() {
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noResume, setNoResume] = useState(false);

  async function fetchAnalysis() {
    setLoading(true);
    setError(null);
    setNoResume(false);
    try {
      const data = await api.get<CareerAnalysis>('/career/analysis');
      setAnalysis(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分析失败';
      if (msg.includes('404') || msg.includes('no resume') || msg.includes('简历')) {
        setNoResume(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '18px',
    padding: '20px 24px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px 32px',
        gap: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.4px',
              marginBottom: '4px',
            }}
          >
            职业地图
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
            技能盘点 · 三年路径建议 · 校友参考
          </p>
        </div>
        {!loading && (analysis || error) && (
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid var(--color-line)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            重新评估
          </button>
        )}
      </div>

      {loading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '80px 32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--color-brand-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loader2
              size={28}
              color="var(--color-brand)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                marginBottom: '6px',
              }}
            >
              AI 正在分析你的简历…
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
              结合你的技能和经历匹配最佳路径，大约需要 5-10 秒
            </p>
          </div>
        </div>
      ) : noResume ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 32px',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1.5px dashed var(--color-line-2)',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Map size={26} color="var(--color-ink-4)" />
          </div>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-ink-2)',
              letterSpacing: '-0.01em',
            }}
          >
            请先上传你的简历
          </p>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
            职业地图需要分析你的技能和经历，前往「简历馆」上传简历后再回来
          </p>
          <a
            href="/resumes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            前往简历馆
          </a>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            color: 'var(--color-danger)',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {error}
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={fetchAnalysis}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-danger)',
                background: 'transparent',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      ) : analysis ? (
        <>
          {/* Hero */}
          <div
            style={{
              background: '#eaf2ff',
              border: '1px solid rgba(10,132,255,0.16)',
              borderRadius: '22px',
              padding: '22px 26px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  margin: '0 0 6px',
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-ink)',
                }}
              >
                三年后 ·{' '}
                <span style={{ color: 'var(--color-brand)' }}>你会在哪？</span>
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: 'var(--color-ink-2)',
                  fontWeight: 500,
                  lineHeight: 1.55,
                }}
              >
                基于你的技能盘点 + 校友真实轨迹 · Coach 给你 {analysis.paths.length} 个最可能 / 最适合的方向
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: 'var(--color-brand)',
                  lineHeight: 1,
                }}
              >
                {analysis.paths.length}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-ink-3)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                }}
              >
                推荐路径
              </div>
            </div>
          </div>

          {/* Path cards */}
          {analysis.paths.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(analysis.paths.length, 3)}, 1fr)`,
                gap: '12px',
              }}
            >
              {analysis.paths.map((path, i) => (
                <PathCard key={path.title} path={path} chosen={i === 0} />
              ))}
            </div>
          )}

          {/* Skill audit */}
          {analysis.skill_audit.length > 0 && (
            <div style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '16px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    letterSpacing: '-0.012em',
                  }}
                >
                  能力盘点 · 你 vs 路径要求
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    fontWeight: 500,
                  }}
                >
                  共 {analysis.skill_audit.length} 项技能
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px 28px',
                }}
              >
                {analysis.skill_audit.map((skill) => {
                  const isOk = skill.ok;
                  const bigGap = !isOk && skill.needed - skill.current > 30;
                  const barColor = isOk
                    ? 'var(--color-success)'
                    : bigGap
                    ? 'var(--color-danger)'
                    : 'var(--color-brand)';

                  return (
                    <div key={skill.name} style={{ fontSize: '13px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '5px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-ink-2)',
                          }}
                        >
                          {skill.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isOk
                              ? 'var(--color-success)'
                              : bigGap
                              ? 'var(--color-danger)'
                              : 'var(--color-ink)',
                          }}
                        >
                          {skill.current}{' '}
                          <span
                            style={{
                              color: 'var(--color-ink-4)',
                              fontWeight: 500,
                            }}
                          >
                            / {skill.needed}
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'var(--color-surface-2)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(skill.current, 100)}%`,
                            background: barColor,
                            borderRadius: '3px',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-2px',
                            left: `${Math.min(skill.needed, 100)}%`,
                            width: '2px',
                            height: '10px',
                            background: 'var(--color-ink-3)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gap summary */}
              {analysis.skill_audit.some((s) => !s.ok) && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'var(--color-warn-soft)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#a86200',
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}
                >
                  <b>主要缺口 ——</b>{' '}
                  {analysis.skill_audit
                    .filter((s) => !s.ok)
                    .map((s) => s.name)
                    .join('、')}{' '}
                  还未达到目标路径要求。前往「今天」查看专项练习计划。
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

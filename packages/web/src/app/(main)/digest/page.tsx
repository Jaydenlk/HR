'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Plus, X, Trash2, Download, GitBranch, Rss, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface FeedItem {
  id: string;
  title: string;
  content: string;
  company: string | null;
  role: string | null;
  outcome: string | null;
  source: string;
  category: string;
  source_url: string | null;
  created_at: string;
  user: { id: string; name: string } | null;
}

interface FormState {
  title: string;
  content: string;
  company: string;
  role: string;
  outcome: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  company: '',
  role: '',
  outcome: '',
};

function outcomeLabel(outcome: string | null) {
  if (!outcome) return null;
  const map: Record<string, string> = {
    pass: '通过',
    fail: '未通过',
    offer: '拿到 Offer',
    pending: '等待结果',
  };
  return map[outcome] ?? outcome;
}

function outcomeColor(outcome: string | null) {
  if (!outcome) return 'var(--color-ink-3)';
  const map: Record<string, string> = {
    pass: '#34c759',
    fail: '#ff3b30',
    offer: 'var(--color-brand)',
    pending: 'var(--color-warn)',
  };
  return map[outcome] ?? 'var(--color-ink-3)';
}

interface SourceBadgeConfig {
  label: string;
  bg: string;
  color: string;
}

function getSourceBadge(source: string): SourceBadgeConfig {
  const map: Record<string, SourceBadgeConfig> = {
    github: { label: 'GitHub', bg: '#24292e18', color: '#24292e' },
    nowcoder: { label: '牛客', bg: '#5c6bc018', color: '#5c6bc0' },
    ai_digest: { label: 'AI 精选', bg: 'var(--color-brand)18', color: 'var(--color-brand)' },
    ugc: { label: '团队分享', bg: '#34c75918', color: '#34c759' },
  };
  return map[source] ?? { label: source, bg: 'var(--color-surface)', color: 'var(--color-ink-3)' };
}

export default function DigestPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  async function loadItems() {
    try {
      const data = await api.get<FeedItem[]>('/feed');
      setItems(data);
    } catch {
      // silently ignore — empty list is fine
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function run() {
      try {
        const data = await api.get<FeedItem[]>('/feed');
        setItems(data);
      } catch {
        // silently ignore — empty list is fine
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/feed', {
        title: form.title.trim(),
        content: form.content.trim(),
        company: form.company.trim() || undefined,
        role: form.role.trim() || undefined,
        outcome: form.outcome || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/feed/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    }
  }

  async function triggerImport(type: 'github' | 'rss' | 'digest') {
    setImporting(type);
    setImportStatus(null);
    try {
      if (type === 'github') {
        const result = await api.post<{ imported: number }>('/feed/import/github', {});
        setImportStatus(`GitHub 导入完成，新增 ${result.imported} 条面经`);
      } else if (type === 'rss') {
        const result = await api.post<{ imported: number }>('/feed/import/rss', {});
        setImportStatus(`牛客 RSS 导入完成，新增 ${result.imported} 条面经`);
      } else {
        await api.post('/feed/digest', {});
        setImportStatus('AI 周刊已生成');
      }
      await loadItems();
    } catch (err) {
      setImportStatus(`操作失败：${err instanceof Error ? err.message : '请重试'}`);
    } finally {
      setImporting(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--color-line)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-ink)',
    background: 'var(--color-bg)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px 48px',
        boxSizing: 'border-box',
        maxWidth: '800px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
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
            月刊·面经
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
            汇聚团队成员分享、GitHub 面经库与牛客网面经，AI 周刊每周自动生成。
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--color-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: '16px',
            marginTop: '2px',
          }}
        >
          <Plus size={15} />
          手动添加面经
        </button>
      </div>

      {/* Import Controls */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: '16px',
          marginBottom: '4px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
          <Download size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          导入面经：
        </span>
        <button
          onClick={() => void triggerImport('github')}
          disabled={importing !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 13px',
            border: '1px solid #24292e30',
            borderRadius: '7px',
            background: importing === 'github' ? '#24292e10' : 'var(--color-bg)',
            color: '#24292e',
            fontSize: '13px',
            fontWeight: 500,
            cursor: importing !== null ? 'not-allowed' : 'pointer',
            opacity: importing !== null && importing !== 'github' ? 0.5 : 1,
          }}
        >
          <GitBranch size={13} />
          {importing === 'github' ? '导入中…' : '从 GitHub 导入'}
        </button>
        <button
          onClick={() => void triggerImport('rss')}
          disabled={importing !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 13px',
            border: '1px solid #5c6bc030',
            borderRadius: '7px',
            background: importing === 'rss' ? '#5c6bc010' : 'var(--color-bg)',
            color: '#5c6bc0',
            fontSize: '13px',
            fontWeight: 500,
            cursor: importing !== null ? 'not-allowed' : 'pointer',
            opacity: importing !== null && importing !== 'rss' ? 0.5 : 1,
          }}
        >
          <Rss size={13} />
          {importing === 'rss' ? '导入中…' : '从牛客导入'}
        </button>
        <button
          onClick={() => void triggerImport('digest')}
          disabled={importing !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 13px',
            border: '1px solid var(--color-brand)40',
            borderRadius: '7px',
            background: importing === 'digest' ? 'var(--color-brand)10' : 'var(--color-bg)',
            color: 'var(--color-brand)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: importing !== null ? 'not-allowed' : 'pointer',
            opacity: importing !== null && importing !== 'digest' ? 0.5 : 1,
          }}
        >
          <Sparkles size={13} />
          {importing === 'digest' ? '生成中…' : '生成 AI 周刊'}
        </button>
      </div>

      {importStatus && (
        <p
          style={{
            fontSize: '13px',
            color: importStatus.startsWith('操作失败') ? '#ff3b30' : '#34c759',
            marginTop: '8px',
            marginBottom: '0',
            flexShrink: 0,
          }}
        >
          {importStatus}
        </p>
      )}

      {/* Form dialog */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            style={{
              background: 'var(--color-bg)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                分享面试经验
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                标题 *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="例：字节跳动 产品经理 一面体验"
                maxLength={200}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  公司
                </label>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="字节跳动"
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  岗位
                </label>
                <input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="产品经理"
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                结果
              </label>
              <select name="outcome" value={form.outcome} onChange={handleChange} style={inputStyle}>
                <option value="">不填写</option>
                <option value="pass">通过</option>
                <option value="fail">未通过</option>
                <option value="offer">拿到 Offer</option>
                <option value="pending">等待结果</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                面试经过 *
              </label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="分享面试题目、考察重点、面试官风格、复盘建议等……"
                maxLength={5000}
                required
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: '120px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', textAlign: 'right' }}>
                {form.content.length} / 5000
              </span>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#ff3b30' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '9px 18px',
                  border: '1px solid var(--color-line)',
                  borderRadius: '8px',
                  background: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--color-ink-2)',
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                style={{
                  padding: '9px 24px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? '提交中…' : '发布'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          background: 'var(--color-line)',
          margin: '24px 0',
          flexShrink: 0,
        }}
      />

      {/* Content */}
      {loading ? (
        <div style={{ color: 'var(--color-ink-3)', fontSize: '14px', padding: '32px 0' }}>
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 32px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #eaf2ff 0%, #f0f4ff 100%)',
              border: '1px solid rgba(10,132,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px',
            }}
          >
            <BookOpen size={28} color="var(--color-brand)" />
          </div>
          <div>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.015em',
                marginBottom: '6px',
              }}
            >
              还没有面经记录
            </p>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-ink-3)',
                lineHeight: 1.6,
                maxWidth: '360px',
              }}
            >
              点击&ldquo;手动添加面经&rdquo;分享经验，或使用上方按钮从 GitHub / 牛客导入面经
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              marginTop: '4px',
              padding: '9px 20px',
              background: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            分享面试经验
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => {
            const badge = getSourceBadge(item.source);
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--color-line)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  background: 'var(--color-bg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--color-ink)',
                        marginBottom: '6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        alignItems: 'center',
                      }}
                    >
                      {/* Source badge */}
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 600,
                        }}
                      >
                        {badge.label}
                      </span>
                      {item.company && (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'var(--color-surface)',
                            color: 'var(--color-ink-2)',
                            border: '1px solid var(--color-line)',
                          }}
                        >
                          {item.company}
                        </span>
                      )}
                      {item.role && (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'var(--color-surface)',
                            color: 'var(--color-ink-2)',
                            border: '1px solid var(--color-line)',
                          }}
                        >
                          {item.role}
                        </span>
                      )}
                      {item.outcome && (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: `${outcomeColor(item.outcome)}18`,
                            color: outcomeColor(item.outcome),
                            fontWeight: 600,
                          }}
                        >
                          {outcomeLabel(item.outcome)}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.source === 'ugc' && (
                    <button
                      onClick={() => void handleDelete(item.id)}
                      title="删除（仅本人可删）"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-ink-3)',
                        padding: '4px',
                        flexShrink: 0,
                        display: 'flex',
                        opacity: 0.6,
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-ink-2)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.content}
                </p>

                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  {item.user?.name && (
                    <>
                      <span>{item.user.name}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>
                    {new Date(item.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  {item.source_url && (
                    <>
                      <span>·</span>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-brand)', textDecoration: 'none' }}
                      >
                        查看原文
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

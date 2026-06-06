'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  QuestionBankRecord,
  QuestionBankListItem,
  QuestionItem,
  QuestionBankGap,
} from '@/lib/types';
import {
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
} from 'lucide-react';

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-line)',
  borderRadius: '7px',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  letterSpacing: '0.03em',
  marginBottom: '4px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '14px',
  padding: '18px 20px',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    behavioral: '行为面',
    technical_cs: '计算机基础',
    technical_domain: '专业技术',
    case_product: '产品案例',
    case_business: '商业分析',
    motivation: '求职动机',
    cultural_fit: '文化契合',
    system_design: '系统设计',
  };
  return map[c] ?? c;
}

function difficultyLabel(d: string): string {
  return { easy: '简单', medium: '中等', hard: '困难' }[d] ?? d;
}

function frequencyLabel(f: string): string {
  return { very_high: '极高频', high: '高频', medium: '中频', low: '低频' }[f] ?? f;
}

function frequencyColor(f: string): string {
  if (f === 'very_high') return '#ef4444';
  if (f === 'high') return '#f59e0b';
  if (f === 'medium') return 'var(--color-brand)';
  return 'var(--color-ink-4)';
}

function difficultyColor(d: string): string {
  if (d === 'hard') return '#ef4444';
  if (d === 'medium') return '#f59e0b';
  return '#10b981';
}

function confidenceLabel(c: string): string {
  return { high: '高', medium: '中', low: '低', insufficient: '信息不足' }[c] ?? c;
}

function confidenceColor(c: string): string {
  if (c === 'high') return '#10b981';
  if (c === 'medium') return 'var(--color-brand)';
  return 'var(--color-ink-3)';
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({ q }: { q: QuestionItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-line)',
        borderRadius: '10px',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--color-ink-3)',
                background: 'var(--color-surface-3)',
                padding: '2px 7px',
                borderRadius: '99px',
                letterSpacing: '0.03em',
              }}
            >
              {categoryLabel(q.category)}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: frequencyColor(q.frequency),
                background: `${frequencyColor(q.frequency)}18`,
                padding: '2px 7px',
                borderRadius: '99px',
              }}
            >
              {frequencyLabel(q.frequency)}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: difficultyColor(q.difficulty),
                background: `${difficultyColor(q.difficulty)}18`,
                padding: '2px 7px',
                borderRadius: '99px',
              }}
            >
              {difficultyLabel(q.difficulty)}
            </span>
            {q.time_estimate != null && (
              <span style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginLeft: '2px' }}>
                ~{q.time_estimate} 分钟
              </span>
            )}
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.5 }}>
            {q.question}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
            来源：{q.source}
          </div>
        </div>
        {q.answer_hint && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            title={expanded ? '收起提示' : '查看回答提示'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && q.answer_hint && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--color-line)',
            fontSize: '12.5px',
            color: 'var(--color-ink-2)',
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--color-ink-3)' }}>回答要点：</span>
          {q.answer_hint}
        </div>
      )}
    </div>
  );
}

// ── Bank Detail View ──────────────────────────────────────────────────────────

function BankDetail({
  bank,
  onBack,
  onDelete,
}: {
  bank: QuestionBankRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const { result } = bank;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('确定要删除这个题库吗？')) return;
    setDeleting(true);
    try {
      await api.delete(`/question-bank/${bank.id}`);
      onDelete(bank.id);
    } catch {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  }

  // Group questions by category
  const grouped = result.question_bank.reduce<Record<string, QuestionItem[]>>((acc, q) => {
    const cat = q.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});

  const sectionTitle = (text: string) => (
    <div
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--color-ink-3)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-3)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            padding: '4px 0',
          }}
        >
          ← 返回列表
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'none',
            border: '1px solid var(--color-line)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            color: 'var(--color-danger)',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'inherit',
            padding: '6px 12px',
            borderRadius: '8px',
          }}
        >
          <Trash2 size={13} />
          删除
        </button>
      </div>

      {/* Summary card */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${confidenceColor(result.confidence)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>
            {bank.company} · {bank.role}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: confidenceColor(result.confidence),
              background: `${confidenceColor(result.confidence)}18`,
              padding: '2px 9px',
              borderRadius: '99px',
            }}
          >
            置信度：{confidenceLabel(result.confidence)}
          </span>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', margin: 0, lineHeight: 1.6 }}>
          {result.summary}
        </p>
      </div>

      {/* Insufficient state */}
      {result.confidence === 'insufficient' && (
        <div
          style={{
            padding: '16px 18px',
            background: 'var(--color-surface-2)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
            信息不足，题库质量有限
          </div>
          {result.follow_up_questions.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '6px' }}>
                建议补充：
              </div>
              {result.follow_up_questions.map((q, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>· {q}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coverage */}
      <div style={cardStyle}>
        {sectionTitle('覆盖度')}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1 }}>
              {result.coverage.total_questions}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginTop: '3px' }}>总题数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 800, color: 'var(--color-brand)', lineHeight: 1 }}>
              {result.coverage.estimated_coverage_percentage}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginTop: '3px' }}>估算覆盖率</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(result.coverage.by_category).map(([cat, count]) => (
            <span
              key={cat}
              style={{
                fontSize: '11.5px',
                color: 'var(--color-ink-2)',
                background: 'var(--color-surface-2)',
                padding: '3px 10px',
                borderRadius: '99px',
                fontWeight: 600,
              }}
            >
              {categoryLabel(cat)} {count}
            </span>
          ))}
        </div>
      </div>

      {/* Question bank by category */}
      {Object.entries(grouped).map(([cat, questions]) => (
        <div key={cat} style={cardStyle}>
          {sectionTitle(`${categoryLabel(cat)}（${questions.length} 题）`)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {questions.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </div>
      ))}

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <AlertCircle size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              题库空白区域
            </span>
          </div>
          {(result.gaps as QuestionBankGap[]).map((gap, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>{gap.area}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '2px' }}>{gap.reason}</div>
              {gap.workaround && (
                <div style={{ fontSize: '12px', color: 'var(--color-ink-2)', marginTop: '2px' }}>
                  建议：{gap.workaround}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div style={cardStyle}>
          {sectionTitle('备考建议')}
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
            {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListItem({
  item,
  onSelect,
}: {
  item: QuestionBankListItem;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background 0.1s',
      }}
    >
      <BookOpen size={18} color="var(--color-ink-3)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)' }}>
          {item.company} · {item.role}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.summary}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
          {item.total_questions}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--color-ink-4)' }}>题</div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<QuestionBankListItem[] | null>(null);
  const [selectedBank, setSelectedBank] = useState<QuestionBankRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function loadList() {
    try {
      const data = await api.get<QuestionBankListItem[]>('/question-bank');
      setList(data);
    } catch {
      // Non-fatal: list stays null
    }
  }

  async function handleGenerate() {
    if (!company.trim() || !role.trim()) {
      setError('请填写目标公司和岗位');
      return;
    }
    setError(null);
    setLoading(true);
    setSelectedBank(null);

    try {
      const data = await api.post<QuestionBankRecord>('/question-bank/generate', {
        company: company.trim(),
        role: role.trim(),
      });
      setSelectedBank(data);
      // Refresh list in background
      loadList().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFromList(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await api.get<QuestionBankRecord>(`/question-bank/${id}`);
      setSelectedBank(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请重试');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleShowList() {
    setSelectedBank(null);
    if (!list) {
      await loadList();
    }
  }

  function handleDeleted(id: string) {
    setSelectedBank(null);
    setList((prev) => prev?.filter((item) => item.id !== id) ?? null);
  }

  // Detail view
  if (selectedBank) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          padding: '40px 32px',
          gap: '20px',
          boxSizing: 'border-box',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <BankDetail bank={selectedBank} onBack={handleShowList} onDelete={handleDeleted} />
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          padding: '40px 32px',
          gap: '20px',
          boxSizing: 'border-box',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
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
            面试题库
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', margin: 0 }}>
            按公司+岗位生成结构化题库 · 来源标注 · 防编造保障
          </p>
        </div>

        {/* Generate form */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '14px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>目标公司 *</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="字节跳动"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <div>
              <label style={labelStyle}>目标岗位 *</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="后端开发 / HRBP / 产品经理"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? 'var(--color-surface-3)' : 'var(--color-brand)',
                color: loading ? 'var(--color-ink-3)' : '#fff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  生成中…
                </>
              ) : (
                <>
                  <Plus size={14} />
                  生成题库
                </>
              )}
            </button>
            <button
              onClick={handleShowList}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--color-line)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-ink-2)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <BookOpen size={14} />
              查看历史题库
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--color-danger-soft)',
              borderRadius: '10px',
              color: 'var(--color-danger)',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '40px',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            AI 正在构建题库，通常需要 15-30 秒…
          </div>
        )}

        {/* Detail loading */}
        {loadingDetail && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '40px',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            加载中…
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadingDetail && !error && list === null && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1.5px dashed var(--color-line-2)',
              gap: '8px',
              color: 'var(--color-ink-4)',
            }}
          >
            <BookOpen size={32} />
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-ink-3)' }}>
              填写公司和岗位，生成专属题库
            </p>
            <p style={{ fontSize: '12.5px', margin: 0 }}>
              支持行为面 · 技术 · 案例 · 文化契合等维度 · 来源诚实标注
            </p>
          </div>
        )}

        {/* History list */}
        {list !== null && !loading && !loadingDetail && (
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-4)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              历史题库（{list.length} 个）
            </div>
            {list.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'var(--color-surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-line)',
                  color: 'var(--color-ink-4)',
                  fontSize: '13.5px',
                }}
              >
                暂无已生成的题库，填写表单开始生成
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {list.map((item) => (
                  <ListItem key={item.id} item={item} onSelect={handleSelectFromList} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

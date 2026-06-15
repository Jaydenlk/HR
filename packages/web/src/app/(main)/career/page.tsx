'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  CareerAnalysis,
  CareerPath,
  SkillAuditItem,
  CareerHistoryItem,
} from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { RefreshCw, Loader2, Map, Sparkles, History, SlidersHorizontal, X } from 'lucide-react';

function FitBadge({ pct }: { pct: number }) {
  const isHigh = pct >= 80;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        fontWeight: 800,
        color: isHigh ? 'var(--color-brand)' : 'var(--color-warn)',
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
      className="lg"
      style={{
        // chosen 选中态:品牌边 + 玻璃柔阴影强调(不靠实底色,暗色也成立)。
        border: chosen ? '1.5px solid var(--color-brand)' : undefined,
        boxShadow: chosen ? 'var(--glass-sh)' : undefined,
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
            fontFamily: 'var(--serif)',
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
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
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
        <b style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          {path.alumni_count != null ? `${path.alumni_count} 人` : '暂无数据'}
        </b>
      </div>
    </div>
  );
}

/**
 * FIX-3:本地把用户自评覆盖到当前 analysis(不调 AI、不扣点),镜像后端 calibrateSkill 的自评分支:
 *  - current = 自评(展示尊重自评),scoreSource='self';
 *  - aiScore 保留 AI 原始分(若该技能此前已被压分,真实 AI 原分在 aiScore 里,否则就是当前 current);
 *  - gapScore = min(自评, AI原分)(保守分,缺口不被自评虚高欺骗),ok = gapScore>=needed。
 * 只覆盖用户实际给了分的技能;未涉及的技能原样保留。
 */
function applySelfAssessment(
  analysis: CareerAnalysis,
  scores: Record<string, number>,
): CareerAnalysis {
  return {
    ...analysis,
    skill_audit: analysis.skill_audit.map((s): SkillAuditItem => {
      const self = scores[s.name];
      if (self === undefined) return s;
      // AI 原始分:已压分的技能其原分在 aiScore;否则当前 current 即 AI 分。
      const aiRaw = s.aiScore != null ? s.aiScore : s.current;
      const gapScore = Math.min(self, aiRaw);
      return {
        ...s,
        current: self,
        scoreSource: 'self',
        aiScore: aiRaw,
        gapScore,
        ok: gapScore >= s.needed,
      };
    }),
  };
}

/** 分数 tooltip 文案:解释"这分怎么来的"——证据 / 压分 / 自评。 */
function skillTooltipText(skill: SkillAuditItem): string {
  if (skill.scoreSource === 'self') {
    const ai = skill.aiScore != null ? `（AI 原评 ${skill.aiScore} 分,已按你的自评校准）` : '';
    // FIX-5 诚实提示:展示尊重自评,但缺口按保守分(min(自评,AI原分))判;两者矛盾时讲清楚。
    if (!skill.ok && skill.current > skill.gapScore) {
      return `这是你的自评分 ${skill.current} 分${ai}。不过缺口仍按更保守的 ${skill.gapScore} 分计(取自评与 AI 评分的较低值),距目标 ${skill.needed} 分还有差距,建议继续补强、用项目坐实。`;
    }
    return `这是你的自评分 ${skill.current} 分${ai}。`;
  }
  if (skill.scoreSource === 'suppressed') {
    const ai = skill.aiScore != null ? `AI 原想给 ${skill.aiScore} 分,但` : '';
    // FG-1:区分"本无证据" vs "证据与该技能不相关(张冠李戴,已剔除)",后者标注相关性存疑。
    if (skill.evidenceRelevance === 'unrelated') {
      return `${ai}AI 给出的证据与该技能并不相关（疑似引用了简历中其他技能/经历的内容），已视为无效并下调到 ${skill.current} 分。补上该技能本身的项目/经历后会更准。`;
    }
    return `${ai}未在简历中找到该技能的具体证据，分数已下调到 ${skill.current} 分。补上对应项目/经历后会更准。`;
  }
  // ai 来源
  if (skill.evidenceFound.trim().length > 0) {
    return `依据简历中的证据评分：${skill.evidenceFound}`;
  }
  return `简历中未找到该技能的具体证据，给低档分 ${skill.current} 分。`;
}

function SkillRow({ skill }: { skill: SkillAuditItem }) {
  const isOk = skill.ok;
  // bigGap bug 修:量程 0-10,差距阈值 >3 才算大缺口(原 >30 永远触发不到,危险色失效)。
  // FIX-5:缺口危险色按保守分 gapScore 判(自评虚高不能让缺口凭空消失),与后端 ok 同源。
  const bigGap = !isOk && skill.needed - skill.gapScore > 3;
  const barColor = isOk
    ? 'var(--color-success)'
    : bigGap
    ? 'var(--color-danger)'
    : 'var(--color-brand)';

  return (
    <div style={{ fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>{skill.name}</span>
        <Tooltip content={skillTooltipText(skill)} triggerRender={<span />} side="top">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'help',
              borderBottom: '1px dotted var(--color-ink-4)',
              color: isOk ? 'var(--color-success)' : bigGap ? 'var(--color-danger)' : 'var(--color-ink)',
            }}
          >
            {skill.current}{' '}
            <span style={{ color: 'var(--color-ink-4)', fontWeight: 500 }}>/ {skill.needed}</span>
            {skill.scoreSource === 'self' && (
              <span style={{ marginLeft: '4px', fontSize: '9.5px', color: 'var(--color-brand)', fontWeight: 700 }}>
                自评
              </span>
            )}
            {skill.scoreSource === 'suppressed' && (
              <span style={{ marginLeft: '4px', fontSize: '9.5px', color: 'var(--color-danger)', fontWeight: 700 }}>
                无证据
              </span>
            )}
          </span>
        </Tooltip>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(47,143,255,.05)',
          border: '1px solid var(--hair)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(skill.current / 10) * 100}%`,
            background: barColor,
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            left: `${(skill.needed / 10) * 100}%`,
            width: '2px',
            height: '10px',
            background: 'var(--color-ink-3)',
          }}
        />
      </div>
    </div>
  );
}

function SkillGroup({
  title,
  icon,
  skills,
  accent,
}: {
  title: string;
  icon?: React.ReactNode;
  skills: SkillAuditItem[];
  accent?: boolean;
}) {
  if (skills.length === 0) return null;
  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
          fontSize: '13px',
          fontWeight: 700,
          color: accent ? 'var(--color-brand)' : 'var(--color-ink-2)',
        }}
      >
        {icon}
        {title}
        <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
          {skills.length} 项
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px' }}>
        {skills.map((skill) => (
          <SkillRow key={skill.name} skill={skill} />
        ))}
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-scrim" onClick={onClose} />
      <div
        className="lg"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '520px',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              display: 'flex',
            }}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--color-line)' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

function SelfAssessmentModal({
  skills,
  onClose,
  onSaved,
}: {
  skills: SkillAuditItem[];
  onClose: () => void;
  // FIX-3:保存后把自评分回传给页面做本地覆盖(不重新 analyze、不扣点)。
  onSaved: (scores: Record<string, number>) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(skills.map((s) => [s.name, s.current])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    // FIX-4:技能名固定取自当前结果(s.name),用户只打分不自由输入,
    // 避免 AI 换措辞导致后端 selfMap 匹配不上而静默失效。
    const submitted = Object.fromEntries(
      skills.map((s) => [s.name, scores[s.name] ?? s.current]),
    );
    try {
      // 持久化自评:供下次正式 analyze 时后端覆盖(后端 selfMap 逻辑保留)。
      await api.post<{ written: number }>(
        '/career/self-assessment',
        skills.map((s) => ({ skill_name: s.name, self_score: submitted[s.name] })),
      );
      // FIX-3:本地即时覆盖,不再触发 load()(那会再扣 1 点)。
      onSaved(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="填自评精进 · 校准你的真实水平"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {error && <span style={{ fontSize: '12.5px', color: 'var(--color-danger)' }}>{error}</span>}
          <button
            onClick={submit}
            disabled={saving}
            style={{
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            {saving ? '保存中…' : '保存并按自评校准（免费 · 不扣点）'}
          </button>
        </div>
      }
    >
      <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
        觉得 AI 的分不准？拖动滑块写下你对自己的真实评估。保存后当前页面立刻按你的自评校准分数（AI 分仍保留作参考），免费、不重新扣点；缺口仍按自评与 AI 评分的较低值计算，避免虚高让缺口消失。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {skills.map((s) => (
          <div key={s.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                {s.name}
                {s.category === 'ai' && (
                  <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>
                    AI
                  </span>
                )}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--color-brand)' }}>
                {scores[s.name] ?? s.current}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={scores[s.name] ?? s.current}
              onChange={(e) => setScores((prev) => ({ ...prev, [s.name]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--color-brand)' }}
            />
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function HistoryModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const [items, setItems] = useState<CareerHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<CareerHistoryItem[]>('/career/history');
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    })();
  }, []);

  return (
    <ModalShell title="历史记录" onClose={onClose}>
      {error ? (
        <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>
      ) : items === null ? (
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>加载中…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>还没有历史记录，生成一次职业地图后会出现在这里。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onOpen(it.id)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--hair)',
                background: 'rgba(47,143,255,.05)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                {it.top_path ?? '职业地图'}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--color-ink-3)' }}>
                {new Date(it.created_at).toLocaleString('zh-CN')} · {it.path_count} 条路径 · {it.skill_count} 项技能
              </span>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

export default function CareerPage() {
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noResume, setNoResume] = useState(false);
  // FG-4:有简历可生成但尚无任何已生成结果的空态——进页只读历史不扣点,此态给"主动生成"引导。
  const [neverGenerated, setNeverGenerated] = useState(false);
  const [showSelfAssess, setShowSelfAssess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // 历史回看:展示某条历史记录的只读快照(null 表示看实时结果)。
  const [viewing, setViewing] = useState<CareerAnalysis | null>(null);

  // FG-4 主动生成:仅用户点"重新评估/生成"时调用——GET /career/analysis 扣 1 点 + 跑 AI + 落库。
  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoResume(false);
    setNeverGenerated(false);
    setViewing(null);
    try {
      const data = await api.get<CareerAnalysis>('/career/analysis');
      setAnalysis(data);
      // 扣点成功后广播,刷新侧边栏点数(对齐其他页写法)。
      window.dispatchEvent(new Event('coach:credit-refresh'));
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
  }, []);

  // FG-4 进页只读:复用最近一次已生成结果(GET /career/history → /career/history/:id,均不扣点、不跑 AI、
  // 不落库)。看页面不花钱;有结果直接展示,没结果显示"主动生成"引导,从不进页自动扣点。
  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoResume(false);
    setNeverGenerated(false);
    setViewing(null);
    try {
      const history = await api.get<CareerHistoryItem[]>('/career/history');
      if (history.length === 0) {
        setNeverGenerated(true);
        return;
      }
      const latest = await api.get<CareerAnalysis>(`/career/history/${history[0].id}`);
      setAnalysis(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // async IIFE:把 setState 推迟到同步 effect body 之后,避免 set-state-in-effect 级联渲染告警。
    (async () => {
      await loadLatest();
    })();
  }, [loadLatest]);

  async function openHistoryDetail(id: string) {
    try {
      const data = await api.get<CareerAnalysis>(`/career/history/${id}`);
      setViewing(data);
      setShowHistory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史失败');
      setShowHistory(false);
    }
  }

  // 卡外层统一用 className="lg"(单层玻璃);cardStyle 仅留内边距。
  const cardStyle: React.CSSProperties = {
    padding: '20px 24px',
  };

  // 当前展示的数据:看历史则用 viewing 快照,否则用实时 analysis。
  const shown = viewing ?? analysis;
  const generalSkills = shown ? shown.skill_audit.filter((s) => s.category !== 'ai') : [];
  const aiSkills = shown ? shown.skill_audit.filter((s) => s.category === 'ai') : [];

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--hair)',
              background: 'rgba(47,143,255,.05)',
              color: 'var(--color-ink-2)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <History size={15} />
            历史
          </button>
          {/* FG-4:仅有已生成结果时显示"重新评估"(主动扣点重生成);进页只读态/空态不在此处扣点。 */}
          {!loading && analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <button
                onClick={generate}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--hair)',
                  background: 'rgba(47,143,255,.05)',
                  color: 'var(--color-ink)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                重新评估
              </button>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'rgba(47,143,255,.05)',
            border: '1px solid var(--hair)',
            borderRadius: '10px',
            fontSize: '12.5px',
            color: 'var(--color-ink-2)',
            fontWeight: 500,
          }}
        >
          正在回看一条历史记录（只读）
          <button
            onClick={() => setViewing(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--color-brand)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12.5px',
            }}
          >
            返回实时结果
          </button>
        </div>
      )}

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
            <Loader2 size={28} color="var(--color-brand)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', marginBottom: '6px' }}>
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
            background: 'transparent',
            borderRadius: '16px',
            border: '1.5px dashed var(--hair-2)',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Map size={26} color="var(--color-ink-4)" />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', letterSpacing: '-0.01em' }}>
            请先上传你的简历
          </p>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
            职业地图需要分析你的技能和经历，前往「简历馆」上传简历后再回来
          </p>
          <Link
            href="/resumes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            前往简历馆
          </Link>
        </div>
      ) : neverGenerated ? (
        /* FG-4 空态:进页只读历史发现尚无任何已生成结果。不自动扣点,引导用户主动生成。 */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 32px',
            textAlign: 'center',
            background: 'transparent',
            borderRadius: '16px',
            border: '1.5px dashed var(--hair-2)',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--color-brand-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Map size={26} color="var(--color-brand)" />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', letterSpacing: '-0.01em' }}>
            还没有生成过职业地图
          </p>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)', lineHeight: 1.5 }}>
            点击下方按钮，AI 会基于你的简历生成技能盘点与三年路径建议。
            <br />
            生成会消耗 1 点；之后再来本页查看结果不再扣点。
          </p>
          <button
            onClick={generate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '11px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            <Sparkles size={16} />
            生成职业地图（消耗 1 点）
          </button>
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
              onClick={loadLatest}
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
      ) : shown ? (
        <>
          {/* Hero(单层玻璃,品牌色数字/强调字由 token 表达) */}
          <div
            className="lg"
            style={{
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
                  fontFamily: 'var(--serif)',
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-ink)',
                }}
              >
                三年后 · <span style={{ color: 'var(--color-brand)' }}>你会在哪？</span>
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink-2)', fontWeight: 500, lineHeight: 1.55 }}>
                基于你的技能盘点 + 校友真实轨迹 · Coach 给你 {shown.paths.length} 个最可能 / 最适合的方向
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
                {shown.paths.length}
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
          {shown.paths.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(shown.paths.length, 3)}, 1fr)`,
                gap: '12px',
              }}
            >
              {shown.paths.map((path, i) => (
                <PathCard key={path.title} path={path} chosen={i === 0} />
              ))}
            </div>
          )}

          {/* Skill audit */}
          {shown.skill_audit.length > 0 && (
            <div className="lg" style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.012em' }}>
                  能力盘点 · 你 vs 路径要求
                </h3>
                {!viewing && (
                  <button
                    onClick={() => setShowSelfAssess(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '9px',
                      border: '1px solid var(--color-brand)',
                      background: 'var(--color-brand-soft)',
                      color: 'var(--color-brand)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <SlidersHorizontal size={14} />
                    觉得分数不准？填自评精进
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <SkillGroup title="通用能力" skills={generalSkills} />
                <SkillGroup
                  title="AI 能力"
                  icon={<Sparkles size={14} />}
                  skills={aiSkills}
                  accent
                />
              </div>

              {/* Gap summary */}
              {shown.skill_audit.some((s) => !s.ok) && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'var(--color-warn-soft)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--color-warn)',
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}
                >
                  <b>主要缺口 ——</b>{' '}
                  {shown.skill_audit
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

      {showSelfAssess && analysis && (
        <SelfAssessmentModal
          skills={analysis.skill_audit}
          onClose={() => setShowSelfAssess(false)}
          onSaved={(scores) => {
            setShowSelfAssess(false);
            // FIX-3:纯前端本地用自评覆盖当前已显示分数,不重新 analyze、不扣点。
            setAnalysis((prev) => (prev ? applySelfAssessment(prev, scores) : prev));
          }}
        />
      )}

      {showHistory && (
        <HistoryModal onClose={() => setShowHistory(false)} onOpen={openHistoryDetail} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

'use client';

/**
 * PerfReportLibrary — 性能测试报告库(第一层,只读)
 *
 * null 选中态 → 渲染报告卡片网格;选中某报告 → 拉详情并渲染 PerfReportDetail(风琴包)。
 * 数据经鉴权 api 端点 fetch(GET /admin/perf-reports 列表 + /admin/perf-reports/:id 详情),
 * 报告全文不进前端 bundle、仅管理员可取;view-only:无创建/编辑/删除按钮,无写入请求。
 *
 * 真实报告卡来自列表端点(1→N 自适应网格);另附 2 张「待发布」占位灰卡演示网格
 * (占位卡无 onClick、无任何按钮,前端静态写死)。
 */

import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PerfReportDetail } from './PerfReportDetail';
import type { PerfReport, PerfReportCard } from './perfTypes';

function MetaBadge({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span
      style={{
        fontSize: '11.5px',
        fontWeight: 600,
        color: 'var(--color-ink-2)',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid var(--hair)',
        borderRadius: '8px',
        padding: '4px 9px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
      }}
    >
      {children}
    </span>
  );
}

const loadingBox: React.CSSProperties = {
  padding: '40px',
  display: 'flex',
  justifyContent: 'center',
};

const errorAlert: React.CSSProperties = {
  background: 'var(--color-danger-soft)',
  color: 'var(--color-danger)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  marginBottom: '12px',
  fontWeight: 500,
};

export function PerfReportLibrary(): React.ReactElement {
  // 列表层状态
  const [cards, setCards] = useState<PerfReportCard[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // 详情层状态(selectedId 非空即进详情视图)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PerfReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 列表 fetch:首个 setState 在 await 之后,规避 react-hooks/set-state-in-effect。
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await api.get<PerfReportCard[]>('/admin/perf-reports');
        if (!cancelled) setCards(data);
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // 详情 fetch:selectedId 变化时拉完整报告。
  // effect 体内只跑 async run,首个 setState 在 await 之后(规避 react-hooks/set-state-in-effect);
  // 进入详情前的「清空旧报告 + 置 loading」在 openReport 同步完成(点击路径,非 effect)。
  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    async function run(id: string) {
      try {
        const data = await api.get<PerfReport | null>(`/admin/perf-reports/${id}`);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void run(selectedId);
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // 进入详情:点击路径同步重置详情态并置 loading,再触发 selectedId effect 拉取。
  const openReport = (id: string) => {
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSelectedId(id);
  };

  const backToList = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  // ── 详情视图 ──
  if (selectedId !== null) {
    if (detailLoading) {
      return (
        <div className="lg" style={{ padding: '20px 22px' }}>
          <div style={loadingBox}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
          </div>
        </div>
      );
    }
    if (detailError || detail === null) {
      return (
        <div className="lg" style={{ padding: '20px 22px' }}>
          {detailError && (
            <div role="alert" style={errorAlert}>
              {detailError}
            </div>
          )}
          {!detailError && detail === null && (
            <div style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>报告暂不可用</div>
          )}
          <button
            type="button"
            onClick={backToList}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--hair)',
              background: 'rgba(47,143,255,.05)',
              color: 'var(--color-ink)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            返回报告库
          </button>
        </div>
      );
    }
    return <PerfReportDetail report={detail} onBack={backToList} />;
  }

  // ── 列表视图 ──
  return (
    <div>
      {/* 只读说明条 */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '12.5px',
          color: 'var(--color-ink-3)',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid var(--hair)',
          borderRadius: '999px',
          padding: '6px 13px',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-success)',
          }}
        />
        只读视图 · 报告由研发侧打包发布,此处不创建/编辑
      </div>

      {/* 错误态 */}
      {listError && (
        <div role="alert" style={errorAlert}>
          {listError}
        </div>
      )}

      {/* 加载态 */}
      {listLoading ? (
        <div style={loadingBox}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
        </div>
      ) : (
        /* 卡片网格 */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '18px',
          }}
        >
          {/* 真实报告卡(整卡可点) */}
          {cards.map((report) => (
            <div
              key={report.id}
              role="button"
              tabIndex={0}
              onClick={() => openReport(report.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openReport(report.id);
                }
              }}
              className="lg"
              style={{ padding: '20px 22px', cursor: 'pointer' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: '17px',
                      fontWeight: 700,
                      lineHeight: 1.35,
                      letterSpacing: '-0.01em',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {report.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
                    {report.positioning}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    color: '#F5B945',
                    background: 'rgba(245,185,69,.12)',
                    border: '1px solid rgba(245,185,69,.28)',
                  }}
                >
                  {report.statusLabel}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '14px 0 12px' }}>
                <MetaBadge>
                  <Calendar size={12} /> <b style={{ color: 'var(--color-ink)' }}>{report.date}</b>
                </MetaBadge>
                <MetaBadge>
                  <b style={{ color: 'var(--color-ink)' }}>{report.modelCount}</b> 模型
                </MetaBadge>
                <MetaBadge>{report.sampleSummary}</MetaBadge>
                <MetaBadge>
                  <b style={{ color: 'var(--color-ink)' }}>{report.judgeCount}</b> 裁判
                </MetaBadge>
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-ink-2)',
                  lineHeight: 1.6,
                  borderTop: '1px solid var(--color-line)',
                  paddingTop: '12px',
                }}
              >
                {report.conclusionPreview}
              </div>

              <div
                style={{
                  marginTop: '14px',
                  textAlign: 'right',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--color-brand)',
                }}
              >
                查看报告 →
              </div>
            </div>
          ))}

          {/* 占位灰卡:演示 1→N 网格自适应(无 onClick、无按钮) */}
          <div className="lg" style={{ padding: '20px 22px', opacity: 0.42, cursor: 'default' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '17px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    color: 'var(--color-ink-3)',
                  }}
                >
                  Round-2 扩样报告
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
                  每功能 ≥50 例 · 多裁判 · 并发压测
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 9px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  color: 'var(--color-ink-3)',
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid var(--hair)',
                }}
              >
                待发布
              </span>
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-4)',
                lineHeight: 1.6,
                borderTop: '1px solid var(--hair)',
                paddingTop: '12px',
              }}
            >
              报告库随研发侧打包自动增长,1 → N 份无需改结构。
            </div>
          </div>

          <div className="lg" style={{ padding: '20px 22px', opacity: 0.28, cursor: 'default' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '17px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    color: 'var(--color-ink-4)',
                  }}
                >
                  ASR/TTS 准确率报告
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
                  阶跃 vs 讯飞 · 60 样本商用测试集
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 9px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  color: 'var(--color-ink-4)',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--hair)',
                }}
              >
                待发布
              </span>
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-4)',
                lineHeight: 1.6,
                borderTop: '1px solid var(--hair)',
                paddingTop: '12px',
              }}
            >
              每张卡一份报告,点开进各自的风琴包详情。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerfReportLibrary;

import { CalendarClock, ExternalLink, HelpCircle, MapPin } from 'lucide-react';
import type { RecruitBoardData, RecruitEventView } from '@/lib/types';

function formatEventDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** 「校招情报」常驻板块:未过期按 event_date 升序(后端已排好);缺日期的事件落"日期待确认"分区,
 * 不参与主列表排序(防编造红线:不得由前端替 AI/后端补一个假日期塞进主列表)。 */
export function RecruitIntelBoard({ data }: { data: RecruitBoardData }) {
  const { upcoming, unscheduled } = data;
  if (upcoming.length === 0 && unscheduled.length === 0) return null;

  return (
    <section className="ri-board" aria-label="校招情报">
      <style>{RI_BOARD_CSS}</style>
      <div className="ri-board-header">
        <CalendarClock size={16} />
        <h2>校招情报</h2>
        <span className="ri-board-count">{upcoming.length} 条待跟进</span>
      </div>

      {upcoming.length > 0 ? (
        <ul className="ri-board-list">
          {upcoming.map((event) => (
            <RecruitEventRow key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="ri-board-empty">暂无未过期的校招事件。</p>
      )}

      {unscheduled.length > 0 && (
        <div className="ri-unscheduled">
          <div className="ri-unscheduled-header">
            <HelpCircle size={13} />
            日期待确认
          </div>
          <ul className="ri-board-list">
            {unscheduled.map((event) => (
              <RecruitEventRow key={event.id} event={event} dateLabel="日期待确认" />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RecruitEventRow({ event, dateLabel }: { event: RecruitEventView; dateLabel?: string }) {
  return (
    <li className="ri-event-row">
      <div className="ri-event-main">
        <strong>{event.company}</strong>
        <span className="ri-event-type">{event.event_type}</span>
        {event.role_hint && <span className="ri-event-role">{event.role_hint}</span>}
      </div>
      <div className="ri-event-meta">
        <span className="ri-event-date">{dateLabel ?? formatEventDate(event.event_date)}</span>
        {event.city && (
          <span className="ri-event-city">
            <MapPin size={11} />
            {event.city}
          </span>
        )}
        {event.apply_url && (
          <a className="ri-event-link" href={event.apply_url} target="_blank" rel="noopener noreferrer">
            查看
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </li>
  );
}

const RI_BOARD_CSS = `
.ri-board {
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
  background: rgba(47,143,255,.04);
  padding: 16px 18px;
  margin: 0 0 18px;
}

.ri-board-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ri-board-header h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 16px;
  color: var(--color-ink);
}

.ri-board-count {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-brand-ink);
  background: var(--color-brand-soft);
  border-radius: 999px;
  padding: 2px 9px;
}

.ri-board-empty {
  margin: 0;
  color: var(--color-ink-3);
  font-size: 12.5px;
}

.ri-board-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ri-event-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px dashed var(--hair);
  padding-bottom: 8px;
}

.ri-event-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ri-event-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ri-event-main strong {
  font-size: 13px;
  color: var(--color-ink);
}

.ri-event-type {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-ink-2);
  background: rgba(47,143,255,.08);
  border-radius: 999px;
  padding: 2px 8px;
}

.ri-event-role {
  font-size: 12px;
  color: var(--color-ink-3);
}

.ri-event-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--color-ink-3);
}

.ri-event-city {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.ri-event-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-brand);
  font-weight: 700;
  text-decoration: none;
}

.ri-unscheduled {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--hair);
}

.ri-unscheduled-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-ink-3);
}
`;

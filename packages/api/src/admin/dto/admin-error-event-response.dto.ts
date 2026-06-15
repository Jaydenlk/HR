import { OpsEvent, OpsEventType } from '../../ops/entities/ops-event.entity';

// detail 白名单:只允许这些 key 出现在响应 detail 对象中。
// 任何含有 token/原始请求体/正文内容的 key 一律在此省略,即使存在于 DB 记录里。
const DETAIL_KEY_WHITELIST = new Set<string>([
  // AI 降级/失败类
  'endpoint',
  'error',
  'model',
  'provider',
  'active',
  'maxConcurrent',
  'maxQueue',
  // credit 失败类
  'user_id',
  // 管理操作类
  'actor',
  'target',
  'op',
  'patch',
  'delta',
  'note',
]);

// 出参:运维事件/错误流水单条响应(GET /admin/ops-events、GET /admin/error-stream)。
// 隐私铁律:detail 字段经白名单过滤,确保 token/原始请求体/正文内容不出现在响应中。
export class AdminErrorEventResponseDto {
  id: string;
  type: OpsEventType;
  // detail 白名单投影:只含 DETAIL_KEY_WHITELIST 内的 key。
  detail: Record<string, unknown> | null;
  created_at: string; // ISO 8601 字符串

  // 静态工厂:从 OpsEvent 实体构造响应,强制 detail 白名单过滤。
  static from(event: OpsEvent): AdminErrorEventResponseDto {
    const dto = new AdminErrorEventResponseDto();
    dto.id = event.id;
    dto.type = event.type;
    dto.detail = AdminErrorEventResponseDto.filterDetail(event.detail);
    dto.created_at = event.created_at.toISOString();
    return dto;
  }

  // 批量映射。
  static fromMany(events: OpsEvent[]): AdminErrorEventResponseDto[] {
    return events.map((e) => AdminErrorEventResponseDto.from(e));
  }

  // detail 白名单过滤:只保留 DETAIL_KEY_WHITELIST 内的 key,其余全部丢弃。
  private static filterDetail(
    detail: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (detail === null || detail === undefined) return null;
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(detail)) {
      if (DETAIL_KEY_WHITELIST.has(key)) {
        filtered[key] = detail[key];
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : null;
  }
}

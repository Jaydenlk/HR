import { OpsEvent } from '../../ops/entities/ops-event.entity';

// 出参:最近 AI 调用失败(GET /admin/recent-failures)单条。
// 只对 AI_CALL_FAILED 类事件构造:供管理后台快速排障(谁/哪个端点/哪一步/为何失败)。
// 隐私铁律:用户标识只回打码后的形式(ab***@x.com),绝不回完整邮箱;无法解析则回 null。
export class AdminRecentFailureResponseDto {
  id: string;
  // 失败时间 ISO 8601。
  created_at: string;
  // 失败原因(detail.error)。无则 null。
  reason: string | null;
  // 触发失败的端点(detail.endpoint)。无则 null。
  endpoint: string | null;
  // 失败发生的阶段(detail.stage,如 transcribe);拦截器路径无此字段则 null。
  stage: string | null;
  // 打码用户标识(如 ab***@x.com);无法解析(无 user_id 或用户已删)则 null。
  user: string | null;

  // 静态工厂:从 OpsEvent 实体 + userId→email 映射构造,强制对邮箱打码。
  static from(
    event: OpsEvent,
    emailById: Map<string, string>,
  ): AdminRecentFailureResponseDto {
    const detail = event.detail ?? {};
    const dto = new AdminRecentFailureResponseDto();
    dto.id = event.id;
    dto.created_at = event.created_at.toISOString();
    dto.reason = typeof detail.error === 'string' ? detail.error : null;
    dto.endpoint = typeof detail.endpoint === 'string' ? detail.endpoint : null;
    dto.stage = typeof detail.stage === 'string' ? detail.stage : null;
    const userId = typeof detail.user_id === 'string' ? detail.user_id : null;
    const email = userId ? emailById.get(userId) : undefined;
    dto.user = email ? AdminRecentFailureResponseDto.maskEmail(email) : null;
    return dto;
  }

  static fromMany(
    events: OpsEvent[],
    emailById: Map<string, string>,
  ): AdminRecentFailureResponseDto[] {
    return events.map((e) => AdminRecentFailureResponseDto.from(e, emailById));
  }

  // 邮箱打码:本地名保留首尾各 1 字符、中间替 ***;域名保留 TLD,主域首字符 + 其余替 *。
  //   alice@example.com → al***e@e*****e.com;a@b.io → a***@*.io(本地名过短则整段 ***)。
  // 目的:出站可辨识到「大概是谁」用于排障,但不泄露完整邮箱。
  private static maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const maskedLocal =
      local.length <= 2
        ? `${local[0] ?? ''}***`
        : `${local[0]}***${local[local.length - 1]}`;
    const dot = domain.lastIndexOf('.');
    if (dot <= 0) return `${maskedLocal}@***`;
    const host = domain.slice(0, dot);
    const tld = domain.slice(dot); // 含点,如 .com
    const maskedHost =
      host.length <= 1 ? '*' : `${host[0]}${'*'.repeat(host.length - 1)}`;
    return `${maskedLocal}@${maskedHost}${tld}`;
  }
}

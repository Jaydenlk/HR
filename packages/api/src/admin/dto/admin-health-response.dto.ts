import { HealthReport } from '../../health/health.service';
import { QueueStatus } from '../../ai/concurrency-limiter';

// 出参:平台健康快照响应(GET /admin/health-snapshot)。
// 字段白名单投影:只暴露状态级与计数级字段,不含任何业务数据。
// 手工映射风格:沿用 AdminUserRow 模式,static from() 强制字段白名单。
export class AdminHealthResponseDto {
  // 整体健康状态:DB ping 通过为 'ok',否则 'error'。
  status: 'ok' | 'error';

  // 数据库连通性。
  db: 'ok' | 'error';

  // 进程运行时长(秒,取整)。
  uptime: number;

  // 应用版本号。
  version: string;

  // 快照时间戳 ISO 8601。
  timestamp: string;

  // 并发护栏状态:当前进行中与排队中的请求数。
  concurrency: {
    active: number;
    queued: number;
    // 是否处于排队压力状态(queued > 0 即视为有压力,供前端高亮展示)。
    under_pressure: boolean;
  };

  // 静态工厂:从 HealthService.check() 与 ConcurrencyLimiter.status() 结果构造响应。
  static from(health: HealthReport, queue: QueueStatus): AdminHealthResponseDto {
    const dto = new AdminHealthResponseDto();
    dto.status = health.status;
    dto.db = health.db;
    dto.uptime = health.uptime;
    dto.version = health.version;
    dto.timestamp = health.timestamp;
    dto.concurrency = {
      active: queue.active,
      queued: queue.queued,
      under_pressure: queue.queued > 0,
    };
    return dto;
  }
}

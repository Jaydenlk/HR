import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService, HealthReport } from './health.service';

// 健康检查端点:不挂任何鉴权守卫,供反代/容器探针/外部监控无凭证访问。
// 注意:全局前缀 'api' 由 main.ts 设置,故实际路径为 /api/health。
// Caddyfile 与 compose healthcheck 须按 /api/health 探测(本路由相对前缀注册为 health)。
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  // 始终返回 200(即便 DB down 也回 200 + status:'error'),
  // 让探针拿到结构化诊断而非裸 5xx;监控按 body.status 判活。
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): Promise<HealthReport> {
    return this.health.check();
  }
}

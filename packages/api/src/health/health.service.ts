import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// 健康检查响应结构。运维探针(Caddy/compose healthcheck/外部监控)按 status 字段判活。
export interface HealthReport {
  // 整体状态:DB ping 通过为 'ok',否则 'error'。
  status: 'ok' | 'error';
  // 进程运行时长(秒,取整)。
  uptime: number;
  // 应用版本号:优先取 APP_VERSION 环境变量(部署时注入镜像 tag),回退 'unknown'。
  version: string;
  // 数据库连通性:实际跑一次轻量查询验证连接可用,而非仅看 isInitialized 标志。
  db: 'ok' | 'error';
  // ISO 时间戳,便于日志对齐。
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async check(): Promise<HealthReport> {
    const db = await this.pingDb();
    return {
      status: db === 'ok' ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      version: process.env.APP_VERSION ?? 'unknown',
      db,
      timestamp: new Date().toISOString(),
    };
  }

  // 真实 DB ping:跑一条 `SELECT 1` 探测连接。
  // 不依赖 isInitialized——初始化标志为真但底层连接已断时仍会误报健康。
  private async pingDb(): Promise<'ok' | 'error'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }
}

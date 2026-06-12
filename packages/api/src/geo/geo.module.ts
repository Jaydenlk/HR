import { Module } from '@nestjs/common';
import { IpRegionService } from './ip-region.service';

// 离线 IP 归属解析模块:单例 IpRegionService(启动时加载 xdb 一次),供 AuthModule 注入。
@Module({
  providers: [IpRegionService],
  exports: [IpRegionService],
})
export class GeoModule {}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { defaultDbFile, isValidIp, loadContentFromFile, newWithBuffer } from 'ip2region-ts';

// ip2region-ts 未导出 Searcher 类型,从工厂函数返回值推导(严格类型,不用 any)。
type Searcher = ReturnType<typeof newWithBuffer>;

// IP 归属:省/市,任一查不到即为 null,绝不编造。
export interface IpRegion {
  province: string | null;
  city: string | null;
}

// region 字符串「国家|区域|省份|城市|ISP」中省/市的下标(如「中国|0|江苏省|南京市|电信」)。
const REGION_PROVINCE_INDEX = 2;
const REGION_CITY_INDEX = 3;

/**
 * 离线 IP → 省/市归属解析(单例)。
 *
 * 数据源:ip2region(lionsoul2014/ip2region,中国 IP 归属离线事实标准)的社区 Node 封装
 * ip2region-ts,包内自带 ~11M 的 ip2region.xdb(node_modules 内,Docker runner 阶段
 * 随 node_modules 拷贝天然带上,无需改 Dockerfile)。
 *
 * 启动时把 xdb 全量读入内存 buffer 一次(newWithBuffer,单次查询 ~0.0x ms,无文件 IO),
 * 之后所有查询走内存。加载失败仅告警不阻断启动——登录主流程不依赖归属解析,查不到存 null。
 */
@Injectable()
export class IpRegionService implements OnModuleInit {
  private readonly logger = new Logger(IpRegionService.name);
  private searcher: Searcher | null = null;

  onModuleInit(): void {
    try {
      this.searcher = newWithBuffer(loadContentFromFile(defaultDbFile));
    } catch (err) {
      this.logger.warn(`ip2region xdb 加载失败,IP 归属解析降级为 null: ${(err as Error).message}`);
    }
  }

  /**
   * 解析 IP 归属:
   * - 内网/localhost(127.x / ::1 / 10.x / 172.16-31.x / 192.168.x)→ province「内网」;
   * - 公网 IPv4 → xdb 查省/市,字段缺失(xdb 里为 '0')存 null;
   * - 非法 IP / IPv6 公网 / 查询失败 → null(不编造)。
   */
  async resolve(ip: string): Promise<IpRegion | null> {
    const normalized = this.normalize(ip);
    if (!normalized) return null;

    if (this.isInternal(normalized)) {
      return { province: '内网', city: null };
    }

    if (!this.searcher || !isValidIp(normalized)) return null;

    try {
      const { region } = await this.searcher.search(normalized);
      if (!region) return null;
      const parts = region.split('|');
      const province = this.fieldOrNull(parts[REGION_PROVINCE_INDEX]);
      const city = this.fieldOrNull(parts[REGION_CITY_INDEX]);
      return province || city ? { province, city } : null;
    } catch (err) {
      this.logger.warn(`IP 归属解析失败(${normalized}): ${(err as Error).message}`);
      return null;
    }
  }

  // 去掉 IPv4-mapped IPv6 前缀(::ffff:1.2.3.4 → 1.2.3.4),trim 空白;空串返回 null。
  private normalize(ip: string): string | null {
    const trimmed = ip.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase().startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
  }

  // 内网判定:127.x / ::1 / 10.x / 172.16-31.x / 192.168.x(与前后端契约一致)。
  private isInternal(ip: string): boolean {
    if (ip === '::1') return true;
    const octets = ip.split('.');
    if (octets.length !== 4) return false;
    const [a, b] = [Number(octets[0]), Number(octets[1])];
    if (a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // xdb 字段缺失约定为 '0' 或空串 → null。
  private fieldOrNull(value: string | undefined): string | null {
    return value && value !== '0' ? value : null;
  }
}

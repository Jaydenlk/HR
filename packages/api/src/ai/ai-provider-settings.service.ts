import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  AiConfig,
  AiProviderKind,
  orderProviders,
} from '../config/ai.config';
import { AiProviderSettings } from './entities/ai-provider-settings.entity';

// service 对外暴露的「有效配置」:已规范化的主力 + 完整降级顺序(已去重补齐)。
// 仅含通道名,绝不含密钥/baseURL/型号——那些永远从 env(AiConfig)取。
export interface EffectiveProviderConfig {
  primary: AiProviderKind;
  order: AiProviderKind[];
}

const KNOWN_PROVIDERS: readonly AiProviderKind[] = ['deepseek', 'relay', 'glm'];

function isKnownProvider(value: unknown): value is AiProviderKind {
  return typeof value === 'string' && (KNOWN_PROVIDERS as readonly string[]).includes(value);
}

/**
 * AI provider 运行时配置读写 + 短 TTL 内存缓存。
 *
 * - current():AiService 在每次调用进入时读「有效配置」据此排序已构造好的 Provider 实例池。
 *   带短 TTL 缓存(默认 8s),避免每次 AI 调用打 DB;切换(update)时主动 invalidate。
 * - 无 DB 记录 → 回退 env primaryProvider + 默认顺序(与今天行为完全一致,平滑)。
 * - 安全红线:本 service 只处理通道名(deepseek/relay/glm),永不接触密钥/baseURL/型号。
 *
 * update() 由 admin ai-provider 端点调用(端点本身波2集成,签名在此先备好)。
 */
@Injectable()
export class AiProviderSettingsService {
  private readonly logger = new Logger(AiProviderSettingsService.name);
  private readonly cacheTtlMs = 8000;
  private cache: { value: EffectiveProviderConfig; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(AiProviderSettings)
    private readonly repo: Repository<AiProviderSettings>,
    private readonly config: ConfigService,
  ) {}

  /** env 回退:无 DB 记录时的有效配置(= 今天行为)。 */
  private envFallback(): EffectiveProviderConfig {
    const ai = this.config.get<AiConfig>('ai')!;
    const primary = ai.primaryProvider;
    return { primary, order: orderProviders(primary) };
  }

  /**
   * 读最新一行 DB 配置,解析为规范化有效配置;非法/缺失字段安全回退 env。
   * 带短 TTL 缓存。
   */
  async current(): Promise<EffectiveProviderConfig> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }
    const value = await this.load();
    this.cache = { value, expiresAt: now + this.cacheTtlMs };
    return value;
  }

  /** 切换后清缓存,使下次 current() 立即读新值(免重启即时生效)。 */
  invalidate(): void {
    this.cache = null;
  }

  /**
   * 写入新配置(单行覆盖语义:不存在则建,存在则更新最新行)。
   * primary/order 已由调用方(DTO + service)白名单校验;此处再次过滤未知通道名,纵深防御。
   * 返回写入后的有效配置,并 invalidate 缓存。
   */
  async update(
    primary: AiProviderKind,
    order: AiProviderKind[] | undefined,
    updatedBy: string | null,
  ): Promise<EffectiveProviderConfig> {
    const safeOrder = orderProviders(primary, (order ?? []).filter(isKnownProvider));
    const existing = await this.repo.find({ order: { updated_at: 'DESC' }, take: 1 });
    const row = existing[0] ?? this.repo.create();
    row.primary = primary;
    row.order = JSON.stringify(safeOrder);
    row.updated_by = updatedBy;
    await this.repo.save(row);
    this.invalidate();
    return { primary, order: safeOrder };
  }

  private async load(): Promise<EffectiveProviderConfig> {
    const rows = await this.repo.find({ order: { updated_at: 'DESC' }, take: 1 });
    const row = rows[0];
    if (!row) return this.envFallback();

    const primary = isKnownProvider(row.primary) ? row.primary : null;
    if (!primary) {
      // DB 主力名非法(理论上不可能,白名单写入)→ 回退 env,不崩。
      this.logger.warn(`ai_provider_settings.primary 非法值 "${row.primary}",回退 env 配置`);
      return this.envFallback();
    }

    let parsedOrder: AiProviderKind[] = [];
    try {
      const raw: unknown = JSON.parse(row.order);
      if (Array.isArray(raw)) parsedOrder = raw.filter(isKnownProvider);
    } catch {
      this.logger.warn(`ai_provider_settings.order 解析失败,按默认顺序补齐`);
    }
    return { primary, order: orderProviders(primary, parsedOrder) };
  }
}

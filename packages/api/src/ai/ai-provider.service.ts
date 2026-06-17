import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../config/ai.config';
import { AiProvider } from './entities/ai-provider.entity';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  resolveMasterKey,
} from '../common/secret-crypto';

// AiService 用的「已解密、可直接构造 client」的通道视图(明文 key 仅在进程内存,绝不出本边界)。
export interface LoadedProvider {
  id: string;
  name: string;
  protocol: string;
  baseURL: string;
  apiKey: string;
  modelPro: string;
  modelFlash: string;
  timeoutMs: number;
  maxRetries: number;
}

// admin 列表/详情对外视图:密钥只回打码,绝不回明文/密文。
export interface ProviderView {
  id: string;
  name: string;
  protocol: string;
  baseURL: string;
  apiKeyMasked: string;
  modelPro: string;
  modelFlash: string;
  role: string;
  sortOrder: number;
  timeoutMs: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// 新建通道入参(apiKey 必填,write-only)。
export interface CreateProviderInput {
  name: string;
  protocol: string;
  baseURL: string;
  apiKey: string;
  modelPro: string;
  modelFlash: string;
  role: 'primary' | 'backup' | 'disabled';
  sortOrder?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

// 改通道入参(全部可选;apiKey 不传则不改 key —— write-only 语义)。
export interface UpdateProviderInput {
  name?: string;
  protocol?: string;
  baseURL?: string;
  apiKey?: string;
  modelPro?: string;
  modelFlash?: string;
  role?: 'primary' | 'backup' | 'disabled';
  sortOrder?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

// 草稿连通性测试入参(未保存配置,直接拿明文 key 测一次)。
export interface DraftTestInput {
  protocol: string;
  baseURL: string;
  apiKey: string;
  modelFlash: string;
  timeoutMs?: number;
}

const VALID_ROLES = ['primary', 'backup', 'disabled'] as const;
const VALID_PROTOCOLS = ['anthropic-compat', 'openai-compat'] as const;

/**
 * AI provider 通道 CRUD + 解密池加载 + 短 TTL 缓存 + env 种子。
 *
 * - loadPool():AiService 每次调用前读已解密、已排序的通道池(primary 优先,backup 按 sort_order),
 *   带短 TTL 缓存(默认 8s);任一写操作 invalidate。disabled 通道不入池。
 * - 主密钥(PROVIDER_ENC_KEY)缺失/非 32 字节:
 *     生产(由 AiModule onModuleInit fail-fast,本 service 不重复拒启)→ 不应走到这里;
 *     dev/test → masterKey()=null,loadPool 跳过加密通道(回退 env 直连池),CRUD 写操作被拒(400)。
 * - 安全红线:明文密钥只在 loadPool 解密后存活于内存;list/view 一律打码;CRUD 入站 key 立即加密。
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly cacheTtlMs = 8000;
  private cache: { value: LoadedProvider[]; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(AiProvider)
    private readonly repo: Repository<AiProvider>,
    private readonly config: ConfigService,
  ) {}

  /** 解析主密钥;null = 未配置/非法。 */
  private masterKey(): Buffer | null {
    return resolveMasterKey(process.env.PROVIDER_ENC_KEY);
  }

  /** dev/test 无主密钥时,直接用 env 通道作回退池(与历史 envFallback 平滑一致)。 */
  private envFallbackPool(): LoadedProvider[] {
    const ai = this.config.get<AiConfig>('ai')!;
    const out: LoadedProvider[] = [];
    if (ai.deepseek.apiKey) {
      out.push({
        id: 'env:deepseek',
        name: 'deepseek',
        protocol: 'anthropic-compat',
        baseURL: ai.deepseek.baseURL,
        apiKey: ai.deepseek.apiKey,
        modelPro: ai.deepseek.modelPro,
        modelFlash: ai.deepseek.modelFlash,
        timeoutMs: ai.deepseek.timeoutMs,
        maxRetries: ai.deepseek.maxRetries,
      });
    }
    if (ai.relay.apiKey) {
      out.push({
        id: 'env:relay',
        name: 'relay',
        protocol: 'anthropic-compat',
        baseURL: ai.relay.baseURL,
        apiKey: ai.relay.apiKey,
        modelPro: ai.relay.model,
        modelFlash: ai.relay.model,
        timeoutMs: ai.relay.timeoutMs,
        maxRetries: ai.relay.maxRetries,
      });
    }
    if (ai.glm.apiKey) {
      out.push({
        id: 'env:glm',
        name: 'glm',
        protocol: 'anthropic-compat',
        baseURL: ai.glm.baseURL,
        apiKey: ai.glm.apiKey,
        modelPro: ai.glm.modelPro,
        modelFlash: ai.glm.modelFlash,
        timeoutMs: ai.glm.timeoutMs,
        maxRetries: ai.glm.maxRetries,
      });
    }
    // env primaryProvider 优先排序(与历史 orderProviders 行为一致)。
    const primary = ai.primaryProvider;
    out.sort((a, b) => (a.name === primary ? -1 : b.name === primary ? 1 : 0));
    return out;
  }

  /** AiService 用:已解密、已排序的可用通道池(带缓存)。disabled 不入池。 */
  async loadPool(): Promise<LoadedProvider[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;
    const value = await this.buildPool();
    this.cache = { value, expiresAt: now + this.cacheTtlMs };
    return value;
  }

  /** 清缓存:任一写操作后调用,下次 loadPool 立即读新值(免重启)。 */
  invalidate(): void {
    this.cache = null;
  }

  private async buildPool(): Promise<LoadedProvider[]> {
    const key = this.masterKey();
    if (!key) {
      // 无主密钥:dev/test 回退 env 直连池(生产已被 onModuleInit 拦下,不会到这)。
      return this.envFallbackPool();
    }
    const rows = await this.repo.find();
    if (rows.length === 0) return this.envFallbackPool();

    const loaded: LoadedProvider[] = [];
    for (const row of rows) {
      if (row.role === 'disabled') continue;
      let apiKey: string;
      try {
        apiKey = decryptSecret(row.api_key_enc, key);
      } catch (err) {
        // 解密失败(主密钥换了 / 密文损坏):跳过该通道,记 WARN,不崩 —— 其余通道仍可用。
        this.logger.warn(
          `通道 "${row.name}" 密钥解密失败,已跳过(检查 PROVIDER_ENC_KEY 是否与加密时一致):${this.errMsg(err)}`,
        );
        continue;
      }
      loaded.push({
        id: row.id,
        name: row.name,
        protocol: row.protocol,
        baseURL: row.base_url,
        apiKey,
        modelPro: row.model_pro,
        modelFlash: row.model_flash,
        timeoutMs: row.timeout_ms,
        maxRetries: row.max_retries,
      });
    }
    // 排序:primary 优先,其后 backup 按 sort_order 升序;同序按 name 稳定。
    const roleRank = (r: string): number => (r === 'primary' ? 0 : 1);
    const rowByName = new Map(rows.map((r) => [r.name, r]));
    loaded.sort((a, b) => {
      const ra = roleRank(rowByName.get(a.name)!.role);
      const rb = roleRank(rowByName.get(b.name)!.role);
      if (ra !== rb) return ra - rb;
      const sa = rowByName.get(a.name)!.sort_order;
      const sb = rowByName.get(b.name)!.sort_order;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
    return loaded;
  }

  // ============================================================
  // 启动期种子:表空时把 env 配的 deepseek/relay/glm 种入(key 加密)。
  // 仅在有主密钥时执行;无主密钥(dev/test)跳过种子,运行期走 envFallbackPool。
  // ============================================================
  async seedFromEnvIfEmpty(): Promise<void> {
    const key = this.masterKey();
    if (!key) {
      this.logger.warn('PROVIDER_ENC_KEY 未配置,跳过 env→DB 种子(运行期回退 env 直连池)');
      return;
    }
    const count = await this.repo.count();
    if (count > 0) return;

    const ai = this.config.get<AiConfig>('ai')!;
    const primary = ai.primaryProvider;
    const seeds: Array<{ row: Partial<AiProvider>; hasKey: boolean }> = [
      {
        hasKey: !!ai.deepseek.apiKey,
        row: {
          name: 'deepseek',
          protocol: 'anthropic-compat',
          base_url: ai.deepseek.baseURL,
          api_key_enc: ai.deepseek.apiKey ? encryptSecret(ai.deepseek.apiKey, key) : '',
          model_pro: ai.deepseek.modelPro,
          model_flash: ai.deepseek.modelFlash,
          timeout_ms: ai.deepseek.timeoutMs,
          max_retries: ai.deepseek.maxRetries,
        },
      },
      {
        hasKey: !!ai.relay.apiKey,
        row: {
          name: 'relay',
          protocol: 'anthropic-compat',
          base_url: ai.relay.baseURL,
          api_key_enc: ai.relay.apiKey ? encryptSecret(ai.relay.apiKey, key) : '',
          model_pro: ai.relay.model,
          model_flash: ai.relay.model,
          timeout_ms: ai.relay.timeoutMs,
          max_retries: ai.relay.maxRetries,
        },
      },
      {
        hasKey: !!ai.glm.apiKey,
        row: {
          name: 'glm',
          protocol: 'anthropic-compat',
          base_url: ai.glm.baseURL,
          api_key_enc: ai.glm.apiKey ? encryptSecret(ai.glm.apiKey, key) : '',
          model_pro: ai.glm.modelPro,
          model_flash: ai.glm.modelFlash,
          timeout_ms: ai.glm.timeoutMs,
          max_retries: ai.glm.maxRetries,
        },
      },
    ];

    let order = 0;
    const toSave: AiProvider[] = [];
    for (const seed of seeds) {
      if (!seed.hasKey) continue; // 无 key 的通道不种(避免存空密文)。
      const entity = this.repo.create(seed.row);
      entity.role = seed.row.name === primary ? 'primary' : 'backup';
      entity.sort_order = order++;
      toSave.push(entity);
    }
    if (toSave.length === 0) {
      this.logger.warn('env 无任何 AI 通道密钥,种子跳过');
      return;
    }
    await this.repo.save(toSave);
    this.invalidate();
    this.logger.log(`已从 env 种入 ${toSave.length} 个 AI 通道(主力=${primary})`);
  }

  // ============================================================
  // CRUD(admin 端点用)。所有写操作要求有主密钥;无则 400(dev/test 只读)。
  // ============================================================

  async list(): Promise<ProviderView[]> {
    const key = this.masterKey();
    const rows = await this.repo.find({ order: { role: 'ASC', sort_order: 'ASC', name: 'ASC' } });
    return rows.map((r) => this.toView(r, key));
  }

  async create(input: CreateProviderInput): Promise<ProviderView> {
    const key = this.requireKey();
    this.validateRoleProtocol(input.role, input.protocol);
    if (!input.apiKey || input.apiKey.trim().length === 0) {
      throw new BadRequestException('新建通道必须提供 apiKey');
    }
    const dup = await this.repo.findOne({ where: { name: input.name } });
    if (dup) throw new BadRequestException(`通道名 "${input.name}" 已存在`);

    const row = this.repo.create({
      name: input.name,
      protocol: input.protocol,
      base_url: input.baseURL,
      api_key_enc: encryptSecret(input.apiKey, key),
      model_pro: input.modelPro,
      model_flash: input.modelFlash,
      role: input.role,
      sort_order: input.sortOrder ?? 0,
      timeout_ms: input.timeoutMs ?? 120000,
      max_retries: input.maxRetries ?? 2,
    });
    await this.enforceSinglePrimary(row.role, null);
    const saved = await this.repo.save(row);
    this.invalidate();
    return this.toView(saved, key);
  }

  async update(id: string, input: UpdateProviderInput): Promise<ProviderView> {
    const key = this.requireKey();
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('通道不存在');

    if (input.role !== undefined || input.protocol !== undefined) {
      this.validateRoleProtocol(input.role ?? (row.role as 'primary'), input.protocol ?? row.protocol);
    }
    if (input.name !== undefined && input.name !== row.name) {
      const dup = await this.repo.findOne({ where: { name: input.name } });
      if (dup) throw new BadRequestException(`通道名 "${input.name}" 已存在`);
      row.name = input.name;
    }
    if (input.protocol !== undefined) row.protocol = input.protocol;
    if (input.baseURL !== undefined) row.base_url = input.baseURL;
    if (input.modelPro !== undefined) row.model_pro = input.modelPro;
    if (input.modelFlash !== undefined) row.model_flash = input.modelFlash;
    if (input.role !== undefined) row.role = input.role;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    if (input.timeoutMs !== undefined) row.timeout_ms = input.timeoutMs;
    if (input.maxRetries !== undefined) row.max_retries = input.maxRetries;
    // write-only:仅当传了非空 apiKey 才改密钥;不传则保留原密文。
    if (input.apiKey !== undefined && input.apiKey.trim().length > 0) {
      row.api_key_enc = encryptSecret(input.apiKey, key);
    }

    await this.enforceSinglePrimary(row.role, row.id);
    const saved = await this.repo.save(row);
    this.invalidate();
    return this.toView(saved, key);
  }

  async remove(id: string): Promise<void> {
    this.requireKey();
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('通道不存在');
    await this.repo.remove(row);
    this.invalidate();
  }

  /** 取已保存通道的明文 key + 配置(连通性测试用,仅进程内,不出边界)。 */
  async getDecrypted(id: string): Promise<LoadedProvider> {
    const key = this.requireKey();
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('通道不存在');
    return {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      baseURL: row.base_url,
      apiKey: decryptSecret(row.api_key_enc, key),
      modelPro: row.model_pro,
      modelFlash: row.model_flash,
      timeoutMs: row.timeout_ms,
      maxRetries: row.max_retries,
    };
  }

  // ---- 私有助手 ----

  // 单主力约束:把某通道设为 primary 时,其余 primary 降级为 backup(除自身)。
  private async enforceSinglePrimary(role: string, selfId: string | null): Promise<void> {
    if (role !== 'primary') return;
    const others = await this.repo.find({ where: { role: 'primary' } });
    for (const o of others) {
      if (o.id === selfId) continue;
      o.role = 'backup';
      await this.repo.save(o);
    }
  }

  private validateRoleProtocol(role: string, protocol: string): void {
    if (!(VALID_ROLES as readonly string[]).includes(role)) {
      throw new BadRequestException(`role 必须是 ${VALID_ROLES.join('/')} 之一`);
    }
    if (!(VALID_PROTOCOLS as readonly string[]).includes(protocol)) {
      throw new BadRequestException(`protocol 必须是 ${VALID_PROTOCOLS.join('/')} 之一`);
    }
  }

  private requireKey(): Buffer {
    const key = this.masterKey();
    if (!key) {
      throw new BadRequestException(
        'PROVIDER_ENC_KEY 未配置或非法(须 32 字节),无法加密密钥,CRUD 已禁用。请在 .env 配置后重启。',
      );
    }
    return key;
  }

  // 实体 → 对外视图:密钥只回打码(有主密钥则解密取末 4 位;无则只标记是否有密文)。
  private toView(row: AiProvider, key: Buffer | null): ProviderView {
    let masked = '';
    if (row.api_key_enc && row.api_key_enc.length > 0) {
      if (key) {
        try {
          masked = maskSecret(decryptSecret(row.api_key_enc, key));
        } catch {
          masked = '****(解密失败)';
        }
      } else {
        masked = '****(已加密)';
      }
    }
    return {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      baseURL: row.base_url,
      apiKeyMasked: masked,
      modelPro: row.model_pro,
      modelFlash: row.model_flash,
      role: row.role,
      sortOrder: row.sort_order,
      timeoutMs: row.timeout_ms,
      maxRetries: row.max_retries,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}

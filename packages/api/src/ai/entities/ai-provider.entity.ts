import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// AI provider 通道(每通道一行):完整凭证 + 主备角色,由 admin 面板 CRUD 管理。
// 密钥以 AES-256-GCM 加密存 api_key_enc(明文绝不入库、不出 DTO、不进 UI;只回打码末 4 位)。
// 运行期 AiService 从本表加载通道池(解密 key 构造 Anthropic client),带短 TTL 缓存。
// role:'primary'(主力,有效记录中应仅一条)/'backup'(降级备用)/'disabled'(停用,不入池)。
// 表空时启动期把 env 配的 deepseek/relay/glm 种入(key 从 env 取并加密),保证向后兼容。
@Entity('ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 通道标识名(展示 + 日志用,如 'deepseek'/'relay'/'glm' 或用户自定义)。唯一约束防重名。
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  // 协议:'anthropic-compat'(Anthropic Messages 兼容端点,当前三通道均是)
  //      | 'openai-compat'(OpenAI Chat Completions 兼容端点,预留)。
  @Column({ name: 'protocol', type: 'varchar', default: 'anthropic-compat' })
  protocol: string;

  @Column({ name: 'base_url', type: 'varchar' })
  base_url: string;

  // AES-256-GCM 密文(`v1:<iv>:<tag>:<ct>`)。明文密钥绝不入此列。
  @Column({ name: 'api_key_enc', type: 'text' })
  api_key_enc: string;

  // pro 档型号(诊断/改写核心产出)。
  @Column({ name: 'model_pro', type: 'varchar' })
  model_pro: string;

  // flash 档型号(解析类轻档);中转单别名时与 model_pro 同值。
  @Column({ name: 'model_flash', type: 'varchar' })
  model_flash: string;

  // 角色:'primary' | 'backup' | 'disabled'。
  @Column({ name: 'role', type: 'varchar', default: 'backup' })
  role: string;

  // 排序权重:同 role 内按 sort_order 升序定降级顺序;primary 永远排第一。
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sort_order: number;

  // 超时毫秒 / 重试次数:从 env 种入时携带原值;新建默认值在 service 兜底。
  @Column({ name: 'timeout_ms', type: 'int', default: 120000 })
  timeout_ms: number;

  @Column({ name: 'max_retries', type: 'int', default: 2 })
  max_retries: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

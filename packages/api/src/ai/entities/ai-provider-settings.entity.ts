import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

// AI provider 运行时主备配置(单行语义:全局仅一条有效配置,service 取 updated_at DESC 第一条)。
// 安全红线:本表只存「谁是主力 / 降级顺序」这类可在 UI 切换的元数据;
// 密钥 / baseURL / 型号 / timeout / retries 永远从 env 取,绝不进 DB、绝不进出站 DTO、绝不进 UI。
// 无任何记录时 AiProviderSettingsService 回退 env primaryProvider + 默认顺序(与今天行为一致)。
@Entity('ai_provider_settings')
export class AiProviderSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 主力通道名:'deepseek' | 'relay' | 'glm'(白名单由 DTO + service 校验,不约束 DB enum 以免改型号要迁移)。
  @Column({ name: 'primary', type: 'varchar' })
  primary: string;

  // 降级顺序:JSON 数组字符串,如 '["glm","deepseek","relay"]'。service 读时 JSON.parse,写时 JSON.stringify。
  @Column({ name: 'order', type: 'text' })
  order: string;

  // 最后修改的 admin id;首次/迁移态可空。
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}

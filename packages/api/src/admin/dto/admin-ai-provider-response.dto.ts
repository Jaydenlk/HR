import { AiConfig, AiProviderKind } from '../../config/ai.config';
import { EffectiveProviderConfig } from '../../ai/ai-provider-settings.service';

// 单个 provider 的对外状态:名称 + 是否已配置(有 key)+ pro/flash 型号(只读展示)。
// 安全红线:绝不含 apiKey / baseURL —— 密钥永不出 DB、永不出 DTO、永不进 UI。
export class AdminAiProviderItemDto {
  name: AiProviderKind;
  // 该通道是否已配置密钥(env 有 key)。未配置者前端灰显、不可设主力。
  configured: boolean;
  // pro/flash 档型号(从 env 读,只读展示)。
  modelPro: string;
  modelFlash: string;
}

// 出参:AI provider 主备配置响应(GET / PATCH /admin/ai-provider)。
// static from() 强制字段白名单:逐字段手工投影,结构上不可能带出 apiKey/baseURL。
export class AdminAiProviderResponseDto {
  // 三个通道的状态列表(固定顺序 deepseek/relay/glm,前端按 primary/order 标注主备)。
  providers: AdminAiProviderItemDto[];
  // 当前主力通道名。
  primary: AiProviderKind;
  // 当前完整降级顺序(已去重补齐)。
  order: AiProviderKind[];

  // 静态工厂:从 AiConfig(取 configured/型号,绝不取 key/baseURL)+ 有效配置(主力/顺序)构造。
  static from(ai: AiConfig, effective: EffectiveProviderConfig): AdminAiProviderResponseDto {
    const dto = new AdminAiProviderResponseDto();
    dto.providers = [
      {
        name: 'deepseek',
        configured: !!ai.deepseek.apiKey,
        modelPro: ai.deepseek.modelPro,
        modelFlash: ai.deepseek.modelFlash,
      },
      {
        name: 'relay',
        configured: !!ai.relay.apiKey,
        // relay 中转 pro/flash 共用同一别名(降档保命),两档同值展示。
        modelPro: ai.relay.model,
        modelFlash: ai.relay.model,
      },
      {
        name: 'glm',
        configured: !!ai.glm.apiKey,
        modelPro: ai.glm.modelPro,
        modelFlash: ai.glm.modelFlash,
      },
    ];
    dto.primary = effective.primary;
    dto.order = effective.order;
    return dto;
  }
}

import { ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { AiProviderKind } from '../../config/ai.config';

// 已知 AI 通道名白名单:防注入(primary/order 元素都必须命中)。
const PROVIDER_KINDS: AiProviderKind[] = ['deepseek', 'relay', 'glm'];

// 入参:切换 AI provider 主备(PATCH /admin/ai-provider)。
// primary 必须是白名单内通道;service 另校验「已配置密钥」(切到无 key 的 provider → 400)。
// order 可选:降级顺序,元素须白名单 + 去重;缺省时 service 按 primary + 默认序补齐。
// 安全:本 DTO 不含任何 key/baseURL/型号字段 —— 面板只切顺序,密钥永远走 env。
export class UpdateAiProviderDto {
  @IsIn(PROVIDER_KINDS, { message: 'primary 必须是 deepseek/relay/glm 之一' })
  primary: AiProviderKind;

  @IsOptional()
  @IsArray({ message: 'order 必须是数组' })
  @ArrayUnique({ message: 'order 不能有重复通道' })
  @IsIn(PROVIDER_KINDS, { each: true, message: 'order 元素必须是 deepseek/relay/glm 之一' })
  order?: AiProviderKind[];
}

import { ProviderView } from '../../ai/ai-provider.service';

// 出参:单个 AI 通道(GET 列表 / POST 建 / PATCH 改 的响应元素)。
// 安全红线:apiKeyMasked 只回打码末 4 位;结构上不含明文/密文 key。
export class AdminAiProviderResponseDto {
  id: string;
  name: string;
  protocol: string;
  baseURL: string;
  // 密钥打码(如 "****abcd");从不回明文/密文。
  apiKeyMasked: string;
  modelPro: string;
  modelFlash: string;
  role: string;
  sortOrder: number;
  timeoutMs: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;

  // 逐字段手工投影:即便上游 view 误带字段,出站也只含白名单。
  static from(v: ProviderView): AdminAiProviderResponseDto {
    const dto = new AdminAiProviderResponseDto();
    dto.id = v.id;
    dto.name = v.name;
    dto.protocol = v.protocol;
    dto.baseURL = v.baseURL;
    dto.apiKeyMasked = v.apiKeyMasked;
    dto.modelPro = v.modelPro;
    dto.modelFlash = v.modelFlash;
    dto.role = v.role;
    dto.sortOrder = v.sortOrder;
    dto.timeoutMs = v.timeoutMs;
    dto.maxRetries = v.maxRetries;
    dto.createdAt = v.createdAt;
    dto.updatedAt = v.updatedAt;
    return dto;
  }

  static fromMany(views: ProviderView[]): AdminAiProviderResponseDto[] {
    return views.map((v) => AdminAiProviderResponseDto.from(v));
  }
}

// 连通性测试结果(POST /:id/test 与 /test 草稿)。error 已剔密钥。
export class AdminAiProviderTestResponseDto {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

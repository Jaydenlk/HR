import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

const PROTOCOLS = ['anthropic-compat', 'openai-compat'] as const;

// 草稿连通性测试(POST /admin/ai-providers/test):对未保存的配置发一次最小请求。
// apiKey 是入站明文(仅用于本次测试,不落库、不回读)。
export class TestAiProviderDraftDto {
  @IsIn(PROTOCOLS, { message: 'protocol 必须是 anthropic-compat/openai-compat 之一' })
  protocol: 'anthropic-compat' | 'openai-compat';

  @IsString()
  @IsNotEmpty({ message: 'baseURL 不能为空' })
  baseURL: string;

  @IsString()
  @IsNotEmpty({ message: 'apiKey 不能为空' })
  apiKey: string;

  @IsString()
  @IsNotEmpty({ message: 'modelFlash 不能为空' })
  modelFlash: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(600000)
  timeoutMs?: number;
}

import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const PROTOCOLS = ['anthropic-compat', 'openai-compat'] as const;
const ROLES = ['primary', 'backup', 'disabled'] as const;

// 新建 AI 通道(POST /admin/ai-providers)。apiKey 必填且 write-only(永不回读)。
export class CreateAiProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'name 不能为空' })
  name: string;

  @IsIn(PROTOCOLS, { message: 'protocol 必须是 anthropic-compat/openai-compat 之一' })
  protocol: 'anthropic-compat' | 'openai-compat';

  @IsString()
  @IsNotEmpty({ message: 'baseURL 不能为空' })
  baseURL: string;

  // write-only:加密后落库,响应只回打码末 4 位。
  @IsString()
  @IsNotEmpty({ message: 'apiKey 不能为空' })
  apiKey: string;

  @IsString()
  @IsNotEmpty({ message: 'modelPro 不能为空' })
  modelPro: string;

  @IsString()
  @IsNotEmpty({ message: 'modelFlash 不能为空' })
  modelFlash: string;

  @IsIn(ROLES, { message: 'role 必须是 primary/backup/disabled 之一' })
  role: 'primary' | 'backup' | 'disabled';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(600000)
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;
}

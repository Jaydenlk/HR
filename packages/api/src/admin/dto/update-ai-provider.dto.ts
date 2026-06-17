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

// 改 AI 通道(PATCH /admin/ai-providers/:id)。全部可选;apiKey 不传则不改密钥(write-only)。
export class UpdateAiProviderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name 不能为空' })
  name?: string;

  @IsOptional()
  @IsIn(PROTOCOLS, { message: 'protocol 必须是 anthropic-compat/openai-compat 之一' })
  protocol?: 'anthropic-compat' | 'openai-compat';

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'baseURL 不能为空' })
  baseURL?: string;

  // write-only:传了非空才改密钥;不传保留原值。
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'apiKey 不能为空字符串(不改密钥请直接省略该字段)' })
  apiKey?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'modelPro 不能为空' })
  modelPro?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'modelFlash 不能为空' })
  modelFlash?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'role 必须是 primary/backup/disabled 之一' })
  role?: 'primary' | 'backup' | 'disabled';

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

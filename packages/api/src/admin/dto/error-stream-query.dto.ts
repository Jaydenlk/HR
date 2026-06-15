import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OpsEventType } from '../../ops/entities/ops-event.entity';

// 允许查询的 type 枚举:只暴露失败类与管理操作,不含正常运营类型(AI_FAILOVER/AI_BOTH_DOWN/QUEUE_FULL 按需可加)。
const ERROR_STREAM_TYPES: OpsEventType[] = [
  'AI_CALL_FAILED',
  'CREDIT_CONSUME_FAILED',
  'ADMIN_ACTION',
  'AI_FAILOVER',
  'AI_BOTH_DOWN',
  'QUEUE_FULL',
];

// 入参:错误/审计流水查询(GET /admin/error-stream)。
// type 白名单校验防止枚举外字符串直接进 WHERE 查询。
export class ErrorStreamQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 最小为 1' })
  @Max(200, { message: 'limit 最大为 200' })
  limit?: number;

  // 翻页偏移:默认 0,服务端再次 clamp ≥0。契约返回当前页数组(不返回 total)。
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset 必须为整数' })
  @Min(0, { message: 'offset 最小为 0' })
  offset?: number;

  @IsOptional()
  @IsIn(ERROR_STREAM_TYPES, {
    message: `type 仅支持 ${ERROR_STREAM_TYPES.join(' | ')}`,
  })
  type?: OpsEventType;
}

import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 入参:用户积分流水查询(GET /admin/users/:id/credit-history)。
// 对齐 error-stream-query.dto.ts 既有写法:limit/offset 双防线(DTO @Max(200) 前置 + service clamp 兜底)。
// 流水量可能较大,service 缺省 clamp 到 50(而非 200),DTO 仍允许显式至多 200。
export class CreditHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 最小为 1' })
  @Max(200, { message: 'limit 最大为 200' })
  limit?: number;

  // 翻页偏移:默认 0,服务端再次 clamp ≥0。
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset 必须为整数' })
  @Min(0, { message: 'offset 最小为 0' })
  offset?: number;
}

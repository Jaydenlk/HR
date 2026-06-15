import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 入参:运维事件流水分页查询(GET /admin/ops-events)。
// limit 服务端 clamp 上限 200 由 service 层强制执行,此处 @Max 提前拦截非法值。
export class OpsEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 最小为 1' })
  @Max(200, { message: 'limit 最大为 200' })
  limit?: number;
}

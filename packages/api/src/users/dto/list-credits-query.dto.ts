import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// GET /me/credits 分页查询;limit 默认 20、上限 100,offset 默认 0。
// 全局 ValidationPipe transform:true 下 @Type(() => Number) 把 query 字符串转数字。
export class ListCreditsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit 必须为整数' })
  @Min(1, { message: 'limit 不能小于 1' })
  @Max(100, { message: 'limit 不能大于 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset 必须为整数' })
  @Min(0, { message: 'offset 不能为负' })
  offset?: number;
}

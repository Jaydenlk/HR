import { IsISO8601, IsIn, IsOptional, IsUUID } from 'class-validator';

// 入参:单用户活动明细查询。
// userId 必须是合法 UUID,防止 SQL 注入(QueryBuilder setParameter 绑定已足够,但 @IsUUID 提前拒绝无效格式)。
// from/to:ISO 8601 日期字符串,交由 service 转 Date。
// orderBy:枚举白名单,绕过 ORDER BY 字面量注入风险。
export class UserActivityQueryDto {
  @IsUUID('4', { message: 'userId 必须为合法 UUID v4' })
  userId: string;

  @IsOptional()
  @IsISO8601({}, { message: 'from 必须为 ISO 8601 日期字符串,如 2026-06-01' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to 必须为 ISO 8601 日期字符串,如 2026-06-30' })
  to?: string;

  // 排序字段白名单:仅允许按调用时间或端点名排序,防止 ORDER BY 注入。
  @IsOptional()
  @IsIn(['created_at', 'endpoint'], {
    message: 'orderBy 仅支持 created_at | endpoint',
  })
  orderBy?: 'created_at' | 'endpoint';
}

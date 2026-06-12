import { IsOptional, IsString, MaxLength } from 'class-validator';

// GET /mock-sessions/company-check 查询参数校验
// name 超过 100 字符 → ValidationPipe 返回 400，与项目其余 query DTO 风格一致。
export class CompanyCheckQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'name 不能超过 100 个字符' })
  name?: string;
}

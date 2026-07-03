import { IsString, IsOptional, IsIn, IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateMockSessionDto {
  @IsString()
  @IsOptional()
  application_id?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  jd_text?: string;

  @IsString()
  @IsIn(['text', 'voice'])
  @IsOptional()
  mode?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  question_count?: number;

  /**
   * 前端确认的公司搜索候选 id(company_research 表主键)。
   * 防伪造(M3 安全硬项，破坏性 API 变更):不再接受前端回传的原始 name/summary/source_url 文本，
   * 只接受候选 id；后端按 id 查库取真实字段拼防编造 prompt，杜绝客户端伪造"已核实"公司背景。
   */
  @IsOptional()
  @IsUUID()
  company_research_id?: string;
}

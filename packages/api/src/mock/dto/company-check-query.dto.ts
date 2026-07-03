import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

// GET /mock-sessions/company-check 查询参数校验
// name 超过 100 字符 → ValidationPipe 返回 400，与项目其余 query DTO 风格一致。
export class CompanyCheckQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'name 不能超过 100 个字符' })
  name?: string;

  /**
   * force=true 时绕过 7 天缓存,强制两路真实新搜索(缓存候选被用户拒绝后的重搜通道,设计定稿4)。
   * 端点级 @Throttle 对该路径同样生效——强制刷新走真实博查计费,节流不豁免。
   * Transform 只认 true/1/false/0 四种字面,其余原样保留交给 @IsBoolean 拒绝(400)。
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === '1' || value === true) return true;
    if (value === 'false' || value === '0' || value === false) return false;
    return value;
  })
  @IsBoolean()
  force?: boolean;
}

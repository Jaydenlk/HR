import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

export interface ParsedJd {
  company: string | null;
  role: string | null;
  location: string | null;
  employment_type: 'fulltime' | 'intern' | 'contract' | 'parttime' | null;
  requirements: string[];
  responsibilities: string[];
  salary_range: { min: number | null; max: number | null; months: number | null } | null;
  experience_level: string | null;
  team_info: string | null;
  parse_confidence: 'high' | 'medium' | 'low';
}

const PARSE_SYSTEM = `你是一个专业的 JD 解析器。从给定的 JD 文本中提取结构化信息。
规则：
- 所有输出使用中文
- 当信息缺失时，对应字段设为 null
- requirements 和 responsibilities 返回字符串数组
- salary_range 包含 min（月薪最低）、max（月薪最高）、months（年薪月数），无法推断时设为 null
- employment_type 只能是 fulltime/intern/contract/parttime 之一，无法判断时设为 null
- 如果 JD 文本过短或信息不清晰，parse_confidence 设为 "low"`;

// required 只列「服务端不做 null 兜底」的字段:可空字段(company/role/...)在退化输入(JD 过短)下
// 模型——尤其降级后的 DeepSeek——常直接省略而非显式 null,列入 required 会被 AiService 运行期校验
// 拒收→主备各 3 次重试耗尽→503(实测场景4稳定复现)。枚举收口也放 service 而非 schema:模型对中文 JD
// 偶发吐"全职"等非法枚举,schema 内嵌 enum 同样导致整次拒收;service 端 coerce 成本更低且不抬 503。
const PARSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    company: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    employment_type: { type: ['string', 'null'] },
    requirements: { type: 'array', items: { type: 'string' } },
    responsibilities: { type: 'array', items: { type: 'string' } },
    salary_range: {
      type: ['object', 'null'],
      properties: {
        min: { type: ['number', 'null'] },
        max: { type: ['number', 'null'] },
        months: { type: ['number', 'null'] },
      },
    },
    experience_level: { type: ['string', 'null'] },
    team_info: { type: ['string', 'null'] },
    parse_confidence: { type: 'string' },
  },
  required: ['requirements', 'responsibilities', 'parse_confidence'],
};

const VALID_EMPLOYMENT = new Set(['fulltime', 'intern', 'contract', 'parttime']);
const VALID_PARSE_CONFIDENCE = new Set(['high', 'medium', 'low']);

// 字面 null 收口:模型在信息缺失时除了显式省略字段,也常吐回字符串 'null'/'undefined'/'N/A'/空白。
// 这些都是「无数据」而非真实文本,必须归一成真 null,否则会被原样落库并在前端展示成字面 'null'。
const NULLISH_LITERALS = new Set(['null', 'undefined', 'n/a', 'na', '无', '未知', '-', '—']);
function normalizeNullable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || NULLISH_LITERALS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

@Injectable()
export class OpportunityParserService {
  constructor(private readonly ai: AiService) {}

  async parse(jdText: string): Promise<ParsedJd> {
    const raw = await this.ai.completeStructured<Partial<ParsedJd>>({
      system: PARSE_SYSTEM,
      prompt: `请解析以下 JD 文本：\n\n${jdText}`,
      toolName: 'parse_jd',
      toolDescription: '从 JD 文本中提取结构化信息',
      schema: PARSE_SCHEMA,
    });

    // 服务端确定性收口:缺省/字面 null 字段统一归零成真 null;枚举白名单 coerce(非法值不拒收,降级处理)。
    const employment =
      typeof raw.employment_type === 'string' && VALID_EMPLOYMENT.has(raw.employment_type.trim())
        ? (raw.employment_type.trim() as ParsedJd['employment_type'])
        : null;
    const confidence =
      typeof raw.parse_confidence === 'string' && VALID_PARSE_CONFIDENCE.has(raw.parse_confidence.trim())
        ? (raw.parse_confidence.trim() as ParsedJd['parse_confidence'])
        : 'low';

    return {
      company: normalizeNullable(raw.company),
      role: normalizeNullable(raw.role),
      location: normalizeNullable(raw.location),
      employment_type: employment,
      requirements: raw.requirements ?? [],
      responsibilities: raw.responsibilities ?? [],
      salary_range: raw.salary_range ?? null,
      experience_level: normalizeNullable(raw.experience_level),
      team_info: normalizeNullable(raw.team_info),
      parse_confidence: confidence,
    };
  }
}

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

const PARSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    company: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    employment_type: {
      type: ['string', 'null'],
      enum: ['fulltime', 'intern', 'contract', 'parttime', null],
    },
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
    parse_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: [
    'company', 'role', 'location', 'employment_type',
    'requirements', 'responsibilities', 'salary_range',
    'experience_level', 'team_info', 'parse_confidence',
  ],
};

@Injectable()
export class OpportunityParserService {
  constructor(private readonly ai: AiService) {}

  async parse(jdText: string): Promise<ParsedJd> {
    return this.ai.completeStructured<ParsedJd>({
      system: PARSE_SYSTEM,
      prompt: `请解析以下 JD 文本：\n\n${jdText}`,
      toolName: 'parse_jd',
      toolDescription: '从 JD 文本中提取结构化信息',
      schema: PARSE_SCHEMA,
    });
  }
}

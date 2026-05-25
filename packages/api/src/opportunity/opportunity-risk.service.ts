import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { ParsedJd } from './opportunity-parser.service';

export interface RiskFlag {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  confidence: number;
}

export interface RiskAssessment {
  credibility_score: number;
  risk_flags: RiskFlag[];
}

const RISK_SYSTEM = `你是一个职位风险检测专家。分析 JD 文本和解析结果，检测以下 8 类风险信号：
1. jd_too_short — JD 字数过少，信息不完整
2. responsibilities_unclear — 职责描述模糊不清
3. suspected_od — 疑似外包或劳务派遣岗位
4. suspected_training_lure — 疑似培训机构钓鱼招聘
5. salary_unrealistic — 薪资范围不合理（过高或过低）
6. long_term_repost — 长期重复发布的岗位
7. entity_mismatch — 招聘主体与实际用工单位不一致
8. untrusted_source — 来源不可靠

规则：
- 对每个检测到的风险，提供 type、severity（critical/high/medium/low）、evidence（引用 JD 原文）、confidence（0-1）
- 输出 credibility_score（0-1），表示整体可信度
- 没有发现风险时，risk_flags 为空数组，credibility_score 为高值
- 所有输出使用中文描述`;

const RISK_SCHEMA = {
  type: 'object' as const,
  properties: {
    credibility_score: { type: 'number', minimum: 0, maximum: 1 },
    risk_flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'jd_too_short', 'responsibilities_unclear', 'suspected_od',
              'suspected_training_lure', 'salary_unrealistic', 'long_term_repost',
              'entity_mismatch', 'untrusted_source',
            ],
          },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          evidence: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['type', 'severity', 'evidence', 'confidence'],
      },
    },
  },
  required: ['credibility_score', 'risk_flags'],
};

@Injectable()
export class OpportunityRiskService {
  constructor(private readonly ai: AiService) {}

  async detectRisks(jdText: string, parsed: ParsedJd): Promise<RiskAssessment> {
    return this.ai.completeStructured<RiskAssessment>({
      system: RISK_SYSTEM,
      prompt: `请分析以下 JD 的风险信号：\n\nJD 原文：\n${jdText}\n\n解析结果：\n${JSON.stringify(parsed, null, 2)}`,
      toolName: 'detect_risks',
      toolDescription: '检测 JD 中的风险信号',
      schema: RISK_SCHEMA,
    });
  }
}

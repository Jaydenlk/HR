import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { OpportunityService } from './opportunity.service';
import { OpportunityParserService } from './opportunity-parser.service';
import { OpportunityRiskService } from './opportunity-risk.service';
import type { ParsedJd } from './opportunity-parser.service';
import type { RiskAssessment } from './opportunity-risk.service';
import type { Recommendation, ConfidenceLevel, ActionType } from './types/opportunity.types';

interface EvaluationResult {
  match_score: number;
  value_score: number;
  strengths: string[];
  gaps: string[];
  next_actions: { action_type: string; title: string; reason: string }[];
}

const EVAL_SYSTEM = `你是一个职位评估专家。根据解析后的 JD 信息和风险评估结果，对该职位进行综合评估。

评估维度：
- match_score (0-100): 职位质量与匹配度综合评分。考虑 JD 质量、职位明确度、成长潜力
- value_score (0-100): 价值评分。考虑薪资竞争力、发展前景、公司实力
- strengths[]: 该职位的优势（3-5条，中文）
- gaps[]: 需要注意的不足或风险（2-4条，中文）
- next_actions[]: 建议的后续行动，每项包含 action_type、title、reason

action_type 可选值：optimize_resume, write_cover_letter, prepare_interview, research_company, apply, dismiss

注意：当前阶段没有用户简历数据，match_score 主要基于 JD 本身的质量和清晰度来评估。`;

const EVAL_SCHEMA = {
  type: 'object' as const,
  properties: {
    match_score: { type: 'number', minimum: 0, maximum: 100 },
    value_score: { type: 'number', minimum: 0, maximum: 100 },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    next_actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            enum: ['optimize_resume', 'write_cover_letter', 'prepare_interview', 'research_company', 'apply', 'dismiss'],
          },
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['action_type', 'title', 'reason'],
      },
    },
  },
  required: ['match_score', 'value_score', 'strengths', 'gaps', 'next_actions'],
};

@Injectable()
export class OpportunityEvaluatorService {
  private readonly logger = new Logger(OpportunityEvaluatorService.name);

  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly parser: OpportunityParserService,
    private readonly riskService: OpportunityRiskService,
    private readonly ai: AiService,
  ) {}

  async evaluate(opportunityId: string, userId: string): Promise<void> {
    const opportunity = await this.opportunityService.findOne(opportunityId, userId);
    await this.opportunityService.setStatus(opportunityId, userId, 'evaluating');

    try {
      // Step 1: Parse JD
      const parsedJd = await this.parser.parse(opportunity.jd_text);

      // Step 2: Update opportunity with parsed data (only if not already set by user)
      const updates: Record<string, unknown> = { jd_snapshot: parsedJd };
      if (!opportunity.company && parsedJd.company) updates.company = parsedJd.company;
      if (!opportunity.role && parsedJd.role) updates.role = parsedJd.role;
      if (!opportunity.location && parsedJd.location) updates.location = parsedJd.location;
      if (!opportunity.employment_type && parsedJd.employment_type) {
        updates.employment_type = parsedJd.employment_type;
      }
      await this.opportunityService.updateOpportunity(opportunityId, userId, updates);

      // Step 3: Detect risks
      const riskAssessment = await this.riskService.detectRisks(opportunity.jd_text, parsedJd);

      // Step 4: AI evaluation for match/value scores
      const evalResult = await this.evaluateWithAi(parsedJd, riskAssessment);

      // Step 5: Calculate overall score
      const overallScore = this.calculateOverallScore(
        evalResult.match_score, evalResult.value_score, riskAssessment.credibility_score,
      );

      // Step 6: Determine recommendation
      const recommendation = this.determineRecommendation(overallScore, riskAssessment);
      const confidence = this.determineConfidence(parsedJd);

      // Step 7: Save evaluation
      await this.opportunityService.saveEvaluation({
        opportunity_id: opportunityId,
        match_score: evalResult.match_score,
        value_score: evalResult.value_score,
        credibility_score: riskAssessment.credibility_score * 100,
        overall_score: overallScore,
        recommendation,
        confidence,
        risk_flags: riskAssessment.risk_flags.map((f) => `${f.type}:${f.severity}`),
        strengths: evalResult.strengths,
        gaps: evalResult.gaps,
        next_actions: evalResult.next_actions.map((a) => a.title),
        model_version: 'phase-o2',
      });

      // Step 8: Save evidence from JD analysis
      await this.opportunityService.saveEvidence([
        {
          opportunity_id: opportunityId,
          kind: 'jd_analysis',
          title: 'JD 结构化解析',
          excerpt: `解析置信度: ${parsedJd.parse_confidence}, 识别 ${parsedJd.requirements.length} 项要求, ${parsedJd.responsibilities.length} 项职责`,
          company: parsedJd.company ?? undefined,
          role: parsedJd.role ?? undefined,
          confidence: parsedJd.parse_confidence === 'high' ? 'high' : parsedJd.parse_confidence === 'medium' ? 'medium' : 'low',
        },
      ]);

      // Step 9: Save actions
      const actionItems = evalResult.next_actions.map((action) => ({
        opportunity_id: opportunityId,
        action_type: action.action_type as ActionType,
        title: action.title,
        reason: action.reason,
        status: 'pending' as const,
      }));
      if (actionItems.length > 0) {
        await this.opportunityService.saveActions(actionItems);
      }

      // Step 10: Set status to evaluated
      await this.opportunityService.setStatus(opportunityId, userId, 'evaluated');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Evaluation failed for opportunity ${opportunityId}: ${message}`);
      await this.opportunityService.setStatus(opportunityId, userId, 'failed', message);
    }
  }

  private async evaluateWithAi(parsedJd: ParsedJd, riskAssessment: RiskAssessment): Promise<EvaluationResult> {
    return this.ai.completeStructured<EvaluationResult>({
      system: EVAL_SYSTEM,
      prompt: `请评估以下职位：\n\n解析结果：\n${JSON.stringify(parsedJd, null, 2)}\n\n风险评估：\n${JSON.stringify(riskAssessment, null, 2)}`,
      toolName: 'evaluate_opportunity',
      toolDescription: '综合评估职位的匹配度和价值',
      schema: EVAL_SCHEMA,
    });
  }

  private calculateOverallScore(matchScore: number, valueScore: number, credibilityScore: number): number {
    // Weighted average: match 40%, value 30%, credibility 30%
    return Math.round(matchScore * 0.4 + valueScore * 0.3 + credibilityScore * 100 * 0.3);
  }

  private determineRecommendation(overallScore: number, riskAssessment: RiskAssessment): Recommendation {
    const hasCriticalRisk = riskAssessment.risk_flags.some((f) => f.severity === 'critical');
    if (hasCriticalRisk) return 'not_recommend';

    const hasHighRisk = riskAssessment.risk_flags.some((f) => f.severity === 'high');
    if (hasHighRisk) return 'cautious';

    if (overallScore >= 80) return 'strongly_recommend';
    if (overallScore >= 60) return 'recommend';
    if (overallScore >= 40) return 'neutral';
    return 'cautious';
  }

  private determineConfidence(parsedJd: ParsedJd): ConfidenceLevel {
    if (parsedJd.parse_confidence === 'low') return 'low';
    if (parsedJd.parse_confidence === 'medium') return 'medium';
    // Phase O2 without resume data caps confidence at medium
    return 'medium';
  }
}

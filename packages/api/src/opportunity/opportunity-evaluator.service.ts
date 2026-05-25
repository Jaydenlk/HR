import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { EvidenceService } from '../intelligence/evidence.service';
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

const EVAL_SYSTEM_BASE = `你是一个职位评估专家。根据解析后的 JD 信息、风险评估结果以及用户背景数据，对该职位进行综合评估。

评估维度：
- match_score (0-100): 职位与用户的匹配度评分。综合考虑用户技能经验与 JD 要求的匹配程度、成长潜力
- value_score (0-100): 价值评分。考虑薪资竞争力、发展前景、公司实力
- strengths[]: 该职位的优势（3-5条，中文）
- gaps[]: 需要注意的不足或风险（2-4条，中文）
- next_actions[]: 建议的后续行动，每项包含 action_type、title、reason

action_type 可选值：optimize_resume, write_cover_letter, prepare_interview, research_company, apply, dismiss`;

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
    private readonly evidence: EvidenceService,
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
      const rawParsed = await this.parser.parse(opportunity.jd_text);
      // Defensive: normalise parsed JD arrays
      const parsedJd: ParsedJd = {
        ...rawParsed,
        requirements: Array.isArray(rawParsed.requirements) ? rawParsed.requirements : [],
        responsibilities: Array.isArray(rawParsed.responsibilities) ? rawParsed.responsibilities : [],
      };

      // Step 2: Update opportunity with parsed data (only if not already set by user)
      const updates: Record<string, unknown> = { jd_snapshot: parsedJd };
      if (!opportunity.company && parsedJd.company) updates.company = parsedJd.company;
      if (!opportunity.role && parsedJd.role) updates.role = parsedJd.role;
      if (!opportunity.location && parsedJd.location) updates.location = parsedJd.location;
      if (!opportunity.employment_type && parsedJd.employment_type) {
        updates.employment_type = parsedJd.employment_type;
      }
      await this.opportunityService.updateOpportunity(opportunityId, userId, updates);

      // Step 3: Gather user context via EvidenceService
      const evalCtx = await this.buildEvaluationContext(userId, parsedJd);

      // Step 4: Detect risks
      const rawRisk = await this.riskService.detectRisks(opportunity.jd_text, parsedJd);
      // Defensive: AI may omit fields despite schema — normalise
      const riskAssessment: RiskAssessment = {
        credibility_score: rawRisk.credibility_score ?? 0.5,
        risk_flags: Array.isArray(rawRisk.risk_flags) ? rawRisk.risk_flags : [],
      };

      // Step 5: AI evaluation for match/value scores
      const rawEval = await this.evaluateWithAi(parsedJd, riskAssessment, evalCtx.promptContext);
      const evalResult: EvaluationResult = {
        match_score: rawEval.match_score ?? 0,
        value_score: rawEval.value_score ?? 0,
        strengths: Array.isArray(rawEval.strengths) ? rawEval.strengths : [],
        gaps: Array.isArray(rawEval.gaps) ? rawEval.gaps : [],
        next_actions: Array.isArray(rawEval.next_actions) ? rawEval.next_actions : [],
      };

      // Step 6: Calculate overall score
      const overallScore = this.calculateOverallScore(
        evalResult.match_score, evalResult.value_score, riskAssessment.credibility_score,
      );

      // Step 7: Determine recommendation — use structured fields, not string matching
      const recommendation = this.determineRecommendation(overallScore, riskAssessment);
      const confidence = this.determineConfidence(parsedJd, evalCtx.hasResume);

      // Step 8: Save evaluation
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

      // Step 9: Save evidence from JD analysis and user context
      const evidenceItems: Parameters<typeof this.opportunityService.saveEvidence>[0] = [
        {
          opportunity_id: opportunityId,
          kind: 'jd_analysis',
          title: 'JD 结构化解析',
          excerpt: `解析置信度: ${parsedJd.parse_confidence}, 识别 ${parsedJd.requirements.length} 项要求, ${parsedJd.responsibilities.length} 项职责`,
          company: parsedJd.company ?? undefined,
          role: parsedJd.role ?? undefined,
          confidence: parsedJd.parse_confidence === 'high' ? 'high' : parsedJd.parse_confidence === 'medium' ? 'medium' : 'low',
        },
      ];
      if (!evalCtx.hasResume) {
        evidenceItems.push({
          opportunity_id: opportunityId,
          kind: 'resume_match',
          title: '简历数据缺失',
          excerpt: '用户尚未上传简历，匹配度评估基于 JD 质量，置信度受限于 medium',
          confidence: 'low',
        });
      }
      if (!evalCtx.hasCompanySalary) {
        evidenceItems.push({
          opportunity_id: opportunityId,
          kind: 'salary_data',
          title: '薪资数据不足',
          excerpt: '未找到该公司/岗位的薪资数据，价值评分仅基于 JD 描述',
          confidence: 'low',
        });
      }
      await this.opportunityService.saveEvidence(evidenceItems);

      // Step 10: Save actions
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

      // Step 11: Set status to evaluated
      await this.opportunityService.setStatus(opportunityId, userId, 'evaluated');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Evaluation failed for opportunity ${opportunityId}: ${message}`);
      await this.opportunityService.setStatus(opportunityId, userId, 'failed', message);
    }
  }

  private async buildEvaluationContext(
    userId: string,
    parsedJd: ParsedJd,
  ): Promise<{ promptContext: string; hasResume: boolean; hasCompanySalary: boolean }> {
    const intel = await this.evidence.gather(userId);
    const sections: string[] = [];

    const hasResume = intel.has_resume && intel.skills.length > 0;
    if (hasResume) {
      sections.push(`用户技能：${intel.skills.join(', ')}`);
      sections.push(`JD 要求：${parsedJd.requirements.join(', ')}`);
    } else {
      sections.push('用户尚未上传简历，匹配度评估基于 JD 质量，置信度受限于 medium');
    }

    if (intel.diagnoses.length > 0) {
      const patterns = intel.diagnosis_patterns;
      if (patterns.hit.length > 0) sections.push(`历史诊断命中关键词：${patterns.hit.join(', ')}`);
      if (patterns.miss.length > 0) sections.push(`历史诊断缺失关键词：${patterns.miss.join(', ')}`);
    }

    const companyName = parsedJd.company?.toLowerCase();
    if (companyName) {
      const relatedFeed = intel.feed_relevant.filter(
        (e) => e.structured?.['company']?.toString().toLowerCase() === companyName,
      );
      if (relatedFeed.length > 0) {
        sections.push(`该公司相关面经（${relatedFeed.length}条）：${relatedFeed.map((e) => e.summary).join('；')}`);
      }
    }

    let hasCompanySalary = false;
    if (companyName && intel.salary_context.length > 0) {
      const companySalary = intel.salary_context.filter(
        (e) => e.structured?.['company']?.toString().toLowerCase() === companyName,
      );
      if (companySalary.length > 0) {
        hasCompanySalary = true;
        sections.push(`该公司薪资参考：${companySalary.map((e) => e.summary).join('；')}`);
      } else {
        sections.push('未找到该公司薪资数据，价值评分仅基于 JD 描述');
      }
    } else {
      sections.push('未找到薪资数据，价值评分仅基于 JD 描述');
    }

    return { promptContext: sections.join('\n'), hasResume, hasCompanySalary };
  }

  private buildSystemPrompt(contextString: string): string {
    return `${EVAL_SYSTEM_BASE}\n\n## 用户背景\n${contextString}`;
  }

  private async evaluateWithAi(
    parsedJd: ParsedJd,
    riskAssessment: RiskAssessment,
    evaluationContext: string,
  ): Promise<EvaluationResult> {
    const systemPrompt = this.buildSystemPrompt(evaluationContext);
    return this.ai.completeStructured<EvaluationResult>({
      system: systemPrompt,
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

  private determineConfidence(parsedJd: ParsedJd, hasResume: boolean): ConfidenceLevel {
    if (parsedJd.parse_confidence === 'low') return 'low';
    if (parsedJd.parse_confidence === 'medium') return 'medium';
    // With resume data, confidence can reach high; without, cap at medium
    return hasResume ? 'high' : 'medium';
  }
}

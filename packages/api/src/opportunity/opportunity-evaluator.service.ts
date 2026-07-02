import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { EvidenceService } from '../intelligence/evidence.service';
import { OpportunityService } from './opportunity.service';
import { OpportunityParserService } from './opportunity-parser.service';
import { OpportunityRiskService } from './opportunity-risk.service';
import type { ParsedJd } from './opportunity-parser.service';
import type { RiskAssessment } from './opportunity-risk.service';
import type { Recommendation, ConfidenceLevel, ActionType } from './types/opportunity.types';

// AI 原始返回:title 必有,action_type/reason 可能缺失(已从 schema required 移除)。
interface RawNextAction {
  action_type?: unknown;
  title?: unknown;
  reason?: unknown;
}

// AI 原始评估返回:所有字段都可能缺失/类型漂移,service 端逐字段收口成 EvaluationResult。
interface RawEvaluation {
  match_score?: number;
  value_score?: number;
  strengths?: unknown[];
  gaps?: unknown[];
  next_actions?: RawNextAction[];
}

interface EvaluationResult {
  match_score: number;
  value_score: number;
  strengths: string[];
  gaps: string[];
  next_actions: { action_type: ActionType; title: string; reason: string }[];
}

const EVAL_SYSTEM_BASE = `你是一个职位评估专家。根据解析后的 JD 信息、风险评估结果以及用户背景数据，对该职位进行综合评估。

评估维度：
- match_score (0-100): 职位与用户的匹配度评分。综合考虑用户技能经验与 JD 要求的匹配程度、成长潜力
- value_score (0-100): 价值评分。考虑薪资竞争力、发展前景、公司实力
- strengths[]: 该职位的优势（3-5 条中文短句，纯字符串数组）
- gaps[]: 需要注意的不足或风险（2-4 条中文短句，纯字符串数组）
- next_actions[]: 建议的后续行动，每项是一个对象，至少给出 title（中文行动标题），并尽量补充 reason（中文理由）和 action_type

action_type 从这几个里选一个最贴切的：optimize_resume(优化简历)、write_cover_letter(写求职信)、prepare_interview(面试准备)、research_company(研究公司)、apply(直接投递)、dismiss(放弃)。拿不准时填 research_company。`;

// 友好化范式(对齐 parse_jd):内嵌对象只把 title 列为 required——降级后的 DeepSeek 偶发漏掉
// reason/action_type,若一并列入 required 会被 AiService 运行期校验整次拒收→主备重试耗尽→503。
// action_type 枚举同样不写进 schema:模型偶发吐中文/越界枚举,schema 内 enum 会触发整次拒收;
// 改放 service 端 coerce(非法值降级为 research_company),成本更低且不抬 503。
// 外层 required 只保留两个标量分数;strengths/gaps/next_actions 在 service 端已有 Array.isArray 兜底,
// 不强制 required 可避免模型偶发省略数组字段导致整次评估失败。
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
          action_type: { type: 'string' },
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  required: ['match_score', 'value_score'],
};

const VALID_ACTION_TYPES = new Set<ActionType>([
  'optimize_resume', 'write_cover_letter', 'prepare_interview', 'research_company', 'apply', 'dismiss',
]);

// action_type 枚举漂移收口:模型可能吐空/中文/越界值,统一 coerce 成合法 ActionType,
// 拿不准时降级为 research_company(对应 entity action_type 列与前端 ACTION_TYPE_LABELS 都安全)。
function coerceActionType(raw: unknown): ActionType {
  if (typeof raw === 'string' && VALID_ACTION_TYPES.has(raw.trim() as ActionType)) {
    return raw.trim() as ActionType;
  }
  return 'research_company';
}

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
    // 记录原状态:已加入投递看板(tracked)的机会重新评估后应保留 tracked,
    // 不能被无条件回退成 evaluated 而从看板"丢失"。详见 Step 11。
    const originalStatus = opportunity.status;
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
      // 服务端收口:strengths/gaps 只取字符串元素;next_actions 缺 title 的丢弃,
      // action_type 走 coerce(漂移→research_company),reason 缺失补空串。
      const rawActions: RawNextAction[] = Array.isArray(rawEval.next_actions) ? rawEval.next_actions : [];
      const evalResult: EvaluationResult = {
        match_score: rawEval.match_score ?? 0,
        value_score: rawEval.value_score ?? 0,
        strengths: Array.isArray(rawEval.strengths)
          ? rawEval.strengths.filter((s): s is string => typeof s === 'string')
          : [],
        gaps: Array.isArray(rawEval.gaps)
          ? rawEval.gaps.filter((g): g is string => typeof g === 'string')
          : [],
        next_actions: rawActions
          .filter((a) => typeof a.title === 'string' && a.title.trim().length > 0)
          .map((a) => ({
            action_type: coerceActionType(a.action_type),
            title: (a.title as string).trim(),
            reason: typeof a.reason === 'string' ? a.reason.trim() : '',
          })),
      };

      // Step 6: Calculate overall score
      const overallScore = this.calculateOverallScore(
        evalResult.match_score, evalResult.value_score, riskAssessment.credibility_score,
      );

      // Step 7: Determine recommendation — use structured fields, not string matching
      const recommendation = this.determineRecommendation(overallScore, riskAssessment);
      const confidence = this.determineConfidence(parsedJd, evalCtx.hasResume);

      // Step 8: Replace prior artifacts then persist the fresh evaluation.
      // Clearing happens only after all AI calls above succeeded, so a transient
      // failure leaves the previous good evaluation intact.
      await this.opportunityService.clearEvaluationData(opportunityId);
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
      await this.opportunityService.saveEvidence(evidenceItems);

      // Step 10: Save actions
      const actionItems = evalResult.next_actions.map((action) => ({
        opportunity_id: opportunityId,
        action_type: action.action_type,
        title: action.title,
        reason: action.reason,
        status: 'pending' as const,
      }));
      if (actionItems.length > 0) {
        await this.opportunityService.saveActions(actionItems);
      }

      // Step 11: Finalize status. 已在投递看板的机会(tracked)重评后保留 tracked,
      // 不丢看板状态;否则(原为 draft/evaluating/failed/evaluated)统一置 evaluated。
      const finalStatus = originalStatus === 'tracked' ? 'tracked' : 'evaluated';
      await this.opportunityService.setStatus(opportunityId, userId, finalStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Evaluation failed for opportunity ${opportunityId}: ${message}`);
      await this.opportunityService.setStatus(opportunityId, userId, 'failed', message);
    }
  }

  private async buildEvaluationContext(
    userId: string,
    parsedJd: ParsedJd,
  ): Promise<{ promptContext: string; hasResume: boolean }> {
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

    return { promptContext: sections.join('\n'), hasResume };
  }

  private buildSystemPrompt(contextString: string): string {
    return `${EVAL_SYSTEM_BASE}\n\n## 用户背景\n${contextString}`;
  }

  private async evaluateWithAi(
    parsedJd: ParsedJd,
    riskAssessment: RiskAssessment,
    evaluationContext: string,
  ): Promise<RawEvaluation> {
    const systemPrompt = this.buildSystemPrompt(evaluationContext);
    return this.ai.completeStructured<RawEvaluation>({
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

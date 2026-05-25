import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { OpportunityService } from './opportunity.service';
import { OpportunityParserService } from './opportunity-parser.service';
import { OpportunityRiskService } from './opportunity-risk.service';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { FeedItem } from '../feed/entities/feed-item.entity';
import { SalaryEntry } from '../salary/entities/salary-entry.entity';
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

interface UserContext {
  resumeSummary: string | null;
  diagnosisPatterns: string | null;
  feedIntelligence: string | null;
  salaryData: string | null;
  hasResume: boolean;
  insufficientSalaryData: boolean;
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
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(FeedItem)
    private readonly feedItemRepo: Repository<FeedItem>,
    @InjectRepository(SalaryEntry)
    private readonly salaryRepo: Repository<SalaryEntry>,
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

      // Step 3: Gather user context
      const userContext = await this.gatherUserContext(userId, parsedJd);

      // Step 4: Detect risks
      const rawRisk = await this.riskService.detectRisks(opportunity.jd_text, parsedJd);
      // Defensive: AI may omit fields despite schema — normalise
      const riskAssessment: RiskAssessment = {
        credibility_score: rawRisk.credibility_score ?? 0.5,
        risk_flags: Array.isArray(rawRisk.risk_flags) ? rawRisk.risk_flags : [],
      };

      // Step 5: AI evaluation for match/value scores
      const rawEval = await this.evaluateWithAi(parsedJd, riskAssessment, userContext);
      // Defensive: normalise AI output
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

      // Step 7: Determine recommendation
      const recommendation = this.determineRecommendation(overallScore, riskAssessment);
      const confidence = this.determineConfidence(parsedJd, userContext.hasResume);

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
      if (!userContext.hasResume) {
        evidenceItems.push({
          opportunity_id: opportunityId,
          kind: 'resume_match',
          title: '简历数据缺失',
          excerpt: '用户尚未上传简历，匹配度评估基于 JD 质量，置信度受限于 medium',
          confidence: 'low',
        });
      }
      if (userContext.insufficientSalaryData) {
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

  private async gatherUserContext(userId: string, parsedJd: ParsedJd): Promise<UserContext> {
    const ctx: UserContext = {
      resumeSummary: null,
      diagnosisPatterns: null,
      feedIntelligence: null,
      salaryData: null,
      hasResume: false,
      insufficientSalaryData: true,
    };

    // 1. Get user's primary resume (or most recent)
    try {
      let resume = await this.resumeRepo.findOne({
        where: { user_id: userId, is_primary: true },
      });
      if (!resume) {
        resume = await this.resumeRepo.findOne({
          where: { user_id: userId },
          order: { created_at: 'DESC' },
        });
      }
      if (resume) {
        ctx.hasResume = true;
        const parsed = resume.parsed_json;
        if (parsed) {
          const parts: string[] = [];
          // Skills is an object with technical, soft, languages, certifications
          const allSkills = [
            ...(parsed.skills?.technical || []),
            ...(parsed.skills?.soft || []),
            ...(parsed.skills?.languages || []),
            ...(parsed.skills?.certifications || []),
          ];
          if (allSkills.length) parts.push(`技能: ${allSkills.join(', ')}`);
          if (parsed.work_experience?.length) {
            const expSummary = parsed.work_experience
              .slice(0, 3)
              .map((e) =>
                `${e.company}${e.title ? ' - ' + e.title : ''}${e.start_date ? ' (' + e.start_date + (e.end_date ? '~' + e.end_date : '~至今') + ')' : ''}`)
              .join('; ');
            parts.push(`经验: ${expSummary}`);
          }
          if (parsed.education?.length) {
            const eduSummary = parsed.education
              .slice(0, 2)
              .map((e) =>
                `${e.school} ${e.degree} ${e.major}`)
              .join('; ');
            parts.push(`教育: ${eduSummary}`);
          }
          if (parsed.summary) {
            parts.push(`概要: ${parsed.summary}`);
          }
          ctx.resumeSummary = parts.join('\n');
        } else if (resume.raw_text) {
          // Fallback: use truncated raw text
          ctx.resumeSummary = resume.raw_text.slice(0, 500);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load resume for user ${userId}: ${err}`);
    }

    // 2. Get recent diagnoses for match pattern insight
    try {
      const diagnoses = await this.diagnosisRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 3,
      });
      if (diagnoses.length > 0) {
        const patterns = diagnoses.map((d) => {
          const hits = (d.keywords_hit || []).join(', ');
          const misses = (d.keywords_miss || []).join(', ');
          return `[${d.jd_company ?? '?'}-${d.jd_role ?? '?'}] 得分:${d.score ?? '?'}, 命中:${hits || '无'}, 缺失:${misses || '无'}`;
        });
        ctx.diagnosisPatterns = patterns.join('\n');
      }
    } catch (err) {
      this.logger.warn(`Failed to load diagnoses for user ${userId}: ${err}`);
    }

    // 3. Get feed items matching company
    try {
      if (parsedJd.company) {
        const feedItems = await this.feedItemRepo.find({
          where: { company: parsedJd.company },
          take: 5,
        });
        if (feedItems.length > 0) {
          const items = feedItems.map((f) => {
            const excerpt = f.summary || (f.content ? f.content.slice(0, 100) : '');
            return `- ${f.title}${f.source_name ? ' (来源: ' + f.source_name + ')' : ''}: ${excerpt}`;
          });
          ctx.feedIntelligence = items.join('\n');
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load feed items: ${err}`);
    }

    // 4. Get salary data
    try {
      if (parsedJd.company) {
        const salaryEntries = await this.salaryRepo.find({
          where: { company: parsedJd.company },
          take: 5,
        });
        if (salaryEntries.length > 0) {
          ctx.insufficientSalaryData = false;
          const entries = salaryEntries.map((s) =>
            `${s.role}${s.level ? '(' + s.level + ')' : ''}: 基本${s.base_salary}${s.bonus ? ', 奖金' + s.bonus : ''}${s.stock_value ? ', 股票' + s.stock_value : ''}, 总包${s.total_comp}${s.location ? ' @' + s.location : ''}`);
          ctx.salaryData = entries.join('\n');
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load salary data: ${err}`);
    }

    return ctx;
  }

  private buildSystemPrompt(userContext: UserContext): string {
    const sections: string[] = [EVAL_SYSTEM_BASE];

    if (userContext.resumeSummary) {
      sections.push(`\n## 用户简历摘要\n${userContext.resumeSummary}\n请基于用户的实际技能和经验来评估匹配度。`);
    } else {
      sections.push(`\n注意：用户尚未上传简历，match_score 主要基于 JD 本身的质量和清晰度来评估，无法精确匹配。`);
    }

    if (userContext.diagnosisPatterns) {
      sections.push(`\n## 用户历史诊断记录\n${userContext.diagnosisPatterns}\n参考用户过往的关键词命中/缺失模式来评估匹配度。`);
    }

    if (userContext.feedIntelligence) {
      sections.push(`\n## 相关市场情报\n${userContext.feedIntelligence}\n参考这些信息评估公司和岗位的市场状况。`);
    }

    if (userContext.salaryData) {
      sections.push(`\n## 薪资市场数据\n${userContext.salaryData}\n参考市场薪资数据评估职位价值。`);
    } else {
      sections.push(`\n注意：未找到该公司的薪资数据，价值评分仅基于 JD 描述。`);
    }

    return sections.join('\n');
  }

  private async evaluateWithAi(
    parsedJd: ParsedJd,
    riskAssessment: RiskAssessment,
    userContext: UserContext,
  ): Promise<EvaluationResult> {
    const systemPrompt = this.buildSystemPrompt(userContext);
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

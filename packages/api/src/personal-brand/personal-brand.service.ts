import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { BrandStrategyDto } from './dto/brand-strategy.dto';
import { PortfolioAdviceDto } from './dto/portfolio-advice.dto';

// ── Shared base types ──────────────────────────────────────────────────────────

interface EvidenceItem {
  field: string;
  value: string;
  relevance: string;
}

interface BaseResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: EvidenceItem[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
}

// ── Brand strategy output ──────────────────────────────────────────────────────

interface BrandStrategy {
  type: 'technical_depth' | 'industry_insight' | 'career_experience';
  positioning: string;
  evidence_basis: string[];
}

interface PlatformAction {
  platform: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

interface ContentIdea {
  title: string;
  angle: string;
  source_experience: string;
  format?: 'article' | 'tutorial' | 'case_study' | 'opinion' | 'thread';
}

interface ProfileOptimization {
  platform: string;
  current_issue: string;
  suggested_change: string;
}

export interface BrandStrategyResult extends BaseResult {
  brand_strategy: BrandStrategy;
  platform_actions: PlatformAction[];
  content_ideas: ContentIdea[];
  profile_optimization: ProfileOptimization[];
}

// ── Portfolio advice output ────────────────────────────────────────────────────

interface ProjectIdea {
  title: string;
  description: string;
  skills_demonstrated: string[];
  size: 'small' | 'medium' | 'large';
  estimated_weeks: number;
  interview_talking_points: string[];
  evidence_basis: string;
  github_visibility?: boolean;
}

interface AntiPattern {
  pattern: string;
  reason: string;
}

export interface PortfolioAdviceResult extends BaseResult {
  project_ideas: ProjectIdea[];
  anti_patterns: AntiPattern[];
}

// ── Profile sufficiency check ──────────────────────────────────────────────────

/**
 * Returns true when the profile provides enough signal to generate non-fabricated output.
 * Minimum: profile must have at least one of: experience, skills, education,
 *          and not be an empty object.
 */
function isProfileSufficient(profile: Record<string, unknown>): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const keys = Object.keys(profile);
  if (keys.length === 0) return false;
  // Must have at least one substantive section
  return (
    Boolean(profile['experience']) ||
    Boolean(profile['skills']) ||
    Boolean(profile['education'])
  );
}

/**
 * Returns a list of profile field names that appear missing.
 */
function missingProfileFields(profile: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!profile['experience']) missing.push('experience（工作/项目经历）');
  if (!profile['skills']) missing.push('skills（技能列表）');
  if (!profile['education']) missing.push('education（教育背景）');
  return missing;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class PersonalBrandService {
  constructor(private readonly ai: AiService) {}

  // ── Brand strategy ────────────────────────────────────────────────────────

  async brandStrategy(dto: BrandStrategyDto): Promise<BrandStrategyResult> {
    if (!isProfileSufficient(dto.profile)) {
      throw new BadRequestException({
        error: 'profile_insufficient',
        message: '个人品牌策略需要完整的用户画像，请补充以下信息后再试',
        missing_fields: missingProfileFields(dto.profile),
      });
    }

    const result = await this.ai.completeStructured<BrandStrategyResult>({
      system: this.buildBrandSystem(dto),
      prompt: this.buildBrandPrompt(dto),
      toolName: 'personal_brand_strategy',
      toolDescription: '输出个人品牌策略，包含品牌定位、平台行动计划、内容创意和 profile 优化建议',
      schema: BRAND_STRATEGY_SCHEMA,
    });

    return this.applyBrandGuards(result, dto.profile);
  }

  // ── Portfolio advice ──────────────────────────────────────────────────────

  async portfolioAdvice(dto: PortfolioAdviceDto): Promise<PortfolioAdviceResult> {
    if (!isProfileSufficient(dto.profile)) {
      throw new BadRequestException({
        error: 'profile_insufficient',
        message: '作品集规划需要完整的用户画像，请补充以下信息后再试',
        missing_fields: missingProfileFields(dto.profile),
      });
    }

    const result = await this.ai.completeStructured<PortfolioAdviceResult>({
      system: this.buildPortfolioSystem(dto),
      prompt: this.buildPortfolioPrompt(dto),
      toolName: 'portfolio_advice',
      toolDescription: '输出作品集项目推荐列表和应避免的反模式',
      schema: PORTFOLIO_ADVICE_SCHEMA,
    });

    return this.applyPortfolioGuards(result, dto.profile);
  }

  // ── Guard: brand strategy ─────────────────────────────────────────────────

  /**
   * Guard file:line reference — PersonalBrandService.applyBrandGuards
   *
   * Rule 1: evidence_used items whose field+value cannot be traced to the input
   *         profile are stripped.
   * Rule 2: platform_actions whose rationale mentions a field not found in
   *         profile top-level keys are downgraded (rationale clarified).
   * Rule 3: brand_strategy.evidence_basis items that cannot be found in profile
   *         top-level keys are stripped.
   * Rule 4: content_ideas whose source_experience is blank or generic are stripped.
   */
  private applyBrandGuards(
    result: BrandStrategyResult,
    profile: Record<string, unknown>,
  ): BrandStrategyResult {
    const profileStr = JSON.stringify(profile).toLowerCase();

    // Guard 1: strip unlocatable evidence_used
    const evidence_used = (result.evidence_used ?? []).filter((ev) => {
      const needle = String(ev.value ?? '').toLowerCase().trim();
      return needle.length > 0 && profileStr.includes(needle);
    });

    // Guard 3: strip unlocatable brand_strategy.evidence_basis
    const profileKeys = Object.keys(profile).map((k) => k.toLowerCase());
    const brand_strategy: BrandStrategy = {
      ...result.brand_strategy,
      evidence_basis: (result.brand_strategy?.evidence_basis ?? []).filter((ref) => {
        const refLower = ref.toLowerCase();
        return profileKeys.some((k) => refLower.includes(k)) || profileStr.includes(refLower);
      }),
    };

    // Guard 2: platform_actions — keep all but annotate unverifiable rationale
    const platform_actions = (result.platform_actions ?? []).map((pa) => {
      const rationaleLower = (pa.rationale ?? '').toLowerCase();
      const traceable = profileKeys.some((k) => rationaleLower.includes(k)) || profileStr.includes(rationaleLower);
      if (!traceable) {
        return { ...pa, rationale: `[依据待补充] ${pa.rationale}` };
      }
      return pa;
    });

    // Guard 4: strip content_ideas with empty/unlocatable source_experience
    const content_ideas = (result.content_ideas ?? []).filter((ci) => {
      const src = (ci.source_experience ?? '').toLowerCase().trim();
      return src.length > 3 && profileStr.includes(src);
    });

    return {
      ...result,
      evidence_used,
      brand_strategy,
      platform_actions,
      content_ideas,
    };
  }

  // ── Guard: portfolio advice ───────────────────────────────────────────────

  /**
   * Guard file:line reference — PersonalBrandService.applyPortfolioGuards
   *
   * Rule 1: project_ideas whose evidence_basis cannot be traced to profile
   *         skills/experience are stripped.
   * Rule 2: When profile.skills.technical is all "mentioned" level (no project
   *         usage), set confidence to low and prepend a note to summary.
   * Rule 3: evidence_used items whose field+value are unlocatable → stripped.
   */
  private applyPortfolioGuards(
    result: PortfolioAdviceResult,
    profile: Record<string, unknown>,
  ): PortfolioAdviceResult {
    const profileStr = JSON.stringify(profile).toLowerCase();

    // Guard 1: strip project_ideas with unlocatable evidence_basis
    const project_ideas = (result.project_ideas ?? []).filter((pi) => {
      const basis = (pi.evidence_basis ?? '').toLowerCase().trim();
      return basis.length > 3 && profileStr.includes(basis);
    });

    // Guard 3: strip unlocatable evidence_used
    const evidence_used = (result.evidence_used ?? []).filter((ev) => {
      const needle = String(ev.value ?? '').toLowerCase().trim();
      return needle.length > 0 && profileStr.includes(needle);
    });

    // Guard 2: skills all "mentioned" → low confidence + note
    let { confidence, summary } = result;
    if (this.isSkillsAllMentionedOnly(profile)) {
      confidence = 'low';
      summary = `[注意：所有技能均为「了解」级别，无项目实践基础，以下推荐仅供参考，建议先积累项目经验] ${summary}`;
    }

    return {
      ...result,
      evidence_used,
      project_ideas,
      confidence,
      summary,
    };
  }

  /**
   * Returns true when all technical skills in the profile are at "mentioned" level
   * (i.e., never used in a real project), meaning no project foundation exists.
   */
  private isSkillsAllMentionedOnly(profile: Record<string, unknown>): boolean {
    const skills = profile['skills'] as Record<string, unknown> | undefined;
    if (!skills) return false;
    const technical = skills['technical'];
    if (!Array.isArray(technical) || technical.length === 0) return false;
    return technical.every(
      (s) => (s as Record<string, string>)?.level === 'mentioned',
    );
  }

  // ── Prompt builders: brand ────────────────────────────────────────────────

  private buildBrandSystem(dto: BrandStrategyDto): string {
    const focusHint =
      dto.brand_focus && dto.brand_focus !== 'auto'
        ? `用户指定品牌方向：${dto.brand_focus}，请优先基于此方向。`
        : '请根据 profile 自动判断最适合的品牌方向。';

    return `你是专注中国职场的个人品牌顾问。

## 品牌策略三大类型
1. technical_depth — 技术深度型：深耕领域，输出深度技术内容和开源贡献
2. industry_insight — 行业洞察型：结合行业经验输出商业+技术交叉观点
3. career_experience — 职业经验型：分享求职、晋升、转型的实战经验

## 平台选择逻辑（中国市场）
- 掘金/思否：前端/全栈/后端开发者首选，技术教程+源码解析
- CSDN：曝光量大但信噪比高，适合有流量诉求的内容
- GitHub：技术方向必选，开源项目+中文 README
- 知乎：行业洞察/职业规划方向首选，长文+问答
- 小红书/B站：职业经验型，职场方向的轻量内容

## 防编造规则（硬性，不得违反）
1. brand_strategy.evidence_basis 每条必须能在用户 profile 字段中找到对应内容；不能定位则省略该条
2. platform_actions[].rationale 必须引用 profile 中具体字段（如 skills.technical、experience[0].company）；无法引用时在 rationale 说明「依据待补充」
3. content_ideas[].source_experience 必须是 profile 中真实出现过的经历描述；不能定位则省略该条内容创意
4. 禁止生成「分享你的心得」等无意义的通用建议
5. evidence_used 每条的 value 必须能在输入 profile 原文中找到

${focusHint}

目标受众：${dto.target_audience ?? '技术/职场从业者（中国市场）'}

输出语言：全部中文（字段名保持英文）`;
  }

  private buildBrandPrompt(dto: BrandStrategyDto): string {
    return `请根据以下用户画像制定个人品牌策略：

## 用户画像
${JSON.stringify(dto.profile, null, 2)}

请严格按照系统提示的规则和防编造约束，输出品牌定位、平台行动计划、内容创意和 profile 优化建议。
每条内容必须能在上面的用户画像中找到对应依据。`;
  }

  // ── Prompt builders: portfolio ────────────────────────────────────────────

  private buildPortfolioSystem(dto: PortfolioAdviceDto): string {
    return `你是专注中国职场的 Portfolio 项目顾问。

## 项目推荐维度
- 技能延伸：基于 profile.skills.technical 中 used_in_project 级别的技能，做有深度延伸的项目
- 差距弥补：针对 skill_gaps 中 critical 差距，设计有实战价值的项目
- 禁止推荐与 profile 技能完全无关的项目

## 项目规模
- small：2-4周，quick wins，填补空白
- medium：1-3个月，核心差距弥补，面试主力
- large：3-6个月，深度展示，差异化竞争力

## 可展示性（面试 talking points 必须涵盖）
- 技术选型理由
- 遇到的挑战与解决方案
- 量化指标（如有真实数据）
- 代码质量（能否 code review）

## 防编造规则（硬性，不得违反）
1. project_ideas[].evidence_basis 必须能在 profile.skills 或 profile.experience 中定位真实字段；不能定位则省略该推荐
2. 禁止推荐与 profile 技能完全无关的项目
3. skills.technical 全为 mentioned 级别（无项目实践）→ confidence 设为 low，在 summary 中说明无项目基础
4. 不推荐教程克隆项目（如：跟着视频做 TodoApp）
5. evidence_used 每条的 value 必须能在输入 profile 原文中找到
6. interview_talking_points 不得包含具体量化数字，除非 profile 中已有真实数据

输出语言：全部中文（字段名保持英文）`;
  }

  private buildPortfolioPrompt(dto: PortfolioAdviceDto): string {
    const gapsText =
      dto.skill_gaps && dto.skill_gaps.length > 0
        ? `\n## 技能差距（skill-gap-planner 输出）\n${dto.skill_gaps.map((g) => `- ${g}`).join('\n')}`
        : '';

    return `请根据以下用户画像推荐适合做 Portfolio 的项目方向：

## 用户画像
${JSON.stringify(dto.profile, null, 2)}
${gapsText}

每个推荐项目必须在 evidence_basis 中引用用户画像的具体字段。
无法锚定真实技能或经历的项目推荐请直接省略。`;
  }
}

// ── Output JSON Schemas ────────────────────────────────────────────────────────

const BRAND_STRATEGY_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'brand_strategy', 'platform_actions', 'content_ideas', 'profile_optimization',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'value', 'relevance'],
        properties: {
          field: { type: 'string' },
          value: { type: 'string' },
          relevance: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    brand_strategy: {
      type: 'object',
      required: ['type', 'positioning', 'evidence_basis'],
      properties: {
        type: { type: 'string', enum: ['technical_depth', 'industry_insight', 'career_experience'] },
        positioning: { type: 'string' },
        evidence_basis: { type: 'array', items: { type: 'string' } },
      },
    },
    platform_actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['platform', 'action', 'priority', 'rationale'],
        properties: {
          platform: { type: 'string' },
          action: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          rationale: { type: 'string' },
        },
      },
    },
    content_ideas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'angle', 'source_experience'],
        properties: {
          title: { type: 'string' },
          angle: { type: 'string' },
          source_experience: { type: 'string' },
          format: {
            type: 'string',
            enum: ['article', 'tutorial', 'case_study', 'opinion', 'thread'],
          },
        },
      },
    },
    profile_optimization: {
      type: 'array',
      items: {
        type: 'object',
        required: ['platform', 'current_issue', 'suggested_change'],
        properties: {
          platform: { type: 'string' },
          current_issue: { type: 'string' },
          suggested_change: { type: 'string' },
        },
      },
    },
  },
} as const;

const PORTFOLIO_ADVICE_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'project_ideas', 'anti_patterns',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'value', 'relevance'],
        properties: {
          field: { type: 'string' },
          value: { type: 'string' },
          relevance: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    project_ideas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'description', 'skills_demonstrated', 'size', 'estimated_weeks', 'interview_talking_points', 'evidence_basis'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          skills_demonstrated: { type: 'array', items: { type: 'string' } },
          size: { type: 'string', enum: ['small', 'medium', 'large'] },
          estimated_weeks: { type: 'integer', minimum: 1 },
          interview_talking_points: { type: 'array', items: { type: 'string' } },
          evidence_basis: { type: 'string' },
          github_visibility: { type: 'boolean' },
        },
      },
    },
    anti_patterns: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pattern', 'reason'],
        properties: {
          pattern: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
} as const;

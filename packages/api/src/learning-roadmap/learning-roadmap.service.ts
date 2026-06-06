import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { BuildRoadmapDto } from './dto/build-roadmap.dto';

// ── Output types ───────────────────────────────────────────────────────────────

interface RoadmapPhase {
  phase_name: string;
  goal: string;
  estimated_weeks: number;
  activities?: string[];
  completion_criteria: string;
  output_artifact?: string;
}

interface RoadmapItem {
  skill_name: string;
  priority?: number;
  total_weeks?: number;
  phases: RoadmapPhase[];
}

interface ResourceItem {
  skill_name: string;
  resource_type: 'official_docs' | 'chinese_community' | 'book' | 'video' | 'open_source' | 'practice_platform';
  description: string;
  quality_criteria: string;
  language?: 'zh' | 'en' | 'both';
  for_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface BuildRoadmapResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: { field: string; value: string; relevance: string }[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  total_estimated_weeks?: number;
  roadmap: RoadmapItem[];
  resource_list: ResourceItem[];
  /** Present when skill_gaps > 10 — items deferred to reduce overload */
  backlog?: string[];
}

// ── Service ────────────────────────────────────────────────────────────────────

const MAX_ACTIVE_GAPS = 10;

@Injectable()
export class LearningRoadmapService {
  constructor(private readonly ai: AiService) {}

  async build(dto: BuildRoadmapDto): Promise<BuildRoadmapResult> {
    // Guard 1: empty skill_gaps → 400 (not a fabrication opportunity)
    if (!dto.skill_gaps || dto.skill_gaps.length === 0) {
      throw new BadRequestException('skill_gaps 不能为空，至少提供 1 项技能差距');
    }

    // Guard 2: >10 items — only process critical ones, rest go to backlog
    const allGaps = dto.skill_gaps;
    let activeGaps = allGaps;
    let backlog: string[] = [];

    if (allGaps.length > MAX_ACTIVE_GAPS) {
      // Take first MAX_ACTIVE_GAPS as "critical" — prompt instructs AI to prioritize
      activeGaps = allGaps.slice(0, MAX_ACTIVE_GAPS);
      backlog = allGaps.slice(MAX_ACTIVE_GAPS);
    }

    const weeklyHours = dto.weekly_hours ?? 10;

    const result = await this.ai.completeStructured<BuildRoadmapResult>({
      system: this.buildSystem(weeklyHours, dto.preferred_language ?? 'zh'),
      prompt: this.buildPrompt(activeGaps, dto.profile, weeklyHours),
      toolName: 'learning_roadmap',
      toolDescription: '为技能差距生成分阶段学习路线图，包含可验证完成标准和资源清单',
      schema: OUTPUT_SCHEMA,
    });

    // Guard 3: enforce completion_criteria is non-empty for each phase
    const sanitizedRoadmap = this.sanitizeRoadmap(result.roadmap ?? []);

    const finalResult: BuildRoadmapResult = {
      ...result,
      roadmap: sanitizedRoadmap,
    };

    if (backlog.length > 0) {
      finalResult.backlog = backlog;
    }

    return finalResult;
  }

  // ── 服务端确定性 guard ──────────────────────────────────────────────────────

  private sanitizeRoadmap(roadmap: RoadmapItem[]): RoadmapItem[] {
    return roadmap.map((item) => ({
      ...item,
      phases: item.phases.map((phase) => ({
        ...phase,
        // Guard: completion_criteria must be non-empty and not vague self-assessment
        completion_criteria: this.validateCriteria(phase.completion_criteria),
      })),
    }));
  }

  /**
   * Guard: reject vague self-assessment phrases.
   * Valid criteria must reference a concrete output (code/project/article/demo).
   */
  private validateCriteria(criteria: string): string {
    if (!criteria || criteria.trim().length < 5) {
      return '【需补充】完成标准须为可验证的输出物（如：代码仓库、项目截图、技术博客）';
    }
    // Reject self-assessment phrases — they violate the "no self-evaluation" rule
    const selfEvalPatterns = /我觉得|感觉掌握|自我评估|自己认为|认为自己|我感觉/;
    if (selfEvalPatterns.test(criteria)) {
      return criteria + '（注：完成标准须以可验证输出物为准，不依赖自我感受）';
    }
    return criteria;
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSystem(weeklyHours: number, language: string): string {
    const langNote = language === 'zh' ? '全部中文（简体）输出' : '全部英文输出';

    return `你是一位专注中国职场的技术学习路线规划师，帮助求职者系统补齐技能差距。

## 核心原则（硬性，不得变通）

1. **禁止推荐具体课程名称**：只描述资源类型（官方文档、B站技术系列、掘金专栏、书籍等）和质量评估标准，不给出具体 URL 或课程名
2. **完成标准须可验证**：每个阶段必须有能用具体输出物（代码仓库、项目、文章、演示）证明完成的标准，绝对禁止"我觉得我掌握了"这类自我评价
3. **完成标准须面试可展示**：优先设计能在面试中直接引用的成果（GitHub 项目、技术博客、开源贡献）
4. **中文资源优先**：技术文档优先官方中文版；社区资源优先掘金/思否/CSDN高质量专栏（点赞>1000）；书籍优先豆瓣评分>8.0的中文技术书；视频优先B站（播放>10万的系列课）
5. **时间估算诚实**：基准为每周 ${weeklyHours} 小时，不得给出不切实际的"1周速成"类估算
6. **防编造**：所有分析基于用户提供的 skill_gaps，不得凭空加入用户没有提到的技能

## 阶段结构（每项技能 2-5 个阶段）
- 基础阶段：概念理解+基础操作
- 实践阶段：项目中应用
- 进阶阶段（可选）：复杂问题+能讲解给他人
- 验证阶段（可选）：通过项目或评估确认掌握
- 专家阶段（可选）：优化、扩展、教授他人

## 输出要求
- ${langNote}
- summary：2-3句概括整体路线安排
- total_estimated_weeks：按每周 ${weeklyHours} 小时计算的总学习周数
- resource_list：每个技能至少 1-2 条资源推荐，类型多样`;
  }

  private buildPrompt(gaps: string[], profile: string | undefined, weeklyHours: number): string {
    const profileSection = profile
      ? `\n## 用户背景\n${profile}`
      : '\n## 用户背景\n（未提供，按通用路径规划）';

    const gapList = gaps.map((g, i) => `${i + 1}. ${g}`).join('\n');

    return `请为以下 ${gaps.length} 项技能差距生成学习路线图：

## 技能差距清单
${gapList}
${profileSection}

## 学习条件
- 每周可用时间：${weeklyHours} 小时

请严格按照系统提示的规则（禁止推荐具体课程名、完成标准可验证、中文资源优先）生成完整路线图和资源清单。`;
  }
}

// ── Output JSON Schema ─────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'roadmap', 'resource_list',
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
    total_estimated_weeks: { type: 'integer', minimum: 1 },
    roadmap: {
      type: 'array',
      items: {
        type: 'object',
        required: ['skill_name', 'phases'],
        properties: {
          skill_name: { type: 'string' },
          priority: { type: 'integer', minimum: 1 },
          total_weeks: { type: 'integer', minimum: 1 },
          phases: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              required: ['phase_name', 'goal', 'estimated_weeks', 'completion_criteria'],
              properties: {
                phase_name: { type: 'string' },
                goal: { type: 'string' },
                estimated_weeks: { type: 'integer', minimum: 1 },
                activities: { type: 'array', items: { type: 'string' } },
                completion_criteria: { type: 'string' },
                output_artifact: { type: 'string' },
              },
            },
          },
        },
      },
    },
    resource_list: {
      type: 'array',
      items: {
        type: 'object',
        required: ['skill_name', 'resource_type', 'description', 'quality_criteria'],
        properties: {
          skill_name: { type: 'string' },
          resource_type: {
            type: 'string',
            enum: ['official_docs', 'chinese_community', 'book', 'video', 'open_source', 'practice_platform'],
          },
          description: { type: 'string' },
          quality_criteria: { type: 'string' },
          language: { type: 'string', enum: ['zh', 'en', 'both'] },
          for_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        },
      },
    },
  },
} as const;

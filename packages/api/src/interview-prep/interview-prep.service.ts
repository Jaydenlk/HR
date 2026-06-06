import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { CompanyPlaybookDto } from './dto/company-playbook.dto';
import { StarStoriesDto } from './dto/star-stories.dto';
import { TechCoachDto } from './dto/tech-coach.dto';
import { CaseCoachDto } from './dto/case-coach.dto';

type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

// ── 1. company-interview-playbook ───────────────────────────────────────────────

interface SalaryNegotiationNotes {
  salary_range_estimate: string | null;
  negotiation_timing?: string;
  leverage_points?: string[];
  taboos?: string[];
}

export interface CompanyPlaybookResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: Confidence;
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  company_profile: {
    company_name: string;
    stage: string;
    culture_keywords: string[];
    hiring_volume?: string;
    reputation_summary: string;
    common_pain_points?: string[];
  };
  interview_process: Array<{
    stage: string;
    description: string;
    key_assessment_angle: string;
    format?: string;
    typical_duration?: string;
    pass_rate_estimate?: string;
  }>;
  culture_fit_tips: Array<{ tip: string; example_answer_pattern?: string; anti_pattern: string }>;
  common_pitfalls: Array<{ pitfall: string; consequence: string; avoidance_strategy: string }>;
  salary_negotiation_notes: SalaryNegotiationNotes;
}

// ── 2. behavioral-story-builder ─────────────────────────────────────────────────

type PolishLevel = 'ready' | 'needs_polish' | 'skeleton';

interface StarStory {
  title: string;
  competency: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  polish_level: PolishLevel;
  applicable_questions?: string[];
  time_estimate?: number;
}

export interface StarStoriesResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: Confidence;
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  story_bank: StarStory[];
  coverage_map: {
    by_dimension?: Record<string, number>;
    strong_dimensions: string[];
    weak_dimensions: string[];
    missing_dimensions: string[];
  };
  gaps: Array<{ dimension: string; severity: 'critical' | 'moderate' | 'minor'; experience_hint?: string }>;
}

// ── 3. technical-interview-coach ────────────────────────────────────────────────

type PrepPriority = 'critical' | 'high' | 'medium';

interface PreparationItem {
  priority: PrepPriority;
  area: string;
  estimated_hours: number;
  target_week?: number;
  resources_hint?: string;
}

export interface TechCoachResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: Confidence;
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  preparation_plan: PreparationItem[];
  practice_questions: Array<{
    title: string;
    type: 'algorithm' | 'system_design' | 'coding' | 'cs_fundamentals';
    difficulty: 'easy' | 'medium' | 'hard';
    target_company_relevance?: 'high' | 'medium' | 'low';
    key_concepts: string[];
  }>;
  common_patterns: Array<{ pattern_name: string; applicable_types: string[]; description: string }>;
  company_specific_focus: Array<{ focus_area: string; rationale: string; evidence_source: string }>;
}

// ── 4. case-interview-coach ─────────────────────────────────────────────────────

export interface CaseCoachResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: Confidence;
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  framework_library: Array<{
    name: string;
    applicable_to: string[];
    structure: string;
    example_usage?: string;
    common_mistake?: string;
  }>;
  practice_cases: Array<{
    title: string;
    type: string;
    question: string;
    suggested_approach: string[];
    key_considerations?: string[];
    evaluation_criteria: string[];
    time_limit?: number;
  }>;
  common_mistakes: Array<{ mistake: string; why_bad: string; fix: string }>;
  evaluation_criteria: Array<{
    dimension: string;
    weight: 'primary' | 'secondary' | 'minor';
    good_example?: string;
    bad_example?: string;
  }>;
}

// ── 防编造：技术岗判定 / 量化数字提取 ─────────────────────────────────────────────

// 明确的非技术岗关键词。命中则拒绝技术面备考（应改用案例面/行为面）。
const NON_TECH_KEYWORDS = [
  '运营',
  '市场',
  '销售',
  '人力',
  'hr',
  '行政',
  '财务',
  '法务',
  '客服',
  '编辑',
  '文案',
  '公关',
  '采购',
  '行政',
];

// 提取一段文本里的所有量化数字（含百分比/倍数/万等中文量词的阿拉伯数字）。
// 用于 STAR guard：result 中出现而输入经历里没有的数字 = 编造，剔除。
function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ?? [];
}

// ── Service ─────────────────────────────────────────────────────────────────────

@Injectable()
export class InterviewPrepService {
  constructor(private readonly ai: AiService) {}

  // ── 端点 1：公司面试手册 ─────────────────────────────────────────────────────

  async playbook(dto: CompanyPlaybookDto): Promise<CompanyPlaybookResult> {
    const hasIntel =
      !!dto.interview_intelligence &&
      Object.keys(dto.interview_intelligence).length > 0;

    const result = await this.ai.completeStructured<CompanyPlaybookResult>({
      system: this.playbookSystem(hasIntel),
      prompt: this.playbookPrompt(dto, hasIntel),
      toolName: 'company_interview_playbook',
      toolDescription: '输出某公司的面试攻略手册：公司画像、面试流程、文化契合攻略、踩坑预警、薪资谈判注记',
      schema: PLAYBOOK_SCHEMA,
    });

    return this.guardPlaybook(result, hasIntel);
  }

  // Guard ①：薪资估算无来源 → null；无真实面经 → 文化判断降级为 cannot_determine
  private guardPlaybook(
    result: CompanyPlaybookResult,
    hasIntel: boolean,
  ): CompanyPlaybookResult {
    const notes = result.salary_negotiation_notes ?? {
      salary_range_estimate: null,
    };

    // 薪资范围估算必须附带来源标注（含「来源」「数据」字样）才保留，否则强制 null。
    const estimate = notes.salary_range_estimate;
    const hasSource =
      typeof estimate === 'string' &&
      /来源|数据|截至|samples|样本|\d{4}/.test(estimate);
    const salary_negotiation_notes: SalaryNegotiationNotes = {
      ...notes,
      salary_range_estimate: hasSource ? estimate : null,
    };

    // 无真实面经数据：文化画像基于通用知识图谱，不得给出确定性文化结论。
    // 把「文化契合」相关项收口进 cannot_determine，并下调 confidence。
    let confidence = result.confidence;
    const cannot_determine = [...(result.cannot_determine ?? [])];
    if (!hasIntel) {
      const note = '无真实面经数据，公司文化契合判断基于通用画像，置信度有限';
      if (!cannot_determine.includes(note)) cannot_determine.push(note);
      if (confidence === 'high') confidence = 'medium';
    }

    return { ...result, confidence, cannot_determine, salary_negotiation_notes };
  }

  // ── 端点 2：STAR 行为故事 ────────────────────────────────────────────────────

  async starStories(dto: StarStoriesDto): Promise<StarStoriesResult> {
    const result = await this.ai.completeStructured<StarStoriesResult>({
      system: this.starSystem(),
      prompt: this.starPrompt(dto),
      toolName: 'behavioral_star_builder',
      toolDescription: '从用户工作经历提炼 STAR 结构故事库，按能力维度分类，标注覆盖度与空白',
      schema: STAR_SCHEMA,
    });

    return this.guardStar(result, dto.experiences);
  }

  // Guard ②：result 不得含输入经历里没有的量化数字（代码逐故事校验后剔除/降级）。
  private guardStar(
    result: StarStoriesResult,
    experiences: string[],
  ): StarStoriesResult {
    const inputNumbers = new Set(experiences.flatMap(extractNumbers));

    const story_bank = (result.story_bank ?? []).map((story) => {
      const resultNumbers = extractNumbers(story.result);
      const fabricated = resultNumbers.filter((n) => !inputNumbers.has(n));
      if (fabricated.length === 0) return story;

      // 含编造数字：把 result 收口为「待补充」，并据经历详略下调 polish_level。
      // ready 经历被剔数后不再是 ready；至多 needs_polish。
      const downgraded: PolishLevel =
        story.polish_level === 'ready' ? 'needs_polish' : story.polish_level;
      return {
        ...story,
        result: '待补充（原输出含未在你经历中出现的量化数字，已移除以防编造）',
        polish_level: downgraded,
      };
    });

    return { ...result, story_bank };
  }

  // ── 端点 3：技术面辅导 ───────────────────────────────────────────────────────

  async techCoach(dto: TechCoachDto): Promise<TechCoachResult> {
    // Guard ③-a：非技术岗 → 400（技术面备考不适用，应走案例面/行为面）。
    const title = dto.job_title.toLowerCase();
    if (NON_TECH_KEYWORDS.some((kw) => title.includes(kw))) {
      throw new BadRequestException(
        `「${dto.job_title}」不是技术岗，技术面备考不适用。请改用案例面（case-coach）或行为故事（star-stories）。`,
      );
    }

    const hasIntel =
      !!dto.interview_intelligence &&
      Object.keys(dto.interview_intelligence).length > 0;

    const result = await this.ai.completeStructured<TechCoachResult>({
      system: this.techSystem(hasIntel),
      prompt: this.techPrompt(dto, hasIntel),
      toolName: 'technical_interview_coach',
      toolDescription: '为技术岗输出按优先级排序的备考计划、练习题、通用模式与公司专项重点',
      schema: TECH_SCHEMA,
    });

    return this.guardTech(result, hasIntel, dto.available_weeks);
  }

  // Guard ③-b：无面经数据 → company_specific_focus 强制空数组；
  // ③-c：available_weeks<2 → preparation_plan 只保留 critical。
  private guardTech(
    result: TechCoachResult,
    hasIntel: boolean,
    availableWeeks?: number,
  ): TechCoachResult {
    const company_specific_focus = hasIntel
      ? (result.company_specific_focus ?? [])
      : [];

    let preparation_plan = result.preparation_plan ?? [];
    if (availableWeeks != null && availableWeeks < 2) {
      preparation_plan = preparation_plan.filter((p) => p.priority === 'critical');
    }

    const cannot_determine = [...(result.cannot_determine ?? [])];
    if (!hasIntel) {
      const note = '无目标公司面经数据，公司专项考察重点无法定制（company_specific_focus 为空）';
      if (!cannot_determine.includes(note)) cannot_determine.push(note);
    }

    return { ...result, company_specific_focus, preparation_plan, cannot_determine };
  }

  // ── 端点 4：案例面辅导 ───────────────────────────────────────────────────────

  async caseCoach(dto: CaseCoachDto): Promise<CaseCoachResult> {
    // Guard ④-a：interview_type 非法枚举由 DTO 的 @IsIn 拦截 → 400（无需在此重复）。
    const result = await this.ai.completeStructured<CaseCoachResult>({
      system: this.caseSystem(),
      prompt: this.casePrompt(dto),
      toolName: 'case_interview_coach',
      toolDescription: '输出案例/产品设计/群面备考的框架库、练习案例、常见错误与评分维度',
      schema: CASE_SCHEMA,
    });

    return this.guardCase(result);
  }

  // Guard ④-b：剔除任何「用此框架一定通过/保证拿 offer」式的绝对化保证语。
  private guardCase(result: CaseCoachResult): CaseCoachResult {
    const guaranteePattern =
      /一定(通过|过|拿到|成功|录用)|保证(通过|过|拿到|offer|录用|成功)|百分百|包过|必过|稳过/;

    const scrub = (text: string): string =>
      guaranteePattern.test(text)
        ? text.replace(guaranteePattern, '有助于提升表现，但不保证结果')
        : text;

    const framework_library = (result.framework_library ?? []).map((f) => ({
      ...f,
      structure: scrub(f.structure),
      example_usage: f.example_usage ? scrub(f.example_usage) : f.example_usage,
    }));

    const recommendations = (result.recommendations ?? []).map(scrub);
    const summary = scrub(result.summary);

    return { ...result, summary, framework_library, recommendations };
  }

  // ── System prompts（防编造硬规则逐条写入）─────────────────────────────────────

  private playbookSystem(hasIntel: boolean): string {
    return `你是专注中国职场的面试备考教练，为特定公司生成系统化的面试攻略手册。

## 手册结构（逐项输出，不得遗漏）
company_profile / interview_process / culture_fit_tips / common_pitfalls / salary_negotiation_notes

## 中国市场文化注记（识别但保持中性客观）
- 阿里味/价值观面（阿里系）、腾讯赛马、字节飞速、中小公司「家文化」可能暗示超时工作。

## 防编造规则（硬性，违反即为错误输出）
1. ${hasIntel ? '已提供真实面经情报，可据此给出文化与流程判断，并在 evidence_used 标注来源。' : '未提供真实面经，公司画像/流程/文化均基于知识图谱通用规律，必须在 cannot_determine 声明置信度有限，不得伪装成该公司确定情报。'}
2. salary_negotiation_notes.salary_range_estimate：仅当能标注数据来源与时间时给出字符串（形如「来源：xx，截至 2025」），否则必须为 null，绝不凭空给具体数字。
3. reputation_summary 必须中性客观，不得渲染或贬低。
4. evidence_used 中每条证据必须能在输入中定位，否则省略。
5. confidence 诚实反映信息完整度，不得高估。

## 输出要求
语言：全部中文（字段名保持英文）。`;
  }

  private playbookPrompt(dto: CompanyPlaybookDto, hasIntel: boolean): string {
    const intel = hasIntel
      ? `\n## 真实面经情报（可信来源，据此分析并在 evidence_used 标注）\n${JSON.stringify(dto.interview_intelligence)}`
      : '\n（未提供真实面经情报，请按降级规则处理）';
    const profile = dto.user_profile
      ? `\n## 用户画像\n${JSON.stringify(dto.user_profile)}`
      : '';
    return `请为以下公司生成面试攻略手册：
- 公司名称：${dto.company_name}
- 目标岗位：${dto.job_title ?? '未指定'}${intel}${profile}

请严格按系统提示的结构与防编造规则输出。`;
  }

  private starSystem(): string {
    return `你是面试故事教练，从用户提供的工作经历中提炼可用于行为面试的 STAR 结构故事。

## STAR 故事结构
每个故事含 title / competency[] / situation / task / action / result / polish_level（ready|needs_polish|skeleton）/ applicable_questions[] / time_estimate。

## 能力维度（competency 只能取这些枚举）
问题解决 / 领导力 / 协作影响 / 主动创新 / 逆境应对 / 数据驱动 / 客户中心 / 自我学习

## 防编造规则（硬性，违反即为错误输出）
1. result 中的所有量化数字必须来自用户原始经历原文，严禁添加用户未提及的任何数字（百分比、金额、人数、倍数等）。
2. 无量化数据时 result 标注「待补充」，禁止用「可能」「大概」等模糊表述伪造结果。
3. 不得修改用户经历的事实，只能结构化重组。
4. polish_level 据经历详略诚实标注：要素齐全且有量化=ready；有素材但缺细节/数字=needs_polish；仅有线索=skeleton。
5. action 突出个人贡献，避免笼统的「我们」。

## 输出要求
语言：全部中文（字段名保持英文）。`;
  }

  private starPrompt(dto: StarStoriesDto): string {
    const exp = dto.experiences.map((e, i) => `### 经历 ${i + 1}\n${e}`).join('\n\n');
    const comp =
      dto.target_competencies && dto.target_competencies.length > 0
        ? `\n## 希望重点覆盖的维度\n${dto.target_competencies.join('、')}`
        : '';
    const job = dto.target_job_type ? `\n## 目标岗位类型：${dto.target_job_type}` : '';
    return `请从以下工作经历提炼 STAR 故事库，并分析能力维度覆盖度与空白：

${exp}${comp}${job}

请严格遵守防编造规则：result 中不得出现经历原文里没有的量化数字。`;
  }

  private techSystem(hasIntel: boolean): string {
    return `你是技术面试备考教练，为技术岗候选人制定个性化备考计划（算法/系统设计/语言特性）。

## 输出维度
preparation_plan[]（按 critical|high|medium 排序）/ practice_questions[]（类型题，非真题）/ common_patterns[] / company_specific_focus[]

## 中国技术面特殊场景
笔试 OJ 限时提交 / 手撕代码注重可读性允许小语法错误 / 系统设计偏高并发分布式缓存 / 语言底层（JVM、GIL、goroutine）高频。

## 防编造规则（硬性，违反即为错误输出）
1. ${hasIntel ? '已提供真实面经，可据此填充 company_specific_focus，每条须有 evidence_source。' : '未提供目标公司面经，company_specific_focus 必须为空数组，绝不编造该公司特定考察偏好或真题。'}
2. practice_questions 为通用类型题，不得伪装成某公司真题。
3. estimated_hours 为合理估算，不得夸大。
4. cannot_determine 列出无法个性化的内容。

## 输出要求
语言：全部中文（字段名保持英文）。`;
  }

  private techPrompt(dto: TechCoachDto, hasIntel: boolean): string {
    const weeks = dto.available_weeks
      ? `\n- 可用备考时间：${dto.available_weeks} 周`
      : '';
    const intel = hasIntel
      ? `\n## 真实面经情报（据此填充 company_specific_focus）\n${JSON.stringify(dto.interview_intelligence)}`
      : '\n（未提供目标公司面经，company_specific_focus 须为空数组）';
    const profile = dto.user_profile
      ? `\n## 用户画像\n${JSON.stringify(dto.user_profile)}`
      : '';
    return `请为以下技术岗制定备考计划：
- 目标岗位：${dto.job_title}
- 目标公司：${dto.company_name ?? '未指定'}${weeks}${intel}${profile}

请严格按系统提示的防编造规则输出。`;
  }

  private caseSystem(): string {
    return `你是 Case 面试/产品设计题备考教练，基于通用方法论提供系统化备考指导。

## 输出维度
framework_library[] / practice_cases[] / common_mistakes[] / evaluation_criteria[]

## 中国市场特殊场景
无领导小组讨论（群面）：平衡发言主动与倾听协作，结构化总结者常获好评，不打断但可「接棒」。
产品设计题中国情境：微信生态、下沉市场、直播电商/短视频逻辑。

## 防编造规则（硬性，违反即为错误输出）
1. 严禁任何「用此框架一定通过」「保证拿 offer」「包过/必过」式的绝对化保证语，框架只提升表现、不保证结果。
2. practice_cases 为类型练习题，不得伪装成某公司真题。
3. evaluation_criteria 反映面试官真实评分维度，不得编造。

## 输出要求
语言：全部中文（字段名保持英文）。`;
  }

  private casePrompt(dto: CaseCoachDto): string {
    const company = dto.target_company ? `\n- 目标公司/行业：${dto.target_company}` : '';
    const level = dto.experience_level ? `\n- 经验水平：${dto.experience_level}` : '';
    const focus = dto.focus_area ? `\n- 重点方向：${dto.focus_area}` : '';
    return `请为以下 Case 面试场景提供备考指导：
- 面试类型：${dto.interview_type}${company}${level}${focus}

请严格遵守防编造规则，不得出现任何「一定通过」类保证语。`;
  }
}

// ── Output JSON Schemas ─────────────────────────────────────────────────────────

const BASE_REQUIRED = [
  'skill_name',
  'skill_version',
  'summary',
  'confidence',
  'evidence_used',
  'recommendations',
  'risks',
  'next_actions',
  'follow_up_questions',
  'cannot_determine',
] as const;

const BASE_PROPS = {
  skill_name: { type: 'string' },
  skill_version: { type: 'string' },
  summary: { type: 'string' },
  confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
  evidence_used: { type: 'array', items: { type: 'object' } },
  recommendations: { type: 'array', items: { type: 'string' } },
  risks: { type: 'array', items: { type: 'string' } },
  next_actions: { type: 'array', items: { type: 'string' } },
  follow_up_questions: { type: 'array', items: { type: 'string' } },
  cannot_determine: { type: 'array', items: { type: 'string' } },
} as const;

const PLAYBOOK_SCHEMA = {
  type: 'object',
  required: [
    ...BASE_REQUIRED,
    'company_profile',
    'interview_process',
    'culture_fit_tips',
    'common_pitfalls',
    'salary_negotiation_notes',
  ],
  properties: {
    ...BASE_PROPS,
    company_profile: {
      type: 'object',
      required: ['company_name', 'stage', 'culture_keywords', 'reputation_summary'],
      properties: {
        company_name: { type: 'string' },
        stage: { type: 'string' },
        culture_keywords: { type: 'array', items: { type: 'string' } },
        hiring_volume: { type: 'string' },
        reputation_summary: { type: 'string' },
        common_pain_points: { type: 'array', items: { type: 'string' } },
      },
    },
    interview_process: {
      type: 'array',
      items: {
        type: 'object',
        required: ['stage', 'description', 'key_assessment_angle'],
        properties: {
          stage: { type: 'string' },
          description: { type: 'string' },
          format: { type: 'string' },
          typical_duration: { type: 'string' },
          key_assessment_angle: { type: 'string' },
          pass_rate_estimate: { type: 'string' },
        },
      },
    },
    culture_fit_tips: {
      type: 'array',
      items: {
        type: 'object',
        required: ['tip', 'anti_pattern'],
        properties: {
          tip: { type: 'string' },
          example_answer_pattern: { type: 'string' },
          anti_pattern: { type: 'string' },
        },
      },
    },
    common_pitfalls: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pitfall', 'consequence', 'avoidance_strategy'],
        properties: {
          pitfall: { type: 'string' },
          consequence: { type: 'string' },
          avoidance_strategy: { type: 'string' },
        },
      },
    },
    salary_negotiation_notes: {
      type: 'object',
      required: ['salary_range_estimate', 'negotiation_timing'],
      properties: {
        salary_range_estimate: { oneOf: [{ type: 'string' }, { type: 'null' }] },
        negotiation_timing: { type: 'string' },
        leverage_points: { type: 'array', items: { type: 'string' } },
        taboos: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

const STAR_SCHEMA = {
  type: 'object',
  required: [...BASE_REQUIRED, 'story_bank', 'coverage_map', 'gaps'],
  properties: {
    ...BASE_PROPS,
    story_bank: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'competency', 'situation', 'task', 'action', 'result', 'polish_level'],
        properties: {
          title: { type: 'string' },
          competency: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['问题解决', '领导力', '协作影响', '主动创新', '逆境应对', '数据驱动', '客户中心', '自我学习'],
            },
          },
          situation: { type: 'string' },
          task: { type: 'string' },
          action: { type: 'string' },
          result: { type: 'string' },
          polish_level: { type: 'string', enum: ['ready', 'needs_polish', 'skeleton'] },
          applicable_questions: { type: 'array', items: { type: 'string' } },
          time_estimate: { type: 'integer' },
        },
      },
    },
    coverage_map: {
      type: 'object',
      required: ['strong_dimensions', 'weak_dimensions', 'missing_dimensions'],
      properties: {
        by_dimension: { type: 'object', additionalProperties: { type: 'integer' } },
        strong_dimensions: { type: 'array', items: { type: 'string' } },
        weak_dimensions: { type: 'array', items: { type: 'string' } },
        missing_dimensions: { type: 'array', items: { type: 'string' } },
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dimension', 'severity'],
        properties: {
          dimension: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
          experience_hint: { type: 'string' },
        },
      },
    },
  },
} as const;

const TECH_SCHEMA = {
  type: 'object',
  required: [...BASE_REQUIRED, 'preparation_plan', 'practice_questions', 'common_patterns', 'company_specific_focus'],
  properties: {
    ...BASE_PROPS,
    preparation_plan: {
      type: 'array',
      items: {
        type: 'object',
        required: ['priority', 'area', 'estimated_hours'],
        properties: {
          priority: { type: 'string', enum: ['critical', 'high', 'medium'] },
          area: { type: 'string' },
          estimated_hours: { type: 'number', minimum: 0 },
          target_week: { type: 'integer' },
          resources_hint: { type: 'string' },
        },
      },
    },
    practice_questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'type', 'difficulty', 'key_concepts'],
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['algorithm', 'system_design', 'coding', 'cs_fundamentals'] },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          target_company_relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
          key_concepts: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    common_patterns: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pattern_name', 'applicable_types', 'description'],
        properties: {
          pattern_name: { type: 'string' },
          applicable_types: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
      },
    },
    company_specific_focus: {
      type: 'array',
      items: {
        type: 'object',
        required: ['focus_area', 'rationale', 'evidence_source'],
        properties: {
          focus_area: { type: 'string' },
          rationale: { type: 'string' },
          evidence_source: { type: 'string' },
        },
      },
    },
  },
} as const;

const CASE_SCHEMA = {
  type: 'object',
  required: [...BASE_REQUIRED, 'framework_library', 'practice_cases', 'common_mistakes', 'evaluation_criteria'],
  properties: {
    ...BASE_PROPS,
    framework_library: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'applicable_to', 'structure'],
        properties: {
          name: { type: 'string' },
          applicable_to: { type: 'array', items: { type: 'string' } },
          structure: { type: 'string' },
          example_usage: { type: 'string' },
          common_mistake: { type: 'string' },
        },
      },
    },
    practice_cases: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'type', 'question', 'suggested_approach', 'evaluation_criteria'],
        properties: {
          title: { type: 'string' },
          type: { type: 'string' },
          question: { type: 'string' },
          suggested_approach: { type: 'array', items: { type: 'string' } },
          key_considerations: { type: 'array', items: { type: 'string' } },
          evaluation_criteria: { type: 'array', items: { type: 'string' } },
          time_limit: { type: 'integer' },
        },
      },
    },
    common_mistakes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['mistake', 'why_bad', 'fix'],
        properties: {
          mistake: { type: 'string' },
          why_bad: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
    evaluation_criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dimension', 'weight'],
        properties: {
          dimension: { type: 'string' },
          weight: { type: 'string', enum: ['primary', 'secondary', 'minor'] },
          good_example: { type: 'string' },
          bad_example: { type: 'string' },
        },
      },
    },
  },
} as const;

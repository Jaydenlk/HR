import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { SpeechService } from '../speech/speech.service';
import type { SynthesizedAudio } from '../speech/providers/speech.provider';
import { CompanyRegistryService } from '../feed/company-registry.service';
import { CompanyResearchService, CompanyResearchCandidate } from '../company-research/company-research.service';
import { ApplicationsService } from '../applications/applications.service';
import type { Company } from '../feed/entities/company.entity';
import { MockSession, Question, Answer, Evaluation } from './entities/mock-session.entity';
import { CreateMockSessionDto } from './dto/create-mock-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

interface AnswerEvaluation {
  score: number;
  feedback: string;
  filler_count: number;
}

/** 公司查库结果：命中时带库内字段，未命中为 null */
interface CompanyLookup {
  company_known: boolean;
  matched: Company | null;
}

/**
 * 出题 prompt 用的已确认公司信息。
 *
 * 防伪造(M3 安全硬项):本对象只能由 create() 按前端回传的 company_research_id 查库构造，
 * 绝不能直接采信前端请求体里夹带的原始 name/summary/source_url 文本——客户端可任意构造这些字段，
 * 只有查库取得的内容才可信。
 */
export interface ConfirmedCompanyInfo {
  name: string;
  summary: string;
  source_url: string;
  searched_at: string; // ISO date string，取自 company_research.retrieved_at
}

/** 出题 prompt 所需的公司上下文字符串 */
function buildCompanyContext(
  lookup: CompanyLookup,
  companyName: string,
  confirmed?: ConfirmedCompanyInfo,
): string {
  // 库内命中：使用公司库数据
  if (lookup.company_known && lookup.matched) {
    const c = lookup.matched;
    const lines: string[] = [
      `公司：${c.name}（以下公司背景来自本站公司库）`,
    ];
    if (c.sector) lines.push(`行业：${c.sector}`);
    if (c.company_type) lines.push(`公司类型：${c.company_type}`);
    if (c.role_focus?.length) lines.push(`重点岗位方向：${c.role_focus.join('、')}`);
    return lines.join('\n');
  }

  // 前端已确认的联网搜索结果
  if (confirmed) {
    return [
      `公司：${confirmed.name}`,
      `简介（来源 ${confirmed.source_url}，检索日期 ${confirmed.searched_at}）：${confirmed.summary}`,
      `⚠ 以上公司信息来自联网搜索，仅供出题背景参考，不得在此之外编造该公司的任何细节。`,
    ].join('\n');
  }

  // 库外且无搜索确认：仅公司名
  return `公司：${companyName || '（未提供）'}`;
}

@Injectable()
export class MockService {
  constructor(
    @InjectRepository(MockSession)
    private readonly repo: Repository<MockSession>,
    private readonly ai: AiService,
    private readonly speech: SpeechService,
    private readonly companyRegistry: CompanyRegistryService,
    private readonly companyResearch: CompanyResearchService,
    private readonly applications: ApplicationsService,
  ) {}

  /** 查库：name 为空直接返回未命中 */
  async lookupCompany(name: string): Promise<CompanyLookup> {
    if (!name.trim()) return { company_known: false, matched: null };
    const matched = await this.companyRegistry.matchCompany(name.trim());
    return { company_known: matched !== null, matched };
  }

  /**
   * 库外公司搜索确认：查库未命中时调用统一公司搜索服务(company-research)。
   * 返回 {company_known, candidates, reason?, from_cache?} 供前端展示多候选消歧确认框
   * (破坏性 API 变更：不再是单一 search_candidate，reason 透传搜索不可用原因，供前端区分文案，m6 校准)。
   * forceRefresh=true:缓存候选被用户拒绝后的强制重搜通道(绕缓存两路真实搜索,设计定稿4)。
   */
  async checkCompany(name: string, forceRefresh = false): Promise<{
    company_known: boolean;
    candidates: CompanyResearchCandidate[];
    reason?: 'no_key' | 'timeout' | 'error';
    from_cache?: boolean;
  }> {
    const lookup = await this.lookupCompany(name);
    if (lookup.company_known) {
      return { company_known: true, candidates: [] };
    }

    // 库外：追加统一公司搜索(候选全量返回，不截断)
    const outcome = await this.companyResearch.search(name.trim(), undefined, forceRefresh);
    return { company_known: false, ...outcome };
  }

  async generateQuestions(
    jdText: string,
    company: string,
    role: string,
    count: number,
    lookup: CompanyLookup,
    confirmed?: ConfirmedCompanyInfo,
  ): Promise<Question[]> {
    // 防编造规则：三种情况——库内/联网已确认/纯通用
    let antiHallucination: string;
    if (lookup.company_known) {
      antiHallucination = `## 防编造规则（硬性，违反即为错误输出）
1. 公司特定信息仅限以下"公司背景"字段所提供的内容，不得补充任何未在此列出的公司内部信息。
2. 不得编造该公司的具体面试流程、内部评价标准、历年真题来源。
3. 可基于公司类型与岗位方向合理推断通用题型，但不得伪装成该公司独有机密信息。`;
    } else if (confirmed) {
      antiHallucination = `## 防编造规则（硬性，违反即为错误输出）
1. 公司信息来自联网搜索（来源 ${confirmed.source_url}，检索日期 ${confirmed.searched_at}），仅限所提供的简介范围内使用。
2. 不得在简介之外编造该公司的内部流程、评价标准、历年真题或任何未提及细节。
3. 可合理推断通用校招题型，但不得伪装成该公司独有内幕信息。`;
    } else {
      antiHallucination = `## 防编造规则（硬性，违反即为错误输出）
1. 该公司不在本站资料库，严禁编造该公司的任何具体面试风格、内部流程或评价标准。
2. 出题完全依据 JD 内容与岗位名称驱动，以通用校招面试逻辑为准。
3. 不得伪装了解该公司，不得用"据了解该公司通常……"等句式暗示了解该公司内情。`;
    }

    const systemPrompt = `你是一位经验丰富的技术面试官，专注于帮助候选人做模拟面试练习。
根据提供的职位描述、公司信息和岗位名称，生成高质量的面试问题。
问题类型应包括：技术/行为/项目/反问
难度应从简单到困难合理分布。
每道题都应该配有提示，帮助候选人思考答题方向。

${antiHallucination}`;

    const companyContext = buildCompanyContext(lookup, company, confirmed);
    const userPrompt = `请为以下职位生成 ${count} 道面试题：

${companyContext}
${role ? `岗位：${role}` : ''}
${!lookup.company_known && !confirmed ? '出题策略：以通用校招面试 + JD/岗位驱动出题，不依赖对该公司的具体了解。' : ''}
${jdText ? `\n职位描述：\n${jdText}` : ''}

请使用 generate_questions 工具返回结构化的面试题列表。`;

    const schema = {
      type: 'object' as const,
      properties: {
        questions: {
          type: 'array',
          description: '面试题列表',
          items: {
            type: 'object',
            properties: {
              n: { type: 'number', description: '题目序号，从1开始' },
              type: {
                type: 'string',
                enum: ['技术', '行为', '项目', '反问'],
                description: '问题类型',
              },
              topic: { type: 'string', description: '考察主题，例如：系统设计、团队协作等' },
              difficulty: {
                type: 'string',
                enum: ['简单', '中等', '困难'],
                description: '题目难度',
              },
              question: { type: 'string', description: '面试问题正文' },
              hint: { type: 'string', description: '答题提示，帮助候选人理解考点和答题方向' },
            },
            required: ['n', 'type', 'topic', 'difficulty', 'question', 'hint'],
          },
        },
      },
      required: ['questions'],
    };

    const result = await this.ai.completeStructured<{ questions: Question[] }>({
      system: systemPrompt,
      prompt: userPrompt,
      toolName: 'generate_questions',
      toolDescription: '生成结构化面试题列表',
      schema,
    });

    return result.questions;
  }

  async evaluateAnswer(
    question: string,
    answer: string,
  ): Promise<AnswerEvaluation> {
    const fillerWords = ['呃', '嗯', '那个', '就是'];
    const fillerCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(word, 'g');
      return count + (answer.match(regex)?.length ?? 0);
    }, 0);

    const systemPrompt = `你是一位专业的面试教练，负责评估候选人对面试问题的回答质量。
评分标准（0-100分）：
- 完整性：是否完整回答了问题
- 深度：是否有足够的技术深度或思考深度
- 结构性：回答是否有逻辑结构（如STAR方法）
- 表达清晰度：是否表达清晰、简洁
请给出客观、建设性的反馈，帮助候选人改进。

## 防编造规则（硬性，违反即为错误输出）
1. 评分和反馈仅依据候选人的回答内容，不得引用候选人回答中未提及的任何信息。
2. 不得编造该公司的内部评价标准或招聘偏好。`;

    const userPrompt = `请评估以下面试问答：

【面试问题】
${question}

【候选人回答】
${answer}

请使用 evaluate_answer 工具返回评估结果。`;

    const schema = {
      type: 'object' as const,
      properties: {
        score: {
          type: 'number',
          description: '评分 0-100',
        },
        feedback: {
          type: 'string',
          description: '详细反馈，包括优点和改进建议（150字以内）',
        },
      },
      required: ['score', 'feedback'],
    };

    const result = await this.ai.completeStructured<{ score: number; feedback: string }>({
      system: systemPrompt,
      prompt: userPrompt,
      toolName: 'evaluate_answer',
      toolDescription: '评估面试回答质量',
      schema,
    });

    return {
      score: result.score,
      feedback: result.feedback,
      filler_count: fillerCount,
    };
  }

  async generateEvaluation(session: MockSession): Promise<Evaluation> {
    const qaList = (session.questions ?? [])
      .map((q) => {
        const ans = (session.answers ?? []).find((a) => a.n === q.n);
        return [
          `【问题 ${q.n}】（${q.type} · ${q.difficulty}）${q.question}`,
          ans ? `【回答】${ans.answer}` : '【回答】（未作答）',
          ans ? `【得分】${ans.score} 分  【反馈】${ans.feedback}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    const systemPrompt = `你是一位资深面试教练，负责对完整的模拟面试进行综合评估。
根据所有问题的作答情况，给出客观、全面的综合评价。
综合评分标准：
- A+: 95-100，A: 85-94，B+: 75-84，B: 65-74，B-: 55-64，C+: 45-54，C: 35-44，D: <35

## 防编造规则（硬性，违反即为错误输出）
1. 综合评价仅依据本次会话的问答记录，不得编造候选人未展示的能力或行为。
2. 不得编造目标公司的内部录用标准、薪资期望或岗位内幕信息。
3. 不得伪装了解该公司的具体面试流程或官方评价维度。`;

    const context = [
      session.company ? `公司：${session.company}` : '',
      session.role ? `岗位：${session.role}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userPrompt = `请对以下完整模拟面试进行综合评估：

${context ? `【面试背景】\n${context}\n\n` : ''}【面试问答记录】
${qaList}

请使用 generate_evaluation 工具返回综合评估结果。`;

    const schema = {
      type: 'object' as const,
      properties: {
        overall_score: {
          type: 'number',
          description: '综合评分 0-100',
        },
        overall_grade: {
          type: 'string',
          enum: ['A+', 'A', 'B+', 'B', 'B-', 'C+', 'C', 'D'],
          description: '综合字母等级',
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description: '主要优势列表（3-5条）',
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: '主要改进方向列表（3-5条）',
        },
        summary: {
          type: 'string',
          description: '综合评语（200字以内），总结表现并给出下一步建议',
        },
      },
      required: ['overall_score', 'overall_grade', 'strengths', 'weaknesses', 'summary'],
    };

    // tier: 'pro' — 总评用重档模型，确保综合评语质量
    return this.ai.completeStructured<Evaluation>({
      system: systemPrompt,
      prompt: userPrompt,
      toolName: 'generate_evaluation',
      toolDescription: '生成模拟面试综合评估',
      schema,
      tier: 'pro',
    });
  }

  async create(userId: string, dto: CreateMockSessionDto): Promise<MockSession & { company_known: boolean }> {
    // Validate: role is required — "字节" alone is meaningless without knowing the specific role
    const role = dto.role?.trim() ?? '';
    if (!role) {
      throw new BadRequestException(
        '请指定面试岗位（例如：后端开发工程师），仅提供公司名称无法生成有效面试题。',
      );
    }

    // Validate: either jd_text (>=50 chars) or role must give enough context
    const jdText = dto.jd_text?.trim() ?? '';
    if (!jdText && role.length < 4) {
      throw new BadRequestException(
        '请提供职位描述（JD）或更具体的岗位名称，以便生成有针对性的面试题。',
      );
    }

    // 归属校验(比照 follow-up.service.ts 的 NotFound/Forbidden 归一模式):dto.application_id 非空时
    // 必须先确认它属于当前用户,校验不过直接拒绝——不能等 generateQuestions() 出完题(AI 调用,会计费)
    // 才发现越权,那样会白白烧掉一次 AI 额度(B2/M12 同款审计校准的越权洞,mock 场景一并堵上)。
    if (dto.application_id) {
      try {
        await this.applications.findOne(dto.application_id, userId);
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) {
          throw new ForbiddenException('application_id 不属于当前用户');
        }
        throw err;
      }
    }

    const count = dto.question_count ?? 5;

    // 查公司库（命中/未命中双路径）
    const lookup = await this.lookupCompany(dto.company ?? '');

    // 防伪造(M3 安全硬项):前端只回传候选 id，这里按 id 查库取真实字段拼防编造 prompt，
    // 绝不信任请求体里可能夹带的任何原始 name/summary/source_url 文本(那些字段已从 DTO 移除)。
    let confirmed: ConfirmedCompanyInfo | undefined;
    if (dto.company_research_id) {
      const row = await this.companyResearch.findById(dto.company_research_id);
      if (!row) {
        throw new BadRequestException('公司背景信息已失效或不存在，请重新搜索确认');
      }
      confirmed = {
        name: row.display_name,
        summary: row.summary,
        source_url: row.source_url,
        searched_at: new Date(row.retrieved_at).toISOString().slice(0, 10),
      };
    }

    // 先出题再落库:出题是创建会话的核心产物。若 AI 失败,generateQuestions
    // 抛出的 ServiceUnavailableException(503)直接上抛,不写入任何会话行,
    // 避免产生无题的"进行中"僵尸会话。
    const questions = await this.generateQuestions(
      jdText,
      dto.company ?? '',
      role,
      count,
      lookup,
      confirmed,
    );

    const session = this.repo.create({
      user_id: userId,
      application_id: dto.application_id,
      company: dto.company,
      role: dto.role,
      jd_text: dto.jd_text,
      mode: dto.mode ?? 'text',
      status: 'in_progress',
      questions,
      answers: [],
    });

    const saved = await this.repo.save(session);
    return { ...saved, company_known: lookup.company_known };
  }

  findAllByUser(userId: string): Promise<MockSession[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<MockSession> {
    const session = await this.repo.findOne({
      where: { id, user_id: userId },
    });
    if (!session) throw new NotFoundException();
    return session;
  }

  /**
   * 语音模式读题:把指定题号的问题文本经 TTS 合成音频字节返回(模拟面试 mode='voice')。
   *
   * 所有权:非本人会话 → findOne 抛 404(不泄露存在性)。
   * 边界:仅 mode='voice' 会话允许读题(text 模式调此端点 → 400);题号越界 → 400。
   * 防编造红线:SpeechService.synthesize 对缺 key/上游失败/空音频显式抛错,本方法不吞错、不兜底空音频。
   */
  async synthesizeQuestion(
    id: string,
    userId: string,
    questionIndex: number,
  ): Promise<SynthesizedAudio> {
    const session = await this.findOne(id, userId);

    if (session.mode !== 'voice') {
      throw new BadRequestException('该模拟面试不是语音模式,无需朗读题目');
    }

    const questions = session.questions ?? [];
    if (questionIndex < 0 || questionIndex >= questions.length) {
      throw new BadRequestException(
        `题号越界 n=${questionIndex}(有效范围 0..${questions.length - 1})`,
      );
    }

    const text = questions[questionIndex].question?.trim();
    if (!text) {
      // 题面为空说明出题异常,显式抛错而非合成空音频(防编造)。
      throw new BadRequestException('该题目无可朗读的文本内容');
    }

    return this.speech.synthesize(text);
  }

  async submitAnswer(
    id: string,
    userId: string,
    dto: SubmitAnswerDto,
  ): Promise<MockSession> {
    const session = await this.findOne(id, userId);

    if (session.status === 'completed') {
      throw new BadRequestException('该面试已结束，不能继续提交回答');
    }

    const answers = session.answers ?? [];
    const nextN = answers.length + 1;
    const questions = session.questions ?? [];
    const question = questions.find((q) => q.n === nextN);

    if (!question) {
      throw new BadRequestException('所有题目已作答完毕，请调用 complete 接口结束面试');
    }

    // 评分失败不静默吞:若静默,score:0 会和真实低分混淆。让 AI 失败时抛出的
    // ServiceUnavailableException(503)上抛,不落库该作答,前端可据此重试。
    const evaluated = await this.evaluateAnswer(question.question, dto.answer);

    const newAnswer: Answer = {
      n: nextN,
      answer: dto.answer,
      score: evaluated.score,
      feedback: evaluated.feedback,
      filler_count: evaluated.filler_count,
    };

    answers.push(newAnswer);
    session.answers = answers;

    return this.repo.save(session);
  }

  async complete(id: string, userId: string): Promise<MockSession> {
    const session = await this.findOne(id, userId);

    // 幂等守卫:已完成且已有综合评估的会话,直接返回既有结果,不重跑 LLM。
    if (session.status === 'completed' && session.evaluation) {
      return session;
    }

    const totalFiller = (session.answers ?? []).reduce(
      (sum, a) => sum + (a.filler_count ?? 0),
      0,
    );

    // 综合评估失败不静默吞:503 上抛,前端 alert 提示重试。
    // status/evaluation 均在 AI 成功返回后一次性落库,确保两者不会分离。
    const evaluation = await this.generateEvaluation(session);

    session.status = 'completed';
    session.total_filler_count = totalFiller;
    session.evaluation = evaluation;

    return this.repo.save(session);
  }

  async remove(id: string, userId: string): Promise<void> {
    const session = await this.findOne(id, userId);
    await this.repo.remove(session);
  }
}

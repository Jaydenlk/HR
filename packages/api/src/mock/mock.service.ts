import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { MockSession, Question, Answer, Evaluation } from './entities/mock-session.entity';
import { CreateMockSessionDto } from './dto/create-mock-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

interface AnswerEvaluation {
  score: number;
  feedback: string;
  filler_count: number;
}

@Injectable()
export class MockService {
  constructor(
    @InjectRepository(MockSession)
    private readonly repo: Repository<MockSession>,
    private readonly ai: AiService,
  ) {}

  async generateQuestions(
    jdText: string,
    company: string,
    role: string,
    count: number,
  ): Promise<Question[]> {
    const systemPrompt = `你是一位经验丰富的技术面试官，专注于帮助候选人做模拟面试练习。
根据提供的职位描述、公司信息和岗位名称，生成高质量的面试问题。
问题类型应包括：技术/行为/项目/反问
难度应从简单到困难合理分布。
每道题都应该配有提示，帮助候选人思考答题方向。`;

    const userPrompt = `请为以下职位生成 ${count} 道面试题：

${company ? `公司：${company}` : ''}
${role ? `岗位：${role}` : ''}
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
请给出客观、建设性的反馈，帮助候选人改进。`;

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
- A+: 95-100，A: 85-94，B+: 75-84，B: 65-74，B-: 55-64，C+: 45-54，C: 35-44，D: <35`;

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

    return this.ai.completeStructured<Evaluation>({
      system: systemPrompt,
      prompt: userPrompt,
      toolName: 'generate_evaluation',
      toolDescription: '生成模拟面试综合评估',
      schema,
    });
  }

  async create(userId: string, dto: CreateMockSessionDto): Promise<MockSession> {
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

    const count = dto.question_count ?? 5;

    // 先出题再落库:出题是创建会话的核心产物。若 AI 失败,generateQuestions
    // 抛出的 ServiceUnavailableException(503)直接上抛,不写入任何会话行,
    // 避免产生无题的"进行中"僵尸会话。
    const questions = await this.generateQuestions(
      jdText,
      dto.company ?? '',
      role,
      count,
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

    return this.repo.save(session);
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

    // 幂等守卫:已完成且已有综合评估的会话,直接返回既有结果,不重跑 LLM 覆盖原结果。
    // (status 为 completed 但 evaluation 缺失时,说明上次 complete 的 AI 步骤失败,
    //  此时允许重跑以恢复——故守卫只在 evaluation 已存在时短路。)
    if (session.status === 'completed' && session.evaluation) {
      return session;
    }

    session.status = 'completed';

    const totalFiller = (session.answers ?? []).reduce(
      (sum, a) => sum + (a.filler_count ?? 0),
      0,
    );
    session.total_filler_count = totalFiller;

    // 综合评估失败不静默吞:若静默,前端 MockResult 见 evaluation 为 null 会渲染空白,
    // 用户无法区分"AI 失败"与"无评估"。让 503 上抛,前端 alert 提示重试。
    const evaluation = await this.generateEvaluation(session);
    session.evaluation = evaluation;

    return this.repo.save(session);
  }

  async remove(id: string, userId: string): Promise<void> {
    const session = await this.findOne(id, userId);
    await this.repo.remove(session);
  }
}

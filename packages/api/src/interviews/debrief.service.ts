import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { ScoreItem, QuestionItem, InterviewPrediction } from './entities/interview.entity';

export interface DebriefResult {
  overall_grade: string;
  overall_note: string;
  scores: ScoreItem[];
  questions: QuestionItem[];
  prediction: InterviewPrediction;
}

@Injectable()
export class DebriefService {
  constructor(private readonly ai: AiService) {}

  async analyze(
    transcript: string,
    company?: string,
    role?: string,
    round?: string,
  ): Promise<DebriefResult> {
    const trimmedTranscript = transcript?.trim() ?? '';
    if (trimmedTranscript.length < 20) {
      throw new BadRequestException(
        '请提供面试记录内容（至少 20 字），内容过短无法进行有效复盘分析。',
      );
    }

    const systemPrompt = `你是一位资深技术面试官，专精于帮助候选人进行面试复盘分析。
你的任务是深入分析面试对话记录，从多个维度给出客观、专业的评估和改进建议。

分析要求：
1. 逐一评估每个面试问题的回答质量（语气评定：good/warn/bad）
2. 对候选人的回答提供专业的教练点评
3. 给出更优的回答示例
4. 指出回答中暴露的知识盲点
5. 从6个维度评分（0-100分）：技术深度、清晰表达、结构化思考、行为面试STAR、反问环节、气场自信
6. 给出综合字母等级：A+/A/B+/B/B-/C+/C/D
7. 预测下一轮面试可能考察的核心主题及概率（%）

请基于面试记录做出客观分析，不要过度美化或贬低，帮助候选人真实了解自己的水平和改进方向。`;

    const contextInfo = [
      company ? `公司：${company}` : '',
      role ? `岗位：${role}` : '',
      round ? `面试轮次：${round}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userPrompt = `请对以下面试记录进行深度复盘分析：

${contextInfo ? `【面试背景】\n${contextInfo}\n\n` : ''}【面试记录】
${transcript}

请使用 interview_debrief 工具返回结构化的分析结果。`;

    const schema = {
      type: 'object',
      properties: {
        overall_grade: {
          type: 'string',
          enum: ['A+', 'A', 'B+', 'B', 'B-', 'C+', 'C', 'D'],
          description: '综合面试表现字母等级',
        },
        overall_note: {
          type: 'string',
          description: '整体点评（200字以内），总结优势和主要改进方向',
        },
        scores: {
          type: 'array',
          description: '6个维度评分',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '维度名称' },
              score: { type: 'number', description: '分数 0-100' },
            },
            required: ['name', 'score'],
          },
        },
        questions: {
          type: 'array',
          description: '逐题分析列表',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', description: '面试问题原文' },
              tone: {
                type: 'string',
                enum: ['good', 'warn', 'bad'],
                description: '回答质量评级',
              },
              coach_assessment: { type: 'string', description: '教练点评' },
              better_answer: { type: 'string', description: '更优回答示例' },
              knowledge_gaps: {
                type: 'array',
                items: { type: 'string' },
                description: '暴露的知识盲点列表',
              },
            },
            required: ['question', 'tone', 'coach_assessment', 'better_answer', 'knowledge_gaps'],
          },
        },
        prediction: {
          type: 'object',
          description: '下一轮面试预测',
          properties: {
            next_round_topics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string', description: '预测考察主题' },
                  likelihood: {
                    type: 'number',
                    description: '出现概率（0-100的整数，表示百分比）',
                  },
                },
                required: ['topic', 'likelihood'],
              },
            },
            summary: { type: 'string', description: '下一轮准备建议概要' },
          },
          required: ['next_round_topics', 'summary'],
        },
      },
      required: ['overall_grade', 'overall_note', 'scores', 'questions', 'prediction'],
    };

    return this.ai.completeStructured<DebriefResult>({
      system: systemPrompt,
      prompt: userPrompt,
      toolName: 'interview_debrief',
      toolDescription: '面试复盘分析',
      schema,
    });
  }
}

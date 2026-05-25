import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { FeedCandidate } from './importers/feed-importer.interface';
import type { FeedCategory, FeedTags } from './types/feed.types';
import type { FeedConfidence } from './types/newspaper.types';

interface ClassifiedFeed {
  category: FeedCategory;
  title: string;
  summary: string;
  company: string | null;
  role: string | null;
  outcome: string | null;
  tags: FeedTags;
  quality_score: number;
  department: string | null;
  role_category: string | null;
  interview_round: string | null;
  question_types: string[];
  difficulty: string | null;
  quarter: string | null;
  confidence: FeedConfidence;
}

@Injectable()
export class FeedClassifierService {
  constructor(private readonly ai: AiService) {}

  async classify(candidate: FeedCandidate): Promise<ClassifiedFeed> {
    const prompt = [
      `来源：${candidate.source_name}`,
      `链接：${candidate.source_url}`,
      `标题：${candidate.title}`,
      `内容：${candidate.content}`,
      '',
      '请识别这条内容对求职者的价值，并输出 JSON。',
    ].join('\n');

    const raw = await this.ai.complete({
      system: [
        '你是 Coach 求职情报编辑。',
        '只能基于输入内容分类和摘要，不得编造公司、岗位、薪资、结果。',
        '如果无法判断公司或岗位，返回 null。',
        '输出严格 JSON，不要 Markdown。',
        'JSON 字段：category,title,summary,company,role,outcome,tags,quality_score。',
        'category 只能是 interview_exp, market_insight, job_tips, hiring_signal, editorial。',
        '新增输出字段（全部加入 JSON）：',
        '- department: 部门/BU名（如"抖音电商"），不确定返回 null',
        '- role_category: 岗位大类 key，只能是：backend/frontend/algorithm/embedded/product/operations/hr/design/data/finance/consulting/marketing，不确定返回 null',
        '- interview_round: 面试轮次（一面/二面/三面/HR面/笔试），不确定返回 null',
        '- question_types: 问题类型数组（如["算法","系统设计"]），不确定返回 []',
        '- difficulty: 难度（easy/medium/hard），不确定返回 null',
        '- quarter: 内容所属季度（如"2026Q2"），根据发布时间判断，不确定返回 null',
        '- confidence: 分类置信度（high=公司岗位轮次都明确/medium=公司明确其他模糊/low=不确定）',
      ].join('\n'),
      prompt,
      maxTokens: 1200,
    });

    return this.normalize(candidate, this.parseJson(raw));
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new BadRequestException('Feed classifier returned invalid JSON');
    }
  }

  private normalize(candidate: FeedCandidate, value: unknown): ClassifiedFeed {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Feed classifier returned non-object JSON');
    }
    const record = value as Record<string, unknown>;
    return {
      category: this.toCategory(record.category),
      title: this.toText(record.title, candidate.title).slice(0, 200),
      summary: this.toText(record.summary, candidate.content || candidate.title).slice(0, 1000),
      company: this.toNullableText(record.company),
      role: this.toNullableText(record.role),
      outcome: this.toNullableText(record.outcome),
      tags: this.toTags(record.tags),
      quality_score: this.toScore(record.quality_score),
      department: this.toNullableText(record.department),
      role_category: this.toNullableText(record.role_category),
      interview_round: this.toNullableText(record.interview_round),
      question_types: this.toStringArray(record.question_types),
      difficulty: this.toNullableText(record.difficulty),
      quarter: this.toNullableText(record.quarter),
      confidence: this.toConfidence(record.confidence),
    };
  }

  private toCategory(value: unknown): FeedCategory {
    switch (value) {
      case 'interview_exp':
      case 'market_insight':
      case 'job_tips':
      case 'hiring_signal':
      case 'editorial':
        return value;
      default:
        return 'job_tips';
    }
  }

  private toText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private toTags(value: unknown): FeedTags {
    if (!value || typeof value !== 'object') {
      return { companies: [], roles: [], topics: [] };
    }
    const record = value as Record<string, unknown>;
    return {
      companies: this.toStringArray(record.companies),
      roles: this.toStringArray(record.roles),
      topics: this.toStringArray(record.topics),
    };
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  private toScore(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private toConfidence(value: unknown): FeedConfidence {
    if (value === 'high' || value === 'medium' || value === 'low') return value;
    return 'medium';
  }
}

export type { ClassifiedFeed };


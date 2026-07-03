import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { RECRUIT_EVENT_TYPES } from './types/feed.types';
import type { RecruitEventType } from './types/feed.types';
import type { FeedConfidence } from './types/newspaper.types';

/** 统一的"待抽取原始条目"——sheet_file/sheet_link 的表格行与 wechat_dump 的文章,
 * 在进入 GLM 解析前先各自转换成这个形状,解析器本身不关心来源类型。 */
export interface RecruitRawItem {
  row_number: number;
  raw_text: string;
  /** 确定性提取的候选链接(表格"链接"列 / 公众号文章 url),非 AI 产出,用于 apply_url 兜底。 */
  raw_link: string | null;
}

export interface ExtractedRecruitEvent {
  row_number: number;
  // 保证非空:normalizeOne() 在 company 缺失时直接丢弃整条候选(不会构造出 company 为 null 的实例)。
  company: string;
  role_hint: string | null;
  event_type: RecruitEventType;
  event_date: Date | null;
  city: string | null;
  apply_url: string | null;
  confidence: FeedConfidence;
}

const SYSTEM_PROMPT = [
  '你是 Coach 校招情报编辑,负责把原始表格行/公众号文章正文抽取成结构化校招事件。',
  '铁律(不得违反):',
  '1. 只能基于输入文本抽取,不得编造、不得推断补全任何日期或链接;确实无法从原文判断的字段一律返回 null。',
  '2. 每一行输入都必须在输出数组里有且仅有一个对应对象,用 row_number 精确对应输入编号,不得合并、跳过或新增行。',
  '3. event_type 只能是以下六个取值之一：网申开启、网申截止、宣讲会、笔试、面试批次、其他；无法判断具体类型时用"其他",不得留空。',
  '4. event_date 只能输出能从原文明确读出的日期,格式 YYYY-MM-DD；只有年月、模糊表述("近期"、"月底")一律返回 null,不得脑补具体日期。',
  '5. apply_url 只填原文中明确出现的网申/报名链接文本；原文没有出现具体链接就返回 null,不得编造或使用输入行之外的链接。',
  '6. company 无法判断时返回 null(该行会被丢弃,但仍要输出这一行,不得省略)。',
  '7. confidence：company/event_type/event_date 都明确 → high；company 明确其余模糊 → medium；否则 → low。',
  '输出严格 JSON 数组(不要 Markdown、不要多余文字),每个元素字段：',
  'row_number, company, role_hint, event_type, event_date, city, apply_url, confidence。',
].join('\n');

function buildPrompt(items: RecruitRawItem[]): string {
  const body = items
    .map((item) => `[行号 ${item.row_number}]\n${item.raw_text}`)
    .join('\n\n---\n\n');
  return `以下是 ${items.length} 条待抽取的原始校招信息，请按铁律逐行抽取并输出 JSON 数组：\n\n${body}`;
}

@Injectable()
export class RecruitEventParserService {
  private readonly logger = new Logger(RecruitEventParserService.name);

  constructor(private readonly ai: AiService) {}

  /** 一次 AI 调用处理一批(由调用方分片控制批大小,避免单次 prompt 过大被截断)。 */
  async parseBatch(items: RecruitRawItem[]): Promise<ExtractedRecruitEvent[]> {
    if (items.length === 0) return [];

    const raw = await this.ai.complete({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(items),
      maxTokens: 4096,
    });

    const parsed = this.parseJsonArray(raw);
    return this.normalizeAll(items, parsed);
  }

  private parseJsonArray(raw: string): unknown[] {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    let value: unknown;
    try {
      value = JSON.parse(cleaned);
    } catch {
      throw new BadRequestException('Recruit event parser returned invalid JSON');
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('Recruit event parser did not return a JSON array');
    }
    return value;
  }

  private normalizeAll(items: RecruitRawItem[], parsed: unknown[]): ExtractedRecruitEvent[] {
    const itemsByRow = new Map(items.map((item) => [item.row_number, item]));
    const results: ExtractedRecruitEvent[] = [];
    const seenRows = new Set<number>();

    for (const entry of parsed) {
      const normalized = this.normalizeOne(itemsByRow, entry);
      if (!normalized) continue;
      if (seenRows.has(normalized.row_number)) {
        this.logger.warn(`Recruit parser returned duplicate row_number ${normalized.row_number}, keeping first`);
        continue;
      }
      seenRows.add(normalized.row_number);
      results.push(normalized);
    }

    const missing = items.filter((item) => !seenRows.has(item.row_number));
    if (missing.length > 0) {
      this.logger.warn(`Recruit parser omitted ${missing.length} row(s): ${missing.map((m) => m.row_number).join(',')}`);
    }

    return results;
  }

  private normalizeOne(
    itemsByRow: Map<number, RecruitRawItem>,
    value: unknown,
  ): ExtractedRecruitEvent | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const rowNumber = typeof record.row_number === 'number' ? record.row_number : NaN;
    const source = itemsByRow.get(rowNumber);
    if (!source) {
      this.logger.warn(`Recruit parser returned unknown row_number ${String(record.row_number)}, discarding`);
      return null;
    }

    const company = this.toNullableText(record.company);
    if (!company) {
      // company 缺失:该条不落库(展示格式"公司/事件/日期/城市"缺主体没有意义),
      // 但仍记录到日志,不是静默吞掉。
      this.logger.warn(`Row ${rowNumber}: dropped — no company extracted`);
      return null;
    }

    return {
      row_number: rowNumber,
      company,
      role_hint: this.toNullableText(record.role_hint),
      event_type: this.toEventType(record.event_type),
      event_date: this.toDate(record.event_date),
      city: this.toNullableText(record.city),
      apply_url: this.toApplyUrl(record.apply_url, source.raw_link),
      confidence: this.toConfidence(record.confidence),
    };
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
  }

  private toEventType(value: unknown): RecruitEventType {
    if (typeof value === 'string' && (RECRUIT_EVENT_TYPES as readonly string[]).includes(value)) {
      return value as RecruitEventType;
    }
    return '其他';
  }

  private toDate(value: unknown): Date | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    // 只接受 YYYY-MM-DD(或可被 Date 解析的完整日期),拒绝模糊值,禁止代码侧补全年月日。
    if (!/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return null;
    const date = new Date(value.trim());
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** apply_url:优先 AI 从正文抽取到的具体链接;AI 未抽到时,回退到输入行本身携带的真实链接
   * (确定性透传,不是 AI/代码推断出新值——遵守"来源链接必须原样保留可跳转"红线)。 */
  private toApplyUrl(aiValue: unknown, rawLink: string | null): string | null {
    const extracted = this.toNullableText(aiValue);
    if (extracted && /^https?:\/\//i.test(extracted)) return extracted;
    return rawLink;
  }

  private toConfidence(value: unknown): FeedConfidence {
    if (value === 'high' || value === 'medium' || value === 'low') return value;
    return 'medium';
  }
}

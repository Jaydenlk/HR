import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { TranscriptSegment } from './providers/speech.provider';

/**
 * LLM 角色打标后的句段:在 ASR 句级时间戳基础上补上语义判定的说话人。
 * speaker 仅两类——'interviewer'(面试官) / 'candidate'(候选人,前端展示为"用户")。
 * 由 label.service 产出,写入 task.segments_json,供复盘页渲染可纠正列表 + S1 confirm 流程复用。
 * 与 B1 的 TranscriptSegment 关系:同 text/startMs/endMs,额外把可空的 speaker 收敛为必填两枚举。
 */
export interface LabeledSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker: 'interviewer' | 'candidate';
}

// AI 仅回 {idx, speaker}[](不回传全文省 token),按 idx 回引原段。
interface SpeakerLabel {
  idx: number;
  speaker: 'interviewer' | 'candidate';
}
interface LabelToolResult {
  segments: SpeakerLabel[];
}

@Injectable()
export class LabelService {
  private readonly logger = new Logger(LabelService.name);

  // 每批段数:长面试(20-40 分钟 ≈ 800-1200 句)若一次性打标,N 段需 N 条 {idx,speaker} JSON,
  // 输出 token 随段数线性涨,极易在 completeStructured 的 max_tokens 处被截断 → 整条 503。
  // 按批切(每批 ≤ BATCH_SIZE 段)使单次输出恒定可控,远低于上限;批间传上下文保角色连贯。
  private static readonly BATCH_SIZE = 60;
  // 单段输出 token 预算:一条 {"idx":1199,"speaker":"interviewer"}, 最坏约 22 token,取 32 留足余量
  // (此前取 24 偏乐观,叠加 16384 硬顶在长面试处把每段预算吃掉,是被截断的根因)。
  // 每批 max_tokens = 基线 + 该批段数 * 此值,恒在数千内,远低于 8192 默认上限。
  private static readonly TOKENS_PER_SEGMENT = 32;
  private static readonly TOKENS_BASE = 256;
  // 批间携带的上文行数:把上一批末尾几句的角色判定带给下一批,使问答轮转的连贯性跨批保持
  // (上批末是面试官提问 → 下批首句更可能是候选人作答)。
  private static readonly CONTEXT_LINES = 4;

  constructor(private readonly ai: AiService) {}

  /**
   * 给每段转写打 interviewer|candidate 标。
   * 防编造红线:不改 text、不漏段、不造段——
   *   - 入参空数组 → 抛错(上游 ASR 出空 utterances 不该走到这,绝不返回空当成功);
   *   - 单批内 AI 返回的 idx 集合与该批不是一一对应(缺/多/越界/重复)→ 视为该批失败。
   * text/startMs/endMs 一律取自服务端入参,AI 仅决定 speaker。
   *
   * 长转写韧性:按 BATCH_SIZE 切批逐批打标,每批 max_tokens 按其段数精确给定,
   * 杜绝单次输出在 max_tokens 处被截断导致整条复盘 503。
   * 优雅降级:某批连重试后仍失败(截断/校验不过/主备通道全挂)→ 该批回退为默认 'candidate',
   * 不让整条链路因打标失败而 503——用户至少拿到完整转写,可在确认页手动纠正角色。
   */
  async label(segments: TranscriptSegment[]): Promise<LabeledSegment[]> {
    if (segments.length === 0) {
      // ASR 成功必有句段;走到这里为空说明上游异常,显式抛错而非返回 [] 当成功。
      throw new InternalServerErrorException('转写结果为空,无法进行角色打标');
    }

    const result = new Array<LabeledSegment>(segments.length);
    let prevContext: LabeledSegment[] = [];
    let degradedBatches = 0;

    for (let start = 0; start < segments.length; start += LabelService.BATCH_SIZE) {
      const batch = segments.slice(start, start + LabelService.BATCH_SIZE);
      let speakers: ('interviewer' | 'candidate')[];
      try {
        speakers = await this.labelBatch(batch, prevContext);
      } catch (err) {
        // 该批打标失败(截断/校验不过/主备通道全挂):优雅降级为默认 'candidate',
        // 用户在确认页可逐句纠正。不污染 text/时间戳(防编造红线仍守:仅 speaker 用安全默认)。
        degradedBatches += 1;
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `角色打标第 ${start}-${start + batch.length - 1} 段失败,降级为默认 candidate(用户可在确认页纠正):${reason}`,
        );
        speakers = batch.map(() => 'candidate' as const);
      }

      const batchLabeled: LabeledSegment[] = batch.map((seg, i) => ({
        text: seg.text,
        startMs: seg.startMs,
        endMs: seg.endMs,
        speaker: speakers[i],
      }));
      for (let i = 0; i < batchLabeled.length; i++) {
        result[start + i] = batchLabeled[i];
      }
      // 下一批的上文:本批末尾若干句(已打标),供模型保持跨批角色连贯。
      prevContext = batchLabeled.slice(-LabelService.CONTEXT_LINES);
    }

    if (degradedBatches > 0) {
      this.logger.warn(
        `角色打标共 ${degradedBatches} 批降级(总段数 ${segments.length}),转写完整可用,角色需用户在确认页核对。`,
      );
    }

    return result;
  }

  /**
   * 对单批(≤ BATCH_SIZE 段)调用 AI 打标,返回与该批顺序一一对应的 speaker 数组。
   * 批内严格校验(数量/越界/重复/缺失)→ 任何偏差抛错,由 label() 决定是否降级该批。
   * max_tokens 按该批段数精确给定,远低于上限,不会被截断。
   */
  private async labelBatch(
    batch: TranscriptSegment[],
    prevContext: LabeledSegment[],
  ): Promise<('interviewer' | 'candidate')[]> {
    const maxTokens =
      LabelService.TOKENS_BASE + batch.length * LabelService.TOKENS_PER_SEGMENT;

    const result = await this.ai.completeStructured<LabelToolResult>({
      system: this.buildSystemPrompt(),
      prompt: this.buildUserPrompt(batch, prevContext),
      toolName: 'label_speakers',
      toolDescription: '为面试转写的每一句标注说话人角色(面试官/候选人)',
      schema: this.buildSchema(),
      maxTokens,
      tier: 'flash',
    });

    return this.resolveBatchLabels(batch, result.segments);
  }

  private buildSystemPrompt(): string {
    return `你是面试录音转写的角色标注助手。输入是一段面试对话被切成的若干句子(按时间顺序,带下标 idx),你的唯一任务是判断每一句出自谁之口,标为 "interviewer"(面试官)或 "candidate"(候选人)。

判定规则:
- interviewer(面试官):提出问题、追问、介绍岗位/公司、给出反馈或评价、引导话题、宣布流程(如"我们开始""下面问几个技术题")。若有多位面试官,全部标 "interviewer",不细分。
- candidate(候选人):回答问题、自我介绍、举例说明、向面试官反问(如"请问这个岗位的技术栈是?")。群面多位候选人时统一标 "candidate",不细分。
- 利用上下文连贯性判断:问句后紧跟的长陈述通常是候选人作答;一句话被切成相邻多段时角色应保持一致,直到出现明显的问答轮转。
- 长面试会分批送来,可能附带上一批末尾几句的已定角色作上文,用它保持本批开头的角色连贯(同一个人不要跨批换角色)。

铁律:
- 只判断说话人,绝不改写、翻译、增删任何文字。
- 必须为本批输入中的每一个 idx 恰好给出一条标注,不漏、不重、不新增不存在的 idx。
- 拿不准的句子也必须二选一(结合上下文给最合理的判断),不得留空、不得返回第三种值。`;
  }

  private buildUserPrompt(
    batch: TranscriptSegment[],
    prevContext: LabeledSegment[],
  ): string {
    // 只传 {idx,text},不回传时间戳与全文,省 token;AI 按 idx 回引。idx 为本批内 0-based 局部下标。
    const lines = batch.map((s, idx) => `${idx}: ${s.text}`).join('\n');
    const contextBlock =
      prevContext.length > 0
        ? `【上一批末尾已定角色(仅作连贯参考,不要为它们重新标注)】\n${prevContext
            .map((s) => `${s.speaker === 'interviewer' ? '面试官' : '候选人'}: ${s.text}`)
            .join('\n')}\n\n`
        : '';
    return `${contextBlock}下面是面试转写本批的逐句内容(格式"idx: 文本"),共 ${batch.length} 句。请为每一句标注说话人角色,通过 label_speakers 工具返回(idx 用下面给出的本批下标)。

${lines}`;
  }

  private buildSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          description: '本批每段的角色标注,与输入 idx 一一对应',
          items: {
            type: 'object',
            properties: {
              idx: { type: 'integer', description: '对应本批输入句子的下标' },
              speaker: {
                type: 'string',
                enum: ['interviewer', 'candidate'],
                description: '说话人角色:面试官或候选人',
              },
            },
            required: ['idx', 'speaker'],
          },
        },
      },
      required: ['segments'],
    };
  }

  /**
   * 将 AI 对单批的 {idx,speaker} 标注收敛为「该批顺序的 speaker 数组」。
   * 严格校验一一对应,任何偏差(缺段/多段/越界/重复)即判 AI 输出不可信 → 抛错(防编造),
   * 由 label() 对该批做优雅降级。
   */
  private resolveBatchLabels(
    batch: TranscriptSegment[],
    labels: SpeakerLabel[],
  ): ('interviewer' | 'candidate')[] {
    if (labels.length !== batch.length) {
      throw new InternalServerErrorException(
        `角色打标结果数量不匹配(期望 ${batch.length} 段,实得 ${labels.length} 段)`,
      );
    }

    const byIdx = new Map<number, 'interviewer' | 'candidate'>();
    for (const label of labels) {
      if (label.idx < 0 || label.idx >= batch.length) {
        throw new InternalServerErrorException(
          `角色打标返回越界下标 idx=${label.idx}(本批有效范围 0..${batch.length - 1})`,
        );
      }
      if (byIdx.has(label.idx)) {
        throw new InternalServerErrorException(`角色打标返回重复下标 idx=${label.idx}`);
      }
      byIdx.set(label.idx, label.speaker);
    }

    return batch.map((_seg, idx) => {
      const speaker = byIdx.get(idx);
      if (speaker === undefined) {
        // 数量相等但某 idx 缺失(意味着另一个 idx 重复/越界——已被上面拦截,此处为双保险)。
        throw new InternalServerErrorException(`角色打标缺少下标 idx=${idx} 的标注`);
      }
      return speaker;
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { BochaClient, BochaSearchOutcome, BochaWebPage } from './bocha.client';
import { CompanyResearch } from './entities/company-research.entity';
import { normalizeCompanyName } from './normalize';

/** 缓存命中条件之一：距今 ≤7 天（红线：模糊匹配永远只产生候选，绝不用于命中缓存）。 */
const CACHE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/** 强召回域名白名单（调优文档 docs/part5-bocha-tuning-obscure-2026-06-26.md 实测配方）。 */
const STRONG_RECALL_DOMAINS = 'tianyancha.com,qcc.com';

/**
 * 上下文匹配（消歧层②）高置信阈值：置信度 ≥0.85 且与第二名分差 ≥0.15。
 * 0.85 取自设计文档建议下限；0.15 分差防止 0.86 对 0.84 这类近似平局被误判为"明显更优"。
 * 不满足则降级到层③人工消歧，不强行采信。
 */
const CONTEXT_MATCH_CONFIDENCE = 0.85;
const CONTEXT_MATCH_MARGIN = 0.15;

export interface CompanyResearchCandidate {
  id: string;
  name: string;
  summary: string;
  source_url: string;
  source_domain: string;
}

export interface CompanySearchContext {
  jdText?: string;
}

export interface CompanyResearchOutcome {
  candidates: CompanyResearchCandidate[];
  reason?: 'no_key' | 'timeout' | 'error';
}

interface ExtractedItem {
  name: string;
  summary: string;
  source_url: string;
  domain: string;
}

@Injectable()
export class CompanyResearchService {
  private readonly logger = new Logger(CompanyResearchService.name);

  constructor(
    @InjectRepository(CompanyResearch)
    private readonly repo: Repository<CompanyResearch>,
    private readonly bocha: BochaClient,
    private readonly ai: AiService,
  ) {}

  /**
   * 按 id 查库取真实候选内容（防伪造用，M3 安全硬项）。
   * 调用方（mock.service.ts）必须只信任本方法返回的字段拼防编造 prompt，
   * 绝不能信任前端请求体里夹带的任何原始 name/summary/source_url 文本。
   */
  async findById(id: string): Promise<CompanyResearch | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * 搜索公司候选：查库未命中时调用，返回候选数组供前端消歧确认。
   * 消歧三层（顺序执行，命中即止）：
   *  ① 精确命中缓存（canonical_name 相等且 retrieved_at ≤7 天）→ 单候选，仍需前端确认。
   *  ② 上下文匹配（多候选 + 有上下文）→ GLM 打分排序，高置信取首位，仍需前端确认。
   *  ③ 人工消歧 → 候选全量返回（前端自行决定展示 top3-5，不是本层裁剪）。
   */
  async search(name: string, context?: CompanySearchContext): Promise<CompanyResearchOutcome> {
    const canonical = normalizeCompanyName(name);
    if (!canonical) return { candidates: [] };

    // 层①之一:精确命中缓存(红线:只认归一化名精确相等 且 retrieved_at ≤7天,不做任何模糊命中)
    const cached = await this.repo.findOne({ where: { canonical_name: canonical } });
    if (cached && this.isFresh(cached.retrieved_at)) {
      return { candidates: [this.toDto(cached)] };
    }

    // 两路查询合并:通用查询 + include=tianyancha.com,qcc.com 强召回查询
    const [general, strong] = await Promise.all([
      this.bocha.search(name),
      this.bocha.search(name, { include: STRONG_RECALL_DOMAINS }),
    ]);

    if (!general.available && !strong.available) {
      return { candidates: [], reason: this.pickReason(general, strong) };
    }

    const rawItems = [
      ...(general.available ? general.items : []),
      ...(strong.available ? strong.items : []),
    ];

    const extracted = this.extractAndDedupBySourceUrl(rawItems);
    if (extracted.length === 0) return { candidates: [] };

    // 候选全量落库:upsert by canonical_name,取得真实数据库 id(前端确认阶段回传 id 靠此)。
    const persisted = await this.upsertMerged(extracted);

    // 层②:多候选 + 有上下文 → GLM 打分排序,高置信取首位(仍需前端确认,不跳过)。
    if (persisted.length > 1 && context?.jdText?.trim()) {
      const ordered = await this.rankByContext(persisted, context.jdText.trim());
      if (ordered) return { candidates: ordered.map((c) => this.toDto(c)) };
    }

    // 层③(或层②降级):候选全量返回,不截断——"top3-5" 是前端展示层的呈现数量。
    return { candidates: persisted.map((c) => this.toDto(c)) };
  }

  private isFresh(retrievedAt: Date): boolean {
    return Date.now() - new Date(retrievedAt).getTime() <= CACHE_FRESH_MS;
  }

  private pickReason(
    general: BochaSearchOutcome,
    strong: BochaSearchOutcome,
  ): 'no_key' | 'timeout' | 'error' {
    const reasons = [general, strong]
      .filter((o): o is Extract<BochaSearchOutcome, { available: false }> => !o.available)
      .map((o) => o.reason);
    if (reasons.includes('error')) return 'error';
    if (reasons.includes('timeout')) return 'timeout';
    return 'no_key';
  }

  /** 按 source_url 去重合并两路查询结果，提取为候选字段（不做任何截断，全量保留）。 */
  private extractAndDedupBySourceUrl(items: BochaWebPage[]): ExtractedItem[] {
    const seen = new Set<string>();
    const result: ExtractedItem[] = [];
    for (const item of items) {
      const name = item.name?.trim() ?? '';
      const source_url = item.url?.trim() ?? '';
      if (!name || !source_url) continue;
      if (seen.has(source_url)) continue;
      seen.add(source_url);
      const summary = (item.summary ?? item.snippet ?? '').trim().slice(0, 120);
      result.push({ name, summary, source_url, domain: this.extractDomain(source_url) });
    }
    return result;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * upsert by canonical_name(每个候选各自的名称,不是输入查询名)取得真实数据库行。
   *
   * 先按候选自身归一化名去重(两路查询都命中同一家公司时,通用来源与强召回来源会产生
   * 不同 source_url 但相同 canonical_name 的条目——source_url 去重管不到这种情况)，
   * 再逐条【顺序】upsert，而非 Promise.all 并发：canonical_name 唯一索引下，同批内对
   * 同一 canonical_name 并发执行 findOne→save 的 check-then-write 会互相竞态，
   * 第二个 save 撞唯一约束直接抛 500(已用真实 e2e 复现)。这不是"再按候选名做相似度裁剪"，
   * 是同一家公司的多条来源合并为一行，属于去重范畴，不影响候选去重后的真实数量。
   */
  private async upsertMerged(items: ExtractedItem[]): Promise<CompanyResearch[]> {
    const byCanonical = new Map<string, ExtractedItem>();
    for (const item of items) {
      const canonical = normalizeCompanyName(item.name);
      if (!byCanonical.has(canonical)) byCanonical.set(canonical, item);
    }

    const rows: CompanyResearch[] = [];
    for (const item of byCanonical.values()) {
      rows.push(await this.upsertOne(item));
    }
    return rows;
  }

  private async upsertOne(item: ExtractedItem): Promise<CompanyResearch> {
    const canonical = normalizeCompanyName(item.name);
    const existing = await this.repo.findOne({ where: { canonical_name: canonical } });
    const entity = this.repo.create({
      ...(existing ?? {}),
      canonical_name: canonical,
      display_name: item.name,
      summary: item.summary,
      source_url: item.source_url,
      source_domain: item.domain,
      retrieved_at: new Date(),
      raw: null,
    });
    return this.repo.save(entity);
  }

  /**
   * GLM 上下文匹配:候选列表 + JD 文本交给 AiService 打分排序。
   * 高置信(≥0.85 且分差≥0.15)→ 返回按置信度降序排列的候选数组(首位=AI 最看好);
   * 否则返回 null,调用方保持原顺序进入层③人工消歧。
   */
  private async rankByContext(
    candidates: CompanyResearch[],
    jdText: string,
  ): Promise<CompanyResearch[] | null> {
    const list = candidates
      .map((c, i) => `${i}. ${c.display_name} —— ${c.summary}（来源：${c.source_domain}）`)
      .join('\n');

    const schema = {
      type: 'object' as const,
      properties: {
        rankings: {
          type: 'array',
          description: '每个候选的置信度打分',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number', description: '候选在列表中的序号，从 0 开始' },
              confidence: { type: 'number', description: '该候选是用户所指公司的置信度，0-1' },
            },
            required: ['index', 'confidence'],
          },
        },
      },
      required: ['rankings'],
    };

    let result: { rankings: { index: number; confidence: number }[] };
    try {
      result = await this.ai.completeStructured<{ rankings: { index: number; confidence: number }[] }>({
        system: '你是求职场景下的公司名消歧助手，根据职位描述上下文判断候选公司列表中哪一个最可能是用户所指的公司。只依据提供的候选简介与职位描述，不得编造候选列表之外的信息。',
        prompt: `候选公司列表：\n${list}\n\n职位描述：\n${jdText}\n\n请使用 rank_candidates 工具，为每个候选按序号给出置信度打分。`,
        toolName: 'rank_candidates',
        toolDescription: '为候选公司列表按置信度打分排序',
        schema,
      });
    } catch (err) {
      // GLM 打分失败不影响主流程,降级到层③人工消歧(候选原样返回,不阻断搜索结果)。
      this.logger.warn(`公司消歧 GLM 打分失败,降级人工消歧: ${String(err)}`);
      return null;
    }

    const rankings = (result.rankings ?? [])
      .filter((r) => candidates[r.index])
      .sort((a, b) => b.confidence - a.confidence);

    if (rankings.length === 0) return null;

    const top1 = rankings[0];
    const top2 = rankings[1];
    const marginOk = !top2 || top1.confidence - top2.confidence >= CONTEXT_MATCH_MARGIN;

    if (top1.confidence >= CONTEXT_MATCH_CONFIDENCE && marginOk) {
      const orderedIndexes = rankings.map((r) => r.index);
      const rest = candidates.map((_, i) => i).filter((i) => !orderedIndexes.includes(i));
      return [...orderedIndexes, ...rest].map((i) => candidates[i]);
    }

    return null;
  }

  private toDto(row: CompanyResearch): CompanyResearchCandidate {
    return {
      id: row.id,
      name: row.display_name,
      summary: row.summary,
      source_url: row.source_url,
      source_domain: row.source_domain,
    };
  }
}

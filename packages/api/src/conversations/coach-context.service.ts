import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvidenceService } from '../intelligence/evidence.service';
import { AiService } from '../ai/ai.service';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import type { RewriteSuggestion } from '../common/types';

// 选择器产物种类:可按需加载全文的旧产物类型。
type LoadKind = 'diagnosis' | 'cover_letter';
interface SelectorResult {
  need: { kind: LoadKind; id: string }[];
}

@Injectable()
export class CoachContextService {
  private readonly logger = new Logger(CoachContextService.name);
  // 按需取数全文上限:一次最多并入 3 份,防上下文膨胀。
  private static readonly MAX_LOAD = 3;

  constructor(
    private readonly evidence: EvidenceService,
    private readonly ai: AiService,
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(CoverLetter)
    private readonly coverLetterRepo: Repository<CoverLetter>,
  ) {}

  // 简历全文截断上限:防止超长简历撑爆上下文窗口。
  private static readonly RESUME_MAX_CHARS = 6000;

  // 截断简历原文到上限,超出时追加可读提示。独立函数便于单测。
  static truncateResumeText(raw: string): string {
    if (raw.length <= CoachContextService.RESUME_MAX_CHARS) return raw;
    return (
      raw.slice(0, CoachContextService.RESUME_MAX_CHARS) +
      '\n……(简历过长,以上为前 6000 字,完整内容可在简历页查看)'
    );
  }

  // 开场上下文:画像(证据层)+ 主简历全文 + 最新诊断要点 + 产物目录(type/标题/日期/id)。
  // 产物目录给模型「站内有哪些可深挖的旧产物」的词汇,用户引用时由选择器按需加载全文。
  async buildContext(userId: string): Promise<string> {
    const [intelligence, primaryResume, latestDiagnosis, catalog] =
      await Promise.all([
        this.evidence.gather(userId),
        this.gatherPrimaryResumeText(userId),
        this.gatherLatestDiagnosis(userId),
        this.gatherCatalog(userId),
      ]);

    const sections: string[] = [this.evidence.formatForAI(intelligence)];

    if (primaryResume) {
      sections.push(
        `## 主简历全文（is_primary）\n标题：${primaryResume.title}\n${CoachContextService.truncateResumeText(primaryResume.raw_text)}`,
      );
    }

    if (latestDiagnosis) {
      sections.push(latestDiagnosis);
    }

    if (catalog) {
      sections.push(catalog);
    }

    return sections.join('\n\n');
  }

  // 按需取数:用一次轻档(flash)选择器判定本轮用户消息引用了哪几份旧产物需要全文,
  // 取数(上限 3 份)后并入本轮上下文。选择器失败 → 静默返回空串(不报错、不重试),
  // 上层照用开场上下文。
  async loadReferencedProducts(
    userId: string,
    userMessage: string,
  ): Promise<string> {
    // 一次查询同时取 ids + 选择器描述文案,两处复用无重复 DB 往返。
    const catalog = await this.gatherSelectorCatalog(userId);
    const { ids: catalogIds } = catalog;
    if (catalogIds.diagnosis.length === 0 && catalogIds.cover_letter.length === 0) {
      return '';
    }

    let selection: SelectorResult;
    try {
      selection = await this.runSelector(userMessage, catalog.text);
    } catch (err) {
      // 静默降级:选择器抛错不影响主对话,记一行日志即可。
      this.logger.warn(
        `按需取数选择器失败,降级用开场上下文 —— ${err instanceof Error ? err.message : String(err)}`,
      );
      return '';
    }

    const need = (selection.need ?? [])
      // 只信任目录里真实存在且属于该用户的 id,挡住选择器幻觉/越权。
      .filter((n) =>
        n.kind === 'diagnosis'
          ? catalogIds.diagnosis.includes(n.id)
          : n.kind === 'cover_letter'
            ? catalogIds.cover_letter.includes(n.id)
            : false,
      )
      .slice(0, CoachContextService.MAX_LOAD);

    if (need.length === 0) return '';

    const loaded = await Promise.all(
      need.map((n) =>
        n.kind === 'diagnosis'
          ? this.loadDiagnosisFull(userId, n.id)
          : this.loadCoverLetterFull(userId, n.id),
      ),
    );
    const blocks = loaded.filter((b): b is string => b !== null);
    if (blocks.length === 0) return '';

    return `## 用户本轮引用的旧产物全文（按需加载）\n${blocks.join('\n\n')}`;
  }

  // ── 选择器 ───────────────────────────────────────────────────────────────

  private async runSelector(
    userMessage: string,
    catalogText: string,
  ): Promise<SelectorResult> {
    const schema = {
      type: 'object',
      required: ['need'],
      properties: {
        need: {
          type: 'array',
          items: {
            type: 'object',
            required: ['kind', 'id'],
            properties: {
              kind: { type: 'string', enum: ['diagnosis', 'cover_letter'] },
              id: { type: 'string' },
            },
          },
        },
      },
    };

    return this.ai.completeStructured<SelectorResult>({
      system:
        '你是产物检索助手。根据用户消息,判断它是否引用/需要某些旧产物的全文。只从给定目录里选,选不到就返回空数组。最多选 3 份。',
      prompt: `用户消息：${userMessage}\n\n可选产物目录：\n${catalogText}\n\n输出需要加载全文的产物(目录之外不要选)。`,
      toolName: 'select_products',
      toolDescription: '返回需要加载全文的旧产物列表',
      schema,
      tier: 'flash',
    });
  }

  // ── 取数 ─────────────────────────────────────────────────────────────────

  private async gatherPrimaryResumeText(
    userId: string,
  ): Promise<{ title: string; raw_text: string } | null> {
    const resume = await this.resumeRepo.findOne({
      where: { user_id: userId, is_primary: true },
      select: { title: true, raw_text: true },
    });
    if (!resume?.raw_text) return null;
    return { title: resume.title, raw_text: resume.raw_text };
  }

  private async gatherLatestDiagnosis(userId: string): Promise<string | null> {
    const d = await this.diagnosisRepo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    if (!d) return null;
    const lines = [
      '## 最新诊断要点',
      `公司：${d.jd_company || '未知'}　岗位：${d.jd_role || '未知'}　匹配分：${d.score ?? '未评分'}/100`,
      `命中关键词：${(d.keywords_hit || []).join('、') || '无'}`,
      `缺失关键词：${(d.keywords_miss || []).join('、') || '无'}`,
    ];
    const suggestions = (d.suggestions || [])
      .map((s: RewriteSuggestion) => s.reason)
      .filter(Boolean);
    if (suggestions.length > 0) {
      lines.push(`改写建议：${suggestions.join('；')}`);
    }
    return lines.join('\n');
  }

  // 产物目录:让模型知道站内有哪些可深挖的旧产物(诊断/求职信),每条 type/标题/日期/id。
  private async gatherCatalog(userId: string): Promise<string | null> {
    const [diagnoses, coverLetters] = await Promise.all([
      this.diagnosisRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 10,
      }),
      this.coverLetterRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 10,
      }),
    ]);

    if (diagnoses.length === 0 && coverLetters.length === 0) return null;

    const lines = ['## 产物目录（可按需引用其全文，用 id 指明）'];
    for (const d of diagnoses) {
      lines.push(
        `- [诊断] ${d.jd_company || '未知公司'} / ${d.jd_role || '未知岗位'} ${d.score ?? '未评分'}分　${d.created_at.toISOString().slice(0, 10)}　id=${d.id}`,
      );
    }
    for (const c of coverLetters) {
      lines.push(
        `- [求职信] ${c.company || '未知公司'} / ${c.role || '未知岗位'}　${c.created_at.toISOString().slice(0, 10)}　id=${c.id}`,
      );
    }
    return lines.join('\n');
  }

  // 一次查询同时取 id + 标题字段,供 ids 验权过滤和选择器文案两处复用,减少每条消息约 6 次目录查询。
  private async gatherSelectorCatalog(userId: string): Promise<{
    ids: { diagnosis: string[]; cover_letter: string[] };
    text: string;
  }> {
    const [diagnoses, coverLetters] = await Promise.all([
      this.diagnosisRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 10,
        select: { id: true, jd_company: true, jd_role: true, score: true },
      }),
      this.coverLetterRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 10,
        select: { id: true, company: true, role: true },
      }),
    ]);
    const ids = {
      diagnosis: diagnoses.map((d) => d.id),
      cover_letter: coverLetters.map((c) => c.id),
    };
    const lines: string[] = [];
    for (const d of diagnoses) {
      lines.push(
        `kind=diagnosis id=${d.id} ${d.jd_company || ''}/${d.jd_role || ''} ${d.score ?? ''}分`.trim(),
      );
    }
    for (const c of coverLetters) {
      lines.push(
        `kind=cover_letter id=${c.id} ${c.company || ''}/${c.role || ''}`.trim(),
      );
    }
    return { ids, text: lines.join('\n') };
  }

  private async loadDiagnosisFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const d = await this.diagnosisRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!d) return null;
    const suggestions = (d.suggestions || [])
      .map((s: RewriteSuggestion) => `- ${s.reason}`)
      .join('\n');
    return [
      `### 诊断全文 id=${id}`,
      `公司：${d.jd_company || '未知'}　岗位：${d.jd_role || '未知'}　分数：${d.score ?? '未评分'}/100`,
      `命中：${(d.keywords_hit || []).join('、') || '无'}`,
      `缺失：${(d.keywords_miss || []).join('、') || '无'}`,
      suggestions ? `改写建议：\n${suggestions}` : '改写建议：无',
    ].join('\n');
  }

  private async loadCoverLetterFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const c = await this.coverLetterRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!c) return null;
    return [
      `### 求职信全文 id=${id}`,
      `公司：${c.company || '未知'}　岗位：${c.role || '未知'}　语气：${c.tone}`,
      c.content,
    ].join('\n');
  }
}

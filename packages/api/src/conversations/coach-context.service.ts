import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvidenceService } from '../intelligence/evidence.service';
import { AiService } from '../ai/ai.service';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import { Interview } from '../interviews/entities/interview.entity';
import type {
  ScoreItem,
  QuestionItem,
} from '../interviews/entities/interview.entity';
import { MockSession } from '../mock/entities/mock-session.entity';
import { Application } from '../applications/entities/application.entity';
import { ApplicationEvent } from '../applications/entities/application-event.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { CareerAnalysisRecord } from '../career/entities/career-analysis.entity';
import type { CareerPath, SkillAuditItem } from '../career/career.service';
import type { RewriteSuggestion } from '../common/types';

// 选择器产物种类:可按需加载全文的已落库产物类型。
type LoadKind =
  | 'diagnosis'
  | 'cover_letter'
  | 'interview'
  | 'mock_session'
  | 'application'
  | 'opportunity'
  | 'career';
const LOAD_KINDS: readonly LoadKind[] = [
  'diagnosis',
  'cover_letter',
  'interview',
  'mock_session',
  'application',
  'opportunity',
  'career',
];
interface SelectorResult {
  need: { kind: LoadKind; id: string }[];
}
// 各类按需加载全文的 id 白名单(目录里真实存在且属当前用户的 id)。
type CatalogIds = Record<LoadKind, string[]>;

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
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(MockSession)
    private readonly mockSessionRepo: Repository<MockSession>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationEvent)
    private readonly applicationEventRepo: Repository<ApplicationEvent>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation)
    private readonly opportunityEvalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(CareerAnalysisRecord)
    private readonly careerRepo: Repository<CareerAnalysisRecord>,
  ) {}

  // 简历全文截断上限:防止超长简历撑爆上下文窗口。
  private static readonly RESUME_MAX_CHARS = 6000;
  // 单份模块全文截断上限(面试转录/模拟答案/JD 等长文本字段):对齐简历做法,2C2G token 友好。
  private static readonly FULL_MAX_CHARS = 6000;
  // 新增模块的目录条目每类上限:够选择器据此判断该加载哪几份即可,不必铺满,控目录长度。
  private static readonly CATALOG_TAKE = 5;

  // 截断简历原文到上限,超出时追加可读提示。独立函数便于单测。
  static truncateResumeText(raw: string): string {
    if (raw.length <= CoachContextService.RESUME_MAX_CHARS) return raw;
    return (
      raw.slice(0, CoachContextService.RESUME_MAX_CHARS) +
      '\n……(简历过长,以上为前 6000 字,完整内容可在简历页查看)'
    );
  }

  // 截断任意长文本字段到全文上限,超出时追加可读提示。独立 static 便于单测。
  static truncateText(raw: string): string {
    if (raw.length <= CoachContextService.FULL_MAX_CHARS) return raw;
    return (
      raw.slice(0, CoachContextService.FULL_MAX_CHARS) +
      '\n……(内容过长,以上为前 6000 字,完整内容可在对应模块页查看)'
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
    if (LOAD_KINDS.every((k) => catalogIds[k].length === 0)) {
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
      .filter(
        (n) =>
          LOAD_KINDS.includes(n.kind) && catalogIds[n.kind]?.includes(n.id),
      )
      .slice(0, CoachContextService.MAX_LOAD);

    if (need.length === 0) return '';

    const loaded = await Promise.all(
      need.map((n) => this.loadFull(userId, n.kind, n.id)),
    );
    const blocks = loaded.filter((b): b is string => b !== null);
    if (blocks.length === 0) return '';

    return `## 用户本轮引用的旧产物全文（按需加载）\n${blocks.join('\n\n')}`;
  }

  // 按种类分发到对应 loadXxxFull;非法种类返回 null(上层已做白名单过滤,此处兜底)。
  private loadFull(
    userId: string,
    kind: LoadKind,
    id: string,
  ): Promise<string | null> {
    switch (kind) {
      case 'diagnosis':
        return this.loadDiagnosisFull(userId, id);
      case 'cover_letter':
        return this.loadCoverLetterFull(userId, id);
      case 'interview':
        return this.loadInterviewFull(userId, id);
      case 'mock_session':
        return this.loadMockSessionFull(userId, id);
      case 'application':
        return this.loadApplicationFull(userId, id);
      case 'opportunity':
        return this.loadOpportunityFull(userId, id);
      case 'career':
        return this.loadCareerFull(userId, id);
      default:
        return Promise.resolve(null);
    }
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
              kind: { type: 'string', enum: LOAD_KINDS },
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

  // 产物目录:让模型知道站内有哪些可深挖的已落库产物(诊断/求职信/面试复盘/模拟面试/投递/机会评估/职业地图),
  // 每条 type/标题/日期/id。诊断与求职信沿用 take 10(B2 原口径不动),新增 5 类各取 CATALOG_TAKE 份控目录长度。
  private async gatherCatalog(userId: string): Promise<string | null> {
    const take = CoachContextService.CATALOG_TAKE;
    const [
      diagnoses,
      coverLetters,
      interviews,
      mockSessions,
      applications,
      opportunities,
      careers,
    ] = await Promise.all([
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
      this.interviewRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
      }),
      this.mockSessionRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
      }),
      this.applicationRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
      }),
      this.opportunityRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
      }),
      this.careerRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
      }),
    ]);

    if (
      diagnoses.length === 0 &&
      coverLetters.length === 0 &&
      interviews.length === 0 &&
      mockSessions.length === 0 &&
      applications.length === 0 &&
      opportunities.length === 0 &&
      careers.length === 0
    ) {
      return null;
    }

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
    for (const i of interviews) {
      lines.push(
        `- [面试复盘] ${i.company || '未知公司'} / ${i.role || '未知岗位'} ${i.round}　评级${i.overall_grade || '无'}　${i.created_at.toISOString().slice(0, 10)}　id=${i.id}`,
      );
    }
    for (const m of mockSessions) {
      lines.push(
        `- [模拟面试] ${m.company || '未知公司'} / ${m.role || '未知岗位'}　评级${m.evaluation?.overall_grade || '无'}　${m.created_at.toISOString().slice(0, 10)}　id=${m.id}`,
      );
    }
    for (const a of applications) {
      lines.push(
        `- [投递] ${a.company} / ${a.role}　阶段${a.stage}　${a.created_at.toISOString().slice(0, 10)}　id=${a.id}`,
      );
    }
    for (const o of opportunities) {
      lines.push(
        `- [机会评估] ${o.company || '未知公司'} / ${o.role || '未知岗位'}　状态${o.status}　${o.created_at.toISOString().slice(0, 10)}　id=${o.id}`,
      );
    }
    for (const r of careers) {
      const top = r.result_json?.paths?.[0]?.title || '职业地图';
      lines.push(
        `- [职业地图] ${top}（${r.result_json?.paths?.length ?? 0}条路径）　${r.created_at.toISOString().slice(0, 10)}　id=${r.id}`,
      );
    }
    return lines.join('\n');
  }

  // 一次查询同时取 id + 标题字段,供 ids 验权过滤和选择器文案两处复用,减少每条消息约 6 次目录查询。
  private async gatherSelectorCatalog(userId: string): Promise<{
    ids: CatalogIds;
    text: string;
  }> {
    const take = CoachContextService.CATALOG_TAKE;
    const [
      diagnoses,
      coverLetters,
      interviews,
      mockSessions,
      applications,
      opportunities,
      careers,
    ] = await Promise.all([
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
      this.interviewRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
        select: {
          id: true,
          company: true,
          role: true,
          round: true,
          overall_grade: true,
        },
      }),
      this.mockSessionRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
        select: { id: true, company: true, role: true },
      }),
      this.applicationRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
        select: { id: true, company: true, role: true, stage: true },
      }),
      this.opportunityRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
        select: { id: true, company: true, role: true, status: true },
      }),
      this.careerRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take,
        // result_json 是长 JSON,目录文案不需要其内容,只取 id/created_at 控查询体积。
        select: { id: true, created_at: true },
      }),
    ]);
    const ids: CatalogIds = {
      diagnosis: diagnoses.map((d) => d.id),
      cover_letter: coverLetters.map((c) => c.id),
      interview: interviews.map((i) => i.id),
      mock_session: mockSessions.map((m) => m.id),
      application: applications.map((a) => a.id),
      opportunity: opportunities.map((o) => o.id),
      career: careers.map((r) => r.id),
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
    for (const i of interviews) {
      lines.push(
        `kind=interview id=${i.id} 面试复盘 ${i.company || ''}/${i.role || ''} ${i.round} 评级${i.overall_grade || ''}`.trim(),
      );
    }
    for (const m of mockSessions) {
      lines.push(
        `kind=mock_session id=${m.id} 模拟面试 ${m.company || ''}/${m.role || ''}`.trim(),
      );
    }
    for (const a of applications) {
      lines.push(
        `kind=application id=${a.id} 投递 ${a.company}/${a.role} 阶段${a.stage}`.trim(),
      );
    }
    for (const o of opportunities) {
      lines.push(
        `kind=opportunity id=${o.id} 机会评估 ${o.company || ''}/${o.role || ''} 状态${o.status}`.trim(),
      );
    }
    for (const r of careers) {
      lines.push(
        `kind=career id=${r.id} 职业地图 ${r.created_at.toISOString().slice(0, 10)}`.trim(),
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

  // 真实面试复盘全文:评级/逐题教练点评/知识缺口/转录/下轮预测。
  private async loadInterviewFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const i = await this.interviewRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!i) return null;
    const lines = [
      `### 面试复盘全文 id=${id}`,
      `公司：${i.company || '未知'}　岗位：${i.role || '未知'}　轮次：${i.round}　评级：${i.overall_grade || '无'}`,
    ];
    if (i.overall_note) lines.push(`总评：${i.overall_note}`);
    const scores = (i.scores || [])
      .map((s: ScoreItem) => `${s.name} ${s.score}`)
      .join('、');
    if (scores) lines.push(`维度评分：${scores}`);
    const questions = (i.questions || [])
      .map(
        (q: QuestionItem) =>
          `- [${q.tone}] ${q.question}\n  点评：${q.coach_assessment}` +
          (q.knowledge_gaps?.length
            ? `\n  知识缺口：${q.knowledge_gaps.join('、')}`
            : ''),
      )
      .join('\n');
    if (questions) lines.push(`逐题复盘：\n${questions}`);
    if (i.prediction?.summary) {
      lines.push(`下轮预测：${i.prediction.summary}`);
    }
    if (i.transcript) {
      lines.push(`转录:\n${CoachContextService.truncateText(i.transcript)}`);
    }
    // 整份 block 总帽:questions 数组逐题可能累积超 FULL_MAX_CHARS。
    return CoachContextService.truncateText(lines.join('\n'));
  }

  // 模拟面试全文:总评(分数/评级/优劣势/小结)+ 逐题问答与反馈。
  private async loadMockSessionFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const m = await this.mockSessionRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!m) return null;
    const lines = [
      `### 模拟面试全文 id=${id}`,
      `公司：${m.company || '未知'}　岗位：${m.role || '未知'}　状态：${m.status}`,
    ];
    const e = m.evaluation;
    if (e) {
      lines.push(
        `总评：${e.overall_score}分 ${e.overall_grade}　优势：${(e.strengths || []).join('、') || '无'}　弱项：${(e.weaknesses || []).join('、') || '无'}`,
      );
      if (e.summary) lines.push(`小结：${e.summary}`);
    }
    const questions = m.questions || [];
    const answers = m.answers || [];
    const qa = questions
      .map((q) => {
        const a = answers.find((x) => x.n === q.n);
        return (
          `- Q${q.n}（${q.topic}）：${q.question}` +
          (a
            ? `\n  答（${a.score}分）：${a.answer}\n  反馈：${a.feedback}`
            : '\n  （未作答）')
        );
      })
      .join('\n');
    if (qa) lines.push(`逐题问答:\n${CoachContextService.truncateText(qa)}`);
    // 整份 block 总帽:questions 数组逐题累积可能超 FULL_MAX_CHARS。
    return CoachContextService.truncateText(lines.join('\n'));
  }

  // 投递管道全文:阶段/公司岗位/备注 + 阶段流转事件时间线。
  private async loadApplicationFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const a = await this.applicationRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!a) return null;
    // 最近 20 条事件足够上下文;防止投递事件无限膨胀。
    const events = await this.applicationEventRepo.find({
      where: { application_id: id },
      order: { created_at: 'ASC' },
      take: 20,
    });
    const lines = [
      `### 投递全文 id=${id}`,
      `公司：${a.company}　岗位：${a.role}　当前阶段：${a.stage}` +
        (a.location ? `　地点：${a.location}` : '') +
        (a.deadline ? `　截止：${a.deadline}` : ''),
    ];
    if (a.salary_range) lines.push(`薪资范围：${a.salary_range}`);
    // notes 字段截断,防止超长备注撑爆整份 block。
    if (a.notes)
      lines.push(`备注：${CoachContextService.truncateText(a.notes)}`);
    const timeline = events
      .map(
        (ev) =>
          `- ${ev.created_at.toISOString().slice(0, 10)} ${ev.from_stage ? `${ev.from_stage}→` : ''}${ev.to_stage}` +
          (ev.note ? `（${ev.note}）` : ''),
      )
      .join('\n');
    if (timeline) lines.push(`阶段时间线:\n${timeline}`);
    // 整份 block 最终总帽:防止 notes+timeline 组合超 FULL_MAX_CHARS。
    const raw = lines.join('\n');
    return CoachContextService.truncateText(raw);
  }

  // 机会评估全文:职位信息 + 最新一次评估的各维度分/建议/风险/优势/差距/下一步。
  private async loadOpportunityFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const o = await this.opportunityRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!o) return null;
    const ev = await this.opportunityEvalRepo.findOne({
      where: { opportunity_id: id },
      order: { created_at: 'DESC' },
    });
    const lines = [
      `### 机会评估全文 id=${id}`,
      `公司：${o.company || '未知'}　岗位：${o.role || '未知'}　状态：${o.status}` +
        (o.location ? `　地点：${o.location}` : ''),
    ];
    if (ev) {
      lines.push(
        `匹配度：${Math.round(ev.match_score * 100)}%　投递价值：${Math.round(ev.value_score * 100)}%　可信度：${Math.round(ev.credibility_score * 100)}%　综合：${Math.round(ev.overall_score * 100)}%`,
        `建议：${ev.recommendation}（置信度 ${ev.confidence}）`,
      );
      if (ev.strengths?.length) lines.push(`优势：${ev.strengths.join('、')}`);
      if (ev.gaps?.length) lines.push(`差距：${ev.gaps.join('、')}`);
      if (ev.risk_flags?.length) lines.push(`风险：${ev.risk_flags.join('、')}`);
      if (ev.next_actions?.length)
        lines.push(`下一步：${ev.next_actions.join('、')}`);
    } else {
      lines.push('（评估未完成）');
    }
    // 整份 block 总帽:strengths/gaps/risk_flags/next_actions 数组组合可能超 FULL_MAX_CHARS。
    return CoachContextService.truncateText(lines.join('\n'));
  }

  // 职业地图历史全文:各发展路径(标题/匹配度/描述/技能)+ 能力盘点(当前/所需/证据)。
  private async loadCareerFull(
    userId: string,
    id: string,
  ): Promise<string | null> {
    const r = await this.careerRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!r) return null;
    const result = r.result_json;
    const lines = [
      `### 职业地图全文 id=${id}　生成于 ${r.created_at.toISOString().slice(0, 10)}`,
    ];
    const paths = (result?.paths || [])
      .map(
        (p: CareerPath) =>
          `- ${p.title}（匹配度 ${p.fit_pct}%）：${p.description}` +
          (p.skills?.length ? `\n  关键技能：${p.skills.join('、')}` : ''),
      )
      .join('\n');
    if (paths) lines.push(`发展路径:\n${paths}`);
    const skills = (result?.skill_audit || [])
      .map(
        (s: SkillAuditItem) =>
          `- ${s.name}：当前 ${s.current}/所需 ${s.needed}${s.ok ? '（达标）' : '（缺口）'}` +
          (s.evidenceFound ? `　证据：${s.evidenceFound}` : '　证据：无'),
      )
      .join('\n');
    if (skills) {
      lines.push(`能力盘点:\n${CoachContextService.truncateText(skills)}`);
    }
    // 整份 block 总帽:paths 数组(多路径×技能列表)累积可能超 FULL_MAX_CHARS。
    return CoachContextService.truncateText(lines.join('\n'));
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';
import { CareerAnalysisRecord } from './entities/career-analysis.entity';
import { UserSkillSelfAssessment } from './entities/user-skill-self-assessment.entity';
import {
  buildCareerAnalysisSystem,
  buildCareerAnalysisPrompt,
} from '../ai/prompts/career-analysis';

export interface CareerPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  // 防编造:简历无学校/校友数据时不得生成具体校友数字,此处为 null(前端需省略展示)。
  alumni_count: number | null;
}

// 技能分来源:'ai' AI 评估;'self' 用户自评覆盖;'suppressed' 退化检测压分(高分无证据)。
export type SkillScoreSource = 'ai' | 'self' | 'suppressed';

// 技能类别:'general' 普通技能;'ai' AI 相关能力(前端单独成组渲染)。
export type SkillCategory = 'general' | 'ai';

// 证据相关性(FG-1 张冠李戴护栏判定结果):
//  'grounded'  证据可回指简历 + 与该技能有相关性信号(技能名/别名/邻近溯源)→ 可信;
//  'unrelated' 证据是简历真句但与该技能无任何相关性信号(典型张冠李戴:把别的技能/姓名学历段
//              安给本技能)→ 视为无效证据,evidenceFound 清空并纳入退化压分;
//  'none'      AI 本就没给证据(evidenceFound 空)。
//  前端据此对 'unrelated'(理论上已被清空压分)与低置信场景标注"证据相关性存疑"。
export type EvidenceRelevance = 'grounded' | 'unrelated' | 'none';

export interface SkillAuditItem {
  name: string;
  current: number;
  needed: number;
  ok: boolean;
  category: SkillCategory;
  // 该技能在简历中的证据原文片段;无证据则空字符串(防编造核对依据)。
  evidenceFound: string;
  // current 分的来源,前端 tooltip 据此说明"这分怎么来的"。
  scoreSource: SkillScoreSource;
  // AI 原始评分:被自评覆盖或退化压分时保留 AI 当初给的分(参考);否则与 current 同源,为 null。
  aiScore: number | null;
  // 缺口/达标判定专用的"保守分":展示用 current(尊重自评),但 gap 与 ok 用保守分(=min(自评,AI原分)),
  // 防自评虚高让缺口凭空消失。非自评来源时 gapScore 与 current 同值。前端据此渲染缺口危险色。
  gapScore: number;
  // FG-1 证据相关性判定:'grounded' 可信 / 'unrelated' 张冠李戴(已清空压分)/ 'none' 本无证据。
  // 前端据此对相关性存疑的证据给出标注;'unrelated' 在服务端已触发清空+压分,不可能再现高分。
  evidenceRelevance: EvidenceRelevance;
}

export interface CareerAnalysis {
  paths: CareerPath[];
  skill_audit: SkillAuditItem[];
}

// 历史列表项:只返回摘要,不返回完整 result_json(列表轻量化)。
export interface CareerHistoryItem {
  id: string;
  created_at: Date;
  // 摘要:首条路径标题 + 路径数 + 技能数,供列表一眼识别。
  top_path: string | null;
  path_count: number;
  skill_count: number;
}

export interface SelfAssessmentInput {
  skill_name: string;
  self_score: number;
}

// AI 原始产出形态:降级到 deepseek-flash 时字段可能缺省/残缺,故全部可选,由 service 端兜底。
interface RawCareerPath {
  title?: string;
  fit_pct?: number;
  description?: string;
  skills?: string[];
  alumni_count?: number | null;
}
interface RawSkillAuditItem {
  name?: string;
  current?: number;
  needed?: number;
  evidenceFound?: string;
  category?: string;
}
interface RawCareerAnalysis {
  paths?: RawCareerPath[];
  skill_audit?: RawSkillAuditItem[];
}

// 退化检测:current≥4 但 evidenceFound 为空 → 判定凭技能名泛化的编造,压到该档。
const DEGENERATE_SUSPICION_FLOOR = 4;
const DEGENERATE_CAPPED_SCORE = 2;
// 自评分合法区间(与量程 0-10 一致),越界拒收(防脏数据落库)。
const SELF_SCORE_MIN = 0;
const SELF_SCORE_MAX = 10;

// FG-1 张冠李戴护栏:相关性信号判定相关常量。
// 邻近溯源按"句子"窗口:证据所在句 + 紧邻的前后各一句构成窗口,窗口内含技能名/别名/技能词 token
// 即视为"证据所在那段话在谈这个技能"。用句子(而非固定字符数)切窗,符合"技能名与其项目描述
// 常在同一句、用逗号串接"的简历写法(如"熟悉 Java...负责订单与支付模块;"整句以分号收尾)。
// 句子边界只用强标点(。!?;\n 及其全角),逗号不切句——逗号连接的是同一描述的并列小句。
const SENTENCE_SPLIT_RE = /[。！？；!?;\n]+/;
// 邻近窗口的相邻句半径:证据所在句往前后各扩 1 句,容忍证据与技能名被一个强标点分隔的情况。
const RELEVANCE_SENTENCE_RADIUS = 1;
// 技能名拆出的"实质词" token 最短长度:短于此的词(如单字)不作为相关性信号,避免泛字巧合命中。
const RELEVANCE_TERM_MIN_LEN = 2;
// 技能别名表(归一化小写键):仅补"邻近窗口也兜不住"的少数中英混写技能。
// 不建大词典(违反 KISS/YAGNI):绝大多数技能靠"技能名直含 + 邻近溯源"即可判相关性,
// 此表只收录"技能名是中文、但简历惯用英文工具名"等邻近也对不上的高频对。
const SKILL_ALIASES: Record<string, string[]> = {
  // AI 辅助编码 / AI 辅助工作流:简历常写工具名 Copilot/Cursor,而非中文技能名。
  ai辅助编码: ['copilot', 'cursor', 'githubcopilot', 'ai辅助'],
  ai辅助工作流: ['copilot', 'cursor', 'ai辅助'],
  // Java 生态:简历常以框架名 Spring Boot 体现 Java 工程能力。
  java: ['springboot', 'spring'],
};

@Injectable()
export class CareerService {
  constructor(
    private readonly ai: AiService,
    private readonly resumes: ResumesService,
    @InjectRepository(CareerAnalysisRecord)
    private readonly records: Repository<CareerAnalysisRecord>,
    @InjectRepository(UserSkillSelfAssessment)
    private readonly selfAssessments: Repository<UserSkillSelfAssessment>,
  ) {}

  async analyze(userId: string): Promise<CareerAnalysis> {
    const resumes = await this.resumes.findAllByUser(userId);

    if (resumes.length === 0) {
      // 空态非错误:无简历是一个正常的"尚未开始"状态。前端据 message 含『简历』关键词识别 noResume。
      throw new BadRequestException('请先上传简历后再使用职业地图功能');
    }

    const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];
    const resumeText = primaryResume.raw_text?.trim() ?? '';
    if (resumeText.length < 30) {
      throw new BadRequestException(
        '简历内容不足，无法生成职业发展分析。请上传包含完整工作经历和技能的简历（至少 30 字）。',
      );
    }

    const system = buildCareerAnalysisSystem();
    const rawResumeText = primaryResume.raw_text ?? resumeText;
    const prompt = buildCareerAnalysisPrompt(rawResumeText);

    // 用户自评:有自评的技能用 self_score 覆盖 AI 的 current(AI 分作参考保留),纠偏虚高/虚低。
    const selfMap = await this.loadSelfAssessmentMap(userId);

    // 整轮退化重试(对齐 analyzer.service.ts:100-148 范式):AI 偶发"结构合法但语义为空"的退化产物
    // (无 paths / 无 skill_audit / skill_audit 全无名称),会让付费用户收到残缺职业地图。整轮校验,
    // 退化则重试,最多 3 次。区别于诊断:耗尽不抛 503,而是接受最后一轮——逐技能压分网(calibrateSkill
    // 的退化检测 + 假证据校验)仍会兜住编造,career 给个保守结果优于让用户的点数白扣。
    const MAX_ATTEMPTS = 3;
    let raw: RawCareerAnalysis = {};
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // schema 范式对照 industry_trend / parse_jd:顶层 required 只列两个容器(paths/skill_audit),
      // 内层 object 不设 required(降级到 flash 时缺字段不应整轮失败,改由 service 端兜底)。
      raw = await this.ai.completeStructured<RawCareerAnalysis>({
        system,
        prompt,
        toolName: 'career_analysis',
        toolDescription: '输出结构化职业路径分析和技能差距评估(含证据 evidenceFound)',
        tier: 'pro', // 能力盘点是可信度核心产出,走重档型号(对齐诊断)
        schema: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  fit_pct: { type: 'number' },
                  description: { type: 'string' },
                  skills: { type: 'array', items: { type: 'string' } },
                  alumni_count: { type: ['number', 'null'] },
                },
              },
            },
            skill_audit: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  current: { type: 'number' },
                  needed: { type: 'number' },
                  evidenceFound: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
          },
          required: ['paths', 'skill_audit'],
        },
      });
      // 整轮退化不通过且还有重试机会 → 重试;通过或耗尽 → 跳出用当前结果。
      if (!this.isDegenerateRound(raw) || attempt === MAX_ATTEMPTS - 1) break;
    }

    const analysis: CareerAnalysis = {
      paths: (Array.isArray(raw.paths) ? raw.paths : []).map((p) => ({
        title: p.title ?? '职业路径',
        fit_pct: this.normalizeFitPct(p.fit_pct),
        description: p.description ?? '',
        skills: Array.isArray(p.skills) ? p.skills : [],
        alumni_count: this.normalizeAlumniCount(p.alumni_count),
      })),
      skill_audit: (Array.isArray(raw.skill_audit) ? raw.skill_audit : [])
        .filter(
          (s): s is RawSkillAuditItem & { current: number; needed: number } =>
            typeof s.current === 'number' && typeof s.needed === 'number',
        )
        .map((s) => this.calibrateSkill(s, selfMap, rawResumeText)),
    };

    // 落库:历史 + 第3批 Coach 可调铺路。落库失败不阻断返回(用户已花点数,结果先给到)。
    await this.records.save(this.records.create({ user_id: userId, result_json: analysis }));

    return analysis;
  }

  /**
   * 整轮退化判定(对齐 analyzer 的 isDegenerate,精简为 career 版):
   * AI 这一轮产物是否结构合法但语义为空——无任何路径,或无任何可用技能条目(缺 name 或缺分值)。
   * 命中则该轮不可服务,触发重试。
   */
  private isDegenerateRound(raw: RawCareerAnalysis): boolean {
    const paths = Array.isArray(raw.paths) ? raw.paths : [];
    const audit = Array.isArray(raw.skill_audit) ? raw.skill_audit : [];
    const usableSkills = audit.filter(
      (s) =>
        typeof s.name === 'string' &&
        s.name.trim().length > 0 &&
        typeof s.current === 'number' &&
        typeof s.needed === 'number',
    );
    return paths.length === 0 || usableSkills.length === 0;
  }

  /**
   * 单条技能的防编造校准:
   * 1) clamp current/needed 到 [0,10];evidenceFound 归一为字符串;category 归一为 general/ai。
   * 2) 证据相关性校验(FIX-2 + FG-1):evidenceFound 非空还不够,必须满足两道关:
   *    ① 能在简历 raw_text 里真实回指到(子串命中,或剔除技能名后仍有关键词命中);
   *    ② 与该技能有相关性信号(技能名/别名直含,或证据在简历里出现处的邻近窗口含技能名/别名)。
   *    只照抄技能名、简历里没有的文字、或把别的技能/姓名学历段安给本技能(张冠李戴)→ 判为无效证据,
   *    evidenceFound 清空、按"无证据"处理。relevance 记 'grounded'/'unrelated'/'none'。
   * 3) 退化检测:current≥4 但(经校验后的)证据为空 → 判定凭技能名泛化或张冠李戴的编造,
   *    压到 DEGENERATE_CAPPED_SCORE,scoreSource='suppressed',aiScore 留原始 AI 分。
   * 4) 用户自评覆盖:该技能有自评 → current 用 self_score(展示尊重自评),scoreSource='self',aiScore 留 AI 分。
   *    (自评是人工纠偏,优先级高于退化检测——用户对自己的真实水平最有发言权。)
   * 5) 缺口保守分(FIX-5):gapScore = 自评覆盖时取 min(自评, AI原分),否则 = current(压分后用压分值)。
   *    ok 与缺口危险色按 gapScore 判。
   * 6) FG-2 被压分必判未达标:scoreSource='suppressed' 表示"高分但无有效证据",该能力未坐实,
   *    一律 ok=false——绝不能因 AI 给了极低 needed(0/1/2)致压后分 ≥needed 而反显"达标(绿)",
   *    那会让缺口危险色失效、把未坐实能力包装成达标。自评覆盖优先级更高(用户主观纠偏),不在此列。
   */
  private calibrateSkill(
    s: RawSkillAuditItem & { current: number; needed: number },
    selfMap: Map<string, number>,
    resumeText: string,
  ): SkillAuditItem {
    const name = s.name ?? '技能';
    const needed = this.clampScore(s.needed);
    const aiRaw = this.clampScore(s.current);
    const rawEvidence = typeof s.evidenceFound === 'string' ? s.evidenceFound.trim() : '';
    const category: SkillCategory = s.category === 'ai' ? 'ai' : 'general';

    // 证据相关性校验:既要可回指,又要与本技能相关;张冠李戴(借用无关真句)在此被判 'unrelated'。
    const relevance = this.assessEvidenceRelevance(rawEvidence, name, resumeText);
    const evidenceFound = relevance === 'grounded' ? rawEvidence : '';

    // 退化检测:无(有效)证据却给中高分 → 压分留痕(无关证据已被清空,同样落入此网)。
    const isDegenerate = aiRaw >= DEGENERATE_SUSPICION_FLOOR && evidenceFound.length === 0;
    let current = isDegenerate ? DEGENERATE_CAPPED_SCORE : aiRaw;
    let scoreSource: SkillScoreSource = isDegenerate ? 'suppressed' : 'ai';
    let aiScore: number | null = isDegenerate ? aiRaw : null;
    // 缺口判定分:非自评来源即用当前分(压分后的也用压分值,不会更乐观)。
    let gapScore = current;

    // 用户自评覆盖(优先级最高):有自评则展示用自评分,AI/压分结果均退为参考。
    const self = selfMap.get(this.normalizeSkillKey(name));
    if (self !== undefined) {
      // aiScore 保留"AI 当初给的原始分"(未经压分),供前端对比展示。
      aiScore = aiRaw;
      current = self;
      scoreSource = 'self';
      // 缺口用保守分:min(自评, AI原分)——自评可虚高,缺口判定不被其欺骗。
      gapScore = Math.min(self, aiRaw);
    }

    // FG-2:被退化压分(suppressed)的技能一律判未达标——无有效证据的高分代表能力未坐实,
    // 不得因 AI 给极低 needed(0/1/2)使压后分 ≥needed 而反显"达标(绿)"。自评覆盖优先级更高,不受此约束。
    const ok = scoreSource === 'suppressed' ? false : gapScore >= needed;

    return {
      name,
      current,
      needed,
      ok,
      category,
      evidenceFound,
      scoreSource,
      aiScore,
      gapScore,
      evidenceRelevance: relevance,
    };
  }

  /**
   * 证据相关性判定(FIX-2 假证据 + FG-1 张冠李戴):
   *  - 'none'      证据为空、或只照抄技能名、或简历里根本不存在该措辞 → 等同无证据(旧 FIX-2 行为)。
   *  - 'unrelated' 证据确实是简历里的真句,但与本技能无任何相关性信号(典型张冠李戴:
   *                把别的技能/姓名学历段安给本技能)→ 视为无效证据,清空并压分。
   *  - 'grounded'  证据可回指简历 + 与本技能有相关性信号(技能名/别名直含 或 邻近窗口含)→ 可信。
   *
   * 相关性信号(满足任一即视为相关):
   *  ① 直含:归一化证据文本里出现技能名整体、技能名的某个实质词 token、或技能别名;
   *  ② 邻近溯源:证据片段在简历正文中真实出现,其出现处前后 RELEVANCE_PROXIMITY_RADIUS 字的窗口里
   *     含技能名/别名/技能词 token——即"证据所在那段话确实在谈这个技能"。
   * 都不命中 → 'unrelated':证据可能取自简历别处(别的技能段/姓名学历),不能为本技能背书。
   */
  private assessEvidenceRelevance(
    evidence: string,
    skillName: string,
    resumeText: string,
  ): EvidenceRelevance {
    if (evidence.length === 0) return 'none';
    if (!this.isEvidenceGroundedInResume(evidence, skillName, resumeText)) return 'none';
    return this.isEvidenceRelevantToSkill(evidence, skillName, resumeText)
      ? 'grounded'
      : 'unrelated';
  }

  /**
   * 假证据校验(FIX-2):evidenceFound 是否能在简历正文里真实回指(只判"存在",不判"相关")。
   * 合格条件(任一):
   *  - 证据整体是简历正文的子串(AI 照抄了原文片段);
   *  - 剔除"技能名本身"后,证据里仍有 ≥4 字的连续片段能在简历里找到(避免只回指技能名,
   *    阈值取 4 以排除"项目""开发"等高频短词的巧合命中,同时容忍 AI 加标点/语气词的小差异)。
   * 反例(判为假证据):证据只是技能名(如 "AutoCAD"、"AutoCAD(熟练)")、或简历里根本不存在的措辞。
   */
  private isEvidenceGroundedInResume(evidence: string, skillName: string, resumeText: string): boolean {
    if (evidence.length === 0) return false;
    const haystack = this.normalizeForMatch(resumeText);
    if (haystack.length === 0) return false;

    const ev = this.normalizeForMatch(evidence);
    const skill = this.normalizeForMatch(skillName);

    // 证据等于/几乎等于技能名(只照抄技能名)→ 假证据。
    // 剔除技能名后看证据还剩多少实质内容。
    const residual = skill.length > 0 ? ev.split(skill).join('').trim() : ev;
    if (residual.length === 0) return false; // 全是技能名,无任何项目/经历描述。

    // 证据整体是简历子串 → 真实照抄,合格。
    if (haystack.includes(ev)) return true;

    // 否则要求剔除技能名后的实质内容里,有一段 ≥4 字的连续片段能在简历里找到(关键词回指)。
    // 阈值取 4:足够排除"项目""开发"这类高频通用短词的巧合命中(那种 2 字命中几乎人人简历都有),
    // 又能容忍 AI 在原文片段上加了标点/语气词导致整体非子串的小差异。滑窗由长到短,命中即合格。
    const MIN_FRAGMENT = 4;
    for (let len = Math.min(residual.length, 16); len >= MIN_FRAGMENT; len--) {
      for (let i = 0; i + len <= residual.length; i++) {
        const frag = residual.slice(i, i + len);
        if (haystack.includes(frag)) return true;
      }
    }
    return false;
  }

  /**
   * 相关性判定(FG-1 核心):证据(已确认可回指简历)是否与本技能相关。
   * ① 直含:证据文本含技能名/别名/技能词 token;
   * ② 邻近溯源:证据所在句(+紧邻前后各一句)的窗口含技能名/别名/技能词 token。
   * 二者皆不命中 → 不相关(张冠李戴:把别的技能段/姓名学历安给本技能)。
   */
  private isEvidenceRelevantToSkill(evidence: string, skillName: string, resumeText: string): boolean {
    const terms = this.skillRelevanceTerms(skillName);
    if (terms.length === 0) return true; // 技能名无可用相关词(异常)→ 不冤压,放行交退化网兜底。

    const ev = this.normalizeForMatch(evidence);
    // 信号①:证据文本直接含某个相关词。
    if (terms.some((t) => ev.includes(t))) return true;

    // 信号②:邻近溯源——找证据落在简历的哪些句,把这些句±RADIUS 句拼成窗口,看窗口里有无相关词。
    const sentences = resumeText.split(SENTENCE_SPLIT_RE).map((x) => this.normalizeForMatch(x));
    const hitIdx = this.locateEvidenceSentences(ev, sentences);
    for (const idx of hitIdx) {
      const from = Math.max(0, idx - RELEVANCE_SENTENCE_RADIUS);
      const to = Math.min(sentences.length - 1, idx + RELEVANCE_SENTENCE_RADIUS);
      const window = sentences.slice(from, to + 1).join('');
      if (terms.some((t) => window.includes(t))) return true;
    }
    return false;
  }

  /**
   * 找证据落在归一化简历句子数组里的哪些句的下标。
   * 先用证据整体子串匹配;无整句包含时退而用 ≥4 字滑窗片段(对齐 grounding 的回指逻辑)定位。
   */
  private locateEvidenceSentences(ev: string, sentences: string[]): number[] {
    const whole: number[] = [];
    sentences.forEach((s, i) => {
      if (s.length > 0 && (s.includes(ev) || ev.includes(s))) whole.push(i);
    });
    if (whole.length > 0) return whole;

    const frag: number[] = [];
    const MIN_FRAGMENT = 4;
    for (let len = Math.min(ev.length, 16); len >= MIN_FRAGMENT && frag.length === 0; len--) {
      for (let i = 0; i + len <= ev.length; i++) {
        const piece = ev.slice(i, i + len);
        sentences.forEach((s, idx) => {
          if (s.includes(piece) && !frag.includes(idx)) frag.push(idx);
        });
      }
    }
    return frag;
  }

  /**
   * 生成技能的相关性词表(归一化小写):技能名整体 + 技能名拆出的实质词 token + 别名。
   * 拆词:按非字母数字/中文边界切分,过滤掉短于 RELEVANCE_TERM_MIN_LEN 的泛字 token。
   */
  private skillRelevanceTerms(skillName: string): string[] {
    const terms = new Set<string>();
    const whole = this.normalizeForMatch(skillName);
    if (whole.length > 0) terms.add(whole);

    // 拆词:把斜杠/括号/空格/标点等当分隔符,保留连续的字母数字或中文段。
    const tokens = skillName
      .toLowerCase()
      .split(/[^a-z0-9一-龥]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= RELEVANCE_TERM_MIN_LEN);
    for (const t of tokens) terms.add(t);

    // 别名:按技能名整体键查。
    const aliases = SKILL_ALIASES[whole];
    if (aliases) for (const a of aliases) terms.add(this.normalizeForMatch(a));

    return [...terms];
  }

  // 匹配归一:去所有空白 + 转小写,使"Spring Boot"与"springboot"、大小写/空格差异不影响子串命中。
  private normalizeForMatch(text: string): string {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /** 历史列表:owner-only,只返回摘要(不返回完整 result_json),时间倒序。不扣 credit。 */
  async listHistory(userId: string): Promise<CareerHistoryItem[]> {
    const rows = await this.records.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return rows.map((r) => {
      const result = r.result_json;
      const paths = Array.isArray(result?.paths) ? result.paths : [];
      const audit = Array.isArray(result?.skill_audit) ? result.skill_audit : [];
      return {
        id: r.id,
        created_at: r.created_at,
        top_path: paths[0]?.title ?? null,
        path_count: paths.length,
        skill_count: audit.length,
      };
    });
  }

  /** 历史详情:owner-only,404 不泄露存在性(owner 不匹配与不存在等价)。不扣 credit。 */
  async getHistory(id: string, userId: string): Promise<CareerAnalysis> {
    const row = await this.records.findOne({ where: { id } });
    if (!row || row.user_id !== userId) throw new NotFoundException();
    return row.result_json;
  }

  /**
   * 用户自评 upsert:每用户每技能保留最新一条。不扣 credit。返回写入条数。
   * FG-6: 批量 upsert 替代逐条 findOne+save 的 N+1。先在请求内去重(同技能取最后一条,
   * 避免批内冲突),再用唯一约束 (user_id, skill_name) 一次 ON CONFLICT DO UPDATE 写入。
   */
  async upsertSelfAssessment(userId: string, items: SelfAssessmentInput[]): Promise<number> {
    // 校验 + 去重:键用 trim 后 skill_name(与唯一约束字段一致),Map 后写覆盖前写。
    const dedup = new Map<string, number>();
    for (const item of items) {
      const skillName = typeof item.skill_name === 'string' ? item.skill_name.trim() : '';
      if (skillName.length === 0) continue;
      const score = item.self_score;
      if (typeof score !== 'number' || !Number.isFinite(score)) continue;
      if (score < SELF_SCORE_MIN || score > SELF_SCORE_MAX) {
        throw new BadRequestException(`自评分 ${score} 越界,应在 ${SELF_SCORE_MIN}-${SELF_SCORE_MAX} 之间`);
      }
      dedup.set(skillName, Math.round(score));
    }
    if (dedup.size === 0) return 0;

    const rows = [...dedup].map(([skill_name, self_score]) => ({
      user_id: userId,
      skill_name,
      self_score,
    }));
    // conflictPaths 对齐唯一索引 (user_id, skill_name):命中则更新 self_score(及 @UpdateDateColumn)。
    await this.selfAssessments.upsert(rows, ['user_id', 'skill_name']);
    return rows.length;
  }

  /** 加载用户全部自评为 Map(归一化技能名 → self_score),供 analyze 覆盖用。 */
  private async loadSelfAssessmentMap(userId: string): Promise<Map<string, number>> {
    const rows = await this.selfAssessments.find({ where: { user_id: userId } });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(this.normalizeSkillKey(r.skill_name), this.clampScore(r.self_score));
    }
    return map;
  }

  // 技能名归一化匹配:去空格 + 转小写,使 "Python" 与 "python " 视为同一技能。
  private normalizeSkillKey(name: string): string {
    return name.trim().toLowerCase();
  }

  // 分值 clamp 到 [0,10] 整数:非法值(NaN/Infinity)→ 0。量程铁律,绝不放行越界分。
  private clampScore(value: number | null | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    const v = Math.round(value);
    if (v < 0) return 0;
    if (v > 10) return 10;
    return v;
  }

  // 契合度只接受 0-100 的有限数字,非法值 → 0,绝不放行编造的越界百分比。
  private normalizeFitPct(value: number | null | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  private normalizeAlumniCount(value: number | null | undefined): number | null {
    // 校友数只接受"有限的非负整数"。NaN/Infinity/非整数都是模型臆造的信号,一律置 null。
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return null;
    }
    return value;
  }
}

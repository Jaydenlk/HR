/**
 * 模拟面试创建流程 ⇄ 公司背调二级页(/mock/company-detail)的会话内数据桥接。
 *
 * 两个页面是各自独立的路由,互相跳转会 unmount 对方的 React state,所以用 sessionStorage
 * 承接一次性的草稿(去二级页前)与结果(从二级页回来时),仅限本 tab 内临时传递，不做跨会话持久化。
 */

export interface CompanyDetailDraft {
  company: string;
  role: string;
  jd_text: string;
  mode: 'text' | 'voice';
}

/** company-check API 候选(与后端 CompanyResearchCandidate 对齐) */
export interface CompanyCandidate {
  id: string;
  name: string;
  summary: string;
  source_url: string;
  source_domain: string;
}

/** company-check API 返回(T6:候选数组;reason 区分"没搜到"与"搜索服务不可用") */
export interface CompanyCheckResult {
  company_known: boolean;
  candidates: CompanyCandidate[];
  reason?: 'no_key' | 'timeout' | 'error';
  /** 候选来自 7 天缓存时为 true */
  from_cache?: boolean;
}

/** 用户对候选列表的消歧选择：pending=未决定，selected=已选某候选(记 id)，none=都不是(通用模式) */
export type CandidateChoice = { kind: 'pending' } | { kind: 'selected'; id: string } | { kind: 'none' };

export interface CompanyDetailResult extends CompanyDetailDraft {
  checkResult: CompanyCheckResult | null;
  candidateChoice: CandidateChoice;
}

const DRAFT_KEY = 'coach:mock:company-detail:draft';
const RESULT_KEY = 'coach:mock:company-detail:result';

/** 进二级页前保存表单草稿(公司名/岗位/JD/模式)，供二级页返回时原样恢复。 */
export function saveCompanyDetailDraft(draft: CompanyDetailDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 隐私模式等 sessionStorage 不可用场景：静默降级，二级页会以空草稿运作
  }
}

/** 二级页读取草稿，用于预填公司名等字段。 */
export function readCompanyDetailDraft(): CompanyDetailDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as CompanyDetailDraft) : null;
  } catch {
    return null;
  }
}

/** 二级页背调完成(或取消)后，回填结果并跳回创建流程前调用。 */
export function saveCompanyDetailResult(result: CompanyDetailResult): void {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // 隐私模式等 sessionStorage 不可用场景：静默降级，创建流程会以用户手动重新填写兜底
  }
}

/** 创建流程页挂载时读取一次结果，读到即消费(避免重复应用)。 */
export function consumeCompanyDetailResult(): CompanyDetailResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESULT_KEY);
    return JSON.parse(raw) as CompanyDetailResult;
  } catch {
    return null;
  }
}

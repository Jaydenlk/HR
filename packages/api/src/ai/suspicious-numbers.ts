// 确定性"可疑量化指标"识别(非 AI):无基数/口径/成本支撑的罕见高值数字,在可靠性层标"可疑待验证"。
// 配合提示词禁止"数字可信"背书 + 主评分压制。只抓"启发式量级阈值明显越界"的高值,常规合理数字一律放过(防误伤)。

export interface SuspiciousNumber {
  raw: string; // 命中的原始片段(如 "增长200%")
  reason: string; // 为何可疑(缺基数/口径/成本)
}

// 量级阈值启发式:这些指标类型 + 超阈值高值 = 罕见到需基数与口径支撑才可信。
// 阈值取"应届真实经历极难达到、不给基数即不可信"的保守上沿,避免误伤正常区间(如留存15%、转化27%)。
interface Heuristic {
  // 命中数值前的指标语境关键词(出现其一才判定为该类指标)
  contextKeywords: string[];
  // 该类指标的"可疑阈值":百分比类按百分数,倍数类按倍数
  threshold: number;
  // 数值提取:百分比(%/百分点)或倍数(倍/x/:N 的 ROI)
  kind: 'percent' | 'multiple';
  label: string; // 给用户看的类别名
}

const HEURISTICS: Heuristic[] = [
  {
    contextKeywords: ['增长', '提升', '增幅', '提高', '上涨', 'GMV', '销售额', '营收', '收入'],
    threshold: 100, // 增长/提升 ≥100%(翻倍以上)无基数即可疑
    kind: 'percent',
    label: '增长/提升幅度',
  },
  {
    contextKeywords: ['转化率', '转化', '点击率', 'CTR', 'CVR'],
    threshold: 40, // 转化率 ≥40% 罕见,无口径(分母是谁)即可疑
    kind: 'percent',
    label: '转化率',
  },
  {
    contextKeywords: ['复购', '复购率', '留存', '留存率', '续费', '续费率'],
    threshold: 55, // 复购/留存 ≥55% 罕见,无口径即可疑
    kind: 'percent',
    label: '复购/留存率',
  },
  {
    contextKeywords: ['ROI', '投资回报', '投入产出', '回报率'],
    threshold: 5, // ROI ≥1:5(5 倍)无成本基数即可疑
    kind: 'multiple',
    label: 'ROI/投资回报',
  },
];

/** 是否带基数/口径/成本说明(命中其一即认为已交代,不再判可疑)。 */
function hasBaselineOrCaliber(window: string): boolean {
  return /基数|样本|分母|口径|总量|总数|成本|投入|预算|计算方式|统计口径|占比基准/.test(window);
}

/** 从片段抽百分比数值(支持 200% / 200个百分点)。无则 null。 */
function extractPercent(seg: string): number | null {
  const m = seg.match(/(\d{1,3}(?:\.\d+)?)\s*(?:%|％|个百分点)/);
  return m ? Number(m[1]) : null;
}

/** 从片段抽倍数(ROI 1:8 → 8;8倍 → 8;8x → 8)。无则 null。 */
function extractMultiple(seg: string): number | null {
  const ratio = seg.match(/(?:1\s*[:：]\s*(\d{1,3}(?:\.\d+)?))/); // 1:8
  if (ratio) return Number(ratio[1]);
  const times = seg.match(/(\d{1,3}(?:\.\d+)?)\s*(?:倍|x|X|×)/);
  if (times) return Number(times[1]);
  return null;
}

/**
 * 识别简历文本中的可疑高值量化指标。
 * 对每类启发式:在文本里找指标关键词,取关键词附近窗口,抽该类数值,超阈值且窗口内无基数/口径/成本 → 命中。
 */
export function detectSuspiciousNumbers(text: string): SuspiciousNumber[] {
  const hits: SuspiciousNumber[] = [];
  const seen = new Set<string>(); // 去重(同一片段多关键词命中只报一次)

  for (const h of HEURISTICS) {
    for (const kw of h.contextKeywords) {
      let idx = text.indexOf(kw);
      while (idx !== -1) {
        // 关键词前后各取 20 字窗口:既含数值又含可能的基数/口径说明
        const window = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + kw.length + 20));
        const value = h.kind === 'percent' ? extractPercent(window) : extractMultiple(window);
        if (value !== null && value >= h.threshold && !hasBaselineOrCaliber(window)) {
          const raw = window.trim();
          const dedupKey = `${h.label}|${value}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            hits.push({
              raw,
              reason:
                h.kind === 'percent'
                  ? `${h.label} ${value}% 属罕见高值,简历未给基数与口径(分母/样本量/统计方式),可疑待验证。`
                  : `${h.label} 达 ${value} 倍,简历未给成本与投入基数,可疑待验证。`,
            });
          }
        }
        idx = text.indexOf(kw, idx + kw.length);
      }
    }
  }
  return hits;
}

import { detectSuspiciousNumbers } from '../src/ai/suspicious-numbers';

// 自拟夹具(不取材任何外部 testset):验证确定性可疑量化指标识别——
// 罕见高值且无基数/口径/成本 → 命中;常规合理数字或已给口径 → 放过(防误伤)。

describe('detectSuspiciousNumbers 可疑量化指标识别', () => {
  it('2 个月增长 200%(无基数)→ 命中', () => {
    const out = detectSuspiciousNumbers('上线 2 个月内将销售额增长 200%,效果显著');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].reason).toContain('可疑待验证');
  });

  it('转化率 45%(无口径)→ 命中', () => {
    const out = detectSuspiciousNumbers('优化落地页,将转化率做到 45%');
    expect(out.some((s) => s.reason.includes('转化率'))).toBe(true);
  });

  it('复购率 60%(无口径)→ 命中', () => {
    const out = detectSuspiciousNumbers('通过会员体系把复购率提升至 60%');
    expect(out.length).toBeGreaterThan(0);
  });

  it('ROI 1:8(无成本基数)→ 命中', () => {
    const out = detectSuspiciousNumbers('投放素材优化后 ROI 达到 1:8');
    expect(out.some((s) => s.reason.includes('ROI') || s.reason.includes('投资回报'))).toBe(true);
  });

  it('合理数字(留存 15%、转化率 27%)→ 不误报', () => {
    const out = detectSuspiciousNumbers('将留存提升到 15%,转化率从 18% 提升到 27%');
    expect(out).toHaveLength(0);
  });

  it('高值但已给基数/口径 → 不报(已交代)', () => {
    const out = detectSuspiciousNumbers('转化率 45%(口径:2000 次曝光中 900 次下单,样本量充足)');
    expect(out).toHaveLength(0);
  });

  it('增长 30%(未越翻倍阈值)→ 不误报', () => {
    const out = detectSuspiciousNumbers('推动功能上线,使营收增长 30%');
    expect(out).toHaveLength(0);
  });

  it('同一片段多关键词命中 → 去重只报一次同类同值', () => {
    const out = detectSuspiciousNumbers('GMV 与销售额双双增长 300%');
    // 增长 300% 同属"增长/提升幅度"类,去重后不应重复堆叠同值
    const growthHits = out.filter((s) => s.reason.includes('增长'));
    expect(growthHits.length).toBe(1);
  });
});

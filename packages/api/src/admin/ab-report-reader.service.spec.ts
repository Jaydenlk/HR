/**
 * AbReportReaderService 单元测试 —— 验证本机能读到打进镜像的真实性能报告 JSON。
 *
 * 验收点:
 *  ① getPerfReportCards():读到 ≥1 张卡,含 round-1,且卡上不带 sections/definition 全文。
 *  ② getPerfReport('round-1'):返回完整报告,含 7 个分区,id 对得上。
 *  ③ getPerfReport(不存在 id):返回 null(graceful,不抛)。
 *
 * 报告 JSON 为 src/data/perf-reports/round-1.json(nest assets 拷进 dist 的同一文件);
 * __dirname 相对 ../data/perf-reports 在本机 ts/jest 命中 src 源文件,生产命中 dist 副本。
 */
import { AbReportReaderService } from './ab-report-reader.service';

describe('AbReportReaderService — 读真实性能报告 JSON', () => {
  const service = new AbReportReaderService();

  it('getPerfReportCards 应读到 round-1 卡,且不含 sections/definition 全文', () => {
    const cards = service.getPerfReportCards();
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);

    const round1 = cards.find((c) => c.id === 'round-1');
    expect(round1).toBeDefined();
    expect(typeof round1?.title).toBe('string');
    expect((round1?.title as string).length).toBeGreaterThan(0);
    // 列表卡不回传报告全文(sections)与长定义(definition)。
    expect('sections' in (round1 as object)).toBe(false);
    expect('definition' in (round1 as object)).toBe(false);
  });

  it('getPerfReport("round-1") 应返回含 7 分区的完整报告', () => {
    const report = service.getPerfReport('round-1');
    expect(report).not.toBeNull();
    expect(report?.id).toBe('round-1');
    expect(Array.isArray(report?.sections)).toBe(true);
    expect(report?.sections.length).toBe(7);
    expect(typeof report?.definition).toBe('string');
  });

  it('getPerfReport(不存在的 id) 应返回 null(graceful,不抛)', () => {
    expect(service.getPerfReport('does-not-exist')).toBeNull();
  });
});

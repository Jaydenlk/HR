import { isResumeParseMeaningful } from '../src/ai/parser.service';
import type { ParsedResume } from '../src/common/types';

// ════════════════════════════════════════════════════════════════════════════
// isResumeParseMeaningful 防御性 null 安全
//
// 背景:resolveParsedResume(diagnoses.service.ts)在 DB 缓存命中时把 parsed_json
//   直接喂给 isResumeParseMeaningful。normalizeResume 之后的新解析恒为完整 shape,
//   但 DB 里可能存在 normalize 机制建立之前写入的【畸形遗留行】(basic_info 在但 name 缺、
//   或 skills 整体缺、或顶层数组缺)。这类缓存命中后,原实现对 undefined.trim() /
//   undefined.technical 抛 TypeError(500),而非返回 false 走重解自愈。
//
// 本测试:畸形/缺字段输入 → 判 false 且【不抛】(用例A,自愈前提);
//          正常行/合法稀疏行/全空行判定与改前【逐位等价】(用例B,防回归)。
// 类型签名是 ParsedResume(非可选字段),但运行时真值可能畸形,故畸形夹具用 `as ParsedResume` 注入。
// ════════════════════════════════════════════════════════════════════════════
describe('isResumeParseMeaningful — 防御性 null 安全', () => {
  // 一份「完整 shape」的基底,各用例按需挖空。
  function fullEmpty(): ParsedResume {
    return {
      basic_info: { name: '' },
      work_experience: [],
      education: [],
      skills: { technical: [], soft: [], languages: [], certifications: [] },
      projects: [],
      links: [],
      awards_honors: [],
    };
  }

  // ── 用例A(自愈前提):畸形/缺字段 → 不抛 + 判 false ──────────────────────────
  describe('[A] 畸形遗留缓存 → false 且不抛(走重解自愈)', () => {
    it('basic_info 在但 name 缺、且无 skills/数组(最毒形态 {basic_info:{}})→ false 不抛', () => {
      const malformed = { basic_info: {} } as unknown as ParsedResume;
      expect(() => isResumeParseMeaningful(malformed)).not.toThrow();
      expect(isResumeParseMeaningful(malformed)).toBe(false);
    });

    it('skills 整体缺失 → false 不抛', () => {
      const malformed = {
        basic_info: { name: '' },
        work_experience: [],
        education: [],
        projects: [],
      } as unknown as ParsedResume;
      expect(() => isResumeParseMeaningful(malformed)).not.toThrow();
      expect(isResumeParseMeaningful(malformed)).toBe(false);
    });

    it('顶层数组(work_experience/education/projects)缺失 → false 不抛', () => {
      const malformed = {
        basic_info: { name: '' },
        skills: { technical: [], soft: [], languages: [], certifications: [] },
      } as unknown as ParsedResume;
      expect(() => isResumeParseMeaningful(malformed)).not.toThrow();
      expect(isResumeParseMeaningful(malformed)).toBe(false);
    });

    it('彻底空对象 {} → false 不抛', () => {
      const malformed = {} as unknown as ParsedResume;
      expect(() => isResumeParseMeaningful(malformed)).not.toThrow();
      expect(isResumeParseMeaningful(malformed)).toBe(false);
    });

    it('畸形但有内容(name 缺,但 skills.technical 非空)→ true 不抛(缺字段不误杀有效信息)', () => {
      const malformed = {
        basic_info: {},
        skills: { technical: ['SQL'] },
      } as unknown as ParsedResume;
      expect(() => isResumeParseMeaningful(malformed)).not.toThrow();
      expect(isResumeParseMeaningful(malformed)).toBe(true);
    });
  });

  // ── 用例B(防回归):正常 normalize 过的行判定与改前逐位等价 ─────────────────
  describe('[B] 正常/稀疏/全空行判定不变(语义未改)', () => {
    it('有 name 的有效行 → true', () => {
      const r = fullEmpty();
      r.basic_info.name = '李雷';
      expect(isResumeParseMeaningful(r)).toBe(true);
    });

    it('合法稀疏行:name=\'\' 但 skills.technical 有内容 → true(不误判无效)', () => {
      const r = fullEmpty();
      r.skills.technical = ['SQL', 'Python'];
      expect(isResumeParseMeaningful(r)).toBe(true);
    });

    it('合法稀疏行:仅 education 非空(name=\'\') → true', () => {
      const r = fullEmpty();
      r.education = [
        { school: '某大学', degree: '本科', major: '计科' },
      ];
      expect(isResumeParseMeaningful(r)).toBe(true);
    });

    it('合法稀疏行:仅 summary 非空 → true', () => {
      const r = fullEmpty();
      r.summary = '应届产品经理求职';
      expect(isResumeParseMeaningful(r)).toBe(true);
    });

    it('合法稀疏行:仅 awards_honors 非空 → true', () => {
      const r = fullEmpty();
      r.awards_honors = ['全国大学生市场调研大赛二等奖'];
      expect(isResumeParseMeaningful(r)).toBe(true);
    });

    it('真·全空 normalize 行(name=\'\' + 各数组空)→ false', () => {
      expect(isResumeParseMeaningful(fullEmpty())).toBe(false);
    });

    it('name 仅空白字符(trim 后为空)+ 各数组空 → false(与改前一致)', () => {
      const r = fullEmpty();
      r.basic_info.name = '   ';
      expect(isResumeParseMeaningful(r)).toBe(false);
    });
  });
});

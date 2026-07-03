import { normalizeCompanyName } from './normalize';

describe('normalizeCompanyName', () => {
  it('去除首尾及内部空格', () => {
    expect(normalizeCompanyName(' 字 节 跳动 ')).toBe(normalizeCompanyName('字节跳动'));
  });

  it('全角字符转半角后再归一化', () => {
    expect(normalizeCompanyName('ＡＢＣ公司')).toBe(normalizeCompanyName('ABC公司'));
  });

  it('剥离常见后缀"有限公司"', () => {
    expect(normalizeCompanyName('字节跳动有限公司')).toBe(normalizeCompanyName('字节跳动'));
  });

  it('反复剥离多层后缀("科技有限公司")', () => {
    expect(normalizeCompanyName('某某科技有限公司')).toBe(normalizeCompanyName('某某'));
  });

  it('大小写不敏感', () => {
    expect(normalizeCompanyName('AbC科技')).toBe(normalizeCompanyName('abc科技'));
  });

  it('不会把公司名整体剥空(长度守卫)', () => {
    expect(normalizeCompanyName('科技')).toBe('科技');
  });

  it('形似但不同的公司名归一化结果不同(不产生误命中)', () => {
    expect(normalizeCompanyName('字节跳动')).not.toBe(normalizeCompanyName('字节跳动网络技术有限公司'));
  });
});

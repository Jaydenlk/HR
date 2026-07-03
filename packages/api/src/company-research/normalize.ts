/**
 * 公司名归一化 —— 仅服务本模块(company-research)的搜索缓存键与消歧比对。
 *
 * 边界(m12 审计校准):这是一套独立于 feed/company-registry.service.ts 的
 * CompanyRegistryService.matchCompany(trim+toLowerCase 精确比对，服务月刊优先公司白名单)的
 * 全新规则，两者定位不同、允许并存，不得合并/不得让本函数替代 matchCompany，反之亦然。
 *
 * 规则：去首尾空白 → 全角转半角 → 去除内部空白 → 转小写 → 反复剥离常见公司后缀（直至无可剥离）。
 * 仅用于缓存键比对，展示时永远使用原始名称（display_name）。
 */
const COMMON_SUFFIXES = [
  '股份有限公司',
  '有限责任公司',
  '有限公司',
  '科技集团',
  '集团公司',
  '控股集团',
  '科技',
  '集团',
  '控股',
];

/** 全角字符(！-～)转半角；全角空格(　)转普通空格。 */
function toHalfWidth(input: string): string {
  return input
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
}

export function normalizeCompanyName(input: string): string {
  let s = toHalfWidth(input.trim());
  s = s.replace(/\s+/g, '');
  s = s.toLowerCase();

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of COMMON_SUFFIXES) {
      if (s.length > suffix.length && s.endsWith(suffix)) {
        s = s.slice(0, -suffix.length);
        changed = true;
      }
    }
  }

  return s;
}

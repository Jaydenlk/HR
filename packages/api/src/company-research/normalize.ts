/**
 * 公司名归一化函数体已搬至 common/normalize-company-name.ts(T5 审计校准:与 applications 域下的
 * link-suggestions 模糊匹配共用同一套规则，不允许两处各自维护一份)。此文件只保留 re-export，
 * 保持 company-research.service.ts 等既有 `from './normalize'` 引用路径不变。
 */
export { normalizeCompanyName } from '../common/normalize-company-name';

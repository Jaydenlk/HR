/**
 * 公司背调二级页(/mock/company-detail)的下拉选项清单。
 * 产品判断(未在设计定稿中逐条列出，按合理默认给出，见任务报告)：
 * 城市/行业均为下拉不手输，含"其他"兜底；覆盖主要校招城市与常见行业即可，不追求穷举。
 */

export const CITY_OPTIONS: string[] = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '武汉',
  '南京',
  '西安',
  '苏州',
  '重庆',
  '天津',
  '其他',
];

export const INDUSTRY_OPTIONS: string[] = [
  '互联网',
  '金融',
  '制造',
  '教育',
  '医疗',
  '房地产',
  '快消',
  '汽车',
  '能源',
  '物流',
  '游戏',
  'AI',
  '半导体',
  '生物医药',
  '咨询',
  '传媒',
  '电商',
  '新能源',
  '农业',
  '其他',
];

export type ListedStatus = 'unknown' | 'listed' | 'unlisted' | 'nq_bse';

export const LISTED_OPTIONS: { value: ListedStatus; label: string }[] = [
  { value: 'unknown', label: '不确定' },
  { value: 'listed', label: '已上市' },
  { value: 'unlisted', label: '未上市' },
  { value: 'nq_bse', label: '新三板或北交所' },
];

export const SIZE_OPTIONS: string[] = ['<100', '100-500', '500-2000', '2000+'];

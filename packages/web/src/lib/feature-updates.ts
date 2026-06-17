// ── 功能更新注册表(单一真相源)────────────────────────────────────────────────
// feature_key → { tourId, seenKey, label }。三处共用此表:
//   1. 后台「关联功能」下拉(管理员给公告挂功能键);
//   2. onboarding-tour 的功能 mini-tour(按 tourId 启动、按 seenKey 持久化已看);
//   3. 子页「新」徽章(按 seenKey 判断是否已看过该功能)。
// 只登记真正有「上手导览 / 新徽章」的功能;不为每个页面镀金,先立一个范式(ASR 录音上传)。

export interface FeatureUpdate {
  // 后端 announcement.feature_key 与本键对齐。
  key: string;
  // 中文标签,用于后台下拉显示。
  label: string;
  // 功能 mini-tour 的 tourId('coach:launch-feature-tour' 事件 detail.tourId)。
  tourId: string;
  // 「已看过」标记的 localStorage 键(看完导览或主动消化后置位,徽章随之消失)。
  seenKey: string;
}

// 目前唯一一条:面试录音上传 / ASR 转写复盘(Beta)。
export const FEATURE_UPDATES: FeatureUpdate[] = [
  {
    key: 'asr_recording',
    label: '录音上传 · 转写复盘',
    tourId: 'asr-recording',
    seenKey: 'coach_feature_asr_seen',
  },
];

// 按 feature_key 取注册项(后台公告挂的 key / CTA 的 tour 映射用)。
export function getFeatureUpdateByKey(key: string | null | undefined): FeatureUpdate | undefined {
  if (!key) return undefined;
  return FEATURE_UPDATES.find((f) => f.key === key);
}

// 按 tourId 取注册项(onboarding-tour 收到 launch 事件后,据 tourId 找 seenKey 持久化)。
export function getFeatureUpdateByTourId(tourId: string): FeatureUpdate | undefined {
  return FEATURE_UPDATES.find((f) => f.tourId === tourId);
}

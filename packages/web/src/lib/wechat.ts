import { useSyncExternalStore } from 'react';

// 微信内置浏览器(WeChat in-app WebView)检测。
//
// 用途:微信内置浏览器的 <input type=file> 文件选择器被腾讯内核改造过 ——
//   不论 accept 写什么,媒体类型只会路由到「拍照 / 从相册选择」,不给系统文件/文档选择器,
//   导致用户无法挑选已有的录音文件(iOS 上几乎必然,Android 视内核而定时好时坏)。
//   页面层面无法绕过,唯一可靠出口是引导用户「在浏览器打开」后再上传。
//   据此本检测仅用于在扫码上传页弹出引导横幅,不做任何自动跳转(微信禁止网页主动跳外部浏览器)。
//
// 判定:微信 WebView 的 UA 一律包含 MicroMessenger(大小写不敏感)。
//   仅在浏览器端可用(依赖 navigator);SSR / 无 navigator 环境返回 false。

export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /micromessenger/i.test(navigator.userAgent);
}

// UA 在一次会话内不会变,subscribe 是空操作(只为满足 useSyncExternalStore 签名)。
function noopSubscribe(): () => void {
  return () => {};
}

// React hook:返回当前是否身处微信内置浏览器。
// 用 useSyncExternalStore 而非 useState+useEffect:它原生处理「客户端专属值 + SSR 快照」——
//   服务端快照恒为 false(无 navigator),客户端首帧后给真值,既避免 hydration 不一致,
//   也不触发 effect 内同步 setState(规避 react-hooks/set-state-in-effect)。
export function useIsWeChatBrowser(): boolean {
  return useSyncExternalStore(noopSubscribe, isWeChatBrowser, () => false);
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export interface UseAuthedImageResult {
  url: string | null;
  loading: boolean;
  error: boolean;
}

// 鉴权图片加载:下载路由(如 /files/download/avatars/xxx.png)校验属主后才回文件内容,
// <img src> 原生请求不带 Bearer 头会被拒;改用 api.getBlob 带鉴权头拉取,转成 object URL
// 再喂给 <img>。path 变化或组件卸载时 revoke 旧 object URL,避免内存泄漏。
// path 为空(未设置头像)时不发请求,url/loading/error 均维持初始态,由调用方走回退渲染。
export function useAuthedImage(path: string | null | undefined): UseAuthedImageResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const revokePrev = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    // 用 queueMicrotask 异步触发(而非在 effect 体内同步 setState,会触发级联渲染告警),
    // 并以 cancelled 闸门防竞态:path 快速切换时,旧 effect 的延后任务被其 cleanup 置 cancelled。
    queueMicrotask(() => {
      if (cancelled) return;
      revokePrev();
      setUrl(null);
      setError(false);

      if (!path) {
        setLoading(false);
        return;
      }

      setLoading(true);
      api
        .getBlob(path)
        .then((blob) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          setUrl(objectUrl);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setError(true);
          setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      revokePrev();
    };
  }, [path]);

  return { url, loading, error };
}

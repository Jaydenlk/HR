const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').trim();

// 优先用后端响应体 JSON 的 message 字段(NestJS 错误形如 {statusCode, message, error}),
// 给用户干净的中文提示,而非原样暴露 {"error":"Bad Request","statusCode":400}。
async function errorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join('；');
      }
    }
  } catch {
    // 非 JSON 响应体,回退到原始文本
  }
  return `API ${res.status}: ${text}`;
}

function authToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

// 402 余额不足错误:带 code 标记方便调用方或全局层识别。
export class InsufficientCreditError extends Error {
  readonly code = 'INSUFFICIENT_CREDIT';
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditError';
  }
}

// 统一未授权处理:401 时清 token 并跳登录(登录页除外);402 抛专属错误;其余抛带后端 message 的错误。永远抛出。
async function handleError(res: Response): Promise<never> {
  if (res.status === 401 && typeof window !== 'undefined') {
    // Don't redirect when already on the login page — let the page
    // catch the error and display it to the user instead.
    const onLoginPage = window.location.pathname === '/login';
    if (!onLoginPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }
  const msg = await errorMessage(res);
  if (res.status === 402) {
    // 全局广播:让侧边栏监听并刷新余额。
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coach:insufficient-credit'));
    }
    throw new InsufficientCreditError(msg || '点数不足，请联系管理员充值');
  }
  throw new Error(msg);
}

// 解析响应体:204 / 空 body(常见于 DELETE)安全返回 undefined,避免对空串调用 JSON.parse 抛 SyntaxError
// 导致"后端已成功但前端误判失败"。
async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) return handleError(res);
  return parseBody<T>(res);
}

// ── 全局排队提示(仅非流式路径)────────────────────────────────────────────────
// 仅非流式路径走此轮询:AI 端点 post 等待超过 2.5s 时,轮询 GET /ai/queue-status(2s 间隔);
// 有排队就广播全局轻提示「前面还有 x 个请求」,请求一完成立即清除。
// 流式路径的排队状态由后端在 SSE 连接内直接推送 queue 事件,不经此机制。
// 事件:coach:ai-queue { position } 显示;coach:ai-queue-clear 清除。由布局层挂一个监听渲染 toast。

interface QueueStatus {
  active: number;
  queued: number;
}

function emitQueue(position: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('coach:ai-queue', { detail: { position } }));
}

function clearQueue(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('coach:ai-queue-clear'));
}

async function fetchQueueStatus(): Promise<QueueStatus | null> {
  const token = authToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/ai/queue-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as QueueStatus;
  } catch {
    return null;
  }
}

// 在一次 AI 请求生命周期内做「延迟探测 + 周期轮询」排队;返回 stop() 供请求结束时调用。
function watchQueue(): () => void {
  let polling: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const startPoll = async () => {
    if (stopped) return;
    const probe = async () => {
      const status = await fetchQueueStatus();
      if (stopped) return;
      if (status && status.queued > 0) emitQueue(status.queued);
      else clearQueue();
    };
    await probe();
    if (stopped) return;
    polling = setInterval(probe, 2000);
  };

  // 2.5s 后才探测:绝大多数请求秒回,不打扰;只有真排队/慢才提示。
  const delay = setTimeout(() => void startPoll(), 2500);

  return () => {
    stopped = true;
    clearTimeout(delay);
    if (polling) clearInterval(polling);
    clearQueue();
  };
}

async function requestWithQueueWatch<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const stop = watchQueue();
  try {
    return await request<T>(path, options);
  } finally {
    stop();
  }
}

// ── SSE 流式 ─────────────────────────────────────────────────────────────────
// 后端 ChatStreamEvent 的前端镜像(packages/api conversations.service.ts)。
export type ChatStreamEvent =
  | { type: 'queue'; position: number }
  | { type: 'token'; text: string }
  | {
      type: 'done';
      user_message: import('./types').ChatMessage;
      assistant_message: import('./types').ChatMessage;
      credit_balance: number | null;
    }
  | { type: 'error'; message: string };

// POST 一条消息并以 SSE 流式消费回复。带 Bearer 头(fetch + ReadableStream,EventSource 不支持自定义头)。
// 流开始前的 HTTP 层错误(401/402/网络)按现有 handleError 语义抛出,让调用方走降级或登录跳转。
// 流开始后(200 + text/event-stream)逐 data: 帧解析成 ChatStreamEvent 产出。
async function* postStream(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent, void, void> {
  const token = authToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  // 非流式失败(含 401 跳登录 / 402 余额不足 / 4xx 校验)按统一语义抛出。
  if (!res.ok) {
    await handleError(res);
  }
  if (!res.body) {
    throw new Error('浏览器不支持流式读取');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 帧以空行分隔;逐帧切出,留半截在 buffer 等下次。
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          yield JSON.parse(json) as ChatStreamEvent;
        } catch {
          // 半截/损坏帧:跳过,不中断整流。
        }
      }
    }
  } finally {
    // signal 已 abort 时 cancel 底层流(释放网络连接),然后再 releaseLock。
    if (signal?.aborted) {
      await reader.cancel().catch(() => {});
    }
    reader.releaseLock();
  }
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    requestWithQueueWatch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  postStream,
  // options 透传 signal,支持 AbortController 真正中止 GET(页面切换/竞态时取消旧请求)。
  get: <T>(path: string, options?: Pick<RequestInit, 'signal'>) => request<T>(path, options),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
  upload: async <T>(
    path: string,
    file: File,
    fields?: Record<string, string>,
  ): Promise<T> => {
    const form = new FormData();
    form.append('file', file);
    if (fields) Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const token = authToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) return handleError(res);
    return parseBody<T>(res);
  },
};

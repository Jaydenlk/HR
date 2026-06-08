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

// 统一未授权处理:401 时清 token 并跳登录(登录页除外),再抛带后端 message 的错误。永远抛出。
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
  throw new Error(await errorMessage(res));
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

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
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

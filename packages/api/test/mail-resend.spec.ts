/**
 * MailService 三级驱动单测(Resend HTTPS → SMTP nodemailer → 开发态日志)。
 *
 * 全程 mock 全局 fetch 与 nodemailer.createTransport,绝不发任何真实网络请求。
 * 覆盖:
 *  ① Resend 已配 → 调用正确 URL/头/体;
 *  ② Resend 非 2xx → 抛错且含响应 message;
 *  ③ Resend 超时(AbortError)→ 抛错;
 *  ④ 无 Resend 有 SMTP → 走 nodemailer.sendMail;
 *  ⑤ 全无 → 仅打日志,不发任何请求。
 */
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from '../src/mail/mail.service';

// nodemailer.createTransport 整体 mock:默认返回带 sendMail 的假 transporter。
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// 用一份 env 字典伪造 ConfigService.get,语义同 @nestjs/config:命中返回值,未命中返回 fallback。
function makeConfig(env: Record<string, string>): ConfigService {
  return {
    get: <T>(key: string, fallback?: T): T | undefined => {
      if (key in env) return env[key] as unknown as T;
      return fallback;
    },
  } as unknown as ConfigService;
}

// 构造一个非 2xx 的假 Response。
function makeErrorResponse(status: number, jsonBody: unknown): Response {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    json: async () => jsonBody,
  } as unknown as Response;
}

describe('MailService — 三级驱动', () => {
  let fetchSpy: jest.SpyInstance;
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      { ok: true, status: 200, statusText: 'OK', json: async () => ({ id: 'eml_1' }) } as unknown as Response,
    );
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'mid_1' });
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    } as unknown as nodemailer.Transporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchSpy.mockRestore();
  });

  describe('① Resend 已配 → 正确的 URL / 头 / 体', () => {
    it('configured 为 true,sendLoginCode 调用 Resend HTTPS API 且参数正确', async () => {
      const service = new MailService(
        makeConfig({ RESEND_API_KEY: 're_test_key', SMTP_FROM: 'noreply@coach.dev' }),
      );
      expect(service.configured).toBe(true);

      await service.sendLoginCode('user@coach.dev', '123456');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect(init.method).toBe('POST');

      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer re_test_key');
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(init.body as string) as {
        from: string;
        to: string;
        subject: string;
        text: string;
      };
      expect(body.from).toBe('noreply@coach.dev');
      expect(body.to).toBe('user@coach.dev');
      expect(body.subject).toBe('校招教练 登录验证码');
      expect(body.text).toContain('123456');

      // 配了 Resend 就不应触碰 nodemailer。
      expect(mockedNodemailer.createTransport).not.toHaveBeenCalled();
      expect(sendMailMock).not.toHaveBeenCalled();

      // 带了 abort signal(超时控制)。
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('② Resend 非 2xx → 抛错且含响应 message', () => {
    it('422 + {message} → 抛错信息含 message 与状态码', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeErrorResponse(422, { message: 'Invalid `to` field' }),
      );
      const service = new MailService(makeConfig({ RESEND_API_KEY: 're_test_key' }));

      // 同一次失败发送的错误信息须同时包含响应 message 与状态码。
      const error = await service.sendLoginCode('bad', '123456').then(
        () => null,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Invalid `to` field');
      expect((error as Error).message).toContain('422');
    });

    it('响应体非 JSON → 回退到 statusText,仍抛错', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Status 500',
        json: async () => {
          throw new Error('Unexpected token < in JSON');
        },
      } as unknown as Response);
      const service = new MailService(makeConfig({ RESEND_API_KEY: 're_test_key' }));

      await expect(service.sendLoginCode('user@coach.dev', '123456')).rejects.toThrow(
        /Status 500/,
      );
    });
  });

  describe('③ Resend 超时 → 抛错', () => {
    it('fetch 因 abort 拒绝(AbortError)→ sendLoginCode 抛错', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchSpy.mockRejectedValueOnce(abortError);
      const service = new MailService(makeConfig({ RESEND_API_KEY: 're_test_key' }));

      await expect(service.sendLoginCode('user@coach.dev', '123456')).rejects.toThrow(
        /aborted/,
      );
    });
  });

  describe('④ 无 Resend 有 SMTP → 走 nodemailer', () => {
    it('configured 为 true,sendLoginCode 调用 transporter.sendMail 而非 fetch', async () => {
      const service = new MailService(
        makeConfig({
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: '465',
          SMTP_USER: 'u',
          SMTP_PASS: 'p',
          SMTP_FROM: 'noreply@coach.dev',
        }),
      );
      expect(service.configured).toBe(true);
      expect(mockedNodemailer.createTransport).toHaveBeenCalledTimes(1);

      await service.sendLoginCode('user@coach.dev', '654321');

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const arg = sendMailMock.mock.calls[0][0] as {
        from: string;
        to: string;
        subject: string;
        text: string;
      };
      expect(arg.from).toBe('noreply@coach.dev');
      expect(arg.to).toBe('user@coach.dev');
      expect(arg.subject).toBe('校招教练 登录验证码');
      expect(arg.text).toContain('654321');

      // SMTP 路径绝不触发 fetch。
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('⑤ 全无配置 → 仅打日志', () => {
    it('configured 为 false,sendLoginCode 不发任何请求', async () => {
      const service = new MailService(makeConfig({}));
      expect(service.configured).toBe(false);

      await expect(service.sendLoginCode('user@coach.dev', '111222')).resolves.toBeUndefined();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockedNodemailer.createTransport).not.toHaveBeenCalled();
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('SMTP_HOST 为空字符串(测试态密封)→ configured 仍为 false,走日志', async () => {
      const service = new MailService(makeConfig({ SMTP_HOST: '', RESEND_API_KEY: '' }));
      expect(service.configured).toBe(false);

      await service.sendLoginCode('user@coach.dev', '333444');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockedNodemailer.createTransport).not.toHaveBeenCalled();
    });
  });
});

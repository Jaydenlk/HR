import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// Resend HTTPS API 端点与发送超时。本机 SMTP 全端口被封,HTTPS(443)是唯一可靠路径,
// 故 RESEND_API_KEY 已配时优先走此路径(Node 22 全局 fetch,无新依赖)。
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 15_000;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // Resend API Key:已配则走 HTTPS 发送(优先级最高)。
  private readonly resendApiKey: string | null;
  // SMTP transporter:仅在未配 Resend 但配了 SMTP_HOST 时创建。
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo> | null;
  private readonly from: string;

  // 邮件通道是否已配置:Resend 或 SMTP 任一就绪即 true。
  // auth.service 靠它决定 request-code 是否回传 dev_code(未配置且非 production 才回传)。
  get configured(): boolean {
    return this.resendApiKey !== null || this.transporter !== null;
  }

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM', 'no-reply@coach.dev');

    // 优先级 1:Resend API Key。已配则不创建 SMTP transporter。
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resendApiKey = resendApiKey;
      this.transporter = null;
      return;
    }
    this.resendApiKey = null;

    // 优先级 2:SMTP_HOST。沿用原 nodemailer 路径不变。
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      // 优先级 3:都没配(开发/测试态)→ 不创建 transporter,sendLoginCode 仅打日志。
      this.transporter = null;
      return;
    }

    const port = Number(this.config.get<string>('SMTP_PORT', '465'));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const options: SMTPTransport.Options = {
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    };
    this.transporter = createTransport(options);
  }

  // 发送登录验证码。三级驱动:Resend HTTPS → SMTP nodemailer → 开发态日志。
  // 任一发送路径失败均向上抛错,语义与原 SMTP 路径一致(由 requestCode 透传 → request-code 返回 500)。
  async sendLoginCode(email: string, code: string): Promise<void> {
    const subject = '校招教练 登录验证码';
    const text = `你的登录验证码是 ${code},10 分钟内有效。如非本人操作请忽略此邮件。`;

    if (this.resendApiKey) {
      await this.sendViaResend(email, subject, text);
      return;
    }
    if (this.transporter) {
      await this.transporter.sendMail({ from: this.from, to: email, subject, text });
      return;
    }
    this.logger.log(`[开发态] 登录验证码 → ${email}: ${code}`);
  }

  // 经 Resend HTTPS API 发送。非 2xx 抛错并带响应中的 message;15s 超时由 AbortController 控制。
  private async sendViaResend(to: string, subject: string, text: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, text }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const message = await this.extractResendError(response);
      throw new Error(`Resend 发送失败(${response.status}): ${message}`);
    }
  }

  // 从非 2xx 响应中尽力提取 message;响应体非 JSON 或缺字段时回退状态文本。
  private async extractResendError(response: Response): Promise<string> {
    try {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
      ) {
        return (body as { message: string }).message;
      }
    } catch {
      // 响应体不是合法 JSON,忽略,落到下方状态文本回退。
    }
    return response.statusText || '未知错误';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo> | null;
  private readonly from: string;

  // SMTP 是否已配置。未配置时 request-code 可在非 production 下返回 dev_code。
  get configured(): boolean {
    return this.transporter !== null;
  }

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.from = this.config.get<string>('SMTP_FROM', 'no-reply@coach.dev');

    if (!host) {
      // 未配置 SMTP(开发态):不创建 transporter,sendLoginCode 仅打日志。
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

  // 发送登录验证码。无 SMTP 配置时仅记录日志(开发/测试态)。
  async sendLoginCode(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[开发态] 登录验证码 → ${email}: ${code}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: '校招教练 登录验证码',
      text: `你的登录验证码是 ${code},10 分钟内有效。如非本人操作请忽略此邮件。`,
    });
  }
}

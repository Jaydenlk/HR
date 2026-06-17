import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { ParserService } from './parser.service';
import { AnalyzerService } from './analyzer.service';
import { RewriterService } from './rewriter.service';
import { AiProviderService } from './ai-provider.service';
import { AiProvider } from './entities/ai-provider.entity';
import { OpsEventsModule } from '../ops/ops-events.module';
import { resolveMasterKey } from '../common/secret-crypto';

@Module({
  imports: [TypeOrmModule.forFeature([AiProvider]), OpsEventsModule],
  controllers: [AiController],
  providers: [
    ConcurrencyLimiter,
    AiService,
    ParserService,
    AnalyzerService,
    RewriterService,
    AiProviderService,
  ],
  exports: [
    AiService,
    ParserService,
    AnalyzerService,
    RewriterService,
    ConcurrencyLimiter,
    AiProviderService,
  ],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);

  constructor(private readonly providers: AiProviderService) {}

  // 启动期:① 主密钥强约束(生产 fail-fast)② 表空时从 env 种入通道。
  async onModuleInit(): Promise<void> {
    const isProd = process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN === '0';
    const key = resolveMasterKey(process.env.PROVIDER_ENC_KEY);
    if (!key) {
      if (isProd) {
        // 无主密钥则 DB 里加密密钥无法解密,AI 全线不可用且静默降级风险高 —— 宁可起不来也不裸奔。
        throw new Error(
          'PROVIDER_ENC_KEY 缺失或非 32 字节,生产环境拒绝启动(无主密钥则加密的 AI 通道密钥无法解密)。',
        );
      }
      this.logger.warn(
        'PROVIDER_ENC_KEY 未配置:dev/test 降级为「只读 env 通道、provider CRUD 写入被拒」。',
      );
    }
    // 种子:仅在有主密钥且表空时把 env 通道加密种入(向后兼容)。
    try {
      await this.providers.seedFromEnvIfEmpty();
    } catch (err) {
      this.logger.warn(
        `env→DB 通道种子失败(不阻断启动,运行期可回退 env 池):${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

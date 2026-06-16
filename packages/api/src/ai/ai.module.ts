import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { ParserService } from './parser.service';
import { AnalyzerService } from './analyzer.service';
import { RewriterService } from './rewriter.service';
import { AiProviderSettingsService } from './ai-provider-settings.service';
import { AiProviderSettings } from './entities/ai-provider-settings.entity';
import { OpsEventsModule } from '../ops/ops-events.module';

@Module({
  imports: [TypeOrmModule.forFeature([AiProviderSettings]), OpsEventsModule],
  controllers: [AiController],
  providers: [
    ConcurrencyLimiter,
    AiService,
    ParserService,
    AnalyzerService,
    RewriterService,
    AiProviderSettingsService,
  ],
  exports: [
    AiService,
    ParserService,
    AnalyzerService,
    RewriterService,
    ConcurrencyLimiter,
    AiProviderSettingsService,
  ],
})
export class AiModule {}

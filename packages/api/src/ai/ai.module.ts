import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { ParserService } from './parser.service';
import { AnalyzerService } from './analyzer.service';
import { RewriterService } from './rewriter.service';
import { OpsEventsModule } from '../ops/ops-events.module';

@Module({
  imports: [OpsEventsModule],
  controllers: [AiController],
  providers: [ConcurrencyLimiter, AiService, ParserService, AnalyzerService, RewriterService],
  exports: [AiService, ParserService, AnalyzerService, RewriterService],
})
export class AiModule {}

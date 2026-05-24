import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ParserService } from './parser.service';
import { AnalyzerService } from './analyzer.service';
import { RewriterService } from './rewriter.service';

@Module({
  providers: [AiService, ParserService, AnalyzerService, RewriterService],
  exports: [ParserService, AnalyzerService, RewriterService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { SpeechService } from './speech.service';
import { LabelService } from './label.service';
import { SPEECH_PROVIDER } from './providers/speech.provider';
import { StepFunProvider } from './providers/stepfun.provider';
import { InterviewTranscribeTask } from './entities/transcribe-task.entity';

/**
 * 语音模块:组装 ASR 转写 + LLM 角色打标的全部零件。
 *
 * - SPEECH_PROVIDER 绑定 StepFunProvider(P0 唯一实现;P1 换/加供应商只改此绑定)。
 * - SpeechService(门面)依赖 SPEECH_PROVIDER + ConcurrencyLimiter(来自 AiModule)。
 * - LabelService 依赖 AiService(来自 AiModule)走 completeStructured 打标。
 * - InterviewTranscribeTask 实体经 forFeature 注册,任务表仓库供 InterviewsService 注入。
 *
 * imports AiModule:AiModule 已 export AiService 与 ConcurrencyLimiter,本模块 provider 据此解析依赖。
 * exports SpeechService + LabelService:供 InterviewsModule import 后在 transcribe 编排中消费。
 * 任务表仓库不 export(由 InterviewsModule 自行 forFeature 注册同一实体获取本模块作用域内的仓库)。
 */
@Module({
  imports: [TypeOrmModule.forFeature([InterviewTranscribeTask]), AiModule],
  providers: [
    SpeechService,
    LabelService,
    // SpeechProvider 是接口(运行期不存在),用 SPEECH_PROVIDER token 绑定具体实现。
    { provide: SPEECH_PROVIDER, useClass: StepFunProvider },
  ],
  exports: [SpeechService, LabelService],
})
export class SpeechModule {}

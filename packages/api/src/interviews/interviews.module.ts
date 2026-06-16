import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Interview } from './entities/interview.entity';
import { InterviewsController } from './interviews.controller';
import { QrUploadController } from './qr-upload.controller';
import { InterviewsService } from './interviews.service';
import { QrUploadTokenService } from './qr-upload-token.service';
import { DebriefService } from './debrief.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
import { SpeechModule } from '../speech/speech.module';
import { InterviewTranscribeTask } from '../speech/entities/transcribe-task.entity';

@Module({
  // forFeature 再次注册转写任务实体:同一实体在本模块作用域内拿到仓库,供 InterviewsService 注入
  // (SpeechModule 已在自身作用域注册同一实体,二者各自获得仓库,实体本身经 autoLoadEntities 单次建表)。
  // import SpeechModule:消费其 export 的 SpeechService(ASR 转写)+ LabelService(角色打标)。
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewTranscribeTask]),
    AiModule,
    QuotaModule,
    CreditModule,
    SpeechModule,
    // 本模块需要 JwtService 签发/校验扫码上传 scoped 令牌。auth.module 里的 JwtModule 不被
    // 本模块继承,故在本作用域独立注册同口径 JwtModule(secret=JWT_SECRET,默认 dev-secret),
    // 与主登录令牌共用同一 secret(校验签名一致);本令牌用途/时效在 QrUploadTokenService 内单独控制。
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [InterviewsController, QrUploadController],
  providers: [InterviewsService, QrUploadTokenService, DebriefService],
  exports: [InterviewsService],
})
export class InterviewsModule {}

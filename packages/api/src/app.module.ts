import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { aiConfig } from './config/ai.config';
import { speechConfig } from './config/speech.config';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { ResumesModule } from './resumes/resumes.module';
import { AiModule } from './ai/ai.module';
import { DiagnosesModule } from './diagnoses/diagnoses.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ApplicationsModule } from './applications/applications.module';
import { InterviewsModule } from './interviews/interviews.module';
import { TasksModule } from './tasks/tasks.module';
import { OverviewModule } from './overview/overview.module';
import { MockModule } from './mock/mock.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { SalaryModule } from './salary/salary.module';
import { CareerModule } from './career/career.module';
import { FeedModule } from './feed/feed.module';
import { OpportunityModule } from './opportunity/opportunity.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { OfferComparatorModule } from './offer-comparator/offer-comparator.module';
import { NetworkingModule } from './networking/networking.module';
import { InterviewPrepModule } from './interview-prep/interview-prep.module';
import { LearningRoadmapModule } from './learning-roadmap/learning-roadmap.module';
import { FollowUpModule } from './follow-up/follow-up.module';
import { IndustryTrendModule } from './industry-trend/industry-trend.module';
import { QuotaModule } from './quota/quota.module';
import { CreditModule } from './credit/credit.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { OpsEventsModule } from './ops/ops-events.module';
import { CoachHandoffsModule } from './coach-handoffs/coach-handoffs.module';
import { SpeechModule } from './speech/speech.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [aiConfig, speechConfig], validate, cache: true }),
    ScheduleModule.forRoot(),
    // 全局限流:默认每 IP 60s 内 120 次(ttl 毫秒)。auth 端点经 @Throttle 进一步收紧。
    // skipIf:e2e 套件多用户共享 127.0.0.1 高频请求会误触限流,故 DISABLE_THROTTLE=1 时整体跳过
    // (仅由 test/jest-setup-env.ts 注入);限流本身的 e2e 用独立模块强制开启验证,互不影响。
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
      skipIf: () => process.env.DISABLE_THROTTLE === '1',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get('DB_TYPE', 'sqlite');
        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: config.get('DB_PATH', './coach-dev.db'),
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USER', 'coach'),
          password: config.get('DB_PASS', 'coach'),
          database: config.get('DB_NAME', 'coach'),
          autoLoadEntities: true,
          // 单语句超时(毫秒):防单条失控查询长期独占池化连接拖垮 2C/1.6G 小机。
          // 默认 30s,经 DB_STATEMENT_TIMEOUT_MS 覆盖;由 pg 驱动在每条连接上设 statement_timeout。
          extra: {
            statement_timeout: parseInt(config.get('DB_STATEMENT_TIMEOUT_MS', '30000'), 10),
          },
          // 生产数据安全红线:postgres 永不 synchronize,所有 schema 变更只走迁移文件
          // (CLI 经 src/database/data-source.ts 显式 migration:run)。dev 走 sqlite synchronize。
          synchronize: false,
          // 迁移文件来源(ts 在 ts-node 下、js 在编译产物下各自命中)。
          migrations: [__dirname + '/database/migrations/*.{ts,js}'],
          // 是否在连接初始化时自动跑迁移:默认关闭,由 CLI 显式触发;
          // DB_MIGRATIONS_RUN=1 时才在启动时自动迁移(可选,谨慎用于受控环境)。
          migrationsRun: config.get('DB_MIGRATIONS_RUN') === '1',
        };
      },
    }),
    AuthModule,
    UsersModule,
    FilesModule,
    ResumesModule,
    AiModule,
    DiagnosesModule,
    ConversationsModule,
    ApplicationsModule,
    InterviewsModule,
    TasksModule,
    OverviewModule,
    MockModule,
    CoverLettersModule,
    SalaryModule,
    CareerModule,
    FeedModule,
    OpportunityModule,
    IntelligenceModule,
    OfferComparatorModule,
    NetworkingModule,
    InterviewPrepModule,
    LearningRoadmapModule,
    FollowUpModule,
    IndustryTrendModule,
    // AiUsageInterceptor 仍由各 AI feature module 经 QuotaModule 传递性 import(运营口径 ai_usage);
    // QuotaGuard 已退役,但 QuotaModule 仍导出 AiUsageInterceptor,故保留挂载。
    QuotaModule,
    // CreditModule:CreditGuard/CreditInterceptor 经各 AI feature module 传递性 import,此处显式挂一次
    // 保证 CreditService 在非 feature 入口(auth 注册赠送 / users-me / admin 充值)也可注入。
    CreditModule,
    AdminModule,
    // 健康检查:GET /api/health(探针/监控用),不依赖任何 feature module。
    HealthModule,
    // 运维事件流水:虽已由 AiModule 传递性 import,此处显式挂载提升可读性并保证
    // 非 AI 入口(如 T3 管理后台)也能稳定注入 OpsEventsService。
    OpsEventsModule,
    CoachHandoffsModule,
    // 语音转写(StepFun ASR + LLM 角色打标);InterviewsModule import 之以编排 transcribe 流程。
    SpeechModule,
    // 站内公告:公开端 GET /announcements(只返 active)+ 管理端 /admin/announcements(JwtAuthGuard+AdminGuard)。
    AnnouncementsModule,
  ],
  // 全局限流守卫:与 ThrottlerModule.forRoot 配合,对所有路由生效。
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

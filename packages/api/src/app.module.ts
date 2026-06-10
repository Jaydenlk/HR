import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { aiConfig } from './config/ai.config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [aiConfig], validate, cache: true }),
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
          synchronize: config.get('NODE_ENV') !== 'production',
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
    // @Global QuotaModule:各 AI feature module 已传递性 import,此处显式挂一次
    // 保证非 feature 入口也能用,并与试运行接线约定一致。
    QuotaModule,
  ],
  // 全局限流守卫:与 ThrottlerModule.forRoot 配合,对所有路由生效。
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

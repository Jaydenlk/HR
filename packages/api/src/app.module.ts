import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}

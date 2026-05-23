# Phase 1: 简历馆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建完整的简历诊断系统 — 用户上传简历 + 贴 JD → AI 匹配分析 + 逐条改写建议，含简历库版本管理。

**Architecture:** Monorepo（pnpm workspace），前端 Next.js 静态导出 + 后端 NestJS API。前端编译为静态文件由 nginx 托管，后端跑 NestJS 进程。PostgreSQL 存储，阿里云 OSS 存文件。AI 分层调用（解析用 Haiku，分析用 Sonnet）。

**Tech Stack:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui | NestJS + TypeORM + PostgreSQL | CloudDreamAI 中转(auto-v2) + DeepSeek API | 阿里云 OSS | pnpm monorepo

**Design Reference:** 原型文件在 `Claude design/` 目录，核心参考：
- `core.jsx` — 设计系统（颜色、字体、组件）
- `shared.jsx` — 图标 + mock 数据
- `s-landing.jsx` — 简历馆相关 UI
- `s-chat.jsx` — 诊断结果富卡片 UI
- `s-tools.jsx` — 简历馆完整界面

---

## File Structure

### Backend (`packages/api/`)

```
packages/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── decorators/current-user.decorator.ts
│   │   ├── filters/http-exception.filter.ts
│   │   ├── pipes/validation.pipe.ts
│   │   └── types/index.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── dto/login.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── entities/user.entity.ts
│   ├── resumes/
│   │   ├── resumes.module.ts
│   │   ├── resumes.controller.ts
│   │   ├── resumes.service.ts
│   │   ├── entities/resume.entity.ts
│   │   ├── entities/resume-version.entity.ts
│   │   └── dto/
│   │       ├── create-resume.dto.ts
│   │       └── update-resume.dto.ts
│   ├── diagnoses/
│   │   ├── diagnoses.module.ts
│   │   ├── diagnoses.controller.ts
│   │   ├── diagnoses.service.ts
│   │   ├── entities/diagnosis.entity.ts
│   │   └── dto/create-diagnosis.dto.ts
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts              ← LLM 调用封装
│   │   ├── parser.service.ts          ← 简历/JD 解析
│   │   ├── analyzer.service.ts        ← 匹配分析
│   │   ├── rewriter.service.ts        ← 改写建议
│   │   ├── prompts/
│   │   │   ├── parse-resume.ts
│   │   │   ├── parse-jd.ts
│   │   │   ├── analyze-match.ts
│   │   │   └── suggest-rewrites.ts
│   │   └── schemas/
│   │       ├── parsed-resume.schema.ts
│   │       ├── parsed-jd.schema.ts
│   │       ├── match-result.schema.ts
│   │       └── rewrite-suggestion.schema.ts
│   └── files/
│       ├── files.module.ts
│       ├── files.controller.ts
│       └── files.service.ts           ← OSS 上传/签名URL
├── test/
│   ├── auth.e2e-spec.ts
│   ├── resumes.e2e-spec.ts
│   ├── diagnoses.e2e-spec.ts
│   └── test-utils.ts
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Frontend (`packages/web/`)

```
packages/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (main)/
│   │       ├── layout.tsx              ← Shell: 侧边栏 + 顶栏
│   │       ├── page.tsx                ← 首页
│   │       ├── resumes/
│   │       │   ├── page.tsx            ← 简历库
│   │       │   └── [id]/page.tsx       ← 简历详情
│   │       └── diagnoses/
│   │           ├── new/page.tsx        ← 新建诊断
│   │           └── [id]/page.tsx       ← 诊断结果
│   ├── components/
│   │   ├── shell/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   └── avatar.tsx
│   │   ├── resume/
│   │   │   ├── resume-card.tsx
│   │   │   ├── resume-uploader.tsx
│   │   │   ├── resume-preview.tsx
│   │   │   └── version-list.tsx
│   │   ├── diagnosis/
│   │   │   ├── score-ring.tsx
│   │   │   ├── dimension-bars.tsx
│   │   │   ├── keyword-cloud.tsx
│   │   │   ├── suggestion-card.tsx
│   │   │   └── jd-input.tsx
│   │   └── ui/                         ← shadcn/ui
│   ├── lib/
│   │   ├── api.ts                      ← fetch 封装
│   │   ├── auth.ts                     ← token 管理
│   │   └── types.ts                    ← 共享类型
│   └── styles/
│       └── globals.css                 ← Tailwind + 设计 token
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Root

```
/
├── packages/
│   ├── api/
│   └── web/
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
└── tsconfig.base.json
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `tsconfig.base.json`

- [ ] **Step 1: Initialize git repo**

```bash
cd "E:\Agent program\HRBP"
git init
git checkout -b main
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "coach",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter @coach/api dev",
    "dev:web": "pnpm --filter @coach/web dev",
    "build:api": "pnpm --filter @coach/api build",
    "build:web": "pnpm --filter @coach/web build",
    "lint": "pnpm -r lint",
    "test": "pnpm --filter @coach/api test"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.next/
out/
*.env
*.env.local
.DS_Store
```

- [ ] **Step 5: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: init monorepo structure"
```

---

## Task 2: Backend Scaffolding (NestJS)

**Files:**
- Create: `packages/api/` — NestJS project with TypeORM + PostgreSQL

- [ ] **Step 1: Scaffold NestJS project**

```bash
cd "E:\Agent program\HRBP"
mkdir -p packages/api
cd packages/api
pnpm init
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/typeorm @nestjs/jwt @nestjs/passport @nestjs/config typeorm pg passport passport-jwt reflect-metadata rxjs class-validator class-transformer node-cache pdf-parse mammoth uuid
pnpm add -D @nestjs/cli @nestjs/testing @types/node @types/passport-jwt @types/multer @types/uuid typescript ts-node jest @types/jest ts-jest
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });
  await app.listen(3000);
}
bootstrap();
```

- [ ] **Step 5: Create src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { DiagnosesModule } from './diagnoses/diagnoses.module';
import { AiModule } from './ai/ai.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'coach'),
        password: config.get('DB_PASS', 'coach'),
        database: config.get('DB_NAME', 'coach'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    UsersModule,
    ResumesModule,
    DiagnosesModule,
    AiModule,
    FilesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Create package.json scripts**

Add to `packages/api/package.json`:
```json
{
  "name": "@coach/api",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

- [ ] **Step 7: Create .env template**

Create `packages/api/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=coach
DB_PASS=coach
DB_NAME=coach
JWT_SECRET=change-me-in-production
AI_PROVIDER=clouddream
CLOUDDREAM_API_KEY=sk-xxxx
CLOUDDREAM_BASE_URL=https://api.tutorial.clouddreamai.com
CLOUDDREAM_MODEL=auto-v2
DEEPSEEK_API_KEY=sk-xxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
OSS_REGION=oss-cn-shanghai
OSS_BUCKET=coach-files
OSS_ACCESS_KEY=
OSS_ACCESS_SECRET=
```

- [ ] **Step 8: Commit**

```bash
git add packages/api/
git commit -m "chore: scaffold NestJS backend"
```

---

## Task 3: Database Entities

**Files:**
- Create: `packages/api/src/users/entities/user.entity.ts`
- Create: `packages/api/src/resumes/entities/resume.entity.ts`
- Create: `packages/api/src/resumes/entities/resume-version.entity.ts`
- Create: `packages/api/src/diagnoses/entities/diagnosis.entity.ts`
- Create: `packages/api/src/common/types/index.ts`

- [ ] **Step 1: Create shared types**

```typescript
// packages/api/src/common/types/index.ts

export interface ParsedResume {
  basic_info: {
    name: string;
    phone?: string;
    email?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  work_experience: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date?: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    major: string;
    graduation_date?: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    role?: string;
  }>;
}

export interface ParsedJD {
  job_title: string;
  company?: string;
  department?: string;
  required_skills: Array<{
    skill: string;
    level: 'required' | 'preferred' | 'nice_to_have';
    years?: string;
  }>;
  responsibilities: string[];
  qualifications: {
    education?: string;
    experience_years?: string;
    must_have: string[];
    nice_to_have: string[];
  };
  keywords: string[];
}

export interface MatchDimensions {
  skills: { score: number; max: number; matched: string[]; missing: string[]; partial: string[] };
  experience: { score: number; max: number; analysis: string };
  education: { score: number; max: number; analysis: string };
  keywords: { score: number; max: number; coverage_rate: number; missing_keywords: string[] };
  overall: { score: number; max: number; analysis: string };
}

export interface RewriteSuggestion {
  section: string;
  item_index?: number;
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggested: string;
  reason: string;
  jd_requirement?: string;
}
```

- [ ] **Step 2: Create User entity**

```typescript
// packages/api/src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Resume } from '../../resumes/entities/resume.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column()
  invite_code: string;

  @Column({ default: 'zh' })
  locale: string;

  @OneToMany(() => Resume, (r) => r.user)
  resumes: Resume[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 3: Create Resume entity**

```typescript
// packages/api/src/resumes/entities/resume.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ResumeVersion } from './resume-version.entity';
import { Diagnosis } from '../../diagnoses/entities/diagnosis.entity';
import type { ParsedResume } from '../../common/types';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, (u) => u.resumes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  raw_text: string;

  @Column('jsonb', { nullable: true })
  parsed_json: ParsedResume;

  @Column({ nullable: true })
  file_url: string;

  @Column({ nullable: true })
  file_type: string;

  @Column({ default: false })
  is_primary: boolean;

  @OneToMany(() => ResumeVersion, (v) => v.resume)
  versions: ResumeVersion[];

  @OneToMany(() => Diagnosis, (d) => d.resume)
  diagnoses: Diagnosis[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 4: Create ResumeVersion entity**

```typescript
// packages/api/src/resumes/entities/resume-version.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resume } from './resume.entity';
import type { ParsedResume } from '../../common/types';

@Entity('resume_versions')
export class ResumeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resume_id: string;

  @ManyToOne(() => Resume, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: Resume;

  @Column()
  version_num: number;

  @Column('text')
  raw_text: string;

  @Column('jsonb', { nullable: true })
  parsed_json: ParsedResume;

  @Column({ nullable: true })
  change_note: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 5: Create Diagnosis entity**

```typescript
// packages/api/src/diagnoses/entities/diagnosis.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Resume } from '../../resumes/entities/resume.entity';
import type { ParsedJD, MatchDimensions, RewriteSuggestion } from '../../common/types';

@Entity('diagnoses')
export class Diagnosis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  resume_id: string;

  @ManyToOne(() => Resume, (r) => r.diagnoses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: Resume;

  @Column('text')
  jd_text: string;

  @Column('jsonb', { nullable: true })
  jd_parsed: ParsedJD;

  @Column({ nullable: true })
  jd_company: string;

  @Column({ nullable: true })
  jd_role: string;

  @Column({ nullable: true })
  score: number;

  @Column('jsonb', { nullable: true })
  dimensions: MatchDimensions;

  @Column('jsonb', { nullable: true })
  keywords_hit: string[];

  @Column('jsonb', { nullable: true })
  keywords_miss: string[];

  @Column('jsonb', { nullable: true })
  suggestions: RewriteSuggestion[];

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/
git commit -m "feat: add database entities — User, Resume, ResumeVersion, Diagnosis"
```

---

## Task 4: Auth Module

**Files:**
- Create: `packages/api/src/auth/auth.module.ts`
- Create: `packages/api/src/auth/auth.controller.ts`
- Create: `packages/api/src/auth/auth.service.ts`
- Create: `packages/api/src/auth/dto/login.dto.ts`
- Create: `packages/api/src/common/guards/jwt-auth.guard.ts`
- Create: `packages/api/src/common/decorators/current-user.decorator.ts`
- Create: `packages/api/src/users/users.module.ts`
- Create: `packages/api/src/users/users.service.ts`
- Test: `packages/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write auth e2e test**

```typescript
// packages/api/test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /api/auth/login — valid invite code returns JWT', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', name: '张明', invite_code: 'COACH2026' })
      .expect(201)
      .expect((res) => {
        expect(res.body.access_token).toBeDefined();
        expect(res.body.user.email).toBe('test@example.com');
      });
  });

  it('POST /api/auth/login — invalid invite code returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', name: '张明', invite_code: 'WRONG' })
      .expect(401);
  });

  it('GET /api/auth/me — valid token returns user', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'me@test.com', name: '测试', invite_code: 'COACH2026' });

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('me@test.com');
      });
  });

  it('GET /api/auth/me — no token returns 401', () => {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && pnpm test:e2e -- --testPathPattern=auth`
Expected: FAIL — modules not found

- [ ] **Step 3: Create login DTO**

```typescript
// packages/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  invite_code: string;
}
```

- [ ] **Step 4: Create Users module + service**

```typescript
// packages/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

```typescript
// packages/api/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async findOrCreate(email: string, name: string, invite_code: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    return this.repo.save(this.repo.create({ email, name, invite_code }));
  }
}
```

- [ ] **Step 5: Create Auth service + controller + module**

```typescript
// packages/api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

const VALID_CODES = ['COACH2026'];

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const extra = this.config.get<string>('INVITE_CODES');
    if (extra) extra.split(',').forEach((c) => VALID_CODES.push(c.trim()));
  }

  async login(dto: LoginDto) {
    if (!VALID_CODES.includes(dto.invite_code)) {
      throw new UnauthorizedException('无效的邀请码');
    }
    const user = await this.users.findOrCreate(dto.email, dto.name, dto.invite_code);
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { access_token: token, user };
  }
}
```

```typescript
// packages/api/src/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getProfile(req.user.id);
  }
}
```

Update `AuthService` to add `getProfile`:
```typescript
// append to auth.service.ts
  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
```

```typescript
// packages/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from '../common/guards/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 6: Create JWT guard + strategy + decorator**

```typescript
// packages/api/src/common/guards/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthBearerToken(),
      secretOrKey: config.get('JWT_SECRET', 'dev-secret'),
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

```typescript
// packages/api/src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// packages/api/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd packages/api && pnpm test:e2e -- --testPathPattern=auth`
Expected: 4 tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/api/
git commit -m "feat: auth module — invite code login + JWT + guards"
```

---

## Task 5: File Upload Module

**Files:**
- Create: `packages/api/src/files/files.module.ts`
- Create: `packages/api/src/files/files.controller.ts`
- Create: `packages/api/src/files/files.service.ts`

- [ ] **Step 1: Install OSS SDK**

```bash
cd packages/api && pnpm add ali-oss @types/multer
```

- [ ] **Step 2: Create files service**

```typescript
// packages/api/src/files/files.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

@Injectable()
export class FilesService {
  private client: OSS;

  constructor(private readonly config: ConfigService) {
    this.client = new OSS({
      region: config.get('OSS_REGION', 'oss-cn-shanghai'),
      accessKeyId: config.get('OSS_ACCESS_KEY', ''),
      accessKeySecret: config.get('OSS_ACCESS_SECRET', ''),
      bucket: config.get('OSS_BUCKET', 'coach-files'),
    });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuid()}${ext}`;
    await this.client.put(key, Buffer.from(file.buffer));
    return key;
  }

  getSignedUrl(key: string, expires = 3600): string {
    return this.client.signatureUrl(key, { expires });
  }
}
```

- [ ] **Step 3: Create files controller + module**

```typescript
// packages/api/src/files/files.controller.ts
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const key = await this.files.upload(file, 'resumes');
    return { key, url: this.files.getSignedUrl(key) };
  }
}
```

```typescript
// packages/api/src/files/files.module.ts
import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/files/
git commit -m "feat: file upload module — Aliyun OSS integration"
```

---

## Task 6: Resume Module (Backend)

**Files:**
- Create: `packages/api/src/resumes/resumes.module.ts`
- Create: `packages/api/src/resumes/resumes.controller.ts`
- Create: `packages/api/src/resumes/resumes.service.ts`
- Create: `packages/api/src/resumes/dto/create-resume.dto.ts`
- Create: `packages/api/src/resumes/dto/update-resume.dto.ts`
- Test: `packages/api/test/resumes.e2e-spec.ts`

- [ ] **Step 1: Write resume e2e test**

```typescript
// packages/api/test/resumes.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Resumes (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'resume-test@test.com', name: '测试', invite_code: 'COACH2026' });
    token = res.body.access_token;
  });

  afterAll(() => app.close());

  it('POST /api/resumes — create resume from text', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '主版本', raw_text: '张明 前端工程师 React TypeScript', is_primary: true })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('主版本');
    expect(res.body.is_primary).toBe(true);
  });

  it('GET /api/resumes — list resumes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/resumes — without auth returns 401', () => {
    return request(app.getHttpServer()).get('/api/resumes').expect(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && pnpm test:e2e -- --testPathPattern=resumes`
Expected: FAIL

- [ ] **Step 3: Create DTOs**

```typescript
// packages/api/src/resumes/dto/create-resume.dto.ts
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  raw_text?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
```

```typescript
// packages/api/src/resumes/dto/update-resume.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateResumeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
```

- [ ] **Step 4: Create Resume service**

```typescript
// packages/api/src/resumes/resumes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from './entities/resume.entity';
import { ResumeVersion } from './entities/resume-version.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(Resume) private readonly repo: Repository<Resume>,
    @InjectRepository(ResumeVersion) private readonly versionRepo: Repository<ResumeVersion>,
  ) {}

  async create(userId: string, dto: CreateResumeDto, rawText: string): Promise<Resume> {
    if (dto.is_primary) {
      await this.repo.update({ user_id: userId, is_primary: true }, { is_primary: false });
    }
    return this.repo.save(this.repo.create({
      user_id: userId,
      title: dto.title,
      raw_text: rawText,
      is_primary: dto.is_primary ?? false,
    }));
  }

  findAllByUser(userId: string): Promise<Resume[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { is_primary: 'DESC', updated_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Resume> {
    const resume = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: ['versions', 'diagnoses'],
    });
    if (!resume) throw new NotFoundException();
    return resume;
  }

  async update(id: string, userId: string, dto: UpdateResumeDto): Promise<Resume> {
    const resume = await this.findOne(id, userId);
    if (dto.is_primary) {
      await this.repo.update({ user_id: userId, is_primary: true }, { is_primary: false });
    }
    Object.assign(resume, dto);
    return this.repo.save(resume);
  }

  async remove(id: string, userId: string): Promise<void> {
    const resume = await this.findOne(id, userId);
    await this.repo.remove(resume);
  }

  async getVersions(id: string, userId: string): Promise<ResumeVersion[]> {
    await this.findOne(id, userId);
    return this.versionRepo.find({
      where: { resume_id: id },
      order: { version_num: 'DESC' },
    });
  }

  async createVersion(id: string, userId: string, rawText: string, changeNote: string): Promise<ResumeVersion> {
    const resume = await this.findOne(id, userId);
    const latestVersion = await this.versionRepo.findOne({
      where: { resume_id: id },
      order: { version_num: 'DESC' },
    });
    const newNum = (latestVersion?.version_num ?? 0) + 1;

    const version = await this.versionRepo.save(this.versionRepo.create({
      resume_id: id,
      version_num: newNum,
      raw_text: rawText,
      change_note: changeNote,
    }));

    resume.raw_text = rawText;
    resume.parsed_json = null as never;
    await this.repo.save(resume);

    return version;
  }
}
```

- [ ] **Step 5: Create Resume controller + module**

```typescript
// packages/api/src/resumes/resumes.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateResumeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const rawText = file ? await this.extractText(file) : (dto.raw_text ?? '');
    return this.resumes.create(user.id, dto, rawText);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.resumes.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.findOne(id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateResumeDto) {
    return this.resumes.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.remove(id, user.id);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.getVersions(id, user.id);
  }

  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { raw_text: string; change_note: string },
  ) {
    return this.resumes.createVersion(id, user.id, body.raw_text, body.change_note);
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    if (file.mimetype === 'application/pdf') {
      const pdfParse = await import('pdf-parse');
      const result = await pdfParse.default(file.buffer);
      return result.text;
    }
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }
    return file.buffer.toString('utf-8');
  }
}
```

```typescript
// packages/api/src/resumes/resumes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from './entities/resume.entity';
import { ResumeVersion } from './entities/resume-version.entity';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resume, ResumeVersion])],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/api && pnpm test:e2e -- --testPathPattern=resumes`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/api/
git commit -m "feat: resume module — CRUD + versions + PDF/Word text extraction"
```

---

## Task 7: AI Module — LLM Wrapper + Prompts

**Files:**
- Create: `packages/api/src/ai/ai.module.ts`
- Create: `packages/api/src/ai/ai.service.ts`
- Create: `packages/api/src/ai/parser.service.ts`
- Create: `packages/api/src/ai/analyzer.service.ts`
- Create: `packages/api/src/ai/rewriter.service.ts`
- Create: `packages/api/src/ai/prompts/*.ts`
- Create: `packages/api/src/ai/schemas/*.ts`

This task creates the entire AI pipeline. Due to its size, the subagent should implement it following the types defined in `common/types/index.ts` and the prompt/schema structure below. Full prompt text and schema definitions must be included.

- [ ] **Step 1: Install Anthropic SDK (works with CloudDreamAI proxy)**

```bash
cd packages/api && pnpm add @anthropic-ai/sdk openai
```

Note: `@anthropic-ai/sdk` works with CloudDreamAI (Anthropic-compatible). `openai` SDK works with DeepSeek (OpenAI-compatible).

- [ ] **Step 2: Create AI service (dual provider: CloudDreamAI + DeepSeek)**

```typescript
// packages/api/src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

type Provider = 'clouddream' | 'deepseek';

@Injectable()
export class AiService {
  private clouddream: Anthropic;
  private deepseek: OpenAI;
  private defaultModel: string;
  private deepseekModel: string;

  constructor(private readonly config: ConfigService) {
    this.clouddream = new Anthropic({
      apiKey: config.get('CLOUDDREAM_API_KEY', ''),
      baseURL: config.get('CLOUDDREAM_BASE_URL', 'https://api.tutorial.clouddreamai.com'),
    });
    this.defaultModel = config.get('CLOUDDREAM_MODEL', 'auto-v2');

    this.deepseek = new OpenAI({
      apiKey: config.get('DEEPSEEK_API_KEY', ''),
      baseURL: config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
    });
    this.deepseekModel = config.get('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  async complete(params: {
    provider?: Provider;
    system: string;
    prompt: string;
    tools?: Anthropic.Tool[];
    maxTokens?: number;
  }): Promise<string> {
    const provider = params.provider ?? 'clouddream';

    if (provider === 'deepseek') {
      return this.completeDeepseek(params);
    }
    return this.completeClouddream(params);
  }

  private async completeClouddream(params: {
    system: string;
    prompt: string;
    tools?: Anthropic.Tool[];
    maxTokens?: number;
  }): Promise<string> {
    const response = await this.clouddream.messages.create({
      model: this.defaultModel,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
      ...(params.tools ? { tools: params.tools, tool_choice: { type: 'any' as const } } : {}),
    });

    for (const block of response.content) {
      if (block.type === 'tool_use') return JSON.stringify(block.input);
      if (block.type === 'text') return block.text;
    }
    throw new Error('No content in AI response');
  }

  private async completeDeepseek(params: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string> {
    const response = await this.deepseek.chat.completions.create({
      model: this.deepseekModel,
      max_tokens: params.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.prompt },
      ],
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async completeStructured<T>(params: {
    provider?: Provider;
    system: string;
    prompt: string;
    toolName: string;
    toolDescription: string;
    schema: Record<string, unknown>;
  }): Promise<T> {
    const provider = params.provider ?? 'clouddream';

    if (provider === 'deepseek') {
      const raw = await this.completeDeepseek({
        system: params.system + '\n\n请严格按以下 JSON Schema 输出：\n' + JSON.stringify(params.schema, null, 2),
        prompt: params.prompt,
      });
      return JSON.parse(raw) as T;
    }

    const raw = await this.completeClouddream({
      system: params.system,
      prompt: params.prompt,
      tools: [{
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.schema as Anthropic.Tool.InputSchema,
      }],
    });
    return JSON.parse(raw) as T;
  }
}
```

- [ ] **Step 3: Create prompts**

```typescript
// packages/api/src/ai/prompts/parse-resume.ts
export const PARSE_RESUME_SYSTEM = `你是一个简历解析专家。从简历文本中提取结构化信息。
规则：
- 严格按 tool schema 输出
- 缺失字段用空字符串或空数组
- 不推测不存在的信息
- 技能按 technical/soft/languages/certifications 分类`;

export const parseResumePrompt = (text: string) =>
  `请解析以下简历文本：\n\n${text}`;
```

```typescript
// packages/api/src/ai/prompts/parse-jd.ts
export const PARSE_JD_SYSTEM = `你是一个职位描述解析专家。从 JD 文本中提取结构化信息。
规则：
- 技能分级：required（必须）、preferred（优先）、nice_to_have（加分）
- keywords 提取所有可能用于 ATS 匹配的关键词
- 不推测文本中没有的信息`;

export const parseJdPrompt = (text: string) =>
  `请解析以下职位描述：\n\n${text}`;
```

```typescript
// packages/api/src/ai/prompts/analyze-match.ts
export const ANALYZE_MATCH_SYSTEM = `你是一位资深招聘顾问。对比简历和职位描述，给出详细的匹配分析。
评分标准（满分 100）：
- 技能匹配度 (0-30)：逐项对比 JD 要求的技能
- 经验相关度 (0-25)：工作经历与职位的相关程度
- 教育背景 (0-15)：学历、专业是否符合
- 关键词覆盖 (0-20)：ATS 关键词的覆盖程度
- 整体印象 (0-10)：职业轨迹一致性
规则：
- 给出每个维度的具体分数和分析
- 列出命中和缺失的关键词
- 分析必须具体，不要泛泛而谈`;

export const analyzeMatchPrompt = (resume: string, jd: string) =>
  `## 简历结构化数据：\n${resume}\n\n## JD 结构化数据：\n${jd}`;
```

```typescript
// packages/api/src/ai/prompts/suggest-rewrites.ts
export const SUGGEST_REWRITES_SYSTEM = `你是一位专业简历优化顾问。基于匹配分析结果，为简历提供改写建议。
规则：
1. 每条建议包含"原文 → 改写"对比
2. 说明改写理由（关联 JD 的哪个要求）
3. 按优先级排序（high/medium/low）
4. 不编造用户没有的经历
5. 改写保持真实性，只优化表达
6. 数量 3-5 条`;

export const suggestRewritesPrompt = (resume: string, jd: string, matchResult: string) =>
  `## 简历原文：\n${resume}\n\n## JD：\n${jd}\n\n## 匹配分析结果：\n${matchResult}`;
```

- [ ] **Step 4: Create tool schemas**

```typescript
// packages/api/src/ai/schemas/parsed-resume.schema.ts
export const PARSED_RESUME_SCHEMA = {
  type: 'object' as const,
  properties: {
    basic_info: {
      type: 'object',
      properties: {
        name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
        location: { type: 'string' }, linkedin: { type: 'string' },
      },
      required: ['name'],
    },
    summary: { type: 'string' },
    work_experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' }, title: { type: 'string' },
          start_date: { type: 'string' }, end_date: { type: 'string' },
          description: { type: 'string' },
          achievements: { type: 'array', items: { type: 'string' } },
        },
        required: ['company', 'title'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' }, degree: { type: 'string' },
          major: { type: 'string' }, graduation_date: { type: 'string' }, gpa: { type: 'string' },
        },
        required: ['school'],
      },
    },
    skills: {
      type: 'object',
      properties: {
        technical: { type: 'array', items: { type: 'string' } },
        soft: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        certifications: { type: 'array', items: { type: 'string' } },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } }, role: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  required: ['basic_info', 'work_experience', 'education', 'skills'],
};
```

```typescript
// packages/api/src/ai/schemas/parsed-jd.schema.ts
export const PARSED_JD_SCHEMA = {
  type: 'object' as const,
  properties: {
    job_title: { type: 'string' },
    company: { type: 'string' },
    department: { type: 'string' },
    required_skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          level: { type: 'string', enum: ['required', 'preferred', 'nice_to_have'] },
          years: { type: 'string' },
        },
        required: ['skill', 'level'],
      },
    },
    responsibilities: { type: 'array', items: { type: 'string' } },
    qualifications: {
      type: 'object',
      properties: {
        education: { type: 'string' },
        experience_years: { type: 'string' },
        must_have: { type: 'array', items: { type: 'string' } },
        nice_to_have: { type: 'array', items: { type: 'string' } },
      },
    },
    keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['job_title', 'required_skills', 'keywords'],
};
```

```typescript
// packages/api/src/ai/schemas/match-result.schema.ts
export const MATCH_RESULT_SCHEMA = {
  type: 'object' as const,
  properties: {
    total_score: { type: 'number' },
    dimensions: {
      type: 'object',
      properties: {
        skills: {
          type: 'object',
          properties: {
            score: { type: 'number' }, max: { type: 'number', default: 30 },
            matched: { type: 'array', items: { type: 'string' } },
            missing: { type: 'array', items: { type: 'string' } },
            partial: { type: 'array', items: { type: 'string' } },
          },
          required: ['score', 'max', 'matched', 'missing'],
        },
        experience: { type: 'object', properties: { score: { type: 'number' }, max: { type: 'number', default: 25 }, analysis: { type: 'string' } }, required: ['score', 'max', 'analysis'] },
        education: { type: 'object', properties: { score: { type: 'number' }, max: { type: 'number', default: 15 }, analysis: { type: 'string' } }, required: ['score', 'max', 'analysis'] },
        keywords: {
          type: 'object',
          properties: {
            score: { type: 'number' }, max: { type: 'number', default: 20 },
            coverage_rate: { type: 'number' },
            missing_keywords: { type: 'array', items: { type: 'string' } },
          },
          required: ['score', 'max', 'coverage_rate', 'missing_keywords'],
        },
        overall: { type: 'object', properties: { score: { type: 'number' }, max: { type: 'number', default: 10 }, analysis: { type: 'string' } }, required: ['score', 'max', 'analysis'] },
      },
      required: ['skills', 'experience', 'education', 'keywords', 'overall'],
    },
  },
  required: ['total_score', 'dimensions'],
};
```

```typescript
// packages/api/src/ai/schemas/rewrite-suggestion.schema.ts
export const REWRITE_SUGGESTIONS_SCHEMA = {
  type: 'object' as const,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          item_index: { type: 'number' },
          type: { type: 'string', enum: ['rewrite', 'add_keywords', 'restructure', 'quantify'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          original: { type: 'string' },
          suggested: { type: 'string' },
          reason: { type: 'string' },
          jd_requirement: { type: 'string' },
        },
        required: ['section', 'type', 'priority', 'original', 'suggested', 'reason'],
      },
    },
  },
  required: ['suggestions'],
};
```

- [ ] **Step 5: Create parser/analyzer/rewriter services**

```typescript
// packages/api/src/ai/parser.service.ts
import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { PARSE_RESUME_SYSTEM, parseResumePrompt } from './prompts/parse-resume';
import { PARSE_JD_SYSTEM, parseJdPrompt } from './prompts/parse-jd';
import { PARSED_RESUME_SCHEMA } from './schemas/parsed-resume.schema';
import { PARSED_JD_SCHEMA } from './schemas/parsed-jd.schema';
import type { ParsedResume, ParsedJD } from '../common/types';

@Injectable()
export class ParserService {
  constructor(private readonly ai: AiService) {}

  parseResume(text: string): Promise<ParsedResume> {
    return this.ai.completeStructured<ParsedResume>({
      provider: 'deepseek',
      system: PARSE_RESUME_SYSTEM,
      prompt: parseResumePrompt(text),
      toolName: 'extract_resume',
      toolDescription: '从简历文本中提取结构化信息',
      schema: PARSED_RESUME_SCHEMA,
    });
  }

  parseJD(text: string): Promise<ParsedJD> {
    return this.ai.completeStructured<ParsedJD>({
      provider: 'deepseek',
      system: PARSE_JD_SYSTEM,
      prompt: parseJdPrompt(text),
      toolName: 'extract_jd',
      toolDescription: '从职位描述中提取结构化信息',
      schema: PARSED_JD_SCHEMA,
    });
  }
}
```

```typescript
// packages/api/src/ai/analyzer.service.ts
import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { ANALYZE_MATCH_SYSTEM, analyzeMatchPrompt } from './prompts/analyze-match';
import { MATCH_RESULT_SCHEMA } from './schemas/match-result.schema';
import type { MatchDimensions } from '../common/types';

interface MatchResult {
  total_score: number;
  dimensions: MatchDimensions;
}

@Injectable()
export class AnalyzerService {
  constructor(private readonly ai: AiService) {}

  analyze(resumeJson: string, jdJson: string): Promise<MatchResult> {
    return this.ai.completeStructured<MatchResult>({
      provider: 'clouddream',
      system: ANALYZE_MATCH_SYSTEM,
      prompt: analyzeMatchPrompt(resumeJson, jdJson),
      toolName: 'match_analysis',
      toolDescription: '简历与 JD 的匹配分析',
      schema: MATCH_RESULT_SCHEMA,
    });
  }
}
```

```typescript
// packages/api/src/ai/rewriter.service.ts
import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { SUGGEST_REWRITES_SYSTEM, suggestRewritesPrompt } from './prompts/suggest-rewrites';
import { REWRITE_SUGGESTIONS_SCHEMA } from './schemas/rewrite-suggestion.schema';
import type { RewriteSuggestion } from '../common/types';

@Injectable()
export class RewriterService {
  constructor(private readonly ai: AiService) {}

  async suggest(resumeText: string, jdText: string, matchResult: string): Promise<RewriteSuggestion[]> {
    const result = await this.ai.completeStructured<{ suggestions: RewriteSuggestion[] }>({
      provider: 'clouddream',
      system: SUGGEST_REWRITES_SYSTEM,
      prompt: suggestRewritesPrompt(resumeText, jdText, matchResult),
      toolName: 'suggest_rewrites',
      toolDescription: '简历改写建议',
      schema: REWRITE_SUGGESTIONS_SCHEMA,
    });
    return result.suggestions;
  }
}
```

- [ ] **Step 6: Create AI module**

```typescript
// packages/api/src/ai/ai.module.ts
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
```

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/ai/
git commit -m "feat: AI module — LLM wrapper + resume/JD parsing + match analysis + rewrite suggestions"
```

---

## Task 8: Diagnosis Module (Backend)

**Files:**
- Create: `packages/api/src/diagnoses/diagnoses.module.ts`
- Create: `packages/api/src/diagnoses/diagnoses.controller.ts`
- Create: `packages/api/src/diagnoses/diagnoses.service.ts`
- Create: `packages/api/src/diagnoses/dto/create-diagnosis.dto.ts`
- Test: `packages/api/test/diagnoses.e2e-spec.ts`

- [ ] **Step 1: Write diagnosis e2e test**

```typescript
// packages/api/test/diagnoses.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Diagnoses (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let resumeId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'diag-test@test.com', name: '测试', invite_code: 'COACH2026' });
    token = loginRes.body.access_token;

    const resumeRes = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '测试简历', raw_text: '张明 华东师范大学 前端工程师 React TypeScript 3年经验 蚂蚁集团实习', is_primary: true });
    resumeId = resumeRes.body.id;
  });

  afterAll(() => app.close());

  it('POST /api/diagnoses — creates diagnosis with AI analysis', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resume_id: resumeId,
        jd_text: '岗位：前端工程师\n要求：3年以上React经验，熟悉TypeScript，有SSR经验优先',
      })
      .expect(201);

    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(res.body.dimensions).toBeDefined();
    expect(res.body.suggestions).toBeDefined();
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  }, 30000);

  it('GET /api/diagnoses — lists user diagnoses', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 2: Create diagnosis DTO**

```typescript
// packages/api/src/diagnoses/dto/create-diagnosis.dto.ts
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDiagnosisDto {
  @IsUUID()
  resume_id: string;

  @IsString()
  @MinLength(10)
  jd_text: string;
}
```

- [ ] **Step 3: Create diagnosis service**

```typescript
// packages/api/src/diagnoses/diagnoses.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as NodeCache from 'node-cache';
import * as crypto from 'crypto';
import { Diagnosis } from './entities/diagnosis.entity';
import { ResumesService } from '../resumes/resumes.service';
import { ParserService } from '../ai/parser.service';
import { AnalyzerService } from '../ai/analyzer.service';
import { RewriterService } from '../ai/rewriter.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';

const jdCache = new NodeCache({ stdTTL: 7 * 24 * 3600 });

@Injectable()
export class DiagnosesService {
  constructor(
    @InjectRepository(Diagnosis) private readonly repo: Repository<Diagnosis>,
    private readonly resumes: ResumesService,
    private readonly parser: ParserService,
    private readonly analyzer: AnalyzerService,
    private readonly rewriter: RewriterService,
  ) {}

  async create(userId: string, dto: CreateDiagnosisDto): Promise<Diagnosis> {
    const resume = await this.resumes.findOne(dto.resume_id, userId);

    if (!resume.parsed_json) {
      resume.parsed_json = await this.parser.parseResume(resume.raw_text);
      await this.resumes.updateParsedJson(resume.id, resume.parsed_json);
    }

    const jdHash = crypto.createHash('md5').update(dto.jd_text).digest('hex');
    let jdParsed = jdCache.get<import('../common/types').ParsedJD>(jdHash);
    if (!jdParsed) {
      jdParsed = await this.parser.parseJD(dto.jd_text);
      jdCache.set(jdHash, jdParsed);
    }

    const matchResult = await this.analyzer.analyze(
      JSON.stringify(resume.parsed_json),
      JSON.stringify(jdParsed),
    );

    const suggestions = await this.rewriter.suggest(
      resume.raw_text,
      dto.jd_text,
      JSON.stringify(matchResult),
    );

    const keywordsHit = matchResult.dimensions.skills.matched;
    const keywordsMiss = matchResult.dimensions.skills.missing;

    return this.repo.save(this.repo.create({
      user_id: userId,
      resume_id: dto.resume_id,
      jd_text: dto.jd_text,
      jd_parsed: jdParsed,
      jd_company: jdParsed.company,
      jd_role: jdParsed.job_title,
      score: matchResult.total_score,
      dimensions: matchResult.dimensions,
      keywords_hit: keywordsHit,
      keywords_miss: keywordsMiss,
      suggestions,
    }));
  }

  findAllByUser(userId: string): Promise<Diagnosis[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      relations: ['resume'],
    });
  }

  async findOne(id: string, userId: string): Promise<Diagnosis> {
    const d = await this.repo.findOne({ where: { id, user_id: userId }, relations: ['resume'] });
    if (!d) throw new NotFoundException();
    return d;
  }
}
```

- [ ] **Step 4: Add `updateParsedJson` to ResumesService**

Add to `packages/api/src/resumes/resumes.service.ts`:
```typescript
  async updateParsedJson(id: string, parsed: ParsedResume): Promise<void> {
    await this.repo.update(id, { parsed_json: parsed });
  }
```

Add import: `import type { ParsedResume } from '../common/types';`

- [ ] **Step 5: Create diagnosis controller + module**

```typescript
// packages/api/src/diagnoses/diagnoses.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiagnosesService } from './diagnoses.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';

@Controller('diagnoses')
@UseGuards(JwtAuthGuard)
export class DiagnosesController {
  constructor(private readonly diagnoses: DiagnosesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateDiagnosisDto) {
    return this.diagnoses.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.diagnoses.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.diagnoses.findOne(id, user.id);
  }
}
```

```typescript
// packages/api/src/diagnoses/diagnoses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { DiagnosesController } from './diagnoses.controller';
import { DiagnosesService } from './diagnoses.service';
import { ResumesModule } from '../resumes/resumes.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Diagnosis]), ResumesModule, AiModule],
  controllers: [DiagnosesController],
  providers: [DiagnosesService],
})
export class DiagnosesModule {}
```

- [ ] **Step 6: Run test**

Run: `cd packages/api && pnpm test:e2e -- --testPathPattern=diagnoses`
Expected: PASS (requires valid ANTHROPIC_API_KEY in .env)

- [ ] **Step 7: Commit**

```bash
git add packages/api/
git commit -m "feat: diagnosis module — full AI pipeline (parse → match → suggest)"
```

---

## Task 9: Frontend Scaffolding (Next.js)

**Files:**
- Create: `packages/web/` — Next.js project

- [ ] **Step 1: Create Next.js project**

```bash
cd "E:\Agent program\HRBP/packages"
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd web
pnpm add lucide-react next-themes
npx shadcn@latest init -y
npx shadcn@latest add button card input label badge separator dialog dropdown-menu tabs toast
```

- [ ] **Step 2: Configure for static export**

Update `packages/web/next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default config;
```

- [ ] **Step 3: Create design tokens in globals.css**

Reference: `Claude design/core.jsx` lines 4-50 for exact colors.

```css
/* packages/web/src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-bg: #fbfbfd;
  --color-surface: #ffffff;
  --color-surface-2: #f5f5f7;
  --color-surface-3: #eeeef0;
  --color-ink: #1d1d1f;
  --color-ink-2: #424245;
  --color-ink-3: #6e6e73;
  --color-ink-4: #a1a1a6;
  --color-line: #e5e5e7;
  --color-line-2: #d2d2d7;
  --color-brand: #0a84ff;
  --color-brand-hover: #006fdb;
  --color-brand-soft: #eaf2ff;
  --color-brand-ink: #003f8a;
  --color-success: #34c759;
  --color-success-soft: #e2f6e6;
  --color-warn: #ff9500;
  --color-warn-soft: #fff0d9;
  --color-danger: #ff3b30;
  --color-danger-soft: #ffe1de;
  --radius-default: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --font-sans: "Plus Jakarta Sans", "PingFang SC", "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Create API client**

```typescript
// packages/web/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
  upload: async <T>(path: string, file: File, fields?: Record<string, string>) => {
    const form = new FormData();
    form.append('file', file);
    if (fields) Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<T>;
  },
};
```

- [ ] **Step 5: Create shared types**

```typescript
// packages/web/src/lib/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
}

export interface Resume {
  id: string;
  title: string;
  raw_text: string;
  parsed_json: ParsedResume | null;
  file_url: string | null;
  file_type: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  diagnoses?: Diagnosis[];
  versions?: ResumeVersion[];
}

export interface ResumeVersion {
  id: string;
  version_num: number;
  raw_text: string;
  change_note: string | null;
  created_at: string;
}

export interface Diagnosis {
  id: string;
  resume_id: string;
  jd_text: string;
  jd_company: string | null;
  jd_role: string | null;
  score: number;
  dimensions: MatchDimensions;
  keywords_hit: string[];
  keywords_miss: string[];
  suggestions: RewriteSuggestion[];
  created_at: string;
  resume?: Resume;
}

export interface ParsedResume {
  basic_info: { name: string; phone?: string; email?: string; location?: string };
  summary?: string;
  work_experience: Array<{ company: string; title: string; start_date: string; end_date?: string; description: string; achievements: string[] }>;
  education: Array<{ school: string; degree: string; major: string; graduation_date?: string }>;
  skills: { technical: string[]; soft: string[]; languages: string[]; certifications: string[] };
  projects: Array<{ name: string; description: string; technologies: string[] }>;
}

export interface ParsedJD {
  job_title: string;
  company?: string;
  required_skills: Array<{ skill: string; level: 'required' | 'preferred' | 'nice_to_have' }>;
  keywords: string[];
}

export interface MatchDimensions {
  skills: { score: number; max: number; matched: string[]; missing: string[]; partial: string[] };
  experience: { score: number; max: number; analysis: string };
  education: { score: number; max: number; analysis: string };
  keywords: { score: number; max: number; coverage_rate: number; missing_keywords: string[] };
  overall: { score: number; max: number; analysis: string };
}

export interface RewriteSuggestion {
  section: string;
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggested: string;
  reason: string;
  jd_requirement?: string;
}
```

- [ ] **Step 6: Update package.json**

```json
{
  "name": "@coach/web",
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "lint": "next lint && tsc --noEmit"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/
git commit -m "feat: scaffold Next.js frontend with design tokens + API client + shared types"
```

---

## Task 10-13: Frontend Pages

Tasks 10-13 implement the frontend pages. Each task creates one page and its components, referencing the Claude Design prototypes for exact UI:

- **Task 10: Shell + Login** — sidebar (`core.jsx:258-319`), topbar (`core.jsx:321-329`), login page
- **Task 11: Resume Library + Detail** — resume cards, uploader, version list (`s-tools.jsx:271-424`)
- **Task 12: New Diagnosis + Result** — JD input, score ring, dimension bars, keyword cloud, suggestion cards (`s-tools.jsx:271-424`, `s-chat.jsx:108-297`)
- **Task 13: Dashboard** — recent diagnoses, quick actions, resume library shortcut

Each subagent implementing these tasks MUST:
1. Read the referenced prototype file for exact UI structure
2. Follow the design tokens from `globals.css`
3. Use shadcn/ui components as base
4. Implement full mobile responsiveness
5. Include loading states and empty states

---

## Task 14: Playwright E2E Testing

**This is the final integration task.** Use Playwright MCP (not test scripts) to walk through every user flow:

**Desktop (1440×900) + Mobile (390×844):**

1. **Login flow:** Enter invite code → get JWT → redirect to home
2. **Upload resume:** Click upload → select PDF → see parsed preview → save as primary
3. **Create diagnosis:** Select resume → paste JD → click diagnose → wait for result → see score + dimensions + keywords + suggestions
4. **Adopt suggestion:** Click "采纳" on suggestion → verify resume version created
5. **Resume management:** View resume list → open detail → see version history → see diagnosis history
6. **Error cases:** Wrong invite code → 401 | Empty JD → validation error | No resume selected → validation error

---

## Self-Review Checklist

- [x] **Spec coverage:** Auth (Task 4), Resume CRUD (Task 6), AI parsing (Task 7), Diagnosis (Task 8), Frontend (Tasks 9-13), E2E (Task 14) — all spec sections covered
- [x] **Placeholder scan:** All code blocks are complete, no TBD/TODO
- [x] **Type consistency:** `ParsedResume`, `ParsedJD`, `MatchDimensions`, `RewriteSuggestion` used consistently across backend types, AI schemas, and frontend types
- [x] **Provider routing:** DeepSeek for parsing (cheap), CloudDreamAI auto-v2 for analysis/rewriting (smart)
- [x] **API routes:** Backend controller routes match frontend `api.ts` paths

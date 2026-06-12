/**
 * Seed 脚本 —— 向 DB 灌入市场薪资 & 面经数据。
 * 运行:npm run seed(经 tsconfig.seed.json 编译)
 *
 * 数据源从 DB_* 环境变量装配(sqlite/postgres 同一套,与 app.module 一致),
 * 不再写死 sqlite —— 故同一脚本可对 dev(sqlite)与生产(postgres)分别灌种。
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import type { FeedCategory, FeedSourceKind } from './feed/types/feed.types';

// seed 在 Nest 之外运行,需自行加载 packages/api/.env(与运行期同一份配置源)。
// dotenv 为可选:生产用进程管理器注入环境变量,无 .env 时静默跳过。
//
// 注意:entity import 必须在 dotenv 加载之后通过 require() 延迟引入,
// 否则 TIMESTAMP_COLUMN_TYPE 在装饰器求值时读不到 DB_TYPE,导致 postgres 下类型错误。
loadDotenvIfPresent(path.resolve(__dirname, '..', '.env'));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { User } = require('./users/entities/user.entity') as { User: typeof import('./users/entities/user.entity').User };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { InviteCode } = require('./invites/entities/invite-code.entity') as { InviteCode: typeof import('./invites/entities/invite-code.entity').InviteCode };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SalaryEntry } = require('./salary/entities/salary-entry.entity') as { SalaryEntry: typeof import('./salary/entities/salary-entry.entity').SalaryEntry };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FeedItem } = require('./feed/entities/feed-item.entity') as { FeedItem: typeof import('./feed/entities/feed-item.entity').FeedItem };

function loadDotenvIfPresent(envPath: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv') as { config: (opts: { path: string }) => unknown };
    dotenv.config({ path: envPath });
  } catch {
    // dotenv 未安装 → 依赖进程环境变量,正常。
  }
}

// Resolve JSON data files relative to the repo root (two levels up from packages/api)
const dataRoot = path.resolve(__dirname, '..', '..', '..', 'data', 'seed');

// 市场薪资数据无真实投稿用户,挂在固定 UUID 的「系统」用户名下,保住 FK 完整性
// (Postgres 上 salary_entries.user_id 是 NOT NULL uuid + FK→users;不能再用 'system' 字符串)。
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// 按 DB_* 环境变量装配数据源(与 src/database/data-source.ts、app.module 同源)。
function buildSeedOptions(): DataSourceOptions {
  const dbType = process.env.DB_TYPE ?? 'sqlite';
  const entities = [path.resolve(__dirname, '**', '*.entity.{ts,js}')];

  if (dbType === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? path.resolve(__dirname, '..', 'coach-dev.db'),
      entities,
      synchronize: true,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'coach',
    password: process.env.DB_PASS ?? 'coach',
    database: process.env.DB_NAME ?? 'coach',
    entities,
    uuidExtension: 'pgcrypto',
    // 生产 schema 由迁移管理,seed 绝不自动改表。
    synchronize: false,
    logging: false,
  };
}

interface SalaryRecord {
  company: string;
  role: string;
  location: string;
  offer_level: string;
  base_salary: number;
  salary_months: number;
  bonus_months: number;
  signing_bonus: number;
  stock_value: number;
  housing_subsidy: number;
  total_comp: number;
  level: string;
  source: string;
  data_year: string;
}

interface InterviewRecord {
  title: string;
  company: string;
  role: string;
  round: string;
  category: string;
  questions: string[];
  content: string;
  result: string;
  difficulty: string;
  interview_date: string;
  source: string;
}

interface CuratedFeedRecord {
  title: string;
  company: string | null;
  role: string | null;
  category: string;
  content: string;
  source: string;
  source_url: string;
  source_name: string;
  author: string;
  tags: string[];
}

function toFeedCategory(value: string | null | undefined): FeedCategory {
  switch (value) {
    case 'interview_exp':
    case 'market_insight':
    case 'job_tips':
    case 'hiring_signal':
    case 'editorial':
      return value;
    case 'trending':
    case 'hot':
      return 'hiring_signal';
    case 'story':
      return 'market_insight';
    default:
      return 'interview_exp';
  }
}

function toFeedSourceKind(value: string | null | undefined): FeedSourceKind {
  switch (value) {
    case 'xhs':
    case 'xhs_trend':
      return 'xhs';
    case 'nowcoder':
      return 'nowcoder';
    case 'wechat':
      return 'wechat';
    case 'ugc':
      return 'ugc';
    case 'coach':
    case 'ai_digest':
    case 'market_research':
      return 'coach';
    default:
      return 'blog';
  }
}

async function seed() {
  const ds = new DataSource(buildSeedOptions());

  await ds.initialize();
  console.log(`Connected to DB (${ds.options.type})`);

  // 系统用户兜底:市场薪资数据挂其名下,保住 FK 完整性(idempotent)。
  const userRepo = ds.getRepository(User);
  const systemUser = await userRepo.findOne({ where: { id: SYSTEM_USER_ID } });
  if (!systemUser) {
    await userRepo.insert({
      id: SYSTEM_USER_ID,
      email: 'system@coach.internal',
      name: 'Coach 系统',
      invite_code: 'SYSTEM',
      // FK 占位账号无需管理员权限,降为普通 user(最小权限);status: banned 已禁止登录。
      role: 'user',
      status: 'banned', // 占位账号,禁止登录
    });
    console.log('Created system placeholder user');
  }

  // ── 0. 生产初始邀请码:解锁首个管理员注册(先有鸡先有蛋死锁的根治)。
  // 仅当 INITIAL_INVITE_CODE 环境变量非空时执行,本机 dev 流程不受影响。
  const initialCode = process.env.INITIAL_INVITE_CODE?.trim();
  if (initialCode) {
    const maxUses = Number(process.env.INITIAL_INVITE_MAX_USES ?? 50);
    const inviteRepo = ds.getRepository(InviteCode);
    const existing = await inviteRepo.findOneBy({ code: initialCode });
    if (existing) {
      console.log(`Skipping invite seed — code ${initialCode} already exists`);
    } else {
      await inviteRepo.save(
        inviteRepo.create({ code: initialCode, max_uses: maxUses, note: 'production bootstrap' }),
      );
      console.log(`Created bootstrap invite code ${initialCode} (max_uses=${maxUses})`);
    }
  }

  // ── 1. Seed salary_entries ───────────────────────────────────────────────
  const salaryRepo = ds.getRepository(SalaryEntry);
  const existingSalaryCount = await salaryRepo.count({ where: { source: 'market' as 'self' } });

  if (existingSalaryCount > 0) {
    console.log(`Skipping salary seed — already have ${existingSalaryCount} market entries`);
  } else {
    const salaryDataPath = path.join(dataRoot, 'salary_data.json');
    const salaryData: SalaryRecord[] = JSON.parse(fs.readFileSync(salaryDataPath, 'utf-8'));

    const salaryEntities = salaryData.map((rec) => {
      const entry = salaryRepo.create({
        // 市场数据无投稿用户,挂系统用户名下(FK 有效)。
        user_id: SYSTEM_USER_ID,
        company: rec.company,
        role: rec.role,
        location: rec.location,
        base_salary: rec.base_salary,
        // Approximate annual bonus from bonus_months
        bonus: Math.round(rec.base_salary * (rec.bonus_months ?? 0)),
        stock_value: rec.stock_value ?? 0,
        total_comp: rec.total_comp,
        level: rec.level,
        source: 'market' as 'self',
      });
      return entry;
    });

    await salaryRepo.save(salaryEntities);
    console.log(`Seeded ${salaryEntities.length} salary entries`);
  }

  // ── 2. Seed feed_items (interview experiences) ────────────────────────────
  const feedRepo = ds.getRepository(FeedItem);
  const existingFeedCount = await feedRepo.count({ where: { source: 'market_research' } });

  if (existingFeedCount > 0) {
    console.log(`Skipping interview seed — already have ${existingFeedCount} market_research entries`);
  } else {
    const interviewDataPath = path.join(dataRoot, 'interview_data.json');
    const interviewData: InterviewRecord[] = JSON.parse(fs.readFileSync(interviewDataPath, 'utf-8'));

    const feedEntities = interviewData.map((rec) =>
      feedRepo.create({
        user_id: null,
        title: rec.title,
        content: rec.content,
        company: rec.company,
        role: rec.role,
        outcome: rec.result,
        source: 'market_research',
        source_kind: 'coach',
        source_name: 'Coach seed',
        category: toFeedCategory(rec.category),
        author: '匿名',
      }),
    );

    await feedRepo.save(feedEntities);
    console.log(`Seeded ${feedEntities.length} interview feed items`);
  }

  // ── 3. Seed curated feed items (editorial content) ───────────────────────
  const curatedDataPath = path.join(dataRoot, 'curated_feed.json');
  const curatedData: CuratedFeedRecord[] = JSON.parse(fs.readFileSync(curatedDataPath, 'utf-8'));

  // Dedup by title+source — skip items already present
  let curatedInserted = 0;
  let curatedSkipped = 0;
  for (const rec of curatedData) {
    const existing = await feedRepo.findOne({
      where: { title: rec.title, source: rec.source },
    });
    if (existing) {
      curatedSkipped++;
      continue;
    }
    await feedRepo.save(
      feedRepo.create({
        user_id: null,
        title: rec.title,
        content: rec.content,
        company: rec.company,
        role: rec.role,
        source: rec.source,
        source_kind: toFeedSourceKind(rec.source),
        source_name: rec.source_name,
        source_url: rec.source_url,
        external_id: rec.source_url,
        category: toFeedCategory(rec.category),
        author: rec.author,
      }),
    );
    curatedInserted++;
  }
  console.log(
    `Curated feed: inserted ${curatedInserted}, skipped ${curatedSkipped} duplicates`,
  );

  await ds.destroy();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

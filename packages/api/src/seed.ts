/**
 * Seed script — populates DB with market salary & interview data.
 * Run: npx ts-node src/seed.ts
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { SalaryEntry } from './salary/entities/salary-entry.entity';
import { FeedItem } from './feed/entities/feed-item.entity';

// Resolve JSON data files relative to the repo root (two levels up from packages/api)
const dataRoot = path.resolve(__dirname, '..', '..', '..', 'data', 'seed');

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

async function seed() {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: path.resolve(__dirname, '..', 'coach-dev.db'),
    // Use glob pattern to auto-discover all entities (ts-node resolves .ts, dist resolves .js)
    entities: [path.resolve(__dirname, '**', '*.entity.{ts,js}')],
    synchronize: true,
    // Silence TypeORM logs
    logging: false,
  });

  await ds.initialize();
  console.log('Connected to DB');

  // Disable FK enforcement for the seed (market data has no real user_id)
  await ds.query('PRAGMA foreign_keys = OFF');

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
        // Market data has no user — use a sentinel value.
        // user_id is @Column() but SQLite won't enforce the FK unless PRAGMA is on.
        user_id: 'system',
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
        user_id: null as unknown as string,
        title: rec.title,
        content: rec.content,
        company: rec.company,
        role: rec.role,
        outcome: rec.result,
        source: 'market_research',
        category: rec.category ?? 'interview_exp',
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
        user_id: null as unknown as string,
        title: rec.title,
        content: rec.content,
        company: rec.company ?? (undefined as unknown as string),
        role: rec.role ?? (undefined as unknown as string),
        source: rec.source,
        source_url: rec.source_url,
        category: rec.category,
        author: rec.author,
      }),
    );
    curatedInserted++;
  }
  console.log(
    `Curated feed: inserted ${curatedInserted}, skipped ${curatedSkipped} duplicates`,
  );

  // Re-enable FK enforcement
  await ds.query('PRAGMA foreign_keys = ON');

  await ds.destroy();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

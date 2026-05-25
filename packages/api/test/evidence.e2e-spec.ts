import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EvidenceService } from '../src/intelligence/evidence.service';
import { Resume } from '../src/resumes/entities/resume.entity';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
import { Application } from '../src/applications/entities/application.entity';
import { DailyTask } from '../src/tasks/entities/daily-task.entity';
import { Opportunity } from '../src/opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../src/opportunity/entities/opportunity-evaluation.entity';
import { FeedItem } from '../src/feed/entities/feed-item.entity';
import { SalaryEntry } from '../src/salary/entities/salary-entry.entity';
import { User } from '../src/users/entities/user.entity';
import { request } from './test-utils';

describe('Evidence (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let evidenceService: EvidenceService;
  let resumeRepo: Repository<Resume>;
  let diagnosisRepo: Repository<Diagnosis>;
  let appRepo: Repository<Application>;
  let taskRepo: Repository<DailyTask>;
  let oppRepo: Repository<Opportunity>;
  let evalRepo: Repository<OpportunityEvaluation>;
  let feedRepo: Repository<FeedItem>;
  let salaryRepo: Repository<SalaryEntry>;
  let userRepo: Repository<User>;
  let userId: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    evidenceService = moduleRef.get<EvidenceService>(EvidenceService);
    resumeRepo = moduleRef.get<Repository<Resume>>(getRepositoryToken(Resume));
    diagnosisRepo = moduleRef.get<Repository<Diagnosis>>(getRepositoryToken(Diagnosis));
    appRepo = moduleRef.get<Repository<Application>>(getRepositoryToken(Application));
    taskRepo = moduleRef.get<Repository<DailyTask>>(getRepositoryToken(DailyTask));
    oppRepo = moduleRef.get<Repository<Opportunity>>(getRepositoryToken(Opportunity));
    evalRepo = moduleRef.get<Repository<OpportunityEvaluation>>(getRepositoryToken(OpportunityEvaluation));
    feedRepo = moduleRef.get<Repository<FeedItem>>(getRepositoryToken(FeedItem));
    salaryRepo = moduleRef.get<Repository<SalaryEntry>>(getRepositoryToken(SalaryEntry));
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));

    // Login to create a user and retrieve user_id
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'evidence@coach.dev', name: 'Evidence User', invite_code: 'COACH2026' });
    userId = loginRes.body.user.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── 1. gather() returns UserIntelligence with correct structure ──────

  it('gather() returns correct UserIntelligence structure', async () => {
    const intel = await evidenceService.gather(userId);

    expect(intel).toHaveProperty('user_id', userId);
    expect(intel).toHaveProperty('gathered_at');
    expect(typeof intel.gathered_at).toBe('string');
    expect(intel).toHaveProperty('resume');
    expect(intel).toHaveProperty('skills');
    expect(intel).toHaveProperty('target_roles');
    expect(intel).toHaveProperty('applications');
    expect(intel).toHaveProperty('application_companies');
    expect(intel).toHaveProperty('opportunities');
    expect(intel).toHaveProperty('opportunity_companies');
    expect(intel).toHaveProperty('diagnoses');
    expect(intel).toHaveProperty('diagnosis_patterns');
    expect(intel.diagnosis_patterns).toHaveProperty('hit');
    expect(intel.diagnosis_patterns).toHaveProperty('miss');
    expect(intel).toHaveProperty('tasks');
    expect(intel).toHaveProperty('feed_relevant');
    expect(intel).toHaveProperty('salary_context');
    expect(intel).toHaveProperty('companies_of_interest');
    expect(intel).toHaveProperty('has_resume');
    expect(intel).toHaveProperty('has_applications');
    expect(intel).toHaveProperty('has_opportunities');
  });

  // ── 2. gather() with no data ────────────────────────────────────────

  it('gather() with no data returns empty intelligence', async () => {
    // Create a fresh user with no data
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'empty@coach.dev', name: 'Empty User', invite_code: 'COACH2026' });
    const emptyUserId = loginRes.body.user.id;

    const intel = await evidenceService.gather(emptyUserId);

    expect(intel.has_resume).toBe(false);
    expect(intel.resume).toBeNull();
    expect(intel.applications).toEqual([]);
    expect(intel.opportunities).toEqual([]);
    expect(intel.diagnoses).toEqual([]);
    expect(intel.tasks).toEqual([]);
    expect(intel.feed_relevant).toEqual([]);
    expect(intel.salary_context).toEqual([]);
    expect(intel.skills).toEqual([]);
    expect(intel.target_roles).toEqual([]);
    expect(intel.application_companies).toEqual([]);
    expect(intel.companies_of_interest).toEqual([]);
    expect(intel.has_applications).toBe(false);
    expect(intel.has_opportunities).toBe(false);
  });

  // ── 3. gather() with resume ─────────────────────────────────────────

  it('gather() with resume returns has_resume=true and source_type=resume', async () => {
    const resume = resumeRepo.create({
      user_id: userId,
      title: 'Test Resume',
      raw_text: 'I am a software engineer with 5 years experience.',
      is_primary: true,
      parsed_json: {
        basic_info: { name: 'Test', email: 'test@test.com' },
        summary: 'Software engineer',
        work_experience: [
          {
            company: 'BigCo',
            title: 'SWE',
            start_date: '2020-01',
            description: 'Built things',
            achievements: ['Shipped feature'],
          },
        ],
        education: [
          {
            school: 'MIT',
            degree: 'BS',
            major: 'CS',
          },
        ],
        skills: {
          technical: ['TypeScript', 'Node.js', 'React'],
          soft: ['Leadership'],
          languages: ['English', 'Chinese'],
          certifications: [],
        },
        projects: [],
      },
    });
    await resumeRepo.save(resume);

    const intel = await evidenceService.gather(userId);

    expect(intel.has_resume).toBe(true);
    expect(intel.resume).not.toBeNull();
    expect(intel.resume!.source_type).toBe('resume');
    expect(intel.resume!.source_id).toBe(resume.id);
    expect(intel.resume!.weight).toBe(1.0);
    expect(intel.skills).toContain('TypeScript');
    expect(intel.skills).toContain('Node.js');
    expect(intel.skills).toContain('Leadership');
  });

  // ── 4. gather() with application ────────────────────────────────────

  it('gather() with application includes company in application_companies', async () => {
    const application = appRepo.create({
      user_id: userId,
      company: 'Acme Corp',
      role: 'Senior Engineer',
      stage: 'applied',
    });
    await appRepo.save(application);

    const intel = await evidenceService.gather(userId);

    expect(intel.has_applications).toBe(true);
    expect(intel.application_companies).toContain('Acme Corp');
    expect(intel.applications.length).toBeGreaterThanOrEqual(1);

    const acmeApp = intel.applications.find(
      (a) => a.structured['company'] === 'Acme Corp',
    );
    expect(acmeApp).toBeDefined();
    expect(acmeApp!.source_type).toBe('application');
    expect(acmeApp!.weight).toBe(0.9);
  });

  // ── 5. getCompaniesOfInterest() returns union ───────────────────────

  it('getCompaniesOfInterest() returns union of app + opp + diagnosis companies', async () => {
    // Application for Acme Corp was already created above.
    // Add an opportunity with a different company.
    const opp = oppRepo.create({
      user_id: userId,
      company: 'Beta Inc',
      role: 'Staff Engineer',
      jd_text: 'Looking for a staff engineer',
      status: 'evaluated',
    });
    await oppRepo.save(opp);

    // Add a diagnosis with yet another company.
    const diag = diagnosisRepo.create({
      user_id: userId,
      resume_id: (await resumeRepo.findOne({ where: { user_id: userId } }))!.id,
      jd_text: 'Gamma Ltd JD text',
      jd_company: 'Gamma Ltd',
      jd_role: 'PM',
    });
    await diagnosisRepo.save(diag);

    const companies = await evidenceService.getCompaniesOfInterest(userId);

    expect(companies).toContain('Acme Corp');
    expect(companies).toContain('Beta Inc');
    expect(companies).toContain('Gamma Ltd');
  });

  // ── 6. formatForAI() returns non-empty string ───────────────────────

  it('formatForAI() returns non-empty string containing user data references', async () => {
    const intel = await evidenceService.gather(userId);
    const formatted = evidenceService.formatForAI(intel);

    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain('用户画像');
    expect(formatted).toContain('简历');
    // Should reference the resume title or skills
    expect(formatted).toContain('Test Resume');
    // Should reference application company
    expect(formatted).toContain('Acme Corp');
  });

  // ── 7. Evidence objects have url, observed_at, weight ───────────────

  it('Evidence objects have observed_at and weight fields', async () => {
    const intel = await evidenceService.gather(userId);

    // Check resume evidence
    expect(intel.resume).not.toBeNull();
    expect(intel.resume!.observed_at).toBeDefined();
    expect(typeof intel.resume!.observed_at).toBe('string');
    expect(intel.resume!.weight).toBeDefined();
    expect(typeof intel.resume!.weight).toBe('number');

    // Check application evidence
    for (const app of intel.applications) {
      expect(app.observed_at).toBeDefined();
      expect(typeof app.observed_at).toBe('string');
      expect(app.weight).toBe(0.9);
    }

    // Check diagnosis evidence
    for (const diag of intel.diagnoses) {
      expect(diag.observed_at).toBeDefined();
      expect(diag.weight).toBe(0.7);
    }

    // Check opportunity with url
    for (const opp of intel.opportunities) {
      expect(opp.observed_at).toBeDefined();
      expect(opp.weight).toBe(0.8);
    }
  });

  // ── 8. Evidence has valid confidence and freshness ──────────────────

  it('Evidence objects have valid confidence and freshness values', async () => {
    const validConfidence = ['high', 'medium', 'low'];
    const validFreshness = ['current', 'recent', 'stale'];

    const intel = await evidenceService.gather(userId);

    if (intel.resume) {
      expect(validConfidence).toContain(intel.resume.confidence);
      expect(validFreshness).toContain(intel.resume.freshness);
    }

    for (const e of [
      ...intel.applications,
      ...intel.opportunities,
      ...intel.diagnoses,
      ...intel.tasks,
      ...intel.feed_relevant,
      ...intel.salary_context,
    ]) {
      expect(validConfidence).toContain(e.confidence);
      expect(validFreshness).toContain(e.freshness);
    }
  });

  // ── Bonus: gatherForCompany filters correctly ───────────────────────

  it('gatherForCompany() returns only evidence for the given company', async () => {
    const evidence = await evidenceService.gatherForCompany(userId, 'Acme Corp');

    expect(evidence.length).toBeGreaterThanOrEqual(1);
    for (const e of evidence) {
      const company = e.structured['company'] as string;
      expect(company.toLowerCase()).toContain('acme corp');
    }
  });

  // ── Bonus: feed and salary gathered when companies match ────────────

  it('gathers feed items matching companies of interest', async () => {
    // Seed a feed item for Acme Corp (user has application there)
    const feed = feedRepo.create({
      title: 'Acme Corp interview tips',
      content: 'Prepare for system design questions at Acme Corp',
      company: 'Acme Corp',
      role: 'Senior Engineer',
      source: 'ugc',
      source_kind: 'ugc',
      category: 'interview_exp',
      confidence: 'high',
      question_types: [],
    });
    await feedRepo.save(feed);

    const intel = await evidenceService.gather(userId);

    expect(intel.feed_relevant.length).toBeGreaterThanOrEqual(1);
    const acmeFeed = intel.feed_relevant.find(
      (f) => f.structured['company'] === 'Acme Corp',
    );
    expect(acmeFeed).toBeDefined();
    expect(acmeFeed!.source_type).toBe('feed');
    expect(acmeFeed!.weight).toBe(0.6);
  });

  it('gathers salary entries matching companies of interest', async () => {
    // Seed a salary entry for Acme Corp
    const salary = salaryRepo.create({
      user_id: userId,
      company: 'Acme Corp',
      role: 'Senior Engineer',
      base_salary: 200000,
      total_comp: 280000,
      source: 'self',
    });
    await salaryRepo.save(salary);

    const intel = await evidenceService.gather(userId);

    expect(intel.salary_context.length).toBeGreaterThanOrEqual(1);
    const acmeSal = intel.salary_context.find(
      (s) => s.structured['company'] === 'Acme Corp',
    );
    expect(acmeSal).toBeDefined();
    expect(acmeSal!.source_type).toBe('salary');
    expect(acmeSal!.weight).toBe(0.4);
  });

  // ── Bonus: rejected applications are excluded ───────────────────────

  it('gather() excludes rejected applications', async () => {
    const rejected = appRepo.create({
      user_id: userId,
      company: 'Rejected Co',
      role: 'Tester',
      stage: 'rejected',
    });
    await appRepo.save(rejected);

    const intel = await evidenceService.gather(userId);

    const rejectedApp = intel.applications.find(
      (a) => a.structured['company'] === 'Rejected Co',
    );
    expect(rejectedApp).toBeUndefined();
  });
});

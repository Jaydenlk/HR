import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 初始 Schema —— 从仓库当前全部实体逐表手写(本机无 Postgres/Docker,无法 migration:generate,故手写以保证可审计)。
 *
 * 类型映射依据 TypeORM 1.0 PostgresDriver(已核实源码):
 *  - @PrimaryGeneratedColumn('uuid') → uuid，默认 gen_random_uuid()(data-source 设 uuidExtension='pgcrypto')
 *  - @Column()(默认 string) → character varying NOT NULL
 *  - @Column('text') / type:'text' → text
 *  - simple-json → text(TypeORM 在 PG 上把 simple-json 落为 text,JSON.stringify 存取)
 *  - @Column('float') → double precision；type:'real' → real
 *  - type:'int'/'integer' → integer
 *  - type:'date' → date
 *  - 可空时间列(Date | null)→ timestamp without time zone
 *    (实体侧用 TIMESTAMP_COLUMN_TYPE 按 DB_TYPE 取值:postgres 落 timestamp、better-sqlite3 落 datetime,双端兼容;
 *     见 src/database/column-types.ts)
 *  - @CreateDateColumn/@UpdateDateColumn → timestamp NOT NULL DEFAULT now()
 *  - 布尔默认 → boolean NOT NULL DEFAULT false
 *
 * 外键策略:先建全部表(无内联 FK),再统一 ADD CONSTRAINT,规避建表顺序陷阱;down 逆序。
 * 所有 FK 的 onDelete 与实体装饰器一致(CASCADE / SET NULL)。
 */
export class InitialSchema1781186894991 implements MigrationInterface {
  name = 'InitialSchema1781186894991';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() 需 pgcrypto;PG13+ 多为内置,IF NOT EXISTS 幂等。
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "avatar_url" character varying,
        "invite_code" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'user',
        "status" character varying NOT NULL DEFAULT 'active',
        "daily_quota_override" integer,
        "locale" character varying NOT NULL DEFAULT 'zh',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // ── login_codes ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "login_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "code_hash" character varying NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_codes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_login_codes_email" ON "login_codes" ("email")`);

    // ── invite_codes ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "invite_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying NOT NULL,
        "max_uses" integer NOT NULL DEFAULT 1,
        "used_count" integer NOT NULL DEFAULT 0,
        "disabled" boolean NOT NULL DEFAULT false,
        "note" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invite_codes_code" UNIQUE ("code"),
        CONSTRAINT "PK_invite_codes" PRIMARY KEY ("id")
      )
    `);

    // ── ai_usage ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "ai_usage" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "endpoint" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_usage" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_ai_usage_user_id_created_at" ON "ai_usage" ("user_id", "created_at")`);

    // ── resumes ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "resumes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "raw_text" text NOT NULL,
        "parsed_json" text,
        "file_url" character varying,
        "file_type" character varying,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resumes" PRIMARY KEY ("id")
      )
    `);

    // ── resume_versions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "resume_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "resume_id" uuid NOT NULL,
        "version_num" integer NOT NULL,
        "raw_text" text NOT NULL,
        "parsed_json" text,
        "change_note" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_versions" PRIMARY KEY ("id")
      )
    `);

    // ── diagnoses ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "diagnoses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "jd_text" text,
        "jd_parsed" text,
        "profession" character varying,
        "preset_id" character varying,
        "tier" character varying,
        "mode" character varying NOT NULL DEFAULT 'jd_match',
        "jd_company" character varying,
        "jd_role" character varying,
        "score" integer,
        "dimensions" text,
        "keywords_hit" text,
        "keywords_miss" text,
        "suggestions" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_diagnoses" PRIMARY KEY ("id")
      )
    `);

    // ── applications ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company" character varying NOT NULL,
        "role" character varying NOT NULL,
        "location" character varying,
        "stage" character varying NOT NULL DEFAULT 'wishlist',
        "salary_range" character varying,
        "deadline" character varying,
        "referrer" character varying,
        "notes" text,
        "resume_id" character varying,
        "diagnosis_id" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id")
      )
    `);

    // ── application_events ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "application_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_stage" character varying,
        "to_stage" character varying NOT NULL,
        "note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_events" PRIMARY KEY ("id")
      )
    `);

    // ── conversations ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" character varying,
        "context_type" character varying NOT NULL DEFAULT 'free',
        "context_id" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )
    `);

    // ── messages ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "role" character varying NOT NULL,
        "content" text NOT NULL,
        "rich_card" text,
        "tool_used" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id")
      )
    `);

    // ── cover_letters ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cover_letters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "application_id" character varying,
        "resume_id" character varying,
        "tone" character varying NOT NULL DEFAULT 'warm',
        "length_words" integer,
        "company" character varying,
        "role" character varying,
        "jd_text" text,
        "content" text NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cover_letters" PRIMARY KEY ("id")
      )
    `);

    // ── interviews ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "interviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "application_id" uuid,
        "company" character varying,
        "role" character varying,
        "round" character varying NOT NULL,
        "interview_at" character varying,
        "duration_min" integer,
        "interviewer" character varying,
        "audio_url" character varying,
        "transcript" text,
        "overall_grade" character varying,
        "overall_note" text,
        "scores" text,
        "questions" text,
        "prediction" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interviews" PRIMARY KEY ("id")
      )
    `);

    // ── mock_sessions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mock_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "application_id" character varying,
        "company" character varying,
        "role" character varying,
        "jd_text" text,
        "mode" character varying NOT NULL DEFAULT 'text',
        "status" character varying NOT NULL DEFAULT 'in_progress',
        "questions" text,
        "answers" text,
        "evaluation" text,
        "total_filler_count" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mock_sessions" PRIMARY KEY ("id")
      )
    `);

    // ── daily_tasks ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "daily_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "task_date" character varying NOT NULL,
        "title" character varying NOT NULL,
        "duration_min" integer,
        "task_type" character varying NOT NULL,
        "reason" text,
        "status" character varying NOT NULL DEFAULT 'todo',
        "linked_type" character varying,
        "linked_id" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_daily_tasks" PRIMARY KEY ("id")
      )
    `);

    // ── salary_entries ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "salary_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company" character varying NOT NULL,
        "role" character varying NOT NULL,
        "location" character varying,
        "base_salary" double precision NOT NULL,
        "bonus" double precision,
        "stock_value" double precision,
        "total_comp" double precision NOT NULL,
        "level" character varying,
        "source" character varying NOT NULL DEFAULT 'self',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_salary_entries" PRIMARY KEY ("id")
      )
    `);

    // ── companies ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "aliases" text NOT NULL DEFAULT '[]',
        "bu_aliases" text NOT NULL DEFAULT '[]',
        "company_type" character varying NOT NULL,
        "priority" character varying NOT NULL DEFAULT 'C',
        "source_preference" character varying NOT NULL DEFAULT 'both',
        "role_focus" text NOT NULL DEFAULT '[]',
        "sector" character varying,
        "reason_type" character varying NOT NULL DEFAULT 'product_judgment',
        "reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_companies_name" UNIQUE ("name"),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    // ── departments ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "aliases" text NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);

    // ── role_categories ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "role_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_key" character varying NOT NULL,
        "label" character varying NOT NULL,
        "aliases" text NOT NULL DEFAULT '[]',
        "source_preference" character varying NOT NULL DEFAULT 'both',
        "question_taxonomy" text NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_categories_role_key" UNIQUE ("role_key"),
        CONSTRAINT "PK_role_categories" PRIMARY KEY ("id")
      )
    `);

    // ── feed_sources ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "feed_sources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "kind" character varying NOT NULL,
        "name" character varying NOT NULL,
        "homepage_url" character varying(1000),
        "config_key" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        "description" text,
        "last_run_at" TIMESTAMP,
        "fail_count" integer NOT NULL DEFAULT 0,
        "success_count" integer NOT NULL DEFAULT 0,
        "last_success_at" TIMESTAMP,
        "last_failure_at" TIMESTAMP,
        "last_error" text,
        "health" character varying NOT NULL DEFAULT 'unknown',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feed_sources" PRIMARY KEY ("id")
      )
    `);

    // ── coverage_metrics ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coverage_metrics" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" character varying NOT NULL,
        "role_category_id" character varying NOT NULL,
        "quarter" character varying NOT NULL,
        "source" character varying NOT NULL,
        "target_count" integer NOT NULL DEFAULT 0,
        "valid_count" integer NOT NULL DEFAULT 0,
        "freshness_score" real NOT NULL DEFAULT 0,
        "confidence_score" real NOT NULL DEFAULT 0,
        "gap_level" character varying NOT NULL DEFAULT 'critical',
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coverage_metrics" PRIMARY KEY ("id")
      )
    `);

    // ── feed_items ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "feed_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "company" character varying,
        "role" character varying,
        "outcome" character varying,
        "source" character varying NOT NULL DEFAULT 'ugc',
        "source_kind" character varying NOT NULL DEFAULT 'ugc',
        "source_name" character varying,
        "source_id" uuid,
        "category" character varying NOT NULL DEFAULT 'interview_exp',
        "source_url" character varying(1000),
        "external_id" character varying,
        "fetched_at" TIMESTAMP,
        "published_at" TIMESTAMP,
        "date_confidence" character varying NOT NULL DEFAULT 'unknown',
        "summary" text,
        "tags_json" text,
        "quality_score" integer NOT NULL DEFAULT 0,
        "author" character varying,
        "company_id" uuid,
        "department_id" uuid,
        "role_category_id" uuid,
        "confidence" character varying NOT NULL DEFAULT 'medium',
        "interview_round" character varying,
        "question_types" text NOT NULL DEFAULT '[]',
        "difficulty" character varying,
        "quarter" character varying,
        "department" character varying,
        "role_category" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feed_items" PRIMARY KEY ("id")
      )
    `);

    // ── digest_runs ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "digest_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "source_id" uuid,
        "status" character varying NOT NULL,
        "fetched_count" integer NOT NULL DEFAULT 0,
        "saved_count" integer NOT NULL DEFAULT 0,
        "skipped_count" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_digest_runs" PRIMARY KEY ("id")
      )
    `);

    // ── opportunities ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "opportunities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company" character varying,
        "role" character varying,
        "location" character varying,
        "employment_type" character varying,
        "source_platform" character varying,
        "source_url" character varying,
        "jd_text" text NOT NULL,
        "jd_snapshot" text,
        "status" character varying NOT NULL DEFAULT 'draft',
        "application_id" character varying,
        "error_message" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_opportunities" PRIMARY KEY ("id")
      )
    `);

    // ── opportunity_actions ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "opportunity_actions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "opportunity_id" uuid NOT NULL,
        "action_type" character varying NOT NULL,
        "title" character varying NOT NULL,
        "reason" text NOT NULL,
        "due_date" date,
        "linked_task_id" character varying,
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_opportunity_actions" PRIMARY KEY ("id")
      )
    `);

    // ── opportunity_evaluations ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "opportunity_evaluations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "opportunity_id" uuid NOT NULL,
        "match_score" real NOT NULL DEFAULT 0,
        "value_score" real NOT NULL DEFAULT 0,
        "credibility_score" real NOT NULL DEFAULT 0,
        "overall_score" real NOT NULL DEFAULT 0,
        "recommendation" character varying NOT NULL DEFAULT 'neutral',
        "confidence" character varying NOT NULL DEFAULT 'insufficient',
        "risk_flags" text NOT NULL DEFAULT '[]',
        "strengths" text NOT NULL DEFAULT '[]',
        "gaps" text NOT NULL DEFAULT '[]',
        "next_actions" text NOT NULL DEFAULT '[]',
        "raw_ai_response" text,
        "model_version" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_opportunity_evaluations" PRIMARY KEY ("id")
      )
    `);

    // ── opportunity_evidence ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "opportunity_evidence" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "opportunity_id" uuid NOT NULL,
        "kind" character varying NOT NULL,
        "source_platform" character varying,
        "source_url" character varying,
        "title" character varying NOT NULL,
        "excerpt" text NOT NULL,
        "company" character varying,
        "role" character varying,
        "published_at" TIMESTAMP,
        "fetched_at" TIMESTAMP,
        "confidence" character varying NOT NULL DEFAULT 'medium',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_opportunity_evidence" PRIMARY KEY ("id")
      )
    `);

    // ── ops_events ───────────────────────────────────────────────────────────
    // 运维事件流水(AI 降级/两通道皆败/队列满)。无 FK;detail 为 simple-json → text。
    // 复合索引 (type, created_at) 与实体 @Index(['type','created_at']) 一致。
    await queryRunner.query(`
      CREATE TABLE "ops_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL,
        "detail" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ops_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_ops_events_type_created_at" ON "ops_events" ("type", "created_at")`);

    // ── 外键约束(统一追加;onDelete 与实体一致) ─────────────────────────────
    await queryRunner.query(`ALTER TABLE "resumes" ADD CONSTRAINT "FK_resumes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "resume_versions" ADD CONSTRAINT "FK_resume_versions_resume" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "diagnoses" ADD CONSTRAINT "FK_diagnoses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "diagnoses" ADD CONSTRAINT "FK_diagnoses_resume" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "application_events" ADD CONSTRAINT "FK_application_events_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_cover_letters_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "interviews" ADD CONSTRAINT "FK_interviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "interviews" ADD CONSTRAINT "FK_interviews_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "mock_sessions" ADD CONSTRAINT "FK_mock_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "daily_tasks" ADD CONSTRAINT "FK_daily_tasks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "salary_entries" ADD CONSTRAINT "FK_salary_entries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "feed_items" ADD CONSTRAINT "FK_feed_items_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "feed_items" ADD CONSTRAINT "FK_feed_items_source" FOREIGN KEY ("source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "feed_items" ADD CONSTRAINT "FK_feed_items_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "feed_items" ADD CONSTRAINT "FK_feed_items_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "feed_items" ADD CONSTRAINT "FK_feed_items_role_category" FOREIGN KEY ("role_category_id") REFERENCES "role_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "digest_runs" ADD CONSTRAINT "FK_digest_runs_source" FOREIGN KEY ("source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "opportunities" ADD CONSTRAINT "FK_opportunities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "opportunity_actions" ADD CONSTRAINT "FK_opportunity_actions_opportunity" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "opportunity_evaluations" ADD CONSTRAINT "FK_opportunity_evaluations_opportunity" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "FK_opportunity_evidence_opportunity" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 先撤外键,再删表(与 up 逆序),避免依赖冲突。
    await queryRunner.query(`ALTER TABLE "opportunity_evidence" DROP CONSTRAINT "FK_opportunity_evidence_opportunity"`);
    await queryRunner.query(`ALTER TABLE "opportunity_evaluations" DROP CONSTRAINT "FK_opportunity_evaluations_opportunity"`);
    await queryRunner.query(`ALTER TABLE "opportunity_actions" DROP CONSTRAINT "FK_opportunity_actions_opportunity"`);
    await queryRunner.query(`ALTER TABLE "opportunities" DROP CONSTRAINT "FK_opportunities_user"`);
    await queryRunner.query(`ALTER TABLE "digest_runs" DROP CONSTRAINT "FK_digest_runs_source"`);
    await queryRunner.query(`ALTER TABLE "feed_items" DROP CONSTRAINT "FK_feed_items_role_category"`);
    await queryRunner.query(`ALTER TABLE "feed_items" DROP CONSTRAINT "FK_feed_items_department"`);
    await queryRunner.query(`ALTER TABLE "feed_items" DROP CONSTRAINT "FK_feed_items_company"`);
    await queryRunner.query(`ALTER TABLE "feed_items" DROP CONSTRAINT "FK_feed_items_source"`);
    await queryRunner.query(`ALTER TABLE "feed_items" DROP CONSTRAINT "FK_feed_items_user"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_company"`);
    await queryRunner.query(`ALTER TABLE "salary_entries" DROP CONSTRAINT "FK_salary_entries_user"`);
    await queryRunner.query(`ALTER TABLE "daily_tasks" DROP CONSTRAINT "FK_daily_tasks_user"`);
    await queryRunner.query(`ALTER TABLE "mock_sessions" DROP CONSTRAINT "FK_mock_sessions_user"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP CONSTRAINT "FK_interviews_application"`);
    await queryRunner.query(`ALTER TABLE "interviews" DROP CONSTRAINT "FK_interviews_user"`);
    await queryRunner.query(`ALTER TABLE "cover_letters" DROP CONSTRAINT "FK_cover_letters_user"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversation"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_user"`);
    await queryRunner.query(`ALTER TABLE "application_events" DROP CONSTRAINT "FK_application_events_application"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_user"`);
    await queryRunner.query(`ALTER TABLE "diagnoses" DROP CONSTRAINT "FK_diagnoses_resume"`);
    await queryRunner.query(`ALTER TABLE "diagnoses" DROP CONSTRAINT "FK_diagnoses_user"`);
    await queryRunner.query(`ALTER TABLE "resume_versions" DROP CONSTRAINT "FK_resume_versions_resume"`);
    await queryRunner.query(`ALTER TABLE "resumes" DROP CONSTRAINT "FK_resumes_user"`);

    await queryRunner.query(`DROP INDEX "IDX_ops_events_type_created_at"`);
    await queryRunner.query(`DROP TABLE "ops_events"`);
    await queryRunner.query(`DROP TABLE "opportunity_evidence"`);
    await queryRunner.query(`DROP TABLE "opportunity_evaluations"`);
    await queryRunner.query(`DROP TABLE "opportunity_actions"`);
    await queryRunner.query(`DROP TABLE "opportunities"`);
    await queryRunner.query(`DROP TABLE "digest_runs"`);
    await queryRunner.query(`DROP TABLE "feed_items"`);
    await queryRunner.query(`DROP TABLE "coverage_metrics"`);
    await queryRunner.query(`DROP TABLE "feed_sources"`);
    await queryRunner.query(`DROP TABLE "role_categories"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TABLE "salary_entries"`);
    await queryRunner.query(`DROP TABLE "daily_tasks"`);
    await queryRunner.query(`DROP TABLE "mock_sessions"`);
    await queryRunner.query(`DROP TABLE "interviews"`);
    await queryRunner.query(`DROP TABLE "cover_letters"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "application_events"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "diagnoses"`);
    await queryRunner.query(`DROP TABLE "resume_versions"`);
    await queryRunner.query(`DROP TABLE "resumes"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_usage_user_id_created_at"`);
    await queryRunner.query(`DROP TABLE "ai_usage"`);
    await queryRunner.query(`DROP TABLE "invite_codes"`);
    await queryRunner.query(`DROP INDEX "IDX_login_codes_email"`);
    await queryRunner.query(`DROP TABLE "login_codes"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}

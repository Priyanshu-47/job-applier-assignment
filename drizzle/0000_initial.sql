-- Initial schema for Job Alert System

CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"location" text NOT NULL DEFAULT '',
	"remote_status" text NOT NULL DEFAULT 'unknown',
	"skills" text[] NOT NULL DEFAULT '{}',
	"salary_min" integer,
	"salary_max" integer,
	"source_file_date" timestamp,
	"observed_at" timestamp NOT NULL DEFAULT now(),
	"content_hash" text NOT NULL,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_external_id_idx" ON "jobs" ("external_id");
CREATE INDEX IF NOT EXISTS "jobs_content_hash_idx" ON "jobs" ("content_hash");

CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL DEFAULT 'default-user',
	"name" text NOT NULL DEFAULT '',
	"raw_query" text NOT NULL,
	"filters" jsonb NOT NULL,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "alerts_user_id_idx" ON "alerts" ("user_id");

CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"score" integer NOT NULL DEFAULT 0,
	"reasons" jsonb NOT NULL DEFAULT '[]',
	"matched_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "matches_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "matches_alert_job_idx" ON "matches" ("alert_id", "job_id");
CREATE INDEX IF NOT EXISTS "matches_alert_id_idx" ON "matches" ("alert_id");
CREATE INDEX IF NOT EXISTS "matches_job_id_idx" ON "matches" ("job_id");

CREATE TABLE IF NOT EXISTS "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"alert_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"attempts" integer NOT NULL DEFAULT 0,
	"max_attempts" integer NOT NULL DEFAULT 3,
	"last_error" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	"sent_at" timestamp,
	CONSTRAINT "outbox_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "outbox_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "outbox_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS "outbox_status_idx" ON "outbox" ("status");
CREATE INDEX IF NOT EXISTS "outbox_alert_job_idx" ON "outbox" ("alert_id", "job_id");

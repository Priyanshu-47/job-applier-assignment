import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    remoteStatus: text("remote_status").notNull().default("unknown"),
    skills: text("skills").array().notNull().default([]),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    sourceFileDate: timestamp("source_file_date"),
    observedAt: timestamp("observed_at").notNull().defaultNow(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("jobs_external_id_idx").on(table.externalId),
    index("jobs_content_hash_idx").on(table.contentHash),
  ]
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().default("default-user"),
    name: text("name").notNull().default(""),
    rawQuery: text("raw_query").notNull(),
    filters: jsonb("filters").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("alerts_user_id_idx").on(table.userId)]
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    score: integer("score").notNull().default(0),
    reasons: jsonb("reasons").notNull().default([]),
    matchedAt: timestamp("matched_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matches_alert_job_idx").on(table.alertId, table.jobId),
    index("matches_alert_id_idx").on(table.alertId),
    index("matches_job_id_idx").on(table.jobId),
  ]
);

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
  },
  (table) => [
    index("outbox_status_idx").on(table.status),
    uniqueIndex("outbox_alert_job_idx").on(table.alertId, table.jobId),
  ]
);

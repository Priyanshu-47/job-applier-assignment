-- Dedup notifications: one outbox row per alert-job pair
DROP INDEX IF EXISTS "outbox_alert_job_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_alert_job_idx" ON "outbox" ("alert_id", "job_id");

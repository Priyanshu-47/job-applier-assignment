# Architecture

This document separates **what this repository implements today** from a **production scale-up plan** (150k+ alerts, 10k jobs in a burst, 1.8M ingest rows/day, 50k notifications/day). Scale-up sections are not current behavior.

## Current implementation

Stack: Next.js App Router, TypeScript, PostgreSQL (Drizzle), Docker Compose. UI is two pages (`/alerts`, `/dashboard`) plus JSON APIs. There is no `src/components/` module.

**APIs:** `POST /api/alerts/parse`, `GET/POST/DELETE /api/alerts`, `POST /api/jobs/ingest`, `POST /api/matches/run`, `POST /api/outbox/process` (`batchSize`), `GET /api/outbox/stats`.

### Matcher (current)

`matchJobToAlert` is deterministic substring matching (normalize case/whitespace): exclude terms, roles, **all** required skills, industry, location, remote preference, optional `minSalary`. No LLM, no external matching library. Same inputs → same score and reasons.

`runMatching` loads all active alerts and all jobs, then nested-loops **every alert against every job**. There is **no inverted index, no candidate generation, and no SQL prefilter**. Complexity today is **O(alerts × jobs)** plus a per-hit insert. Matches use UNIQUE `(alert_id, job_id)` with `ON CONFLICT DO NOTHING`. Live path passes `salaryMax` into the matcher.

### Ingestion (current)

`ingestJobs` walks the payload **one row at a time**: validate, SHA-256 hash of stable fields (title, company, description, location, remote status, skills, salary), `SELECT` by `external_id`, then single-row `INSERT` or `UPDATE`. This is **not** COPY, staging, or set-based upsert. `observedAt` is stamped server-side (`now`), not taken from the payload. Counts (`new`, `contentChanged`, `freshnessOnly`, `unchanged`, `rejected`) are computed in that loop. `jobs.external_id` is unique.

### Outbox (current)

On a newly inserted match, one outbox row is inserted with `ON CONFLICT DO NOTHING` targeting `(alert_id, job_id)`. Schema `uniqueIndex("outbox_alert_job_idx")` is UNIQUE on that pair (migration `0001_outbox_unique_alert_job.sql`; apply it if the database still has the original non-unique index).

Worker (`processOutbox`): (1) requeue `processing` rows whose `updated_at` is older than 5 minutes back to `pending`; (2) claim `pending` or retryable `failed` rows (`attempts < maxAttempts`) with `SELECT … FOR UPDATE SKIP LOCKED`; (3) mark `processing` and simulate send (`console.log`, no real email). Statuses: pending → processing → sent/failed. Default `maxAttempts` is 3. **Not implemented:** exponential backoff, token-bucket / 50k-per-day rate limiting, dead-letter queue.

### AI (current)

LLM is used only to parse natural language into Zod-validated `AlertFilters`. Default client is a deterministic fake adapter (`LLM_PROVIDER=fake`); OpenAI is optional with a 5s fetch timeout. Failures (including timeout) use keyword fallback. Prompt is system instructions plus the current query only. Observability: provider, model, latency, success, tokens when present; prompt text is not logged.

### Tenancy (current)

**No real multi-tenant isolation.** `alerts.user_id` is a text column defaulting to `"default-user"`. There is no auth, no RLS, no tenant foreign key on jobs/matches/outbox. Any caller can read/write all rows. PostgreSQL RLS is not enabled.

---

## Production scale-up plan (not implemented)

### Matching at 150k alerts × 10k jobs

Naive nested loop is ~1.5e9 comparisons per burst — acceptable only for this demo’s tiny tables.

**Plan:** inverted indexes (skill, location, remote, role/keyword → job ids). For each alert, generate a candidate set (e.g. skill intersection, then location/remote filters), score only candidates. Target complexity **O(jobs × avg_candidates)** or **O(alerts × k)** with k ≪ jobs (often 1–5% of jobs). Queue batches (~1000 alerts), bounded workers, backpressure on the run API, resumable checkpoints. Scoring function stays the same; only candidate narrowing changes.

### Ingestion at 1.8M rows/day

Per-row SELECT/UPDATE cannot hit ~1000 rows/s sustainably.

**Plan:** COPY (or multi-row insert) into an UNLOGGED staging table; set-based `INSERT … SELECT` / `UPDATE … FROM` / `MERGE` joining staging to `jobs` on `external_id`, comparing `content_hash`; rewrite stable columns only on hash change; bump freshness metadata otherwise. Optionally drop/rebuild secondary indexes around the load. Pipeline: object store → worker → staging → merge → `jobs`.

### Notifications at 50k/day (design-only)

Keep UNIQUE `(alert_id, job_id)` and SKIP LOCKED claims. **Add (not in repo):** token bucket (~50k/day plus per-user caps), scheduled exponential backoff (e.g. 1s–5min) instead of immediate retry on the next process call, a DLQ/status for exhausted attempts, metrics on pending/failed rate, SES (or equivalent) behind the outbox.

### RLS / tenant isolation (plan, not current)

Introduce a real `tenant_id` (or authenticated `user_id`) on alerts, jobs (if partitioned by tenant), matches, and outbox. Enable PostgreSQL RLS (`USING (tenant_id = current_setting('app.tenant_id')::uuid)`). App sets the session variable after JWT auth. No cross-tenant rows in LLM prompts. Default `"default-user"` is removed.

---

## Zero-downtime Supabase → AWS migration (plan)

**Expand.** Stand up RDS PostgreSQL. Use logical replication (or equivalent continuous sync) so Supabase remains primary while RDS warms. Both systems stay live; no cutover yet.

**Validate continuously.** Before moving traffic: row counts, per-table checksums (or hash aggregates of primary keys + updated_at), replication lag SLOs. Fail expand if drift exceeds threshold.

**Reads first.** Feature flag serves reads from RDS for a canary; shadow mode still queries Supabase and logs mismatches. Rollback = flip the flag to Supabase. No backup restore.

**Bounded dual-write (writes only after reads are good).** Short window: application writes both (or write RDS and verify replication). Keep dual-write duration explicit (hours, not weeks of unbounded dual-write as the first step). Rollback still = flag back to Supabase as source of truth.

**Contract.** After a defined rollback-safety window (e.g. 24–48h of clean RDS-primary metrics), stop writes to Supabase, disable replication, archive, delete dual-write paths. **After decommission, rollback is restore-from-backup / rebuild, not a flag flip.**

**Auth.** Prefer copying password hashes if the hasher is compatible (bcrypt/argon as used by GoTrue) so users are not force-reset. If not compatible: dual-issuer JWT shim (accept Supabase JWTs and new issuer JWTs) until sessions expire; then single issuer (Cognito or RDS-backed auth). Same user UUIDs on both sides.

---

## AWS essentials (target, not this repo)

| Piece | Role | Failure mode |
| --- | --- | --- |
| RDS PostgreSQL (Multi-AZ) | System of record | AZ loss → failover; lag on replicas |
| SQS | Ingest/outbox buffer | Poison messages → DLQ (planned); visibility timeout covers workers |
| Lambda or ECS worker | Match, ingest merge, outbox | Lambda 15m cap → ECS for long merges |
| S3 | Job files, archives | Put fail → retry; versioning for rollback copies |
| CloudFront + app (ECS/Lambda) | UI/API | Origin fail → cached GET only |
| SES | Email | Bounce/complaint; outbox retries then fail |
| Secrets Manager | DB/API keys | Rotation miss → auth errors |

Tradeoff: RDS first, Aurora later if needed. SQS not SNS: one consumer group per pipeline, not fan-out.

Data flow (planned): User → CloudFront → app → RDS; S3 → ingest worker → RDS; match worker → outbox → SQS/SES.

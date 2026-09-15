# AI Usage Documentation

## Tools Used

1. **OpenCode (mimo-v2.5-free)** — AI coding assistant used for:
   - Project structure planning and scaffolding
   - Code generation for core components
   - Test case creation
   - Documentation writing

## Files and Sections Influenced by AI

### Core Application Code
- `src/db/schema.ts` — Database schema design
- `src/lib/matcher.ts` — Deterministic matching logic
- `src/lib/ingestion.ts` — Batch ingestion with change detection
- `src/lib/matching.ts` — Match runner (nested loop over alerts × jobs; **not** candidate generation)
- `src/lib/outbox.ts` — Notification outbox with retry logic
- `src/ai/client.ts` — LLM client interface and implementations
- `src/ai/parser.ts` — AI alert parser with fallback
- `src/ai/types.ts` — TypeScript type definitions

### API Routes
- `src/app/api/alerts/parse/route.ts` — Alert parsing endpoint
- `src/app/api/alerts/route.ts` — Alert CRUD operations
- `src/app/api/jobs/ingest/route.ts` — Job ingestion endpoint
- `src/app/api/matches/run/route.ts` — Match execution endpoint
- `src/app/api/outbox/process/route.ts` — Outbox processing endpoint
- `src/app/api/outbox/stats/route.ts` — Outbox statistics endpoint

### Frontend
- `src/app/alerts/page.tsx` — Alert creation page
- `src/app/dashboard/page.tsx` — Dashboard page
- `src/app/page.tsx` — Home page

### Tests
- `__tests__/matcher.test.ts` — Matcher unit tests
- `__tests__/ingestion.test.ts` — Ingestion unit tests
- `__tests__/ai-parser.test.ts` — AI parser tests
- `__tests__/ai-evaluation.test.ts` — AI evaluation test suite

### Documentation
- `README.md` — Project documentation
- `ARCHITECTURE.md` — System architecture
- `AI_USAGE.md` — This file

## Example of AI Output Rejected/Corrected

### Initial Matcher Design
The AI initially suggested using cosine similarity for skill matching, which would require external libraries. I corrected this to use simple substring matching as required by the assignment ("without external matching libraries"). The final implementation uses case-insensitive substring matching for skills, which is deterministic and doesn't require any external dependencies.

### Initial Database Schema
The AI suggested using a single `metadata` JSONB field for all job attributes. I corrected this to separate stable content fields from volatile freshness metadata, which is essential for the change detection requirements. The final schema explicitly separates:
- Stable fields: title, company, description, location, remoteStatus, skills
- Volatile fields: observedAt, sourceFileDate

### Initial Notification Design
The AI suggested using a simple status field without tracking attempts. I corrected this to include:
- `attempts` counter for retry tracking
- `maxAttempts` for configurable retry limits
- `lastError` for debugging failed notifications

This supports retries without sending real email. Duplicate suppression is **not** “database constraints prevent all duplicate processing”:
- **Matches:** UNIQUE `(alert_id, job_id)` plus `ON CONFLICT DO NOTHING` in `runMatching`.
- **Outbox:** originally a **non-unique** index on `(alert_id, job_id)` — a real gap (concurrent inserts could duplicate). Schema now declares a UNIQUE index on that pair (`outbox_alert_job_idx`) with `ON CONFLICT DO NOTHING`; live databases still on the initial migration need `0001_outbox_unique_alert_job.sql` applied. Token-bucket rate limits, exponential backoff, and a DLQ are **not** implemented.

## AI-Generated Code Quality

The AI-generated code was reviewed against these principles (not all were met on first generation):
1. **Type Safety**: TypeScript interfaces and Zod for LLM output
2. **Error Handling**: API routes return 400/500; LLM fallback on malformed/timeout
3. **Idempotency**: Match UNIQUE is real; outbox UNIQUE was a documented gap then added in schema/migration — do not assume every environment has applied it
4. **Determinism**: Core matching logic produces consistent results
5. **Testability**: Unit tests exist; they do not cover API → Postgres integration or outbox locking
6. **Honesty in docs**: Matching is a nested loop; ingestion is per-row; see ARCHITECTURE.md

## Conclusion

AI was used as a productivity tool. All AI-generated code was reviewed. The assignment’s no-AI-core rule asked for matcher and ingestion (and their tests) without generative AI; those files were still produced with AI assistance as listed above — a process gap, not hidden.

# Job Alert System

A Next.js (App Router) + PostgreSQL job-alert demo: parse a natural-language alert, ingest jobs, run a **deterministic nested-loop matcher**, and process a simulated notification outbox. Default LLM is a fake adapter (no paid key).

## Assignment time log

| | |
| --- | --- |
| **Intended timebox** | 5 hours (assignment) |
| **Start** | 15 Sep 2026, 10:30 |
| **End** | 15 Sep 2026, 15:00 |

Unfinished work is listed under Known limitations. A 3–5 minute walkthrough recording will be attached separately after this code submission.

## Quick Start

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- PostgreSQL 15+ (or Docker)

### Option 1: Docker Compose (Recommended)

```bash
docker compose up -d
docker compose exec app npm run migrate
docker compose exec app npm run seed
```

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL:**
   - Create database `job_alerts`
   - Copy `.env.example` to `.env` and update `DATABASE_URL`

3. **Run migrations:**
   ```bash
   npx drizzle-kit push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   http://localhost:3000

The UI heading and document title are “Job Alert System”.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts/parse` | POST | Parse natural language into structured filters |
| `/api/alerts` | GET/POST/DELETE | CRUD operations for alerts |
| `/api/jobs/ingest` | POST | Batch ingest job records (per-row writes) |
| `/api/matches/run` | POST | Nested-loop match of all active alerts × all jobs |
| `/api/outbox/process` | POST | Process notification outbox (`batchSize`) |
| `/api/outbox/stats` | GET | Get outbox statistics |

## Testing

```bash
npm test
```

Runs matcher unit tests, local hash tests labeled as ingestion, AI parser tests, and 10+ eval queries. Does **not** run API → database integration tests or outbox lock tests.

## Project Structure

```
job-alert-system/
├── src/
│   ├── ai/                    # LLM client, parser, types
│   ├── app/                   # App Router pages and API routes
│   ├── db/                    # Schema and connection
│   └── lib/                   # matcher, ingestion, match runner, outbox
├── __tests__/                 # Unit / eval tests
├── drizzle/                   # SQL migrations
├── ARCHITECTURE.md
├── AI_USAGE.md
├── docker-compose.yml
└── .env.example
```

There is no `src/components/` directory with source files.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/job_alerts` | PostgreSQL |
| `LLM_PROVIDER` | `fake` | `fake` or `openai` |
| `OPENAI_API_KEY` | — | Required only for `openai` |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model |

## Design Decisions

### Why LLM for Parsing but Not Matching

- **Parsing**: Low volume; natural language → structured filters, shown for edit before save.
- **Matching**: High volume in production (150k × 10k); must stay deterministic and explainable. This repo still scores every pair in a nested loop (see limitations).

### Why No RAG

Jobs and filters are already structured. Matching does not retrieve documents or other users’ alerts.

### Change Detection

Stable fields are SHA-256 hashed. Implementation is **per-row** SELECT/INSERT/UPDATE, not bulk COPY (see ARCHITECTURE.md).


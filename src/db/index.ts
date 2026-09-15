import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/job_alerts",
});

export const db = drizzle(pool, { schema });

export async function closePool() {
  await pool.end();
}

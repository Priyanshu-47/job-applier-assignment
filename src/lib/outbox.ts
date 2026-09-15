import { db } from "../db";
import { outbox, matches, alerts, jobs } from "../db/schema";
import { eq, and, lt, or, sql } from "drizzle-orm";

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}

const STALE_PROCESSING_MS = 5 * 60 * 1000;

export async function processOutbox(batchSize: number = 100): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, retried: 0 };

  const pendingItems = await db.transaction(async (tx) => {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    await tx
      .update(outbox)
      .set({
        status: "pending",
        updatedAt: new Date(),
      })
      .where(and(eq(outbox.status, "processing"), lt(outbox.updatedAt, staleBefore)));

    const claimed = await tx
      .select()
      .from(outbox)
      .where(
        or(
          eq(outbox.status, "pending"),
          and(eq(outbox.status, "failed"), sql`${outbox.attempts} < ${outbox.maxAttempts}`)
        )
      )
      .limit(batchSize)
      .for("update", { skipLocked: true });

    for (const item of claimed) {
      await tx
        .update(outbox)
        .set({
          status: "processing",
          attempts: item.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(outbox.id, item.id));
    }

    return claimed;
  });

  for (const item of pendingItems) {
    result.processed++;

    try {
      await simulateEmailSend(item.matchId);

      await db
        .update(outbox)
        .set({
          status: "sent",
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(outbox.id, item.id));

      result.sent++;
    } catch (error) {
      const newAttempts = item.attempts + 1;
      if (newAttempts >= item.maxAttempts) {
        await db
          .update(outbox)
          .set({
            status: "failed",
            lastError: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(outbox.id, item.id));
        result.failed++;
      } else {
        await db
          .update(outbox)
          .set({
            status: "pending",
            lastError: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(outbox.id, item.id));
        result.retried++;
      }
    }
  }

  return result;
}

async function simulateEmailSend(matchId: string): Promise<void> {
  const matchDetails = await db
    .select({
      matchId: matches.id,
      score: matches.score,
      alertName: alerts.name,
      alertRawQuery: alerts.rawQuery,
      jobTitle: jobs.title,
      jobCompany: jobs.company,
      jobLocation: jobs.location,
    })
    .from(matches)
    .innerJoin(alerts, eq(matches.alertId, alerts.id))
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (matchDetails.length === 0) {
    throw new Error(`Match ${matchId} not found`);
  }

  await new Promise((resolve) => setTimeout(resolve, 10));

  console.log(
    `[EMAIL] Sending notification for match ${matchId}: "${matchDetails[0].jobTitle}" at ${matchDetails[0].jobCompany}`
  );
}

export async function getOutboxStats() {
  const all = await db.select().from(outbox);
  return {
    total: all.length,
    pending: all.filter((i) => i.status === "pending").length,
    processing: all.filter((i) => i.status === "processing").length,
    sent: all.filter((i) => i.status === "sent").length,
    failed: all.filter((i) => i.status === "failed").length,
  };
}

import { db } from "../db";
import { alerts, jobs, matches, outbox } from "../db/schema";
import { matchJobToAlert } from "./matcher";
import type { AlertFilters } from "../ai/types";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface MatchRunResult {
  alertId: string;
  alertName: string;
  totalJobs: number;
  matchedJobs: number;
  newMatches: number;
}

export async function runMatching(): Promise<MatchRunResult[]> {
  const allAlerts = await db.select().from(alerts).where(eq(alerts.isActive, true));
  const allJobs = await db.select().from(jobs);
  const results: MatchRunResult[] = [];

  for (const alert of allAlerts) {
    const filters = alert.filters as AlertFilters;
    let matchedJobs = 0;
    let newMatches = 0;

    for (const job of allJobs) {
      const result = matchJobToAlert(
        {
          title: job.title,
          description: job.description,
          location: job.location,
          remoteStatus: job.remoteStatus,
          skills: job.skills || [],
          company: job.company,
          salaryMax: job.salaryMax ?? undefined,
        },
        filters
      );

      if (result.matched) {
        matchedJobs++;

        const matchRecord = await db
          .insert(matches)
          .values({
            id: uuidv4(),
            alertId: alert.id,
            jobId: job.id,
            score: result.score,
            reasons: result.reasons,
          })
          .onConflictDoNothing({ target: [matches.alertId, matches.jobId] })
          .returning();

        if (matchRecord.length === 0) {
          continue;
        }

        await db
          .insert(outbox)
          .values({
            id: uuidv4(),
            matchId: matchRecord[0].id,
            alertId: alert.id,
            jobId: job.id,
            status: "pending",
          })
          .onConflictDoNothing({ target: [outbox.alertId, outbox.jobId] });

        newMatches++;
      }
    }

    results.push({
      alertId: alert.id,
      alertName: alert.name,
      totalJobs: allJobs.length,
      matchedJobs,
      newMatches,
    });
  }

  return results;
}

export async function getMatchesForAlert(alertId: string) {
  return db
    .select({
      matchId: matches.id,
      score: matches.score,
      reasons: matches.reasons,
      matchedAt: matches.matchedAt,
      jobId: jobs.id,
      jobTitle: jobs.title,
      jobCompany: jobs.company,
      jobLocation: jobs.location,
    })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .where(eq(matches.alertId, alertId));
}

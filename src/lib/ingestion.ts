import { db } from "../db";
import { jobs } from "../db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

export interface JobRecord {
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remoteStatus: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  sourceFileDate?: Date;
}

export interface IngestionCounts {
  new: number;
  contentChanged: number;
  freshnessOnly: number;
  unchanged: number;
  rejected: number;
}

export function computeContentHash(job: JobRecord): string {
  const content = JSON.stringify({
    title: job.title.toLowerCase().trim(),
    company: job.company.toLowerCase().trim(),
    description: job.description.toLowerCase().trim(),
    location: job.location.toLowerCase().trim(),
    remoteStatus: job.remoteStatus.toLowerCase().trim(),
    skills: job.skills.map((s) => s.toLowerCase().trim()).sort(),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
  });
  return createHash("sha256").update(content).digest("hex");
}

function validateJob(job: JobRecord): string | null {
  if (!job.externalId || typeof job.externalId !== "string") return "Missing or invalid externalId";
  if (!job.title || typeof job.title !== "string") return "Missing or invalid title";
  if (!job.company || typeof job.company !== "string") return "Missing or invalid company";
  if (!Array.isArray(job.skills)) return "Skills must be an array";
  return null;
}

function sourceFileDateMs(value: Date | null | undefined): number | undefined {
  return value ? value.getTime() : undefined;
}

/** Freshness metadata is sourceFileDate only. observedAt is not compared. */
export function hasFreshnessMetadataChanged(
  existingSourceFileDate: Date | null | undefined,
  incomingSourceFileDate: Date | undefined
): boolean {
  if (incomingSourceFileDate === undefined) {
    return false;
  }
  return sourceFileDateMs(existingSourceFileDate) !== incomingSourceFileDate.getTime();
}

export type ExistingJobSnapshot = {
  contentHash: string;
  sourceFileDate: Date | null;
  observedAt?: Date;
};

export type IngestPlan =
  | { type: "reject" }
  | { type: "insert"; contentHash: string }
  | { type: "noop" }
  | { type: "updateFreshness" }
  | { type: "updateContent"; contentHash: string };

export function planIngest(
  existing: ExistingJobSnapshot | null,
  jobData: JobRecord
): IngestPlan {
  if (validateJob(jobData)) {
    return { type: "reject" };
  }

  const contentHash = computeContentHash(jobData);

  if (!existing) {
    return { type: "insert", contentHash };
  }

  if (existing.contentHash !== contentHash) {
    return { type: "updateContent", contentHash };
  }

  if (hasFreshnessMetadataChanged(existing.sourceFileDate, jobData.sourceFileDate)) {
    return { type: "updateFreshness" };
  }

  return { type: "noop" };
}

export async function ingestJobs(jobsData: JobRecord[]): Promise<IngestionCounts> {
  const counts: IngestionCounts = {
    new: 0,
    contentChanged: 0,
    freshnessOnly: 0,
    unchanged: 0,
    rejected: 0,
  };

  for (const jobData of jobsData) {
    const existingRows = validateJob(jobData)
      ? []
      : await db
          .select()
          .from(jobs)
          .where(eq(jobs.externalId, jobData.externalId))
          .limit(1);

    const existingJob = existingRows[0];
    const plan = planIngest(
      existingJob
        ? {
            contentHash: existingJob.contentHash,
            sourceFileDate: existingJob.sourceFileDate,
            observedAt: existingJob.observedAt,
          }
        : null,
      jobData
    );

    if (plan.type === "reject") {
      counts.rejected++;
      continue;
    }

    if (plan.type === "noop") {
      counts.unchanged++;
      continue;
    }

    const now = new Date();

    if (plan.type === "insert") {
      await db.insert(jobs).values({
        id: uuidv4(),
        externalId: jobData.externalId,
        title: jobData.title,
        company: jobData.company,
        description: jobData.description,
        location: jobData.location,
        remoteStatus: jobData.remoteStatus,
        skills: jobData.skills,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        sourceFileDate: jobData.sourceFileDate,
        observedAt: now,
        contentHash: plan.contentHash,
      });
      counts.new++;
      continue;
    }

    if (!existingJob) {
      continue;
    }

    if (plan.type === "updateFreshness") {
      await db
        .update(jobs)
        .set({
          observedAt: now,
          sourceFileDate: jobData.sourceFileDate ?? existingJob.sourceFileDate,
          updatedAt: now,
        })
        .where(eq(jobs.id, existingJob.id));
      counts.freshnessOnly++;
      continue;
    }

    await db
      .update(jobs)
      .set({
        title: jobData.title,
        company: jobData.company,
        description: jobData.description,
        location: jobData.location,
        remoteStatus: jobData.remoteStatus,
        skills: jobData.skills,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        sourceFileDate: jobData.sourceFileDate ?? existingJob.sourceFileDate,
        observedAt: now,
        contentHash: plan.contentHash,
        updatedAt: now,
      })
      .where(eq(jobs.id, existingJob.id));
    counts.contentChanged++;
  }

  return counts;
}

export async function getAllJobs() {
  return db.select().from(jobs);
}

export async function getJobById(id: string) {
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

jest.mock("uuid", () => ({
  v4: () => "00000000-0000-0000-0000-000000000000",
}));

jest.mock("../src/db", () => ({
  db: {},
}));

import {
  computeContentHash,
  planIngest,
  hasFreshnessMetadataChanged,
  type JobRecord,
} from "../src/lib/ingestion";

const baseJob: JobRecord = {
  externalId: "test-001",
  title: "Python Developer",
  company: "Test Corp",
  description: "A test job",
  location: "Remote",
  remoteStatus: "remote",
  skills: ["python", "django"],
};

describe("Ingestion", () => {
  test("computeContentHash should be deterministic", () => {
    expect(computeContentHash(baseJob)).toBe(computeContentHash({ ...baseJob }));
  });

  test("computeContentHash should change when content changes", () => {
    const hash1 = computeContentHash(baseJob);
    const hash2 = computeContentHash({
      ...baseJob,
      title: "Senior Python Developer",
    });
    expect(hash1).not.toBe(hash2);
  });

  test("computeContentHash should be case-insensitive", () => {
    const hash1 = computeContentHash(baseJob);
    const hash2 = computeContentHash({
      ...baseJob,
      title: "PYTHON DEVELOPER",
    });
    expect(hash1).toBe(hash2);
  });

  test("hash ignores observedAt-equivalent freshness: sourceFileDate is not in the hash", () => {
    const hash1 = computeContentHash(baseJob);
    const hash2 = computeContentHash({
      ...baseJob,
      sourceFileDate: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(hash1).toBe(hash2);
  });
});

describe("Ingestion classification (planIngest)", () => {
  const fileDate = new Date("2026-01-01T00:00:00.000Z");
  const laterFileDate = new Date("2026-02-01T00:00:00.000Z");
  const contentHash = computeContentHash(baseJob);

  test("Case A: identical stable data and same sourceFileDate is a no-op (no write)", () => {
    const plan = planIngest(
      {
        contentHash,
        sourceFileDate: fileDate,
        observedAt: new Date("2020-01-01T00:00:00.000Z"),
      },
      { ...baseJob, sourceFileDate: fileDate }
    );
    expect(plan.type).toBe("noop");
  });

  test("Case A/D: a new server clock / different observedAt does not change a same-hash no-op", () => {
    const plan = planIngest(
      {
        contentHash,
        sourceFileDate: fileDate,
        observedAt: new Date("1999-01-01T00:00:00.000Z"),
      },
      { ...baseJob, sourceFileDate: fileDate }
    );
    expect(plan.type).toBe("noop");
    expect(hasFreshnessMetadataChanged(fileDate, fileDate)).toBe(false);
  });

  test("Case A: omitted incoming sourceFileDate is not a freshness change", () => {
    const plan = planIngest(
      { contentHash, sourceFileDate: fileDate, observedAt: new Date() },
      { ...baseJob }
    );
    expect(plan.type).toBe("noop");
  });

  test("Case B: same hash with a new sourceFileDate is freshness-only", () => {
    const plan = planIngest(
      { contentHash, sourceFileDate: fileDate, observedAt: new Date("2020-01-01") },
      { ...baseJob, sourceFileDate: laterFileDate }
    );
    expect(plan.type).toBe("updateFreshness");
  });

  test("Case C: stable field change is content update even if sourceFileDate is unchanged", () => {
    const incoming: JobRecord = {
      ...baseJob,
      title: "Senior Python Developer",
      sourceFileDate: fileDate,
    };
    const plan = planIngest(
      { contentHash, sourceFileDate: fileDate },
      incoming
    );
    expect(plan.type).toBe("updateContent");
    if (plan.type === "updateContent") {
      expect(plan.contentHash).not.toBe(contentHash);
    }
  });

  test("new external id plans an insert", () => {
    expect(planIngest(null, baseJob).type).toBe("insert");
  });

  test("invalid records are rejected", () => {
    expect(
      planIngest(null, { ...baseJob, externalId: "", title: "x", company: "y" }).type
    ).toBe("reject");
  });
});

import { matchJobToAlert } from "../src/lib/matcher";
import type { AlertFilters } from "../src/ai/types";

describe("Matcher", () => {
  const baseFilters: AlertFilters = {
    roles: ["senior python developer"],
    skills: ["python"],
    industries: ["fintech"],
    locations: ["Bengaluru"],
    remotePreference: "allowed",
    excludeTerms: ["internship"],
  };

  const baseJob = {
    title: "Senior Python Developer",
    description: "We need a senior Python developer for our fintech platform",
    location: "Bengaluru, India",
    remoteStatus: "remote",
    skills: ["python", "django", "postgresql"],
    company: "FinTech Corp",
  };

  test("should match a job that satisfies all filters", () => {
    const result = matchJobToAlert(baseJob, baseFilters);
    expect(result.matched).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain("Role match");
    expect(result.reasons).toContain("Skills match: python");
    expect(result.reasons).toContain("Industry match");
    expect(result.reasons).toContain("Location match");
  });

  test("should not match when role doesn't match", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      roles: ["frontend developer"],
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No role match");
  });

  test("should not match when skills don't match", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["rust"],
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No skills match");
  });

  test("should not reject a remote job for location mismatch when remote is allowed", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      locations: ["New York"],
      remotePreference: "allowed",
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(true);
    expect(result.reasons).not.toContain("No location match");
  });

  test("should not reject a fully remote job for location mismatch when remote is required", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      locations: ["New York"],
      remotePreference: "required",
    };
    const job = { ...baseJob, remoteStatus: "fully_remote", location: "Seattle, WA" };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(true);
    expect(result.reasons).not.toContain("No location match");
  });

  test("should treat location as a hard filter for onsite jobs even when remote is allowed", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      locations: ["New York"],
      remotePreference: "allowed",
    };
    const job = { ...baseJob, remoteStatus: "onsite", location: "Bengaluru, India" };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No location match");
  });

  test("should treat location as a hard filter when remote is not allowed", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      locations: ["New York"],
      remotePreference: "not_allowed",
    };
    const job = { ...baseJob, remoteStatus: "onsite", location: "Bengaluru, India" };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No location match");
  });

  test("should not match when remote preference is required but job is not remote", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      remotePreference: "required",
    };
    const job = { ...baseJob, remoteStatus: "onsite" };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("Remote required but job is not remote");
  });

  test("should not match when remote preference is not allowed but job is remote", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      remotePreference: "not_allowed",
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("Remote not allowed but job is remote");
  });

  test("should not match when exclude term is present", () => {
    const job = {
      ...baseJob,
      title: "Python Internship",
      description: "Summer internship for Python developers",
    };
    const result = matchJobToAlert(job, baseFilters);
    expect(result.matched).toBe(false);
    expect(result.reasons.some((r) => r.includes("Excluded by term"))).toBe(true);
  });

  test("should match with case-insensitive comparison", () => {
    const job = {
      ...baseJob,
      title: "SENIOR PYTHON DEVELOPER",
      skills: ["Python", "DJANGO"],
    };
    const result = matchJobToAlert(job, baseFilters);
    expect(result.matched).toBe(true);
  });

  test("should not match when only some required skills are present", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["python", "react", "node"],
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No skills match");
  });

  test("should match when every required skill is on the job", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["C#", ".NET", "SQL"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(true);
    expect(result.reasons).toContain("Skills match: C#, .NET, SQL");
  });

  test("should match when the job has extra skills beyond all required ones", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["C#", ".NET", "SQL", "Azure"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(true);
  });

  test("should not match when one required skill is missing", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["C#", ".NET"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No skills match");
  });

  test("should not match when only one of several required skills is present", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["C#"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No skills match");
  });

  test("should not match when required skills have no overlap", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["Java", "Python"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No skills match");
  });

  test("should match required skills with case and whitespace normalization", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: ["C#", ".NET", "SQL"],
    };
    const job = { ...baseJob, skills: ["  c#  ", ".net", "sql"] };
    const result = matchJobToAlert(job, filters);
    expect(result.matched).toBe(true);
  });

  test("should skip the skills criterion when the alert has no required skills", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      skills: [],
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(true);
    expect(result.reasons.some((r) => r.startsWith("Skills match"))).toBe(false);
    expect(result.reasons).not.toContain("No skills match");
  });

  test("should not match when industry doesn't match", () => {
    const filters: AlertFilters = {
      ...baseFilters,
      industries: ["healthcare"],
    };
    const result = matchJobToAlert(baseJob, filters);
    expect(result.matched).toBe(false);
    expect(result.reasons).toContain("No industry match");
  });
});

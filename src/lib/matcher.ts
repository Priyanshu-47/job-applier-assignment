import type { AlertFilters } from "../ai/types";

export type { AlertFilters };

export interface MatchResult {
  matched: boolean;
  score: number;
  reasons: string[];
}

function normalizeWhitespace(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsTerm(haystack: string, needle: string): boolean {
  return normalizeWhitespace(haystack).includes(normalizeWhitespace(needle));
}

function anyTermMatches(haystack: string[], needles: string[]): boolean {
  const normalizedHaystack = haystack.map(normalizeWhitespace);
  return needles.some((needle) => {
    const normalized = normalizeWhitespace(needle);
    return normalizedHaystack.some((h) => h.includes(normalized));
  });
}

function isFullyRemoteJob(remoteStatus: string): boolean {
  const remote = remoteStatus.toLowerCase();
  return remote === "remote" || remote === "fully_remote";
}

function locationIsHardFilter(remotePreference: AlertFilters["remotePreference"]): boolean {
  return remotePreference !== "required" && remotePreference !== "allowed";
}

export function matchJobToAlert(job: {
  title: string;
  description: string;
  location: string;
  remoteStatus: string;
  skills: string[];
  company?: string;
  salaryMax?: number;
}, filters: AlertFilters): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  let blocked = false;

  const jobText = `${job.title} ${job.description} ${job.company || ""}`;

  // Exclude terms check
  if (filters.excludeTerms.length > 0) {
    const hasExcluded = filters.excludeTerms.some((term) =>
      containsTerm(jobText, term)
    );
    if (hasExcluded) {
      blocked = true;
      reasons.push(`Excluded by term: ${filters.excludeTerms.find((t) => containsTerm(jobText, t))}`);
    }
  }

  // Role matching
  if (filters.roles.length > 0 && !blocked) {
    const roleMatch = filters.roles.some((role) => containsTerm(jobText, role));
    if (roleMatch) {
      score += 30;
      reasons.push("Role match");
    } else {
      blocked = true;
      reasons.push("No role match");
    }
  }

  // Skills matching: every required skill must be present on the job
  if (filters.skills.length > 0 && !blocked) {
    const matchedSkills = filters.skills.filter((skill) =>
      job.skills.some((js) => normalizeWhitespace(js).includes(normalizeWhitespace(skill)))
    );
    if (matchedSkills.length === filters.skills.length) {
      const ratio = matchedSkills.length / filters.skills.length;
      score += Math.round(25 * ratio);
      reasons.push(`Skills match: ${matchedSkills.join(", ")}`);
    } else {
      blocked = true;
      reasons.push("No skills match");
    }
  }

  // Industry matching
  if (filters.industries.length > 0 && !blocked) {
    const industryMatch = filters.industries.some((ind) =>
      containsTerm(jobText, ind)
    );
    if (industryMatch) {
      score += 15;
      reasons.push("Industry match");
    } else {
      blocked = true;
      reasons.push("No industry match");
    }
  }

  // Location matching: hard filter unless the alert accepts remote work
  // and this job is fully remote (location must not reject those jobs).
  if (filters.locations.length > 0 && !blocked) {
    const locationMatch = filters.locations.some((loc) =>
      containsTerm(job.location, loc)
    );
    if (locationMatch) {
      score += 15;
      reasons.push("Location match");
    } else {
      const waiveLocationForRemote =
        !locationIsHardFilter(filters.remotePreference) &&
        isFullyRemoteJob(job.remoteStatus);
      if (!waiveLocationForRemote) {
        blocked = true;
        reasons.push("No location match");
      }
    }
  }

  // Remote preference matching
  if (!blocked) {
    const remote = job.remoteStatus.toLowerCase();
    const pref = filters.remotePreference;

    if (pref === "required" && remote !== "remote" && remote !== "fully_remote") {
      blocked = true;
      reasons.push("Remote required but job is not remote");
    } else if (pref === "not_allowed" && (remote === "remote" || remote === "fully_remote")) {
      blocked = true;
      reasons.push("Remote not allowed but job is remote");
    } else if (pref === "required") {
      score += 15;
      reasons.push("Remote preference satisfied");
    } else {
      score += 10;
      reasons.push("Remote preference compatible");
    }
  }

  // Salary filter
  if (filters.minSalary && job.salaryMax && !blocked) {
    if (job.salaryMax < filters.minSalary) {
      blocked = true;
      reasons.push(`Salary too low: max ${job.salaryMax} < required ${filters.minSalary}`);
    }
  }

  return {
    matched: !blocked && score > 0,
    score,
    reasons,
  };
}

import { createLLMClient, LLMClient } from "./client";
import { AlertFilters, AlertFiltersSchema, ParseResult } from "./types";

const SYSTEM_PROMPT = `You are a job alert parser. Convert natural language job search queries into structured filter objects.
You must return ONLY a JSON object with this exact schema:
{
  "roles": ["string array of job titles/roles"],
  "skills": ["string array of required skills"],
  "industries": ["string array of industry keywords"],
  "locations": ["string array of location names"],
  "remotePreference": "required" | "allowed" | "not_allowed",
  "excludeTerms": ["string array of terms to exclude"],
  "minSalary": number (optional, minimum salary in USD)
}

Rules:
- remotePreference defaults to "allowed" if not specified
- If user says "remote only" or "must be remote", set remotePreference to "required"
- If user says "not remote" or "on-site", set remotePreference to "not_allowed"
- Extract skill keywords from phrases like "with Python experience" or "knowing JavaScript"
- Extract location from "in Bengaluru" or "near San Francisco"
- Extract exclude terms from "excluding internships" or "no junior roles"
- Return ONLY the JSON object, no other text`;

export async function parseAlertQuery(
  query: string,
  client?: LLMClient
): Promise<ParseResult> {
  const llmClient = client || createLLMClient();
  const startTime = Date.now();

  try {
    const response = await llmClient.complete(query, SYSTEM_PROMPT);

    if (!response.success) {
      // Deterministic fallback
      const fallbackFilters = generateFallbackFilters(query);
      return {
        filters: fallbackFilters,
        rawResponse: response.content,
        parseSuccess: false,
        error: response.error || "LLM request failed",
        observability: {
          model: response.model,
          provider: response.provider,
          latencyMs: response.latencyMs,
          success: false,
          tokenUsage: response.tokenUsage,
        },
      };
    }

    // Parse the response
    let parsed: unknown;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Malformed output - use fallback
      const fallbackFilters = generateFallbackFilters(query);
      return {
        filters: fallbackFilters,
        rawResponse: response.content,
        parseSuccess: false,
        error: `Failed to parse LLM output: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
        observability: {
          model: response.model,
          provider: response.provider,
          latencyMs: response.latencyMs,
          success: false,
          tokenUsage: response.tokenUsage,
        },
      };
    }

    // Validate with schema
    const validation = AlertFiltersSchema.safeParse(parsed);
    if (!validation.success) {
      const fallbackFilters = generateFallbackFilters(query);
      return {
        filters: fallbackFilters,
        rawResponse: response.content,
        parseSuccess: false,
        error: `Schema validation failed: ${validation.error.message}`,
        observability: {
          model: response.model,
          provider: response.provider,
          latencyMs: response.latencyMs,
          success: false,
          tokenUsage: response.tokenUsage,
        },
      };
    }

    return {
      filters: validation.data,
      rawResponse: response.content,
      parseSuccess: true,
      observability: {
        model: response.model,
        provider: response.provider,
        latencyMs: Date.now() - startTime,
        success: true,
        tokenUsage: response.tokenUsage,
      },
    };
  } catch (error) {
    // Fallback on any error
    const fallbackFilters = generateFallbackFilters(query);
    return {
      filters: fallbackFilters,
      rawResponse: "",
      parseSuccess: false,
      error: error instanceof Error ? error.message : "Unknown error",
      observability: {
        model: "unknown",
        provider: "unknown",
        latencyMs: Date.now() - startTime,
        success: false,
      },
    };
  }
}

function generateFallbackFilters(query: string): AlertFilters {
  const q = query.toLowerCase();

  const filters: AlertFilters = {
    roles: [],
    skills: [],
    industries: [],
    locations: [],
    remotePreference: "allowed",
    excludeTerms: [],
  };

  // Simple keyword extraction
  if (q.includes("python")) filters.skills.push("python");
  if (q.includes("javascript") || q.includes("js")) filters.skills.push("javascript");
  if (q.includes("typescript") || q.includes("ts")) filters.skills.push("typescript");
  if (q.includes("react")) filters.skills.push("react");
  if (q.includes("node")) filters.skills.push("node");
  if (q.includes("java")) filters.skills.push("java");
  if (q.includes("go") || q.includes("golang")) filters.skills.push("go");
  if (q.includes("rust")) filters.skills.push("rust");

  if (q.includes("remote")) {
    if (q.includes("not remote") || q.includes("on-site") || q.includes("onsite")) {
      filters.remotePreference = "not_allowed";
    } else if (q.includes("must be remote") || q.includes("fully remote")) {
      filters.remotePreference = "required";
    }
  }

  if (q.includes("internship") || q.includes("intern")) {
    filters.excludeTerms.push("internship");
  }

  if (q.includes("junior")) filters.excludeTerms.push("junior");

  return filters;
}

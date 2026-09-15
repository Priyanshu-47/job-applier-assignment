import { z } from "zod";

export const AlertFiltersSchema = z.object({
  roles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  remotePreference: z.enum(["required", "allowed", "not_allowed"]).default("allowed"),
  excludeTerms: z.array(z.string()).default([]),
  minSalary: z.number().optional(),
});

export type AlertFilters = z.infer<typeof AlertFiltersSchema>;

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ParseResult {
  filters: AlertFilters | null;
  rawResponse: string;
  parseSuccess: boolean;
  error?: string;
  observability: {
    model: string;
    provider: string;
    latencyMs: number;
    success: boolean;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

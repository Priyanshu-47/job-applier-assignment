import { parseAlertQuery } from "../src/ai/parser";
import { FakeLLMClient } from "../src/ai/client";

describe("AI Parser", () => {
  test("should parse a simple query with fake LLM", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery(
      "Find me remote Python developer jobs in fintech",
      fakeClient
    );

    expect(result.parseSuccess).toBe(true);
    expect(result.filters).toBeDefined();
    expect(result.filters?.skills).toContain("python");
    expect(result.filters?.remotePreference).toBe("allowed");
    expect(result.observability.provider).toBe("fake");
  });

  test("should handle malformed LLM output gracefully", async () => {
    const fakeClient = new FakeLLMClient();
    fakeClient.setResponse("test query", "This is not valid JSON");

    const result = await parseAlertQuery("test query", fakeClient);

    // Should fall back to deterministic parsing
    expect(result.filters).toBeDefined();
    expect(result.parseSuccess).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("should use fallback parsing when LLM fails", async () => {
    const fakeClient = new FakeLLMClient();
    // Simulate LLM failure by making complete throw
    const failingClient = {
      complete: async () => {
        throw new Error("LLM service unavailable");
      },
    };

    const result = await parseAlertQuery(
      "Python developer excluding internships",
      failingClient as any
    );

    expect(result.filters).toBeDefined();
    expect(result.parseSuccess).toBe(false);
    expect(result.filters?.excludeTerms).toContain("internship");
  });

  test("should parse remote preference correctly", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery(
      "Must be remote Python developer",
      fakeClient
    );

    expect(result.filters).toBeDefined();
    expect(result.filters?.remotePreference).toBe("required");
  });

  test("should parse exclude terms correctly", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery(
      "Python developer excluding internships and junior roles",
      fakeClient
    );

    expect(result.filters).toBeDefined();
    expect(result.filters?.excludeTerms.length).toBeGreaterThan(0);
  });

  test("should include observability metadata", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery("Python developer", fakeClient);

    expect(result.observability).toBeDefined();
    expect(result.observability.model).toBeDefined();
    expect(result.observability.provider).toBeDefined();
    expect(result.observability.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.observability.success).toBe("boolean");
  });

  test("should handle empty query gracefully", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery("", fakeClient);

    expect(result.filters).toBeDefined();
    expect(result.parseSuccess).toBe(true);
  });

  test("should handle complex query with multiple criteria", async () => {
    const fakeClient = new FakeLLMClient();
    const result = await parseAlertQuery(
      "Senior React developer in San Francisco with TypeScript skills, remote allowed, no contractors",
      fakeClient
    );

    expect(result.filters).toBeDefined();
    expect(result.parseSuccess).toBe(true);
  });
});

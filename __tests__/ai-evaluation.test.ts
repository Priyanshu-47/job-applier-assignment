import { parseAlertQuery } from "../src/ai/parser";
import { FakeLLMClient } from "../src/ai/client";
import { AlertFilters } from "../src/ai/types";

interface TestCase {
  query: string;
  expected: Partial<AlertFilters>;
  description: string;
}

const testCases: TestCase[] = [
  {
    query: "Remote senior Python developer in fintech, excluding internships",
    expected: {
      roles: expect.arrayContaining([expect.stringContaining("developer")]),
      skills: expect.arrayContaining(["python"]),
      industries: expect.arrayContaining([expect.stringContaining("fintech")]),
      remotePreference: "allowed",
      excludeTerms: expect.arrayContaining([expect.stringContaining("internship")]),
    },
    description: "Basic query with role, skill, industry, and exclude terms",
  },
  {
    query: "Find me JavaScript React developer jobs in New York",
    expected: {
      skills: expect.arrayContaining(["javascript"]),
      locations: expect.arrayContaining([expect.stringContaining("new york")]),
    },
    description: "Query with multiple skills and location",
  },
  {
    query: "Must be fully remote Go developer position",
    expected: {
      remotePreference: "required",
      skills: expect.arrayContaining(["go"]),
    },
    description: "Query requiring remote work",
  },
  {
    query: "Java backend engineer, not remote, in Seattle",
    expected: {
      remotePreference: "not_allowed",
      skills: expect.arrayContaining(["java"]),
      locations: expect.arrayContaining([expect.stringContaining("seattle")]),
    },
    description: "Query excluding remote work",
  },
  {
    query: "Senior DevOps engineer with Kubernetes and Docker experience",
    expected: {
      roles: expect.arrayContaining([expect.stringContaining("devops")]),
      skills: expect.arrayContaining([expect.stringContaining("kubernetes")]),
    },
    description: "DevOps role with specific skills",
  },
  {
    query: "Python machine learning engineer in healthcare, no junior roles",
    expected: {
      skills: expect.arrayContaining(["python"]),
      industries: expect.arrayContaining([expect.stringContaining("healthcare")]),
      excludeTerms: expect.arrayContaining([expect.stringContaining("junior")]),
    },
    description: "ML role with industry and exclude terms",
  },
  {
    query: "Full stack developer with React and Node.js in Austin, Texas",
    expected: {
      skills: expect.arrayContaining([expect.stringContaining("react")]),
      locations: expect.arrayContaining([expect.stringContaining("austin")]),
    },
    description: "Full stack role with specific tech stack",
  },
  {
    query: "Rust systems programmer, remote only, fintech sector",
    expected: {
      remotePreference: "required",
      skills: expect.arrayContaining(["rust"]),
    },
    description: "Systems programming role with remote requirement",
  },
  {
    query: "Data engineer with Python and SQL skills in San Francisco Bay Area",
    expected: {
      roles: expect.arrayContaining([expect.stringContaining("data")]),
      skills: expect.arrayContaining(["python"]),
      locations: expect.arrayContaining([expect.stringContaining("san francisco")]),
    },
    description: "Data engineering role",
  },
  {
    query: "Frontend developer with TypeScript and Vue.js, hybrid work in Boston",
    expected: {
      skills: expect.arrayContaining([expect.stringContaining("typescript")]),
      locations: expect.arrayContaining([expect.stringContaining("boston")]),
    },
    description: "Frontend role with specific framework",
  },
  {
    query: "Cloud architect with AWS experience, remote, no consultants",
    expected: {
      skills: expect.arrayContaining([expect.stringContaining("aws")]),
      remotePreference: "allowed",
      excludeTerms: expect.arrayContaining([expect.stringContaining("consultant")]),
    },
    description: "Cloud architecture role",
  },
  {
    query: "iOS developer with Swift and SwiftUI experience in Los Angeles",
    expected: {
      skills: expect.arrayContaining([expect.stringContaining("swift")]),
      locations: expect.arrayContaining([expect.stringContaining("los angeles")]),
    },
    description: "Mobile development role",
  },
];

describe("AI Evaluation", () => {
  const fakeClient = new FakeLLMClient();

  test.each(testCases.map((tc, i) => [`${i + 1}. ${tc.description}`, tc]))(
    "%s",
    async (_name, testCase) => {
      const result = await parseAlertQuery(testCase.query, fakeClient);

      expect(result.filters).toBeDefined();
      expect(result.parseSuccess).toBe(true);

      // Check each expected field
      if (testCase.expected.roles) {
        expect(result.filters?.roles).toEqual(testCase.expected.roles);
      }
      if (testCase.expected.skills) {
        expect(result.filters?.skills).toEqual(testCase.expected.skills);
      }
      if (testCase.expected.industries) {
        expect(result.filters?.industries).toEqual(testCase.expected.industries);
      }
      if (testCase.expected.locations) {
        expect(result.filters?.locations).toEqual(testCase.expected.locations);
      }
      if (testCase.expected.remotePreference) {
        expect(result.filters?.remotePreference).toBe(
          testCase.expected.remotePreference
        );
      }
      if (testCase.expected.excludeTerms) {
        expect(result.filters?.excludeTerms).toEqual(
          testCase.expected.excludeTerms
        );
      }
    }
  );
});

// Run evaluation and report results
export async function runEvaluation(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    query: string;
    passed: boolean;
    errors: string[];
  }>;
}> {
  const client = new FakeLLMClient();
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await parseAlertQuery(testCase.query, client);
      const errors: string[] = [];

      if (!result.parseSuccess) {
        errors.push("Parse failed");
      }

      if (!result.filters) {
        errors.push("No filters returned");
      }

      if (errors.length === 0) {
        passed++;
        results.push({ query: testCase.query, passed: true, errors: [] });
      } else {
        failed++;
        results.push({ query: testCase.query, passed: false, errors });
      }
    } catch (error) {
      failed++;
      results.push({
        query: testCase.query,
        passed: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  return {
    total: testCases.length,
    passed,
    failed,
    results,
  };
}

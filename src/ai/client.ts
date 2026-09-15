import { LLMResponse } from "./types";

export interface LLMClient {
  complete(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
}

export class FakeLLMClient implements LLMClient {
  private responseMap: Map<string, string>;

  constructor(responseMap?: Map<string, string>) {
    this.responseMap = responseMap || new Map();
  }

  setResponse(query: string, response: string) {
    this.responseMap.set(query.toLowerCase(), response);
  }

  async complete(prompt: string, _systemPrompt?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const query = prompt.toLowerCase();

    // Check if we have a pre-configured response
    for (const [key, value] of this.responseMap.entries()) {
      if (query.includes(key)) {
        return {
          content: value,
          model: "fake-model",
          provider: "fake",
          latencyMs: Date.now() - startTime,
          success: true,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        };
      }
    }

    // Default deterministic response for common patterns
    const response = this.generateDeterministicResponse(query);
    return {
      content: response,
      model: "fake-model",
      provider: "fake",
      latencyMs: Date.now() - startTime,
      success: true,
      tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
  }

  private generateDeterministicResponse(query: string): string {
    const result: Record<string, unknown> = {
      roles: [],
      skills: [],
      industries: [],
      locations: [],
      remotePreference: "allowed",
      excludeTerms: [],
    };

    const q = query.toLowerCase();

    // Extract skills from common patterns
    const skillKeywords = [
      "python", "javascript", "typescript", "react", "node", "java", "go", "golang",
      "rust", "ruby", "php", "swift", "kotlin", "c++", "c#", "scala", "perl",
      "django", "flask", "fastapi", "express", "spring", "rails", "laravel",
      "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
      "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
      "sql", "nosql", "graphql", "rest", "api",
      "machine learning", "deep learning", "ai", "data science",
      "html", "css", "sass", "less",
      "git", "linux", "bash",
      "agile", "scrum", "devops", "ci/cd",
    ];

    for (const skill of skillKeywords) {
      if (q.includes(skill)) {
        (result.skills as string[]).push(skill);
      }
    }

    // Extract roles
    if (q.includes("developer") || q.includes("engineer")) {
      if (q.includes("full stack") || q.includes("fullstack")) {
        (result.roles as string[]).push("full stack developer");
      } else if (q.includes("frontend") || q.includes("front-end")) {
        (result.roles as string[]).push("frontend developer");
      } else if (q.includes("backend") || q.includes("back-end")) {
        (result.roles as string[]).push("backend developer");
      } else if (q.includes("devops")) {
        (result.roles as string[]).push("devops engineer");
      } else if (q.includes("data")) {
        (result.roles as string[]).push("data engineer");
      } else if (q.includes("machine learning") || q.includes("ml")) {
        (result.roles as string[]).push("machine learning engineer");
      } else if (q.includes("cloud")) {
        (result.roles as string[]).push("cloud architect");
      } else {
        (result.roles as string[]).push("developer");
      }
    }

    // Extract locations
    const locationPatterns = [
      /(?:in|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)*)/g,
      /(?:in|near|from)\s+(new york|san francisco|los angeles|seattle|austin|boston|chicago|dallas|portland)/gi,
    ];
    for (const pattern of locationPatterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        (result.locations as string[]).push(match[1].trim());
      }
    }

    // Extract remote preference
    if (q.includes("remote")) {
      if (q.includes("not remote") || q.includes("on-site") || q.includes("onsite")) {
        result.remotePreference = "not_allowed";
      } else if (q.includes("must be remote") || q.includes("fully remote") || q.includes("remote only")) {
        result.remotePreference = "required";
      } else {
        result.remotePreference = "allowed";
      }
    }

    // Extract exclude terms
    const excludePatterns = [
      /(?:excluding|exclude|not|no)\s+(internship|intern|junior|contractor|consultant)/gi,
    ];
    for (const pattern of excludePatterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        (result.excludeTerms as string[]).push(match[1].trim());
      }
    }

    // Extract industries
    const industryPatterns = [
      /(?:in|for)\s+(fintech|healthcare|tech|finance|e-commerce|ecommerce|gaming|education)/gi,
    ];
    for (const pattern of industryPatterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        (result.industries as string[]).push(match[1].trim());
      }
    }

    return JSON.stringify(result);
  }
}

export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-3.5-turbo") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          content: "",
          model: this.model,
          provider: "openai",
          latencyMs: Date.now() - startTime,
          success: false,
          error: `API error: ${response.status} ${JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      return {
        content,
        model: this.model,
        provider: "openai",
        latencyMs: Date.now() - startTime,
        success: true,
        tokenUsage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return {
        content: "",
        model: this.model,
        provider: "openai",
        latencyMs: Date.now() - startTime,
        success: false,
        error: timedOut
          ? "LLM request timed out"
          : error instanceof Error
            ? error.message
            : "Unknown error",
      };
    }
  }
}

export function createLLMClient(): LLMClient {
  const provider = process.env.LLM_PROVIDER || "fake";

  switch (provider) {
    case "openai":
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY required when LLM_PROVIDER=openai");
      }
      return new OpenAIClient(apiKey, process.env.OPENAI_MODEL || "gpt-3.5-turbo");
    case "fake":
    default:
      return new FakeLLMClient();
  }
}

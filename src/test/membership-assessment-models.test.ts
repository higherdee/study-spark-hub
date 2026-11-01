import { afterEach, expect, it, vi } from "vitest";
import { askGeminiAI, askGeminiVisionAI } from "@/lib/gemini";

afterEach(() => vi.unstubAllEnvs());

it("keeps assessment fallback on reasoning models rather than lightweight chat models", async () => {
  vi.stubEnv("GROQ_API_KEY", "test-groq");
  vi.stubEnv("GEMINI_API_KEY", "test-gemini");
  const calls: string[] = [];
  const fetcher = vi.fn(async (url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push(body.model || String(url));
    return String(url).includes("api.groq.com")
      ? new Response("Unavailable", { status: 503 })
      : Response.json({ candidates: [{ content: { parts: [{ text: "assessment" }] } }] });
  }) as unknown as typeof fetch;
  expect(await askGeminiAI("Mark this answer", { reasoning: true, fetcher })).toBe("assessment");
  expect(calls).toEqual([
    "openai/gpt-oss-120b",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
  ]);
});

it("withholds photo assessments when the reasoning model fails instead of silently switching to Lite", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-gemini");
  const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response("Unavailable", { status: 503 }));
  await expect(askGeminiVisionAI("Mark handwriting", "fixture", "image/jpeg", {
    reasoning: true, fetcher: fetcher as unknown as typeof fetch,
  })).rejects.toThrow("failed");
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0]?.[0]).toContain("gemini-flash-latest:");
});

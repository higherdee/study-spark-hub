import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ paid: false, owned: true, context: "", writes: [] as unknown[], generate: vi.fn(), allowance: vi.fn() }));
vi.mock("@/integrations/turso/client.server", () => ({ turso: {
  execute: async ({ sql }: { sql: string }) => ({ rows: sql.startsWith("SELECT id") ? (state.owned ? [{ id: "owned" }] : []) : [{ role: "user", parts: JSON.stringify([{ type: "text", text: state.context }]) }] }),
  transaction: async () => ({ execute: async (query: unknown) => { state.writes.push(query); }, commit: async () => {}, rollback: async () => {}, close: () => {} }),
} }));
vi.mock("@/lib/membership/policy.server", () => ({ membershipAccess: async () => state.paid, enforceChatRetention: async () => {} }));
vi.mock("@/lib/membership/ai.server", () => ({ budgetedAiFetch: vi.fn(), withAiAllowance: async (_user: string, run: () => unknown) => { state.allowance(); return run(); } }));
vi.mock("@/lib/academic-ai", () => ({ generateFlashcards: (...args: unknown[]) => state.generate(...args), generatePracticeQuestions: (...args: unknown[]) => state.generate(...args), gradeTheoryAnswer: vi.fn() }));
import { nativeStudySet } from "@/lib/native-study.server";
const threadId = "eb0189aa-e211-4db8-8e06-ff15bc8d8f37";
beforeEach(() => { state.paid = false; state.owned = true; state.context = ""; state.writes = []; state.generate.mockReset().mockResolvedValue([{ front: "Question", back: "Answer" }]); state.allowance.mockClear(); });
it("rejects absent topics and oversized free sets before using AI", async () => {
  await expect(nativeStudySet("a", { mode: "flashcards", count: 5 })).rejects.toThrow("topic");
  await expect(nativeStudySet("a", { topic: "Biology", mode: "flashcards", count: 6 })).rejects.toThrow();
  expect(state.generate).not.toHaveBeenCalled(); expect(state.writes).toHaveLength(0);
});
it("checks conversation ownership and meaningful context before generation", async () => {
  state.owned = false; await expect(nativeStudySet("a", { mode: "flashcards", count: 5, threadId, useConversation: true })).rejects.toThrow("not found");
  state.owned = true; await expect(nativeStudySet("a", { mode: "flashcards", count: 5, threadId, useConversation: true })).rejects.toThrow("context");
  expect(state.generate).not.toHaveBeenCalled();
});
it("uses conversation text only when explicitly selected and persists a shared study format", async () => {
  state.context = "Cellular respiration converts glucose into ATP through several metabolic pathways.";
  const result = await nativeStudySet("a", { mode: "flashcards", count: 5, threadId, useConversation: true });
  expect(state.generate.mock.calls[0]?.[1]).toContain("Cellular respiration"); expect(state.allowance).toHaveBeenCalledOnce();
  expect(JSON.parse(result.content).flashcardsData.cards).toHaveLength(1); expect(state.writes).toHaveLength(2);
  state.generate.mockClear(); await nativeStudySet("a", { topic: "Algebra", mode: "flashcards", count: 5, threadId });
  expect(state.generate.mock.calls[0]?.[1]).toBe("Algebra");
});
it("never saves invented output when the provider fails or returns an empty set", async () => {
  state.generate.mockRejectedValueOnce(new Error("Unavailable")); await expect(nativeStudySet("a", { topic: "Biology", mode: "flashcards", count: 5 })).rejects.toThrow("Unavailable");
  state.generate.mockResolvedValueOnce([]); await expect(nativeStudySet("a", { topic: "Biology", mode: "flashcards", count: 5 })).rejects.toThrow("valid"); expect(state.writes).toHaveLength(0);
});

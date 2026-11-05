import { beforeAll, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }) };
});
const state = vi.hoisted(() => ({ battle: { id: "match", status: "lobby", mode: "mcq", time_per_question: 10, questions_json: '[{"options":["a","b"],"correctOptionIndex":1,"estimatedSeconds":10},{"options":["a","b"],"correctOptionIndex":0,"estimatedSeconds":10}]' }, submissions: [] as Array<{ userId: string; score: number; answersJson: string }> }));
vi.mock("@/integrations/turso/community.server", () => ({
  getStudyBattle: async () => state.battle,
  getBattleParticipants: async () => ["a", "b"].map(id => ({ user_id: id, role: "fighter", status: state.submissions.some(s => s.userId === id) ? "submitted" : "joined", score: state.submissions.find(s => s.userId === id)?.score || 0 })),
  submitBattleAnswersRecord: async (submission: { userId: string; score: number; answersJson: string }) => { state.submissions.push(submission); },
  concludeBattleRecord: vi.fn(async () => ({ success: true })),
}));
import { turso } from "@/integrations/turso/client.server";
import { battleRoundState, submitBattleRound } from "@/lib/battle-rounds.server";
import { currentBattleRound } from "@/lib/battle-clock";
beforeAll(async () => { await turso.execute("CREATE TABLE study_battles(id TEXT,status TEXT)"); await battleRoundState("match"); });
beforeEach(async () => { state.battle.status = "lobby"; state.submissions = []; await turso.executeMultiple("DELETE FROM battle_round_clocks; DELETE FROM battle_round_answers;"); });
it("keeps all clients on one immutable start time and closes at exact deadlines", async () => {
  const a = await battleRoundState("match", 1000);
  const b = await battleRoundState("match", 3000);
  expect(a.round).toEqual({ state: "waiting", startsAt: 6000 });
  expect(b.round).toEqual(a.round);
  expect(currentBattleRound(6000, [10, 10], 16000)).toMatchObject({ state: "playing", index: 1 });
  expect(currentBattleRound(6000, [10, 10], 26000).state).toBe("finished");
});
it("locks each answer once, reports opponents answered, rejects outsiders and late rounds, and awards zero for omissions", async () => {
  const now = Date.now();
  await battleRoundState("match", now - 6000);
  await expect(submitBattleRound("outsider", "match", 0, 1)).rejects.toThrow("Join");
  await submitBattleRound("a", "match", 0, 1);
  await submitBattleRound("a", "match", 0, 1);
  await expect(submitBattleRound("a", "match", 0, 0)).rejects.toThrow("locked");
  expect((await battleRoundState("match")).answeredBy).toEqual(["a"]);
  await expect(submitBattleRound("b", "match", 1, 0)).rejects.toThrow("closed");
  await battleRoundState("match", now + 25000);
  expect(state.submissions).toHaveLength(2);
  expect(state.submissions.find(s => s.userId === "a")?.score).toBeGreaterThan(45);
  expect(state.submissions.find(s => s.userId === "b")?.score).toBe(0);
  await expect(submitBattleRound("b", "match", 0, 1, now + 25000)).rejects.toThrow("closed");
});

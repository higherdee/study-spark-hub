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
beforeEach(async () => { state.battle.status = "lobby"; state.battle.mode = "mcq"; state.submissions = []; await turso.executeMultiple("DELETE FROM battle_round_clocks; DELETE FROM battle_round_answers; DELETE FROM battle_round_windows; DELETE FROM battle_round_grades;"); });
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
  await battleRoundState("match", now + 35000);
  expect(state.submissions).toHaveLength(2);
  expect(state.submissions.find(s => s.userId === "a")?.score).toBeGreaterThan(45);
  expect(state.submissions.find(s => s.userId === "b")?.score).toBe(0);
  await expect(submitBattleRound("b", "match", 0, 1, now + 35000)).rejects.toThrow("closed");
});
it("closes immediately when both players answer, reveals individual scores, then advances together", async () => {
  const now = Date.now();
  await battleRoundState("match", now - 6000);
  await submitBattleRound("a", "match", 0, 1);
  await submitBattleRound("b", "match", 0, 0);
  const state = await battleRoundState("match");
  expect(state.round?.state).toBe("review");
  expect(state.results[0]?.players.find(p => p.userId === "a")?.score).toBeGreaterThan(90);
  expect(state.results[0]?.players.find(p => p.userId === "b")?.score).toBe(0);
  expect(state.results[0]?.correctOptionIndex).toBe(1);
  await expect(submitBattleRound("b", "match", 0, 0)).resolves.toEqual({ accepted: true });
  await expect(submitBattleRound("b", "match", 0, 1)).rejects.toThrow("locked");
  if (state.round?.state !== "review") throw new Error("Expected review");
  expect(state.round.closesAt).toBeLessThan(now + 5000);
  const next = await battleRoundState("match", state.round.revealUntil!);
  expect(next.round).toMatchObject({ state: "playing", index: 1, opensAt: state.round.revealUntil });
  expect(next.results).toHaveLength(1); // No future answer key exposed to spectators.
});
it("keeps a theory round in review until marking finishes and exposes each player's marks", async () => {
  state.battle.mode = "theory";
  const now = Date.now();
  await battleRoundState("match", now - 6000);
  await submitBattleRound("a", "match", 0, { text: "Solution A" });
  await submitBattleRound("b", "match", 0, { text: "Solution B" });
  const waiting = await battleRoundState("match", now + 6000);
  expect(waiting.round).toMatchObject({ state: "review", index: 0, revealUntil: null });
  expect(waiting.totals.every(t => t.pending === 1)).toBe(true);
  await turso.batch([
    { sql: "INSERT INTO battle_round_grades VALUES(?,?,?,?,?,?)", args: ["match", "a", 0, 88, "Good derivation", now + 6000] },
    { sql: "INSERT INTO battle_round_grades VALUES(?,?,?,?,?,?)", args: ["match", "b", 0, 70, "Missing units", now + 6000] },
  ], "write");
  const marked = await battleRoundState("match", now + 6001);
  expect(marked.results[0]?.players.map(p => p.score)).toEqual([88, 70]);
  expect(marked.round).toMatchObject({ state: "review", revealUntil: now + 9000 });
  expect((await battleRoundState("match", now + 9000)).round).toMatchObject({ state: "playing", index: 1 });
});

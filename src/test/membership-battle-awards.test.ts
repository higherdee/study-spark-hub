import { beforeAll, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => { const { createClient } = await import("@libsql/client"); return { turso: createClient({ url: "file::memory:" }) }; });
import { turso } from "@/integrations/turso/client.server";
import { concludeBattleRecord, joinBattleEscrowRecord, createStudyBattleRecord } from "@/integrations/turso/community.server";
beforeAll(async () => { await turso.executeMultiple("CREATE TABLE profiles(id TEXT PRIMARY KEY,points INTEGER); CREATE TABLE study_battles(id TEXT PRIMARY KEY,status TEXT,mode TEXT,total_pot INTEGER,question_count INTEGER,winner_ids_json TEXT,updated_at TEXT,stake_amount INTEGER DEFAULT 10); CREATE TABLE battle_participants(id TEXT,battle_id TEXT,user_id TEXT,user_name TEXT,avatar_url TEXT,role TEXT,status TEXT,stake_paid INTEGER DEFAULT 0,created_at TEXT,score REAL,answers_json TEXT,PRIMARY KEY(battle_id,user_id));"); });
beforeEach(async () => { await turso.executeMultiple("DELETE FROM profiles;DELETE FROM study_battles;DELETE FROM battle_participants;INSERT INTO profiles VALUES('a',100),('b',100);INSERT INTO study_battles(id,status,mode,total_pot,question_count) VALUES('battle','grading','mcq',20,2);INSERT INTO battle_participants(id,battle_id,user_id,role,status,score,answers_json) VALUES('pa','battle','a','fighter','submitted',100,'{}'),('pb','battle','b','fighter','submitted',50,'{}');"); });
const balances = async () => (await turso.execute("SELECT points FROM profiles ORDER BY id")).rows.map(r => Number(r['points']));
it("derives winners from server scores and pays the pot only once on retry", async () => {
  const input = { battleId: "battle", winners: [{ userId: "b", score: 9999 }] };
  expect((await concludeBattleRecord(input)).success).toBe(true); expect(await balances()).toEqual([120,100]);
  expect((await concludeBattleRecord(input)).success).toBe(false); expect(await balances()).toEqual([120,100]);
});
it("updates submitted theory answers and awards points in a single transaction", async () => {
  await turso.execute("UPDATE study_battles SET mode='theory'");
  await concludeBattleRecord({ battleId: "battle", winners: [], gradedAnswers: [{ userId: "a", score: 5, answersJson: '{"feedback":"Partial credit"}' },{ userId: "b", score: 18, answersJson: '{"feedback":"Correct reasoning"}' }] });
  expect(await balances()).toEqual([100,120]); expect((await turso.execute("SELECT score FROM battle_participants WHERE user_id='b'")).rows[0]?.['score']).toBe(18);
});
it("rolls back partial grading and keeps balances unchanged when any participant is invalid", async () => {
  await turso.execute("UPDATE study_battles SET mode='theory'");
  await expect(concludeBattleRecord({ battleId: "battle", winners: [], gradedAnswers: [{ userId: "a", score: 3, answersJson: '{}' },{ userId: "missing", score: 18, answersJson: '{}' }] })).rejects.toThrow("participant");
  expect(await balances()).toEqual([100,100]); expect((await turso.execute("SELECT score FROM battle_participants WHERE user_id='a'")).rows[0]?.['score']).toBe(100);
});
it("will not distribute a theory pot before all submitted responses have real grades", async () => {
  await turso.execute("UPDATE study_battles SET mode='theory'");
  await expect(concludeBattleRecord({ battleId: "battle", winners: [] })).rejects.toThrow("graded");
  await expect(concludeBattleRecord({ battleId: "battle", winners: [], gradedAnswers: [{ userId: "a", score: 3, answersJson: '{}' }] })).rejects.toThrow("every"); expect(await balances()).toEqual([100,100]);
});
it("charges a fighter once across repeated joins and refuses to reset submitted answers", async () => {
  await turso.executeMultiple("UPDATE study_battles SET status='lobby';UPDATE battle_participants SET status='invited' WHERE user_id='b';");
  const input = { battleId: "battle", userId: "b", userName: "Student B" };
  expect((await joinBattleEscrowRecord(input)).success).toBe(true); expect((await joinBattleEscrowRecord(input)).success).toBe(true);
  expect(await balances()).toEqual([100,90]); expect((await turso.execute("SELECT total_pot FROM study_battles")).rows[0]?.['total_pot']).toBe(30);
  await turso.execute("UPDATE battle_participants SET status='submitted' WHERE user_id='b'"); expect((await joinBattleEscrowRecord(input)).success).toBe(false);
});
it("rejects an unfunded host sponsorship before creating a battle or touching balances", async () => {
  await expect(createStudyBattleRecord({ id: "new-battle", groupId: "g", hostId: "a", hostName: "A", title: "Biology", mode: "mcq", questionCount: 5, questionsJson: "[]", stakeAmount: 60, fighterIds: ["a","b"], sponsoredIds: ["b"] })).rejects.toThrow("Insufficient");
  expect(await balances()).toEqual([100,100]); expect((await turso.execute("SELECT id FROM study_battles WHERE id='new-battle'")).rows).toHaveLength(0);
});

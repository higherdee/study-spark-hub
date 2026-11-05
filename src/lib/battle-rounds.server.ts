import { turso } from "@/integrations/turso/client.server";
import { getStudyBattle, getBattleParticipants, submitBattleAnswersRecord, concludeBattleRecord } from "@/integrations/turso/community.server";
import { currentBattleRound } from "./battle-clock";

let ready: Promise<unknown> | undefined;
async function ensureRounds() {
  await (ready ??= turso.batch([
    "CREATE TABLE IF NOT EXISTS battle_round_clocks(battle_id TEXT PRIMARY KEY,starts_at INTEGER NOT NULL,durations TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS battle_round_answers(battle_id TEXT NOT NULL,user_id TEXT NOT NULL,question_index INTEGER NOT NULL,answer TEXT NOT NULL,received_at INTEGER NOT NULL,PRIMARY KEY(battle_id,user_id,question_index))",
  ], "write").catch(error => { ready = undefined; throw error; }));
}

export async function battleRoundState(battleId: string, now = Date.now()) {
  await ensureRounds();
  const battle = await getStudyBattle(battleId);
  if (!battle) throw new Error("Battle not found.");
  const players = await getBattleParticipants(battleId);
  const fighters = players.filter(p => p.role === "fighter" && ["joined", "submitted"].includes(p.status));
  if (battle.status === "lobby" && fighters.length >= 2) {
    const questions = JSON.parse(battle.questions_json) as Array<{ estimatedSeconds?: number }>;
    const durations = questions.map(q => Math.max(10, Math.min(600, Math.round(q.estimatedSeconds || battle.time_per_question || (battle.mode === "theory" ? 180 : 30)))));
    await turso.execute({ sql: "INSERT OR IGNORE INTO battle_round_clocks VALUES(?,?,?)", args: [battleId, now + 5000, JSON.stringify(durations)] });
    await turso.execute({ sql: "UPDATE study_battles SET status='active' WHERE id=? AND status='lobby'", args: [battleId] });
  }
  const clock = (await turso.execute({ sql: "SELECT * FROM battle_round_clocks WHERE battle_id=?", args: [battleId] })).rows[0];
  if (!clock) return { serverNow: now, round: null, answeredBy: [] as string[] };
  const durations = JSON.parse(String(clock["durations"])) as number[];
  const round = currentBattleRound(Number(clock["starts_at"]), durations, now);
  const answers = (await turso.execute({ sql: "SELECT * FROM battle_round_answers WHERE battle_id=?", args: [battleId] })).rows;
  if (round.state === "finished" && ["lobby", "active"].includes(battle.status)) {
    const questions = JSON.parse(battle.questions_json);
    for (const fighter of fighters.filter(p => p.status === "joined")) {
      const own = answers.filter(a => a["user_id"] === fighter.user_id);
      let score = 0;
      const saved: Record<string, unknown> = {};
      for (const answer of own) {
        const index = Number(answer["question_index"]);
        const value = JSON.parse(String(answer["answer"]));
        saved[String(index)] = value;
        if (battle.mode === "mcq" && value === (questions[index]?.correctOptionIndex ?? questions[index]?.correctAnswer)) {
          const opened = Number(clock["starts_at"]) + durations.slice(0, index).reduce((sum, seconds) => sum + seconds * 1000, 0);
          const remaining = Math.max(0, 1 - (Number(answer["received_at"]) - opened) / (durations[index]! * 1000));
          score += 90 + 10 * remaining;
        }
      }
      // Missing or late responses have no row, and therefore receive zero.
      try { await submitBattleAnswersRecord({ battleId, userId: fighter.user_id, score: Math.round(score / Math.max(1, questions.length)), answersJson: JSON.stringify(saved) }); }
      catch (error) {
        const updated = (await getBattleParticipants(battleId)).find(p => p.user_id === fighter.user_id);
        if (updated?.status !== "submitted") throw error;
      }
    }
    if (battle.mode === "mcq") {
      const submitted = (await getBattleParticipants(battleId)).filter(p => p.role === "fighter" && p.status === "submitted");
      const highest = Math.max(...submitted.map(p => p.score));
      await concludeBattleRecord({ battleId, winners: submitted.filter(p => p.score === highest).map(p => ({ userId: p.user_id, score: p.score })) });
    }
  }
  return { serverNow: now, round, answeredBy: round.state === "playing" ? answers.filter(a => Number(a["question_index"]) === round.index).map(a => String(a["user_id"])) : [] };
}

export async function submitBattleRound(userId: string, battleId: string, index: number, answer: unknown, now = Date.now()) {
  await ensureRounds();
  const state = await battleRoundState(battleId, now);
  const round = state.round;
  if (round?.state !== "playing" || round.index !== index) throw new Error("This question is closed. Late answers receive zero.");
  const battle = await getStudyBattle(battleId);
  const player = (await getBattleParticipants(battleId)).find(p => p.user_id === userId && p.role === "fighter" && p.status === "joined");
  if (!battle || !player) throw new Error("Join this battle before answering.");
  const q = JSON.parse(battle.questions_json)[index];
  if (battle.mode === "mcq") {
    if (!Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= q.options.length) throw new Error("Choose a valid answer.");
  } else {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) throw new Error("Enter your solution.");
    const value = answer as Record<string, unknown>;
    if (Object.keys(value).some(key => !["text", "imageAttachmentId", "audioTranscript"].includes(key)) || Object.values(value).some(v => typeof v !== "string") || JSON.stringify(answer).length > 12000) throw new Error("Invalid theory answer.");
    if (value["imageAttachmentId"]) {
      const { peerAttachment } = await import("./study-media.server");
      const attachment = await peerAttachment(userId, battle.group_id, String(value["imageAttachmentId"]));
      if (!attachment.mime.startsWith("image/")) throw new Error("Choose a solution photo.");
    }
  }
  const encoded = JSON.stringify(answer);
  // Check wall time at the actual insert, after any database/network delay.
  const received = Date.now();
  if (received >= round.closesAt) throw new Error("Time expired for this question.");
  const result = await turso.execute({ sql: "INSERT OR IGNORE INTO battle_round_answers SELECT ?,?,?,?,? WHERE CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) < ?", args: [battleId, userId, index, encoded, received, round.closesAt] });
  if (!result.rowsAffected) {
    const saved = (await turso.execute({ sql: "SELECT answer FROM battle_round_answers WHERE battle_id=? AND user_id=? AND question_index=?", args: [battleId, userId, index] })).rows[0];
    if (!saved) throw new Error("Time expired for this question.");
    if (saved["answer"] !== encoded) throw new Error("Your answer is already locked.");
  }
  return { accepted: true };
}

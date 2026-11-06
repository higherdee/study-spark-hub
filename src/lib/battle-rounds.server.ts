import { turso } from "@/integrations/turso/client.server";
import { getStudyBattle, getBattleParticipants, submitBattleAnswersRecord, concludeBattleRecord } from "@/integrations/turso/community.server";

let ready: Promise<unknown> | undefined;
async function ensureRounds() {
  await (ready ??= turso.batch([
    "CREATE TABLE IF NOT EXISTS battle_round_clocks(battle_id TEXT PRIMARY KEY,starts_at INTEGER NOT NULL,durations TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS battle_round_answers(battle_id TEXT NOT NULL,user_id TEXT NOT NULL,question_index INTEGER NOT NULL,answer TEXT NOT NULL,received_at INTEGER NOT NULL,PRIMARY KEY(battle_id,user_id,question_index))",
    "CREATE TABLE IF NOT EXISTS battle_round_windows(battle_id TEXT NOT NULL,question_index INTEGER NOT NULL,opens_at INTEGER NOT NULL,deadline INTEGER NOT NULL,closed_at INTEGER,PRIMARY KEY(battle_id,question_index))",
    "CREATE TABLE IF NOT EXISTS battle_round_grades(battle_id TEXT NOT NULL,user_id TEXT NOT NULL,question_index INTEGER NOT NULL,score REAL NOT NULL,feedback TEXT NOT NULL,graded_at INTEGER NOT NULL,PRIMARY KEY(battle_id,user_id,question_index))",
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
  if (!clock) return { serverNow: now, round: null as SharedRound | null, answeredBy: [] as string[], results: [] as RoundResult[], totals: [] as Array<{ userId: string; score: number; pending: number }> };
  const durations = JSON.parse(String(clock["durations"])) as number[];
  const answers = (await turso.execute({ sql: "SELECT * FROM battle_round_answers WHERE battle_id=?", args: [battleId] })).rows;
  const grades = (await turso.execute({ sql: "SELECT * FROM battle_round_grades WHERE battle_id=?", args: [battleId] })).rows;
  const windows = (await turso.execute({ sql: "SELECT * FROM battle_round_windows WHERE battle_id=?", args: [battleId] })).rows;
  const questions = JSON.parse(battle.questions_json);
  const results: RoundResult[] = [];
  const totals = fighters.map(p => ({ userId: p.user_id, score: 0, pending: 0 }));
  let opensAt = Number(clock["starts_at"]);
  let round: SharedRound = { state: "waiting", startsAt: opensAt };
  for (const [index, seconds] of durations.entries()) {
    if (now < opensAt) { round = { state: "waiting", startsAt: opensAt }; break; }
    let window = windows.find(w => Number(w["question_index"]) === index);
    if (!window) {
      await turso.execute({ sql: "INSERT OR IGNORE INTO battle_round_windows(battle_id,question_index,opens_at,deadline) VALUES(?,?,?,?)", args: [battleId, index, opensAt, opensAt + seconds * 1000] });
      window = (await turso.execute({ sql: "SELECT * FROM battle_round_windows WHERE battle_id=? AND question_index=?", args: [battleId, index] })).rows[0]!;
    }
    opensAt = Number(window["opens_at"]);
    const deadline = Number(window["deadline"]);
    const responses = answers.filter(a => Number(a["question_index"]) === index);
    const allAnswered = fighters.length >= 2 && fighters.every(p => responses.some(a => a["user_id"] === p.user_id));
    if (window["closed_at"] == null && (now >= deadline || allAnswered)) {
      const closedAt = allAnswered ? Math.min(deadline, Math.max(opensAt, ...responses.map(a => Number(a["received_at"])))) : deadline;
      await turso.execute({ sql: "UPDATE battle_round_windows SET closed_at=? WHERE battle_id=? AND question_index=? AND closed_at IS NULL", args: [closedAt, battleId, index] });
      window = (await turso.execute({ sql: "SELECT * FROM battle_round_windows WHERE battle_id=? AND question_index=?", args: [battleId, index] })).rows[0]!;
    }
    if (window["closed_at"] == null) { round = { state: "playing", index, opensAt, closesAt: deadline }; break; }
    const closedAt = Number(window["closed_at"]);
    let lastGradedAt = closedAt;
    const correct = battle.mode === "mcq" ? Number(questions[index]?.correctOptionIndex ?? questions[index]?.correctAnswer) : null;
    const scores = fighters.map(fighter => {
      const answer = responses.find(a => a["user_id"] === fighter.user_id);
      const grade = grades.find(g => Number(g["question_index"]) === index && g["user_id"] === fighter.user_id);
      let score: number | null = 0;
      let feedback = "No answer submitted before time expired.";
      if (answer && battle.mode === "mcq") {
        const right = JSON.parse(String(answer["answer"])) === correct;
        const speed = Math.max(0, Math.min(1, 1 - (Number(answer["received_at"]) - opensAt) / (seconds * 1000)));
        score = right ? Math.round((90 + 10 * speed) * 10) / 10 : 0;
        feedback = right ? "Correct · includes speed bonus" : "Incorrect answer";
      } else if (answer) {
        score = grade ? Number(grade["score"]) : null;
        feedback = grade ? String(grade["feedback"]) : "Boss AI is marking this solution…";
        if (grade) lastGradedAt = Math.max(lastGradedAt, Number(grade["graded_at"]));
      }
      const total = totals.find(t => t.userId === fighter.user_id)!;
      if (score == null) total.pending++; else total.score = Math.round((total.score + score) * 10) / 10;
      return { userId: fighter.user_id, score, feedback };
    });
    results.push({ index, correctOptionIndex: correct, explanation: questions[index]?.explanation || questions[index]?.modelAnswer || "", players: scores });
    const revealUntil = scores.some(s => s.score == null) ? null : Math.max(closedAt + 5000, battle.mode === "theory" ? lastGradedAt + 3000 : 0);
    if (revealUntil == null || now < revealUntil) { round = { state: "review", index, opensAt, closesAt: closedAt, revealUntil }; break; }
    opensAt = revealUntil;
    round = { state: "finished", finishedAt: opensAt };
  }
  if (round.state === "finished" && ["lobby", "active"].includes(battle.status)) {
    const questions = JSON.parse(battle.questions_json);
    for (const fighter of fighters.filter(p => p.status === "joined")) {
      const own = answers.filter(a => a["user_id"] === fighter.user_id);
      const score = totals.find(t => t.userId === fighter.user_id)?.score || 0;
      const saved: Record<string, unknown> = {};
      for (const answer of own) {
        const index = Number(answer["question_index"]);
        const value = JSON.parse(String(answer["answer"]));
        saved[String(index)] = value;
      }
      // Missing or late responses have no row, and therefore receive zero.
      try { await submitBattleAnswersRecord({ battleId, userId: fighter.user_id, score: Math.round(score / Math.max(1, questions.length)), answersJson: JSON.stringify(saved) }); }
      catch (error) {
        const updated = (await getBattleParticipants(battleId)).find(p => p.user_id === fighter.user_id);
        if (updated?.status !== "submitted") throw error;
      }
    }
    {
      const submitted = (await getBattleParticipants(battleId)).filter(p => p.role === "fighter" && p.status === "submitted");
      const highest = Math.max(...submitted.map(p => p.score));
      await concludeBattleRecord({ battleId, winners: submitted.filter(p => p.score === highest).map(p => ({ userId: p.user_id, score: p.score })) });
    }
  }
  return { serverNow: now, round, answeredBy: round.state === "playing" ? answers.filter(a => Number(a["question_index"]) === round.index).map(a => String(a["user_id"])) : [], results, totals };
}

type SharedRound = { state: "waiting"; startsAt: number } | { state: "playing"; index: number; opensAt: number; closesAt: number } | { state: "review"; index: number; opensAt: number; closesAt: number; revealUntil: number | null } | { state: "finished"; finishedAt: number };
type RoundResult = { index: number; correctOptionIndex: number | null; explanation: string; players: Array<{ userId: string; score: number | null; feedback: string }> };

export async function gradeClosedBattleRounds(battleId: string) {
  await ensureRounds();
  const battle = await getStudyBattle(battleId);
  if (!battle || battle.mode !== "theory" || ["completed", "cancelled"].includes(battle.status)) return;
  const pending = (await turso.execute({ sql: `SELECT a.* FROM battle_round_answers a JOIN battle_round_windows w ON w.battle_id=a.battle_id AND w.question_index=a.question_index LEFT JOIN battle_round_grades g ON g.battle_id=a.battle_id AND g.user_id=a.user_id AND g.question_index=a.question_index WHERE a.battle_id=? AND w.closed_at IS NOT NULL AND g.user_id IS NULL`, args: [battleId] })).rows;
  if (!pending.length) return;
  const { withAiAllowance, budgetedAiFetch } = await import("./membership/ai.server");
  const { gradeTheoryAnswer } = await import("./academic-ai");
  const questions = JSON.parse(battle.questions_json);
  await withAiAllowance(battle.host_id, async () => {
    await Promise.all(pending.map(async row => {
      const answer = JSON.parse(String(row["answer"]));
      const question = questions[Number(row["question_index"])];
      let image: { base64: string; mimeType: string } | undefined;
      if (answer.imageAttachmentId) {
        const { peerAttachment, readStudyMedia } = await import("./study-media.server");
        const file = await peerAttachment(String(row["user_id"]), battle.group_id, answer.imageAttachmentId);
        const media = await readStudyMedia(String(row["user_id"]), file.id);
        image = { base64: Buffer.from(media.bytes).toString("base64"), mimeType: file.mime };
      }
      const grade = await gradeTheoryAnswer(question.question, question.modelAnswer || question.explanation || "", [answer.text, answer.audioTranscript].filter(Boolean).join("\n"), budgetedAiFetch, image, 100);
      await turso.execute({ sql: "INSERT OR IGNORE INTO battle_round_grades VALUES(?,?,?,?,?,?)", args: [battleId, String(row["user_id"]), Number(row["question_index"]), grade.score, grade.feedback, Date.now()] });
    }));
  });
}

export async function submitBattleRound(userId: string, battleId: string, index: number, answer: unknown, now = Date.now()) {
  await ensureRounds();
  const encoded = JSON.stringify(answer);
  const existing = (await turso.execute({ sql: "SELECT answer FROM battle_round_answers WHERE battle_id=? AND user_id=? AND question_index=?", args: [battleId, userId, index] })).rows[0];
  if (existing) { if (existing["answer"] !== encoded) throw new Error("Your answer is already locked."); return { accepted: true }; }
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
  // Check wall time at the actual insert, after any database/network delay.
  const received = Date.now();
  if (received >= round.closesAt) throw new Error("Time expired for this question.");
  const result = await turso.execute({ sql: "INSERT OR IGNORE INTO battle_round_answers SELECT ?,?,?,?,? WHERE CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) < ? AND EXISTS(SELECT 1 FROM battle_round_windows WHERE battle_id=? AND question_index=? AND closed_at IS NULL)", args: [battleId, userId, index, encoded, received, round.closesAt, battleId, index] });
  if (!result.rowsAffected) {
    const saved = (await turso.execute({ sql: "SELECT answer FROM battle_round_answers WHERE battle_id=? AND user_id=? AND question_index=?", args: [battleId, userId, index] })).rows[0];
    if (!saved) throw new Error("Time expired for this question.");
    if (saved["answer"] !== encoded) throw new Error("Your answer is already locked.");
  }
  await battleRoundState(battleId);
  return { accepted: true };
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { battleRoundState, submitBattleRound } from "./battle-rounds.server";
import { waitUntil } from "@vercel/functions";
import { claimBillingOperation, releaseBillingOperation } from "./billing/store.server";
import { turso } from "@/integrations/turso/client.server";
import { membershipAccess } from "@/lib/membership/policy.server";
import {
  getStudyGroupMembersWithBalances,
  directRequestState,
  createStudyBattleRecord,
  getStudyBattle,
  getBattleParticipants,
  joinBattleEscrowRecord,
  declineBattleRecord,
  submitBattleAnswersRecord,
  concludeBattleRecord,
  getSlowpokesRecord,
  sendGroupMessage,
  sendBattleAnnouncementMessage,
  type StudyBattle,
  type BattleParticipant,
  type GroupMemberWithBalance,
} from "@/integrations/turso/community.server";
import { generatePracticeQuestions, gradeTheoryAnswer } from "@/lib/academic-ai";
import { broadcastChatMessage } from "@/lib/supabase-realtime";
import { withAiAllowance, budgetedAiFetch } from "@/lib/membership/ai.server";

async function generateLargeBattle(userId: string, title: string, source: string, mode: "objective" | "theory", count: number) {
  const day = new Date().toISOString().slice(0, 10);
  const limit = await membershipAccess(userId) ? 5 : 1;
  await turso.execute("CREATE TABLE IF NOT EXISTS large_battle_budget (user_id TEXT PRIMARY KEY, day TEXT NOT NULL, attempts INTEGER NOT NULL)");
  const claimed = await turso.execute({
    sql: `INSERT INTO large_battle_budget(user_id, day, attempts) VALUES(?,?,1)
          ON CONFLICT(user_id) DO UPDATE SET day=excluded.day,
          attempts=CASE WHEN large_battle_budget.day=excluded.day THEN attempts+1 ELSE 1 END
          WHERE large_battle_budget.day<>excluded.day OR attempts<? RETURNING attempts`,
    args: [userId, day, limit],
  });
  if (!claimed.rows.length) throw new Error("You have used today's allowance for battles with more than five questions.");

  const boundedFetch: typeof fetch = (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body || "{}"));
    if (url.includes("api.groq.com/")) {
      body.reasoning_effort = "low";
      body.max_completion_tokens = 3000;
    } else {
      body.generationConfig = { ...body.generationConfig, maxOutputTokens: 3000 };
    }
    return fetch(input, { ...init, body: JSON.stringify(body) });
  };
  const questions: Awaited<ReturnType<typeof generatePracticeQuestions>> = [];
  try {
    while (questions.length < count) {
      const previous = questions.map(question => question.question).join("\n");
      const batch = await generatePracticeQuestions(title, `${source.slice(0, 10500)}\nAvoid repeating these earlier questions:\n${previous}`, mode, Math.min(10, count - questions.length), boundedFetch, "openai/gpt-oss-20b");
      for (const question of batch) {
        if (questions.some(item => item.question.trim().toLowerCase() === question.question.trim().toLowerCase())) throw new Error("Boss AI repeated a battle question. Please try again.");
        questions.push({ ...question, id: `q_${questions.length + 1}` });
      }
    }
    return questions;
  } catch (error) {
    await turso.execute({ sql: "UPDATE large_battle_budget SET attempts=MAX(0,attempts-1) WHERE user_id=? AND day=?", args: [userId, day] });
    throw error;
  }
}

/**
 * Fetch all group members with live point balances for the battle host drawer
 */
export const getGroupMembersWithBalancesServerFn = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<GroupMemberWithBalance[]> => {
    const { requireCurrentUserId } = await import("@/lib/auth.server");
    const userId = await requireCurrentUserId();
    return await getStudyGroupMembersWithBalances(data.groupId, userId);
  });

/**
 * Host initiates a Study Battle, generates exam questions, and drops lobby card into chat
 */
export const createStudyBattleServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    groupId: string;
    hostId: string;
    hostName: string;
    hostAvatar?: string | null | undefined;
    title: string;
    mode: "mcq" | "theory";
    sourceSummary?: string | undefined;
    sourceContext?: string | undefined;
    sourceMaterialId?: string | undefined;
    timePerQuestion?: number | null | undefined;
    questionCount?: number | undefined;
    stakeAmount?: number | undefined;
    fighterIds: string[];
    sponsoredIds?: string[] | undefined;
  }) => d)
  .handler(async ({ data }): Promise<StudyBattle> => {
    const { requireSelfOrAdmin } = await import("@/lib/auth.server");
    await requireSelfOrAdmin(data.hostId);
    if (data.fighterIds.length > 20 || (data.stakeAmount ?? 0) < 0 || (data.stakeAmount ?? 0) > 10000) throw new Error("Invalid battle setup.");
    const members = await getStudyGroupMembersWithBalances(data.groupId, data.hostId);
    const direct = await turso.execute({ sql: "SELECT 1 FROM direct_conversations WHERE id=?", args: [data.groupId] });
    if (direct.rows.length && await directRequestState(data.groupId, data.hostId) !== "accepted") {
      throw new Error("Accept the message request before starting a battle in this DM.");
    }
    const hostName = members.find(member => member.id === data.hostId)?.full_name ?? "Student";
    if (data.fighterIds.some(id => !members.some(member => member.id === id))) throw new Error("Invite students who belong to this conversation.");
    const questionCount = z.number().int().min(1).max(50).parse(data.questionCount ?? 5);
    const modeType = data.mode === "mcq" ? "objective" : "theory";
    let sourceContext = data.sourceContext || data.title;
    if (data.sourceMaterialId) {
      const { loadDocumentContext, selectDocumentExcerpt } = await import("@/lib/document-study.server");
      const document = await loadDocumentContext(data.hostId, data.sourceMaterialId);
      sourceContext = selectDocumentExcerpt(document.text, data.title);
      if (sourceContext.replace(/\[Page \d+\]/g, "").trim().length < 40) throw new Error("This scan needs visual reading. Use a clear text passage as the battle source.");
    }

    // 1. Generate questions using Boss AI
    const questions = questionCount <= 5
      ? await withAiAllowance(data.hostId, () => generatePracticeQuestions(data.title, sourceContext, modeType, questionCount, budgetedAiFetch))
      : await generateLargeBattle(data.hostId, data.title, sourceContext, modeType, questionCount);

    const battleId = crypto.randomUUID();

    // 2. Insert into Turso database with atomic host stake deduction
    const battle = await createStudyBattleRecord({
      id: battleId,
      groupId: data.groupId,
      hostId: data.hostId,
      hostName,
      ...(data.hostAvatar !== undefined ? { hostAvatar: data.hostAvatar } : {}),
      title: data.title,
      mode: data.mode,
      ...(data.sourceSummary !== undefined ? { sourceSummary: data.sourceSummary } : {}),
      ...(data.timePerQuestion !== undefined ? { timePerQuestion: data.timePerQuestion } : {}),
      questionCount,
      questionsJson: JSON.stringify(questions),
      stakeAmount: data.stakeAmount || 0,
      fighterIds: data.fighterIds,
      ...(data.sponsoredIds !== undefined ? { sponsoredIds: data.sponsoredIds } : {}),
    });

    // 3. Drop Interactive Battle Lobby Card into the group chat stream
    const modeLabel = data.mode === "mcq" ? "MCQ Blitz" : "Theory Showdown";
    const stakeLabel = data.stakeAmount && data.stakeAmount > 0
      ? ` • 💰 ${data.stakeAmount} pts Buy-in (Pot: ${battle.total_pot} pts)`
      : " • 🎲 Friendly (0 pts)";

    const battleMessage = await sendBattleAnnouncementMessage({
      targetId: data.groupId,
      userId: data.hostId,
      userName: hostName,
      userInstitution: "Campus Arena",
      content: `⚡ [STUDY_BATTLE:${battle.id}] ${data.title} (${modeLabel}${stakeLabel})`,
      materialId: battle.id,
      materialTitle: `⚡ Battle Arena: ${data.title}`,
      materialCourseCode: modeLabel,
    });

    // 4. Real-time broadcast to all peers in the study group
    await broadcastChatMessage(data.groupId, battleMessage);

    return battle;
  });

/**
 * Get battle details and active participants
 */
export const getBattleDetailsServerFn = createServerFn({ method: "GET" })
  .validator((d: { battleId: string }) => d)
  .handler(async ({ data }): Promise<{
    battle: StudyBattle | null;
    participants: BattleParticipant[];
    sync?: Awaited<ReturnType<typeof battleRoundState>>;
  }> => {
    const { requireCurrentUserId } = await import("@/lib/auth.server");
    const actor = await requireCurrentUserId();
    let battle = await getStudyBattle(data.battleId);
    let participants = await getBattleParticipants(data.battleId);
    if (!battle) return { battle, participants: [] };
    await getStudyGroupMembersWithBalances(battle.group_id, actor);
    const sync = await battleRoundState(data.battleId);
    battle = (await getStudyBattle(data.battleId))!;
    participants = await getBattleParticipants(data.battleId);
    if (sync.round?.state === "finished" && battle.mode === "theory" && battle.status === "grading" && participants.some(p => p.user_id === actor && p.role === "fighter")) {
      const scope = `battle-grading:${battle.id}`;
      const lock = await claimBillingOperation(scope);
      if (lock) {
        waitUntil(gradeTheoryBattleServerFn({ data: { battleId: battle.id, groupId: battle.group_id } })
          .catch(() => { console.error("Battle grading pending retry", data.battleId); })
          .finally(() => releaseBillingOperation(scope, lock)));
      }
    }
    if (battle.status !== "completed") {
      const visible = participants.map(p => p.user_id === actor ? p : { ...p, answers_json: null });
      try {
        const questions = JSON.parse(battle.questions_json);
        for (const question of questions) {
          delete question.correctAnswer;
          delete question.correctOptionIndex;
          delete question.modelAnswer;
          delete question.explanation;
        }
        return { battle: { ...battle, questions_json: JSON.stringify(questions) }, participants: visible, sync };
      } catch { return { battle: { ...battle, questions_json: "[]" }, participants: visible, sync }; }
    }
    return { battle, participants, sync };
  });

/**
 * Join battle with atomic escrow stake lock
 */
export const submitBattleRoundServerFn = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ battleId: z.string().uuid(), index: z.number().int().min(0).max(49), answer: z.unknown() }).parse(value))
  .handler(async ({ data }) => {
    const { requireCurrentUserId } = await import("./auth.server");
    const userId = await requireCurrentUserId();
    return submitBattleRound(userId, data.battleId, data.index, data.answer);
  });

export const joinBattleEscrowServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
    userId: string;
    userName: string;
    avatarUrl?: string | null | undefined;
    role?: "fighter" | "spectator" | undefined;
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { requireSelfOrAdmin } = await import("@/lib/auth.server");
    await requireSelfOrAdmin(data.userId);
    const joiningBattle = await getStudyBattle(data.battleId);
    if (!joiningBattle) throw new Error("Battle not found.");
    await getStudyGroupMembersWithBalances(joiningBattle.group_id, data.userId);
    const clock = await battleRoundState(data.battleId);
    if (clock.round) throw new Error("This match has started. Join the next battle.");
    const res = await joinBattleEscrowRecord({
      battleId: data.battleId,
      userId: data.userId,
      userName: data.userName,
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      role: data.role || "fighter",
    });

    if (res.success) {
      await battleRoundState(data.battleId);
      // Broadcast update to chat channel
      await broadcastChatMessage(data.groupId, {
        type: "battle_presence_update",
        battleId: data.battleId,
        userId: data.userId,
        userName: data.userName,
        status: "joined",
      });
    }

    return res;
  });

/**
 * Decline battle
 */
export const declineBattleServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
    userId: string;
  }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    const { requireSelfOrAdmin } = await import("@/lib/auth.server");
    await requireSelfOrAdmin(data.userId);
    const ok = await declineBattleRecord({
      battleId: data.battleId,
      userId: data.userId,
    });

    if (ok) {
      await broadcastChatMessage(data.groupId, {
        type: "battle_presence_update",
        battleId: data.battleId,
        userId: data.userId,
        status: "declined",
      });
    }

    return ok;
  });

/**
 * Fighter submits their battle answers
 */
export const submitBattleAnswersServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
    userId: string;
    userName: string;
    score: number;
    answersJson: string;
  }) => d)
  .handler(async ({ data }): Promise<{ allSubmitted: boolean; participantCount: number; submittedCount: number }> => {
    const { requireSelfOrAdmin } = await import("@/lib/auth.server");
    await requireSelfOrAdmin(data.userId);
    if (data.answersJson.length > 100_000) throw new Error("Submission is too large.");
    const battle = await getStudyBattle(data.battleId);
    if (!battle || battle.status === "completed") throw new Error("Battle is not accepting submissions.");
    if ((await battleRoundState(data.battleId)).round) throw new Error("Submit each answer during its synchronized round.");
    let score = 0;
    if (battle.mode === "mcq") {
      const questions = JSON.parse(battle.questions_json);
      const answers = JSON.parse(data.answersJson) as Record<string, number>;
      const correct = questions.filter((q: any, i: number) => answers[String(i)] === (typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : typeof q.correctAnswer === "number" ? q.correctAnswer : 0)).length;
      score = Math.round((correct / Math.max(questions.length, 1)) * 100);
    }
    const res = await submitBattleAnswersRecord({
      battleId: data.battleId,
      userId: data.userId,
      score,
      answersJson: data.answersJson,
    });

    // If it's an MCQ battle and all have submitted, auto-conclude
    if (battle && battle.mode === "mcq" && res.allSubmitted) {
      const participants = await getBattleParticipants(data.battleId);
      const fighters = participants.filter((p) => p.role === "fighter" && p.status === "submitted");
      if (fighters.length > 0) {
        const highestScore = Math.max(...fighters.map((f) => f.score));
        const winners = fighters.filter((f) => f.score === highestScore).map((f) => ({ userId: f.user_id, score: f.score }));
        await concludeBattleRecord({
          battleId: data.battleId,
          winners,
        });

        // Drop conclusion receipt in chat
        const winnerNames = fighters.filter((f) => f.score === highestScore).map((f) => f.user_name).join(", ");
        const receiptMsg = await sendBattleAnnouncementMessage({
          targetId: battle.group_id,
          userId: battle.host_id,
          userName: "⚡ Boss Battle Arena",
          userInstitution: "Campus Arena",
          content: `🏆 [BATTLE_RECEIPT:${data.battleId}] Match Complete!\nWinner(s): ${winnerNames} (${highestScore} pts) • Pot of ${battle.total_pot} pts awarded!`,
          materialId: data.battleId,
          materialTitle: `🏆 Battle Solutions: ${battle.title}`,
          materialCourseCode: "MCQ Blitz Winner",
        });
        await broadcastChatMessage(data.groupId, receiptMsg);
      }
    }

    // Broadcast submission event
    await broadcastChatMessage(data.groupId, {
      type: "battle_submission_update",
      battleId: data.battleId,
      userId: data.userId,
      userName: data.userName,
      allSubmitted: res.allSubmitted,
      submittedCount: res.submittedCount,
      participantCount: res.participantCount,
    });

    return res;
  });

/**
 * Nudge slowpokes who have not yet submitted their solutions
 */
export const nudgeSlowpokesServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
    hostName: string;
    battleTitle: string;
  }) => d)
  .handler(async ({ data }): Promise<{ count: number; slowpokes: string[] }> => {
    const { requireCurrentUserId } = await import("@/lib/auth.server");
    const actor = await requireCurrentUserId();
    const battle = await getStudyBattle(data.battleId);
    if (!battle || battle.host_id !== actor) throw new Error("Only the host can nudge participants.");
    const slowpokes = await getSlowpokesRecord(data.battleId);
    if (slowpokes.length === 0) {
      return { count: 0, slowpokes: [] };
    }

    const slowpokeNames = slowpokes.map((s) => `@${s.userName}`).join(", ");
    const nudgeMsg = await sendGroupMessage({
      groupId: data.groupId,
      userId: battle.host_id,
      userName: "⚡ Boss Battle Arena",
      userInstitution: "Campus Arena",
      content: `⏳ [BATTLE_NUDGE] ${data.hostName} is nudging slowpokes: ${slowpokeNames}! Drop your solutions for "${data.battleTitle}" so grading can start!`,
    });

    await broadcastChatMessage(data.groupId, nudgeMsg);
    return { count: slowpokes.length, slowpokes: slowpokes.map((s) => s.userName) };
  });

/**
 * Grade Theory Showdown Battle via Boss AI evaluation
 */
export const gradeTheoryBattleServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; winners: string[] }> => {
    const { requireCurrentUserId } = await import("@/lib/auth.server");
    const actor = await requireCurrentUserId();
    const battle = await getStudyBattle(data.battleId);
    if (!battle) return { success: false, winners: [] };
    if (battle.host_id !== actor) {
      await getStudyGroupMembersWithBalances(battle.group_id, actor);
      const round = await battleRoundState(data.battleId);
      const fighter = (await getBattleParticipants(data.battleId)).some(p => p.user_id === actor && p.role === "fighter");
      if (round.round?.state !== "finished" || !fighter) throw new Error("Only the host can grade this battle before all rounds finish.");
    }
    if (battle.status === "completed" || battle.status === "cancelled") return { success: false, winners: [] };

    const participants = await getBattleParticipants(data.battleId);
    const submittedFighters = participants.filter((p) => p.role === "fighter" && p.status === "submitted");

    if (submittedFighters.length === 0) {
      return { success: false, winners: [] };
    }

    let questions: any[] = [];
    try {
      questions = JSON.parse(battle.questions_json);
    } catch {
      questions = [];
    }
    if (!questions.length || battle.mode !== "theory") throw new Error("This battle has no theory questions to grade.");

    // Evaluate each submitted fighter's answers
    const fighterScores: Array<{ userId: string; userName: string; totalScore: number; evaluations: any[]; answers: Record<string, unknown> }> = [];

    await withAiAllowance(actor, async () => {
    for (const fighter of submittedFighters) {
      let answers: Record<string, { text?: string; imageBase64?: string; imageAttachmentId?: string; audioTranscript?: string }> = {};
      try {
        const saved = JSON.parse(fighter.answers_json || "{}");
        answers = saved.answers || saved;
      } catch {
        answers = {};
      }

      let totalScore = 0;
      const evaluations: any[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const studentAns = answers[String(i)] || {};
        const combinedText = [studentAns.text, studentAns.audioTranscript].filter(Boolean).join(" \n[Voice Derivation]: ");

        try {
          const { peerAttachment, readStudyMedia } = await import("./study-media.server");
          let image: { base64: string; mimeType: string } | undefined;
          if (studentAns.imageAttachmentId) {
            const attachment = await peerAttachment(fighter.user_id, battle.group_id, studentAns.imageAttachmentId);
            if (!attachment.mime.startsWith("image/")) throw new Error("Theory answers require an image.");
            const file = await readStudyMedia(fighter.user_id, attachment.id);
            image = { base64: Buffer.from(file.bytes).toString("base64"), mimeType: attachment.mime };
          }
          if (combinedText.trim() || image) {
            const grading = await gradeTheoryAnswer(q.question, q.modelAnswer || q.explanation || "", combinedText, budgetedAiFetch, image);
            totalScore += grading.score;
            evaluations.push(grading);
          } else {
            evaluations.push({ score: 0, feedback: "No response submitted." });
          }
        } catch {
          throw new Error("Boss AI could not finish grading. No estimated scores have been awarded. Try grading again.");
        }
      }

      fighterScores.push({
        userId: fighter.user_id,
        userName: fighter.user_name,
        totalScore,
        evaluations,
        answers,
      });
    }
    });
    // Find winners
    const maxScore = Math.max(...fighterScores.map((f) => f.totalScore));
    const winners = fighterScores.filter((f) => f.totalScore === maxScore).map((f) => ({ userId: f.userId, score: f.totalScore }));

    const concluded = await concludeBattleRecord({
      battleId: data.battleId,
      winners,
      gradedAnswers: fighterScores.map(f => ({ userId: f.userId, score: f.totalScore, answersJson: JSON.stringify({ answers: f.answers, evaluations: f.evaluations }) })),
    });
    if (!concluded.success) return { success: false, winners: [] };

    const winnerNames = fighterScores.filter((f) => f.totalScore === maxScore).map((f) => f.userName).join(", ");

    // Drop completion receipt in chat
    const receiptMsg = await sendGroupMessage({
      groupId: data.groupId,
      userId: battle.host_id,
      userName: "⚡ Boss Battle Arena",
      userInstitution: "Campus Arena",
      content: `🏆 [BATTLE_RECEIPT:${data.battleId}] Theory Showdown Graded!\nWinner(s): ${winnerNames} with ${maxScore} pts! Pot of ${battle.total_pot} pts distributed!`,
      materialId: data.battleId,
      materialTitle: `🏆 Battle Solutions: ${battle.title}`,
      materialCourseCode: "Theory Showdown Winner",
    });
    await broadcastChatMessage(data.groupId, receiptMsg);

    return { success: true, winners: winners.map((w) => w.userId) };
  });

/**
 * Host force-grades an untimed battle even if slowpokes haven't submitted
 */
export const forceGradeBattleServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    battleId: string;
    groupId: string;
    hostId: string;
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const { requireCurrentUserId } = await import("@/lib/auth.server");
    const actor = await requireCurrentUserId();
    const battle = await getStudyBattle(data.battleId);
    if (!battle || battle.host_id !== actor) {
      throw new Error("Only the host can force-grade this battle.");
    }

    if (battle.mode === "theory") {
      const res = await gradeTheoryBattleServerFn({
        data: { battleId: data.battleId, groupId: data.groupId },
      });
      return { success: res.success };
    } else {
      const participants = await getBattleParticipants(data.battleId);
      const fighters = participants.filter((p) => p.role === "fighter" && p.status === "submitted");
      if (fighters.length > 0) {
        const highestScore = Math.max(...fighters.map((f) => f.score));
        const winners = fighters.filter((f) => f.score === highestScore).map((f) => ({ userId: f.user_id, score: f.score }));
        await concludeBattleRecord({
          battleId: data.battleId,
          winners,
        });
      }
      return { success: true };
    }
  });


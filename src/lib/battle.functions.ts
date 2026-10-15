import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getStudyGroupMembersWithBalances,
  createStudyBattleRecord,
  getStudyBattle,
  getBattleParticipants,
  joinBattleEscrowRecord,
  declineBattleRecord,
  submitBattleAnswersRecord,
  concludeBattleRecord,
  getSlowpokesRecord,
  sendGroupMessage,
  type StudyBattle,
  type BattleParticipant,
  type GroupMemberWithBalance,
} from "@/integrations/turso/community";
import { generatePracticeQuestions, gradeTheoryAnswer } from "@/lib/academic-ai";
import { broadcastChatMessage } from "@/lib/supabase-realtime";

/**
 * Fetch all group members with live point balances for the battle host drawer
 */
export const getGroupMembersWithBalancesServerFn = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<GroupMemberWithBalance[]> => {
    return await getStudyGroupMembersWithBalances(data.groupId);
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
    timePerQuestion?: number | null | undefined;
    questionCount?: number | undefined;
    stakeAmount?: number | undefined;
    fighterIds: string[];
    sponsoredIds?: string[] | undefined;
  }) => d)
  .handler(async ({ data }): Promise<StudyBattle> => {
    const questionCount = data.questionCount || 5;
    const modeType = data.mode === "mcq" ? "objective" : "theory";

    // 1. Generate questions using Boss AI
    const questions = await generatePracticeQuestions(
      data.title,
      data.sourceContext || data.title,
      modeType,
      questionCount
    );

    const battleId = crypto.randomUUID();

    // 2. Insert into Turso database with atomic host stake deduction
    const battle = await createStudyBattleRecord({
      id: battleId,
      groupId: data.groupId,
      hostId: data.hostId,
      hostName: data.hostName,
      hostAvatar: data.hostAvatar,
      title: data.title,
      mode: data.mode,
      sourceSummary: data.sourceSummary,
      timePerQuestion: data.timePerQuestion,
      questionCount,
      questionsJson: JSON.stringify(questions),
      stakeAmount: data.stakeAmount || 0,
      fighterIds: data.fighterIds,
      sponsoredIds: data.sponsoredIds,
    });

    // 3. Drop Interactive Battle Lobby Card into the group chat stream
    const modeLabel = data.mode === "mcq" ? "MCQ Blitz" : "Theory Showdown";
    const stakeLabel = data.stakeAmount && data.stakeAmount > 0
      ? ` • 💰 ${data.stakeAmount} pts Buy-in (Pot: ${battle.total_pot} pts)`
      : " • 🎲 Friendly (0 pts)";

    const battleMessage = await sendGroupMessage({
      groupId: data.groupId,
      userId: data.hostId,
      userName: data.hostName,
      userInstitution: "Campus Study Group",
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
  }> => {
    const battle = await getStudyBattle(data.battleId);
    const participants = await getBattleParticipants(data.battleId);
    return { battle, participants };
  });

/**
 * Join battle with atomic escrow stake lock
 */
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
    const res = await joinBattleEscrowRecord({
      battleId: data.battleId,
      userId: data.userId,
      userName: data.userName,
      avatarUrl: data.avatarUrl,
      role: data.role || "fighter",
    });

    if (res.success) {
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
    const res = await submitBattleAnswersRecord({
      battleId: data.battleId,
      userId: data.userId,
      score: data.score,
      answersJson: data.answersJson,
    });

    const battle = await getStudyBattle(data.battleId);

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
        const receiptMsg = await sendGroupMessage({
          groupId: data.groupId,
          userId: "system",
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
    const slowpokes = await getSlowpokesRecord(data.battleId);
    if (slowpokes.length === 0) {
      return { count: 0, slowpokes: [] };
    }

    const slowpokeNames = slowpokes.map((s) => `@${s.userName}`).join(", ");
    const nudgeMsg = await sendGroupMessage({
      groupId: data.groupId,
      userId: "system",
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
    const battle = await getStudyBattle(data.battleId);
    if (!battle) return { success: false, winners: [] };

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

    // Evaluate each submitted fighter's answers
    const fighterScores: Array<{ userId: string; userName: string; totalScore: number; evaluations: any[] }> = [];

    for (const fighter of submittedFighters) {
      let answers: Record<string, { text?: string; imageBase64?: string; audioTranscript?: string }> = {};
      try {
        answers = JSON.parse(fighter.answers_json || "{}");
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
          if (combinedText.trim()) {
            const grading = await gradeTheoryAnswer(q.question, q.modelAnswer || q.explanation || "", combinedText);
            totalScore += grading.score;
            evaluations.push(grading);
          } else {
            evaluations.push({ score: 0, feedback: "No response submitted." });
          }
        } catch (err: any) {
          evaluations.push({ score: 5, feedback: "Estimated standard credit." });
          totalScore += 5;
        }
      }

      fighterScores.push({
        userId: fighter.user_id,
        userName: fighter.user_name,
        totalScore,
        evaluations,
      });

      // Update participant's finalized score in Turso
      await submitBattleAnswersRecord({
        battleId: data.battleId,
        userId: fighter.user_id,
        score: totalScore,
        answersJson: JSON.stringify({ answers, evaluations }),
      });
    }

    // Find winners
    const maxScore = Math.max(...fighterScores.map((f) => f.totalScore));
    const winners = fighterScores.filter((f) => f.totalScore === maxScore).map((f) => ({ userId: f.userId, score: f.totalScore }));

    await concludeBattleRecord({
      battleId: data.battleId,
      winners,
    });

    const winnerNames = fighterScores.filter((f) => f.totalScore === maxScore).map((f) => f.userName).join(", ");

    // Drop completion receipt in chat
    const receiptMsg = await sendGroupMessage({
      groupId: data.groupId,
      userId: "system",
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
    const battle = await getStudyBattle(data.battleId);
    if (!battle || battle.host_id !== data.hostId) {
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


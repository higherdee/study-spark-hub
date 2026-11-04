import { createFileRoute } from "@tanstack/react-router";
import { verifyToken } from "@clerk/backend";
import { waitUntil } from "@vercel/functions";
import { giftCashoutInput, giftCashoutOptions, requestGiftCashout } from "@/lib/gift-cashout.server";
import { z } from "zod";
import { CLERK_SECRET_KEY } from "@/integrations/clerk";
import { turso, getMaterials, getProfile, getLeaderboard, upsertProfile } from "@/integrations/turso/client.server";
import { getStudyGroups, getGroupMessages, joinStudyGroup, sendGroupMessage, searchPeers, getStudentConversations, getDirectMessages, getOrCreatePeerConversation, sendDirectMessage } from "@/integrations/turso/community.server";
import { withAiAllowance, budgetedAiFetch } from "@/lib/membership/ai.server";
import { chatBudget, compactChatHistory } from "@/lib/ai/chat-cost";
import { enforceChatRetention, membershipSnapshot, startMaterialGate, completeMaterialGate } from "@/lib/membership/policy.server";
import { preferencePatch } from "@/lib/membership/preferences";
import { focusHeartbeat, focusSnapshot } from "@/lib/focus.server";
import { answerDocumentQuestion } from "@/lib/document-study.server";
import { materialReviews } from "@/lib/material-reviews.functions";
import { MembershipLimitError } from "@/lib/membership/policy";
import { acceptDirectRequest, createStudyGroup, directRequestState, getDirectUnreadTotal, markDirectMessagesRead } from "@/integrations/turso/community.server";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function identity(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error("Unauthorized");
  const claims = await verifyToken(token, { secretKey: CLERK_SECRET_KEY }).catch(() => { throw new Error("Unauthorized"); });
  const profile = await getProfile(claims.sub);
  if (profile?.suspended) throw new Error("Unauthorized");
  return claims.sub;
}
const peerInput = z.object({
  content: z.string().trim().max(3000).default(""),
  attachmentId: z.string().uuid().optional(),
  materialId: z.string().max(100).optional(),
});
async function peerContent(actor: string, target: string, input: z.infer<typeof peerInput>) {
  if (input.attachmentId && input.materialId) throw new Error("Attach one item at a time.");
  if (input.attachmentId) {
    const { peerAttachment } = await import("@/lib/study-media.server");
    const media = await peerAttachment(actor,target,input.attachmentId);
    return { content: JSON.stringify({ text: input.content, syllabossAttachment: media }), previewText: input.content || (media.mime.startsWith("audio/") ? "Voice note" : media.title) };
  }
  if (input.materialId) {
    const material = (await turso.execute({
      sql: "SELECT id,title,course_code FROM materials WHERE id=? AND status='verified'", args: [input.materialId],
    })).rows[0];
    if (!material) throw new Error("Library material is unavailable.");
    return { content: input.content || "Shared a library material", materialId: input.materialId, materialTitle: String(material['title']), materialCourseCode: String(material['course_code'] ?? "") };
  }
  if (!input.content) throw new Error("Enter a message.");
  return { content: input.content };
}

function queuePeerAnswer(userId: string, target: string, content: string, group: boolean) {
  if (!/@bossai\b/i.test(content)) return;
  const query = content.replace(/@bossai\b/gi, "").trim();
  if (!query) return;
  waitUntil((async () => {
    if (!group && await directRequestState(target, userId) !== "accepted") return;
    const { askBossAiServerFn } = await import("@/lib/ai/study-assistant.functions");
    const { response } = await askBossAiServerFn({ data: { userId, query, taskType: "general" } });
    const reply = "**Boss AI**:\n" + response;
    if (group) await sendGroupMessage({ groupId: target, userId, userName: "Boss AI", content: reply });
    else await sendDirectMessage({ conversationId: target, senderId: userId, content: reply });
  })().catch(() => console.warn("Peer AI reply could not be completed.")));
}
export const Route = createFileRoute("/api/mobile")({
  server: { handlers: {
    GET: async ({ request }) => {
      const url = new URL(request.url);
      const resource = url.searchParams.get("resource") || "library";
      try {
        if (resource === "library") {
          const materials = await getMaterials({ status: "verified", q: (url.searchParams.get("q") || "").slice(0, 150), limit: 80 });
          return json({ materials: materials.map(({ id, title, course, course_code, institution, level, material_type, page_count, file_size, mime_type }) =>
            ({ id, title, course, course_code, institution, level, material_type, page_count, file_size, mime_type })) });
        }
        if (resource === "shared-material") {
          const material = (await turso.execute({
            sql: "SELECT id,title,course,course_code,institution,material_type,page_count,mime_type FROM materials WHERE id=? AND status='verified'",
            args: [(url.searchParams.get("id") || "").slice(0,100)],
          })).rows[0];
          return material ? json({material}) : json({error:"This library material is unavailable."},404);
        }
        const userId = await identity(request);
        if (resource === "membership") return json(await membershipSnapshot(userId));
        if (resource === "gift-cashout") return json({ options: giftCashoutOptions(request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry")) });
        if (resource === "source") { const {loadDocumentContext}=await import("@/lib/document-study.server"); const doc=await loadDocumentContext(userId,(url.searchParams.get("id")||"").slice(0,100)); return json({id:doc.material.id,title:doc.material.title,pages:doc.pages}); }
        if (resource === "battle-members" || resource === "battles") { const target=(url.searchParams.get("target")||"").slice(0,100); const {getStudyGroupMembersWithBalances}=await import("@/integrations/turso/community.server"); const members=await getStudyGroupMembersWithBalances(target,userId); if(resource==="battle-members")return json({members}); return json({battles:(await turso.execute({sql:"SELECT b.id,b.title,b.mode,b.status,b.question_count,b.total_pot,COALESCE('@' || NULLIF(p.username,''), 'Student') AS host_name FROM study_battles b LEFT JOIN profiles p ON p.id=b.host_id WHERE b.group_id=? ORDER BY b.created_at DESC LIMIT 20",args:[target]})).rows}); }
        if (resource === "battle") {const {getBattleDetailsServerFn}=await import("@/lib/battle.functions");return json(await getBattleDetailsServerFn({data:{battleId:(url.searchParams.get("id")||"").slice(0,100)}}));}
        if (resource === "settings") { const profile = await getProfile(userId); return json({ profile, preferences: profile?.study_plan?.["preferences"] || {} }); }
        if (resource === "focus") return json(await focusSnapshot(userId));
        if (resource === "reviews") return json(await materialReviews(userId, (url.searchParams.get("material") || "").slice(0, 100)));
        if (resource === "peers") return json({ peers: await searchPeers((url.searchParams.get("q") || "").slice(0, 100), userId) });
        if (resource === "direct-conversations") return json({ conversations: await getStudentConversations(userId) });
        if (resource === "direct-unread") return json({ total: await getDirectUnreadTotal(userId) });
        if (resource === "direct-request") return json({ requestState: await directRequestState((url.searchParams.get("thread") || "").slice(0, 100), userId) });
        if (resource === "direct-messages") {
          const conversation = (url.searchParams.get("thread") || "").slice(0, 100);
          const [messages, requestState] = await Promise.all([
            getDirectMessages(conversation, 80, userId),
            directRequestState(conversation, userId),
          ]);
          return json({ messages, requestState });
        }
        if (resource === "conversations" || resource === "conversation") await enforceChatRetention(userId);
        if (resource === "conversations") {
          const result = await turso.execute({ sql: "SELECT id, title, updated_at FROM chat_threads WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50", args: [userId] });
          return json({ conversations: result.rows });
        }
        if (resource === "conversation") {
          const threadId = (url.searchParams.get("thread") || "").slice(0, 100);
          const owned = await turso.execute({ sql: "SELECT id, title FROM chat_threads WHERE id = ? AND user_id = ? LIMIT 1", args: [threadId, userId] });
          if (!owned.rows.length) return json({ error: "Conversation not found." }, 404);
          const result = await turso.execute({ sql: "SELECT role, parts FROM chat_messages WHERE thread_id = ? AND user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200", args: [threadId, userId] });
          return json({ title: owned.rows[0]?.['title'], messages: [...result.rows].reverse().map(row => ({ role: row['role'], content: readText(row['parts']) })).filter(message => message.content) });
        }
        if (resource === "groups") return json({ groups: await getStudyGroups(userId, (url.searchParams.get("q") || "").slice(0, 100)) });
        if (resource === "messages") return json({ messages: await getGroupMessages((url.searchParams.get("group") || "").slice(0, 100), 60, userId) });
        if (resource === "space") {
          const [profile, ledger, ranks] = await Promise.all([
            getProfile(userId),
            turso.execute({ sql: "SELECT amount, reason, created_at FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", args: [userId] }),
            getLeaderboard(20),
          ]);
          return json({ profile: profile ? { full_name: profile.full_name, course: profile.course, institution: profile.institution, level: profile.level, points: profile.points, study_minutes: profile.study_minutes, current_streak: profile.current_streak } : null, ledger: ledger.rows, ranks });
        }
        return json({ error: "Unknown resource" }, 404);
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") return json({ error: "Sign in to continue." }, 401);
        if (error instanceof MembershipLimitError) return json({ error: error.message }, 403);
        console.error("Mobile API request failed", error instanceof Error ? error.message : "Unknown error");
        return json({ error: "Unable to load this right now. Please try again." }, 503);
      }
    },
    POST: async ({ request }) => {
      let userId: string;
      try { userId = await identity(request); } catch { return json({ error: "Sign in to continue." }, 401); }
      const body = await request.json().catch(() => null);
      if (body?.action === "gift-cashout") {
        const input = giftCashoutInput.safeParse(body);
        if (!input.success) return json({ error: "Choose a gift card and enter a delivery email." }, 400);
        try {
          const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry");
          return json({ withdrawalId: await requestGiftCashout(userId, country, input.data) });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Cashout could not be requested." }, 400);
        }
      }
      if (body?.action === "create-group") {
        const input = z.object({ name: z.string().trim().min(3).max(80), description: z.string().trim().max(300).default("") }).safeParse(body);
        if (!input.success) return json({ error: "Enter a group name of 3–80 characters." }, 400);
        try {
          return json({ group: { ...await createStudyGroup({ ...input.data, userId }), is_member: true } });
        } catch {
          return json({ error: "Could not create the group. Try again." }, 503);
        }
      }
      if (body?.action === "direct-accept" || body?.action === "direct-read") {
        const id = z.string().min(1).max(100).safeParse(body.conversationId);
        if (!id.success) return json({ error: "Invalid conversation." }, 400);
        try {
          if (body.action === "direct-accept") await acceptDirectRequest(id.data, userId);
          else await markDirectMessagesRead(id.data, userId);
          return json({ success: true });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Conversation unavailable." }, 403);
        }
      }
      if(typeof body?.action==="string"&&body.action.startsWith("battle-")){
        try{
          const actions=await import("@/lib/battle.functions");const profile=await getProfile(userId);const name=profile?.full_name||"Student";
          if(body.action==="battle-create"){
            const input=z.object({target:z.string().min(1).max(100),title:z.string().trim().min(3).max(200),mode:z.enum(["mcq","theory"]),count:z.number().int().min(1).max(50),fighterIds:z.array(z.string().min(1).max(100)).max(20),stake:z.number().int().min(0).max(10000).default(0),sourceMaterialId:z.string().min(1).max(100).optional()}).parse(body);
            return json(await actions.createStudyBattleServerFn({data:{groupId:input.target,hostId:userId,hostName:name,title:input.title,mode:input.mode,questionCount:input.count,fighterIds:input.fighterIds,stakeAmount:input.stake,...(input.sourceMaterialId?{sourceMaterialId:input.sourceMaterialId}:{})}}));
          }
          const input=z.object({battleId:z.string().uuid(),target:z.string().min(1).max(100),answersJson:z.string().max(100000).optional()}).parse(body);
          const {getStudyBattle}=await import("@/integrations/turso/community.server");const battle=await getStudyBattle(input.battleId);if(!battle||battle.group_id!==input.target)throw new Error("Battle not found in this conversation.");
          if(body.action==="battle-join")return json(await actions.joinBattleEscrowServerFn({data:{battleId:input.battleId,groupId:input.target,userId,userName:name}}));
          if(body.action==="battle-submit"&&input.answersJson)return json(await actions.submitBattleAnswersServerFn({data:{battleId:input.battleId,groupId:input.target,userId,userName:name,score:0,answersJson:input.answersJson}}));
          if(body.action==="battle-grade")return json(await actions.forceGradeBattleServerFn({data:{battleId:input.battleId,groupId:input.target,hostId:userId}}));
          return json({error:"Unknown battle action."},400);
        }catch(e){return json({error:e instanceof z.ZodError?"Check the battle details.":e instanceof Error?e.message:"Battle unavailable."},400);}
      }
      if (["preferences", "study-heartbeat", "start-material", "complete-material", "document-chat", "start-direct", "direct-message", "redeem-promo", "study-generate", "grade-theory", "review"].includes(body?.action)) {
        try {
          if (body.action === "study-generate") { const { nativeStudySet } = await import("@/lib/native-study.server"); return json(await nativeStudySet(userId, body)); }
          if (body.action === "grade-theory") { const { nativeTheoryGrade } = await import("@/lib/native-study.server"); return json(await nativeTheoryGrade(userId, body)); }
          if (body.action === "preferences") { const preferences = preferencePatch.parse(body.preferences); await upsertProfile({ id: userId, study_plan: { preferences } }); return json({ preferences }); }
          if (body.action === "study-heartbeat") return json(await focusHeartbeat(userId, z.boolean().parse(body.active)));
          if (body.action === "start-material") return json(await startMaterialGate(userId, z.string().min(1).max(100).parse(body.materialId), z.enum(["preview", "download"]).parse(body.intent)));
          if (body.action === "complete-material") return json(await completeMaterialGate(userId, z.string().uuid().parse(body.id)));
          if (body.action === "document-chat") { const input = z.object({ materialId: z.string().min(1).max(100), message: z.string().trim().min(1).max(6000), threadId: z.string().uuid().optional() }).parse(body); return json(await answerDocumentQuestion(userId, input)); }
          if (body.action === "start-direct") return json(await getOrCreatePeerConversation(userId, z.string().min(1).max(100).parse(body.peerId)));
          if (body.action === "direct-message") {
            const input = peerInput.extend({ conversationId: z.string().min(1).max(100) }).parse(body);
            const message = await sendDirectMessage({ conversationId: input.conversationId, senderId: userId, ...await peerContent(userId, input.conversationId, input) });
            queuePeerAnswer(userId, input.conversationId, input.content, false);
            return json({ message });
          }
          if (body.action === "redeem-promo") { const { redeemPromo } = await import("@/lib/membership/promos.server"); return json(await redeemPromo(userId, { code: body.code, requestId: body.requestId })); }
          if (body.action === "review") { const input = z.object({ materialId: z.string().min(1).max(100), rating: z.number().int().min(1).max(5), review: z.string().trim().max(1500).default("") }).parse(body); await materialReviews(userId, input.materialId); const { rateMaterial } = await import("@/integrations/turso/client.server"); return json(await rateMaterial(input.materialId, userId, input.rating, input.review)); }
        } catch (error) {
          if (error instanceof Error && /^(Enter a topic|Add a topic|Conversation not found|Boss AI could not generate)/.test(error.message)) return json({ error: error.message },400);
          if (error instanceof Error && error.message.startsWith("This promo code")) return json({ error: error.message }, 400);
          if (error instanceof MembershipLimitError) return json({ error: error.message, upgrade: /SyllaPlus|Free accounts|1,000/i.test(error.message), retryAfter: error.retryAfter }, error.status);
          if(error instanceof Error && /document|photo|mark|reference|response needs|SyllaPlus/i.test(error.message))return json({error:error.message},400);
          return json({ error: error instanceof z.ZodError ? "Check your details and try again." : "This request could not complete. Check your connection and retry." }, error instanceof z.ZodError ? 400 : 503);
        }
      }
      if (body?.action === "profile") {
        const fields = z.object({ full_name: z.string().trim().min(2).max(100), course: z.string().trim().min(2).max(180), institution: z.string().trim().min(2).max(180), level: z.string().max(30) }).safeParse(body);
        if (!fields.success) return json({ error: "Add your name, course and institution." }, 400);
        try { await upsertProfile({ ...fields.data, id: userId, onboarding_step: 4 }); return json({ success: true }); }
        catch { return json({ error: "Profile could not be saved. Please retry." }, 503); }
      }
      if (body?.action === "join" || body?.action === "group-message") {
        const groupAction = peerInput.extend({ action: z.enum(["join", "group-message"]), group: z.string().min(1).max(100) }).safeParse(body);
        if (!groupAction.success) return json({ error: "Enter a valid group and message." }, 400);
        try {
          const group = await turso.execute({ sql: "SELECT id FROM study_groups WHERE id = ? LIMIT 1", args: [groupAction.data.group] });
          if (!group.rows.length) return json({ error: "Study group not found." }, 404);
          if (body.action === "join") return (await joinStudyGroup(groupAction.data.group, userId)) ? json({ success: true }) : json({ error: "Could not join this group." }, 400);

          const profile = await getProfile(userId);
          const message = await sendGroupMessage({ groupId: groupAction.data.group, userId, userName: "Student", ...(profile?.institution ? { userInstitution: profile.institution } : {}), ...await peerContent(userId, groupAction.data.group, groupAction.data) });
          queuePeerAnswer(userId, groupAction.data.group, groupAction.data.content, true);
          return json({ message });
        } catch { return json({ error: "Join the study group before posting. Please try again." }, 403); }
      }
      const parsed = z.object({ message: z.string().trim().min(1).max(6000), threadId: z.string().uuid().optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) })).max(12).default([]) }).safeParse(body);
      if (!parsed.success) return json({ error: "Enter a question of up to 6,000 characters." }, 400);
      // The server controls identity, model, system prompt and API credentials.
      // Native clients never receive database credentials or write reward balances.
      const key = process.env['GROQ_API_KEY'];
      if (!key) return json({ error: "Boss AI is temporarily unavailable." }, 503);
      try {
        await enforceChatRetention(userId);
        return await withAiAllowance(userId, async () => {
        const threadId = parsed.data.threadId || crypto.randomUUID();
        if (parsed.data.threadId) {
          const owned = await turso.execute({ sql: "SELECT id FROM chat_threads WHERE id = ? AND user_id = ? LIMIT 1", args: [threadId, userId] });
          if (!owned.rows.length) return json({ error: "Conversation not found." }, 404);
        }
        const budget = chatBudget(parsed.data.message);
        const prior = await turso.execute({
          sql: "SELECT role, parts FROM chat_messages WHERE thread_id = ? AND user_id = ? AND role IN ('user','assistant') ORDER BY created_at DESC, rowid DESC LIMIT ?",
          args: [threadId, userId, budget.historyCount],
        });
        const history = compactChatHistory(
          [...prior.rows].reverse().map(row => ({ role: String(row['role']), content: readText(row['parts']) })),
          message => message.content,
          (message, content) => ({ ...message, content }),
          budget,
        );
        const response = await budgetedAiFetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(55000),
          body: JSON.stringify({
            model: budget.model,
            max_completion_tokens: budget.output,
            reasoning_effort: budget.effort,
            messages: [
              { role: "system", content: `You are Boss, Syllaboss's study tutor for Nigerian university students. ${budget.instruction} Use Markdown and LaTeX where helpful. State uncertainty, never invent sources, and never assist exam malpractice.` },
              ...history,
              { role: "user", content: parsed.data.message },
            ],
          }),
        });
        if (!response.ok) throw new Error("AI provider unavailable");
        const result = await response.json();
        const answer = result.choices?.[0]?.message?.content;
        if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty AI response");
        const messages = [
          { role: "user", text: parsed.data.message },
          { role: "assistant", text: answer },
        ];
        await turso.batch([
          ...(!parsed.data.threadId ? [{
            sql: "INSERT INTO chat_threads (id, user_id, title) VALUES (?, ?, ?)",
            args: [threadId, userId, parsed.data.message.slice(0, 60)],
          }] : []),
          ...messages.map(({ role, text }) => ({
            sql: "INSERT INTO chat_messages (id, thread_id, user_id, message_id, role, parts) VALUES (?, ?, ?, ?, ?, ?)",
            args: [crypto.randomUUID(), threadId, userId, crypto.randomUUID(), role, JSON.stringify([{ type: "text", text }])],
          })),
          { sql: "UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ? AND user_id = ?", args: [threadId, userId] },
        ], "write");
        return json({ answer, threadId });
        });
      } catch (error) { return error instanceof MembershipLimitError ? json({ error: error.message, upgrade: true, retryAfter: error.retryAfter }, error.status) : json({ error: "Boss could not answer right now. Please retry." }, 503); }
    },
  } },
});

function readText(parts: unknown): string {
  try {
    const parsed = JSON.parse(String(parts || "[]"));
    if (Array.isArray(parsed)) return parsed.filter(part => part.type === "text").map(part => String(part.text || "")).join("\n");
    if (parsed && typeof parsed === "object") return typeof parsed.text === "string" ? parsed.text : "";
    return typeof parsed === "string" ? parsed : "";
  }
  catch { return ""; }
}

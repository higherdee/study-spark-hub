import { createFileRoute } from "@tanstack/react-router";
import { verifyToken } from "@clerk/backend";
import { z } from "zod";
import { CLERK_SECRET_KEY } from "@/integrations/clerk";
import { turso, getMaterials, getProfile, getLeaderboard } from "@/integrations/turso/client.server";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function identity(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error("Unauthorized");
  const claims = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
  const profile = await getProfile(claims.sub);
  if (profile?.suspended) throw new Error("Unauthorized");
  return claims.sub;
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
        const userId = await identity(request);
        if (resource === "space") {
          const [profile, ledger, ranks] = await Promise.all([
            getProfile(userId),
            turso.execute({ sql: "SELECT amount, reason, created_at FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", args: [userId] }),
            getLeaderboard(20),
          ]);
          return json({ profile: profile ? { full_name: profile.full_name, course: profile.course, institution: profile.institution, points: profile.points, study_minutes: profile.study_minutes, current_streak: profile.current_streak } : null, ledger: ledger.rows, ranks });
        }
        return json({ error: "Unknown resource" }, 404);
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") return json({ error: "Sign in to continue." }, 401);
        console.error("Mobile API request failed", error instanceof Error ? error.message : "Unknown error");
        return json({ error: "Unable to load this right now. Please try again." }, 503);
      }
    },
    POST: async ({ request }) => {
      let userId: string;
      try { userId = await identity(request); } catch { return json({ error: "Sign in to continue." }, 401); }
      const parsed = z.object({ message: z.string().trim().min(1).max(6000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) })).max(12).default([]) }).safeParse(await request.json().catch(() => null));
      if (!parsed.success) return json({ error: "Enter a question of up to 6,000 characters." }, 400);
      // The server controls identity, model, system prompt and API credentials.
      // Native clients never receive database credentials or write reward balances.
      const key = process.env['GROQ_API_KEY'] || process.env['VITE_GROQ_API_KEY'];
      if (!key) return json({ error: "Boss AI is temporarily unavailable." }, 503);
      try {
        const quota = await turso.execute({ sql: "SELECT COUNT(*) AS n FROM chat_messages WHERE user_id = ? AND role = 'user' AND created_at > datetime('now', '-1 hour')", args: [userId] });
        if (Number(quota.rows[0]?.['n'] || 0) >= 40) return json({ error: "You have reached the hourly study chat limit. Try again later." }, 429);
        const threadId = crypto.randomUUID();
        await turso.execute({ sql: "INSERT INTO chat_threads (id, user_id, title) VALUES (?, ?, ?)", args: [threadId, userId, parsed.data.message.slice(0, 60)] });
        await turso.execute({ sql: "INSERT INTO chat_messages (id, thread_id, user_id, message_id, role, parts) VALUES (?, ?, ?, ?, 'user', ?)", args: [crypto.randomUUID(), threadId, userId, crypto.randomUUID(), JSON.stringify([{ type: "text", text: parsed.data.message }])] });
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(55000),
          body: JSON.stringify({ model: "openai/gpt-oss-120b", max_completion_tokens: 2200, messages: [{ role: "system", content: "You are Boss, Syllaboss's study tutor for Nigerian university students. Explain clearly, use short paragraphs and worked examples. Help students understand, practise and revise. Never assist exam malpractice. Do not claim to have opened files you have not received." }, ...parsed.data.history, { role: "user", content: parsed.data.message }] }),
        });
        if (!response.ok) throw new Error("AI provider unavailable");
        const result = await response.json();
        const answer = result.choices?.[0]?.message?.content;
        if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty AI response");
        await turso.execute({ sql: "INSERT INTO chat_messages (id, thread_id, user_id, message_id, role, parts) VALUES (?, ?, ?, ?, 'assistant', ?)", args: [crypto.randomUUID(), threadId, userId, crypto.randomUUID(), JSON.stringify([{ type: "text", text: answer }])] });
        return json({ answer });
      } catch { return json({ error: "Boss could not answer right now. Please retry." }, 503); }
    },
  } },
});

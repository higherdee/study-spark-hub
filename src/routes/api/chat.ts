import { createFileRoute } from "@tanstack/react-router";
import { verifyToken } from "@clerk/backend";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { InValue } from "@libsql/client";

import { turso, getProfile } from "@/integrations/turso/client.server";
import { CHAT_MODEL, createGateway, GROQ_API_KEY } from "@/lib/ai/gateway.server";
import { chatBudget, compactChatHistory } from "@/lib/ai/chat-cost";
import { getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id";

import { CLERK_SECRET_KEY } from "@/integrations/clerk";
import { beginAiRequest, settleAiRequest, enforceChatRetention } from "@/lib/membership/policy.server";
import { MembershipLimitError } from "@/lib/membership/policy";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const clerkSecretKey = CLERK_SECRET_KEY;

        let userId: string;
        try {
          const verified = await verifyToken(token, { secretKey: clerkSecretKey });
          userId = verified.sub;
        } catch (err) {
          console.error("Token verification failed:", err);
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string };
        const messages = body.messages ?? [];
        if (!body.threadId || messages.length === 0) return new Response("Bad request", { status: 400 });
        await enforceChatRetention(userId);

        const tRs = await turso.execute({
          sql: "SELECT id, title FROM chat_threads WHERE id = ? AND user_id = ? LIMIT 1",
          args: [body.threadId, userId],
        });
        if (tRs.rows.length === 0 || !tRs.rows[0]) return new Response("Conversation not found", { status: 404 });
        const threadRow = tRs.rows[0] as unknown as Record<string, unknown>;
        const threadId = String(threadRow['id']);
        const threadTitle = String(threadRow['title']);
        let allowance;
        try { allowance = await beginAiRequest(userId); }
        catch (error) {
          if (error instanceof MembershipLimitError) return Response.json({ error: error.message, upgrade: true }, { status: error.status, headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {} });
          return new Response("Membership could not be checked. Please retry.", { status: 503 });
        }

        const last = messages[messages.length - 1]!;
        const question = last.parts.flatMap(part => part.type === "text" ? [part.text] : []).join("\n");
        const budget = chatBudget(question);
        const history = compactChatHistory(
          messages.slice(0, -1).filter(message => message.role === "user" || message.role === "assistant"),
          message => message.parts.flatMap(part => part.type === "text" ? [part.text] : []).join("\n"),
          (message, text) => ({ ...message, parts: [{ type: "text", text }] }),
          budget,
        );
        if (last.role === "user") {
          const userArgs: InValue[] = [
            crypto.randomUUID(),
            threadId,
            userId,
            last.id,
            "user",
            JSON.stringify(last.parts),
          ];
          await turso.execute({
            sql: "INSERT INTO chat_messages (id, thread_id, user_id, message_id, role, parts) VALUES (?, ?, ?, ?, ?, ?)",
            args: userArgs,
          });
        }

        const profile = await getProfile(userId);

        const system = `You are Boss, the Syllaboss study assistant for university students. ${budget.instruction} Use Markdown and never help with exam malpractice.
Course: ${profile?.course ?? "unknown"}. Level: ${profile?.level ?? "unknown"}.`;

        const { provider, runIdFetch } = createGateway(getLovableAiGatewayRunId(request));
        const result = streamText({
          model: provider.responses(GROQ_API_KEY ? budget.model : CHAT_MODEL),
          system,
          messages: await convertToModelMessages([...history, last]),
          abortSignal: request.signal,
          ...(GROQ_API_KEY ? { providerOptions: { openai: { reasoningEffort: budget.effort } } } : {}),
          maxOutputTokens: Math.min(allowance.limit, budget.output),
          maxRetries: 0,
          onFinish: async ({ usage }) => { await settleAiRequest(allowance, usage.outputTokens); },
          onError: async () => { await settleAiRequest(allowance); },
          onAbort: async () => { await settleAiRequest(allowance); },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onFinish: async ({ responseMessage }) => {
            try {
              const assistantArgs: InValue[] = [
                crypto.randomUUID(),
                threadId,
                userId,
                responseMessage.id,
                "assistant",
                JSON.stringify(responseMessage.parts),
              ];
              await turso.execute({
                sql: "INSERT INTO chat_messages (id, thread_id, user_id, message_id, role, parts) VALUES (?, ?, ?, ?, ?, ?)",
                args: assistantArgs,
              });

              const firstText = messages
                .find((m) => m.role === "user")
                ?.parts.find((p) => p.type === "text") as { text: string } | undefined;

              const shouldUpdateTitle = threadTitle === "New conversation" && Boolean(firstText);
              const updateArgs: InValue[] = shouldUpdateTitle && firstText
                ? [firstText.text.slice(0, 60), threadId]
                : [threadId];
              await turso.execute({
                sql: `UPDATE chat_threads SET updated_at = datetime('now') ${shouldUpdateTitle ? ", title = ?" : ""} WHERE id = ?`,
                args: updateArgs,
              });
            } catch (err) {
              console.error("Failed to save assistant response:", err);
            }
          },
        });

        return withLovableAiGatewayRunIdHeader(response, runIdFetch);
      },
    },
  },
});


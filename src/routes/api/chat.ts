import { createFileRoute } from "@tanstack/react-router";
import { verifyToken } from "@clerk/backend";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { InValue } from "@libsql/client";

import { turso, getProfile } from "@/integrations/turso/client";
import { CHAT_MODEL, createGateway, reasoningOptions } from "@/lib/ai/gateway.server";
import { getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const clerkSecretKey =
          process.env['CLERK_SECRET_KEY'] || "sk_test_VNJuQRLEHxWXYBrzNbJNhCiVbVVX7n3aNS25bwC3Cg";

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

        const tRs = await turso.execute({
          sql: "SELECT id, title FROM chat_threads WHERE id = ? AND user_id = ? LIMIT 1",
          args: [body.threadId, userId],
        });
        if (tRs.rows.length === 0 || !tRs.rows[0]) return new Response("Conversation not found", { status: 404 });
        const threadRow = tRs.rows[0] as unknown as Record<string, unknown>;
        const threadId = String(threadRow['id']);
        const threadTitle = String(threadRow['title']);

        const last = messages[messages.length - 1]!;
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

        const system = `You are Boss, the Syllaboss study assistant for university students (mostly in Nigeria). Be warm, clear and practical. Explain concepts step by step, quiz the student when helpful, build study timetables, and summarise topics. Use markdown. Never help with exam malpractice.
Student: ${profile?.full_name ?? "unknown"}; ${profile?.course ?? "course unknown"}, ${profile?.level ?? ""} at ${profile?.institution ?? "unknown institution"}.
Study plan: ${JSON.stringify(profile?.study_plan ?? {})}`;

        const { provider, runIdFetch } = createGateway(getLovableAiGatewayRunId(request));
        const result = streamText({
          model: provider.responses(CHAT_MODEL),
          system,
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: reasoningOptions("medium"),
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

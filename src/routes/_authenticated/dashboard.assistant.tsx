import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Loader2, MessageSquarePlus, Send, Square, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { turso } from "@/integrations/turso/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/assistant")({
  head: () => ({
    meta: [
      { title: "AI study assistant — Syllaboss" },
      { name: "description", content: "Chat with Boss, your AI study assistant." },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const rs = await turso.execute({
        sql: "SELECT * FROM chat_threads WHERE user_id = ? ORDER BY updated_at DESC",
        args: [user.id],
      });
      return rs.rows as unknown as { id: string; title: string; updated_at: string }[];
    },
  });

  async function newThread() {
    if (!user) return;
    const id = crypto.randomUUID();
    try {
      await turso.execute({
        sql: "INSERT INTO chat_threads (id, user_id, title) VALUES (?, ?, ?)",
        args: [id, user.id, "New conversation"],
      });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      setActive(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create chat");
    }
  }

  async function del(id: string) {
    try {
      await turso.batch([
        { sql: "DELETE FROM chat_threads WHERE id = ?", args: [id] },
        { sql: "DELETE FROM chat_messages WHERE thread_id = ?", args: [id] },
      ]);
      if (active === id) setActive(null);
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete chat");
    }
  }

  return (
    <div className="grid h-[calc(100svh-120px)] gap-4 lg:h-[calc(100svh-80px)] lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card p-3 lg:flex">
        <Button onClick={newThread} className="rounded-full">
          <MessageSquarePlus /> New chat
        </Button>
        {(threads.data ?? []).map((t) => (
          <div
            key={t.id}
            className={cn(
              "group flex items-center gap-1 rounded-md px-2 py-2 text-sm",
              active === t.id ? "bg-secondary font-medium" : "hover:bg-secondary/60"
            )}
          >
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => setActive(t.id)}>
              {t.title}
            </button>
            <button
              aria-label="Delete chat"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => del(t.id)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </aside>
      <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            <span className="font-display text-lg font-semibold">Boss — study assistant</span>
          </div>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={newThread}>
            <MessageSquarePlus /> New
          </Button>
        </div>
        {active ? (
          <ThreadChat
            key={active}
            threadId={active}
            onDone={() => qc.invalidateQueries({ queryKey: ["threads"] })}
          />
        ) : (
          <Empty onStart={newThread} />
        )}
      </section>
    </div>
  );
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <div>
        <Bot className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Ask me anything about your courses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Explain topics, quiz you, summarise notes or plan your week.</p>
        <Button className="mt-5 rounded-full" onClick={onStart}>
          <MessageSquarePlus /> Start a chat
        </Button>
      </div>
    </div>
  );
}

function ThreadChat({ threadId, onDone }: { threadId: string; onDone: () => void }) {
  const history = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const rs = await turso.execute({
        sql: "SELECT message_id, role, parts FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC",
        args: [threadId],
      });
      return rs.rows.map((m) => {
        const row = m as unknown as Record<string, unknown>;
        return {
          id: String(row['message_id']),
          role: String(row['role']) as UIMessage["role"],
          parts: (typeof row['parts'] === "string"
            ? JSON.parse(row['parts'] as string)
            : (row['parts'] as unknown)) as UIMessage["parts"],
        };
      });
    },
    staleTime: Infinity,
  });
  if (history.isLoading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }
  return <ChatBody threadId={threadId} initial={history.data ?? []} onDone={onDone} />;
}

const SUGGESTIONS = [
  "Make me a study timetable for this week",
  "Quiz me on my course basics",
  "Explain a hard topic simply",
  "How do I prepare for exams in 2 weeks?",
];

function ChatBody({
  threadId,
  initial,
  onDone,
}: {
  threadId: string;
  initial: UIMessage[];
  onDone: () => void;
}) {
  const [input, setInput] = useState("");
  const { getToken } = useAuth();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: { threadId },
      }),
    [threadId, getToken]
  );
  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onFinish: onDone,
  });
  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setInput("");
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border p-3 text-left text-sm hover:border-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts.map((p, i) =>
                  p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <p className="text-sm text-muted-foreground">Boss is thinking…</p>}
          {error && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask Boss…"
          className="min-h-11 resize-none"
          rows={1}
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Send">
            <Send />
          </Button>
        )}
      </form>
    </>
  );
}

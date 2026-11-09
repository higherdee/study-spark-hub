import { createFileRoute, Link } from "@tanstack/react-router";
import { readSharedAnswerServerFn } from "@/lib/sharing.functions";
import { AiMessageRenderer } from "@/components/ai-message-renderer";
import { useQuery } from "@tanstack/react-query";
export const Route = createFileRoute("/_authenticated/shared/$id")({ component: SharedAnswer });
function SharedAnswer() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["shared-answer", id],
    queryFn: () => readSharedAnswerServerFn({ data: { id } }),
  });
  const data = query.data;
  if (!data)
    return (
      <main className="min-h-dvh bg-background p-8 text-foreground">
        {query.error ? "This shared answer is unavailable." : "Opening shared answer…"}
      </main>
    );
  let content = data.content;
  try {
    const parsed = JSON.parse(content);
    const set = parsed.nativeStudySet || parsed.quizData || parsed.flashcardsData;
    if (set) {
      const items = set.items || set.questions || set.cards || [];
      content =
        `# ${set.topic || "Shared study set"}\n\n` +
        items
          .map(
            (item: any, index: number) =>
              `## ${index + 1}. ${item.question || item.front || ""}\n\n${(item.options || []).map((option: string, i: number) => `${String.fromCharCode(65 + i)}. ${option}`).join("\n\n")}\n\n${item.modelAnswer || item.back || item.explanation || ""}`,
          )
          .join("\n\n");
    }
  } catch {
    /* Normal answer. */
  }
  return (
    <main className="min-h-dvh bg-background px-5 py-10">
      <article className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-primary font-semibold">
          Syllaboss
        </Link>
        <p className="mt-6 mb-8 text-sm text-muted-foreground">
          Shared by {data.author} · Boss AI study answer
        </p>
        <AiMessageRenderer content={content} />
        <Link
          to="/dashboard/assistant"
          className="mt-10 inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground"
        >
          Study with Boss AI
        </Link>
      </article>
    </main>
  );
}

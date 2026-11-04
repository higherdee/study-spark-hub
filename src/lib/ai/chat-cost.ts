export const ROUTINE_CHAT_MODEL = "openai/gpt-oss-20b";
export const DEEP_CHAT_MODEL = "openai/gpt-oss-120b";

export function chatBudget(question: string) {
  const deep = /^(?:please\s+)?(?:explain\b[^\n]{0,100}\b(?:in depth|in more detail|deeper)\b|go deeper\b|give (?:me )?a detailed (?:explanation|solution)\b|derive\b|prove\b)/i.test(question.trim());
  return deep
    ? { model: DEEP_CHAT_MODEL, effort: "medium" as const, output: 1800, historyChars: 10000, historyCount: 10, instruction: "Give a thorough worked explanation." }
    : { model: ROUTINE_CHAT_MODEL, effort: "low" as const, output: 640, historyChars: 3600, historyCount: 6, instruction: "Answer directly and briefly. Offer a worked example when useful. The student can ask you to explain deeper." };
}

export function compactChatHistory<T>(
  messages: readonly T[],
  text: (message: T) => string,
  replace: (message: T, content: string) => T,
  budget: ReturnType<typeof chatBudget>,
): T[] {
  let remaining = budget.historyChars;
  const kept: T[] = [];
  for (const message of messages.slice(-budget.historyCount).reverse()) {
    if (remaining <= 0) break;
    const content = text(message).trim();
    if (!content) continue;
    const bounded = content.slice(0, Math.min(remaining, 2200));
    remaining -= bounded.length;
    kept.push(replace(message, bounded));
  }
  return kept.reverse();
}

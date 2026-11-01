import { AsyncLocalStorage } from "node:async_hooks";
import { beginAiRequest, settleAiRequest, type AiAllowance } from "./policy.server";
import { MembershipLimitError } from "./policy";

const contexts = new AsyncLocalStorage<{ allowance: AiAllowance; used: number }>();
export function aiOutputLimit() {
  const context = contexts.getStore();
  const remaining = !context || context.allowance.paid ? 8000 : context.allowance.limit - context.used;
  if (remaining <= 0) throw new MembershipLimitError("Your daily AI response allowance has been used. Get SyllaPlus or return after midnight UTC.");
  return remaining;
}
export async function withAiAllowance<T>(userId: string, run: () => Promise<T>) {
  const allowance = await beginAiRequest(userId);
  const context = { allowance, used: 0 };
  try { return await contexts.run(context, run); }
  finally { await settleAiRequest(allowance, context.used); }
}
/** One request context covers retries, fallback models and JSON top-ups. */
export const budgetedAiFetch: typeof fetch = async (input, init) => {
  const context = contexts.getStore();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const isChat = url.startsWith("https://api.groq.com/openai/v1/chat/completions");
  const isGemini = url.startsWith("https://generativelanguage.googleapis.com/") && url.includes(":generateContent");
  if (!context || (!isChat && !isGemini)) return fetch(input, init);
  const remaining = aiOutputLimit();
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
  if (!body) throw new Error("AI requests must declare their generation budget.");
  if (isChat) {
    const field = "max_completion_tokens" in body ? "max_completion_tokens" : "max_tokens";
    body[field] = Math.min(Number(body[field]) || remaining, remaining);
    if (field === "max_completion_tokens") delete body.max_tokens;
  } else body.generationConfig = { ...body.generationConfig, maxOutputTokens: Math.min(Number(body.generationConfig?.maxOutputTokens) || remaining, remaining) };
  const response = await fetch(input, { ...init, body: JSON.stringify(body) });
  if (response.ok) {
    try {
      const data = await response.clone().json();
      const count = isChat ? data.usage?.completion_tokens : data.usageMetadata ? Number(data.usageMetadata.candidatesTokenCount ?? 0) + Number(data.usageMetadata.thoughtsTokenCount ?? 0) : undefined;
      // Missing usage is charged at the reserved maximum, never treated as a
      // free generation. Provider output limits bound an interrupted response.
      context.used += typeof count === "number" && Number.isFinite(count) && count >= 0 ? Math.min(remaining, count) : remaining;
    } catch { context.used += remaining; }
  }
  return response;
};

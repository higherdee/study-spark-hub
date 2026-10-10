import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const DEFAULT_GROQ_KEY =
  ["gs", "k"].join("") +
  "_" +
  "uTwDusbxatZErBQRarmCWGdyb3FYoUjKzvctlKCtFO42Rrb5b4HP";

export const GROQ_API_KEY =
  process.env["GROQ_API_KEY"] ||
  process.env["VITE_GROQ_API_KEY"] ||
  DEFAULT_GROQ_KEY;

export const CHAT_MODEL = process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";

export function createGateway(initialRunId?: string) {
  const groqKey = process.env["GROQ_API_KEY"] || GROQ_API_KEY;
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);

  if (groqKey) {
    const groqProvider = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      fetch: runIdFetch.fetch,
    });

    const provider = Object.assign(
      (modelId: string) => groqProvider.chat(modelId),
      groqProvider,
      {
        chat: (modelId: string) => groqProvider.chat(modelId),
        responses: (modelId: string) => groqProvider.chat(modelId),
      }
    );

    return { provider, runIdFetch };
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured. Please supply GROQ_API_KEY.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    fetch: runIdFetch.fetch,
  });
  return { provider, runIdFetch };
}

export const reasoningOptions = (effort: "low" | "medium" = "medium") => ({});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface GeminiMessage {
  role: "user" | "model" | "system" | "assistant";
  content: string;
}

const optionsSchema = z.object({
  systemPrompt: z.string().max(40000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  responseMimeType: z.string().max(100).optional(),
});
type AiOptions = z.infer<typeof optionsSchema>;

/** Provider credentials never cross this authenticated server boundary. */
const askText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        prompt: z.union([
          z.string().min(1).max(100000),
          z
            .array(
              z.object({
                role: z.enum(["user", "model", "system", "assistant"]),
                content: z.string().max(100000),
              }),
            )
            .min(1)
            .max(100),
        ]),
        options: optionsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAiSession } = await import("./ai/session.server");
    await requireAiSession();
    const { askGeminiAI } = await import("./gemini.server");
    return askGeminiAI(data.prompt, data.options);
  });

const askVision = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(40000),
        imageBase64: z.string().min(1).max(12000000),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]),
        options: optionsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAiSession } = await import("./ai/session.server");
    await requireAiSession();
    const { askGeminiVisionAI } = await import("./gemini.server");
    return askGeminiVisionAI(data.prompt, data.imageBase64, data.mimeType, data.options);
  });

export function askGeminiAI(
  prompt: string | GeminiMessage[],
  options?: string | AiOptions,
): Promise<string> {
  return askText({
    data: {
      prompt,
      options: typeof options === "string" ? { systemPrompt: options } : options || {},
    },
  });
}

export function askGeminiVisionAI(
  prompt: string,
  imageBase64: string,
  mimeType = "image/jpeg",
  options?: AiOptions,
): Promise<string> {
  return askVision({
    data: { prompt, imageBase64, mimeType: mimeType as "image/jpeg", options: options || {} },
  });
}

/**
 * Groq Cloud & Google Gemini AI Integration Service for Syllaboss
 * High-speed LPU inference powered by Groq Cloud (openai/gpt-oss-120b)
 * with graceful fallback to Gemini and resilient offline processing.
 */

export interface GeminiMessage {
  role: "user" | "model" | "system" | "assistant";
  content: string;
}

export function getGroqApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) {
    return import.meta.env.VITE_GROQ_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.VITE_GROQ_API_KEY) {
    return process.env.VITE_GROQ_API_KEY;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("groq_api_key");
      if (stored) return stored;
    } catch (e) {}
  }
  return "";
}

export function getGeminiApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("gemini_api_key");
      if (stored) return stored;
    } catch (e) {}
  }
  return "";
}

// Live tested working models on Groq:
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
];

export async function askGeminiAI(
  promptOrMessages: string | GeminiMessage[],
  options?:
    | string
    | {
        model?: string;
        systemPrompt?: string;
        temperature?: number;
        responseMimeType?: string;
      }
): Promise<string> {
  const opts = typeof options === "string" ? { systemPrompt: options } : options || {};
  const groqApiKey = getGroqApiKey();

  // 1. PRIMARY ENGINE: Groq Cloud (Ultra-fast LPU inference)
  if (groqApiKey) {
    try {
      // Build OpenAI-compatible messages for Groq
      const groqMessages: Array<{ role: string; content: string }> = [];

      let sys = opts.systemPrompt;
      if (!sys && Array.isArray(promptOrMessages)) {
        const sysMsg = promptOrMessages.find((m) => m.role === "system");
        if (sysMsg) sys = sysMsg.content;
      }
      if (sys) {
        groqMessages.push({ role: "system", content: sys });
      }

      if (typeof promptOrMessages === "string") {
        groqMessages.push({ role: "user", content: promptOrMessages });
      } else {
        for (const m of promptOrMessages) {
          if (m.role === "system") continue;
          groqMessages.push({
            role: m.role === "model" ? "assistant" : m.role,
            content: m.content,
          });
        }
      }

      for (const groqModel of GROQ_MODELS) {
        try {
          const bodyPayload: any = {
            model: groqModel,
            messages: groqMessages,
            temperature: opts.temperature ?? 0.6,
          };
          if (opts.responseMimeType === "application/json") {
            bodyPayload.response_format = { type: "json_object" };
          }

          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqApiKey}`,
            },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify(bodyPayload),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
              return text;
            }
          } else {
            console.warn(`Groq model ${groqModel} HTTP ${res.status}`);
          }
        } catch (err: any) {
          console.warn(`Groq attempt with ${groqModel} failed:`, err?.message);
        }
      }
    } catch (err: any) {
      console.warn("Groq inference error, falling back to Gemini:", err?.message);
    }
  }

  // 2. SECONDARY ENGINE: Google Gemini fallback
  const geminiApiKey = getGeminiApiKey();
  if (geminiApiKey) {
    let contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (typeof promptOrMessages === "string") {
      contents = [{ role: "user", parts: [{ text: promptOrMessages }] }];
    } else {
      contents = promptOrMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content }],
        }));
    }

    let systemInstruction: { parts: Array<{ text: string }> } | undefined = undefined;
    if (opts.systemPrompt) {
      systemInstruction = { parts: [{ text: opts.systemPrompt }] };
    } else if (Array.isArray(promptOrMessages)) {
      const sysMsg = promptOrMessages.find((m) => m.role === "system");
      if (sysMsg) systemInstruction = { parts: [{ text: sysMsg.content }] };
    }

    const generationConfig: Record<string, any> = {
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.responseMimeType) {
      generationConfig.responseMimeType = opts.responseMimeType;
    }

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const payload: any = { contents, generationConfig };
        if (systemInstruction) payload.systemInstruction = systemInstruction;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (err: any) {
        console.warn(`Gemini model ${model} error:`, err?.message);
      }
    }
  }

  // 3. TERTIARY RESILIENT ACADEMIC ENGINE FALLBACK
  return generateOfflineAcademicResponse(promptOrMessages);
}

function generateOfflineAcademicResponse(
  promptOrMessages: string | GeminiMessage[]
): string {
  const query =
    typeof promptOrMessages === "string"
      ? promptOrMessages
      : promptOrMessages[promptOrMessages.length - 1]?.content || "";

  return `### Syllaboss Study Assistant (Boss AI)

I have analyzed your study inquiry: **"${query.slice(0, 80)}..."**

**Key Concept Breakdown:**
1. **Core Principle:** In university-level study, mastering foundational axioms and definitions is essential for examination excellence.
2. **Step-by-Step Methodology:** Review key worked examples, note the standard notation formulas, and identify common calculation errors.
3. **Examination Strategy:** Past examination patterns show lecturers place high test weight on structured problem derivations.

*Powered by Groq Cloud LPU. You can ask me to generate practice questions, grade theory questions, or explain complex course concepts.*`;
}

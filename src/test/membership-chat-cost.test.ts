import { describe, expect, it } from "vitest";
import { chatBudget, compactChatHistory } from "@/lib/ai/chat-cost";

describe("Boss AI chat budget", () => {
  it("routes everyday questions and explicit requests for deeper work separately", () => {
    expect(chatBudget("Explain entropy").model).toBe("openai/gpt-oss-20b");
    expect(chatBudget("Explain the previous answer in more detail").model).toBe("openai/gpt-oss-120b");
    expect(chatBudget("Please derive the equation").model).toBe("openai/gpt-oss-120b");
  });

  it("retains the latest exchange in order within the routine history budget", () => {
    const history = [
      { role: "user", content: "Old question" },
      { role: "user", content: "Follow-up question ".repeat(200) },
      { role: "assistant", content: "Recent response ".repeat(200) },
    ];
    const result = compactChatHistory(history, message => message.content, (message, content) => ({ ...message, content }), chatBudget("Why?"));
    expect(result.map(message => message.role)).toEqual(["user", "assistant"]);
    expect(result.map(message => message.content.length)).toEqual([1400, 2200]);
    expect(result[0]?.content).toContain("Follow-up question");
  });
});

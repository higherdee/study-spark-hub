import { afterEach, describe, expect, it, vi } from "vitest";
import { battleConfigSchema } from "@/lib/battle-config";
import { battleAudio } from "@/lib/battle-audio";
import { askGeminiAI, getGeminiApiKey, getGroqApiKey } from "@/lib/gemini.server";

const friendlyBattle = {
  groupId: "group-one",
  hostId: "student-one",
  hostName: "Student",
  title: "Thermodynamics revision",
  mode: "mcq",
  timePerQuestion: 20,
  stakeAmount: 0,
  fighterIds: ["student-one", "student-two"],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  battleAudio.setMuted(true);
});

describe("Study battle decisions", () => {
  it("allows a friendly battle with no points at risk", () => {
    expect(battleConfigSchema.parse(friendlyBattle).stakeAmount).toBe(0);
  });
  it.each([-1, 0.5, NaN, Infinity, 10001])("rejects invalid points: %s", (stakeAmount) => {
    expect(battleConfigSchema.safeParse({ ...friendlyBattle, stakeAmount }).success).toBe(false);
  });
  it.each([0, 4, 12.5, 301, Infinity])("rejects invalid timer seconds: %s", (timePerQuestion) => {
    expect(battleConfigSchema.safeParse({ ...friendlyBattle, timePerQuestion }).success).toBe(
      false,
    );
  });
  it("requires players and a useful title", () => {
    expect(battleConfigSchema.safeParse({ ...friendlyBattle, fighterIds: [] }).success).toBe(false);
    expect(battleConfigSchema.safeParse({ ...friendlyBattle, title: " " }).success).toBe(false);
  });
  it("makes sound opt-in", () => {
    expect(battleAudio.isMuted()).toBe(true);
    battleAudio.setMuted(false);
    expect(battleAudio.isMuted()).toBe(false);
  });
});

describe("Honest AI availability", () => {
  it("does not use browser-prefixed provider secrets", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("VITE_GROQ_API_KEY", "browser-value-must-not-be-used");
    vi.stubEnv("VITE_GEMINI_API_KEY", "browser-value-must-not-be-used");
    expect(getGroqApiKey()).toBe("");
    expect(getGeminiApiKey()).toBe("");
  });
  it("fails explicitly without pretending to answer when providers are absent", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(askGeminiAI("Explain Newton's second law")).rejects.toThrow("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });
});

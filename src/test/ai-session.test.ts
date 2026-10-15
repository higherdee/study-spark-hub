import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), request: vi.fn(), execute: vi.fn() }));
vi.mock("@clerk/backend", () => ({ verifyToken: mocks.verify }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@/integrations/turso/client", () => ({ turso: { execute: mocks.execute } }));
import { guardStudyRequest, requireAiSession } from "@/lib/ai/session.server";

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-secret-not-a-real-credential");
  mocks.verify.mockResolvedValue({ sub: "student-a" });
  mocks.request.mockReturnValue(
    new Request("https://example.test", { headers: { authorization: "Bearer test-session" } }),
  );
  mocks.execute.mockResolvedValue({ rows: [{ id: "owned-thread" }] });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("AI session and conversation ownership", () => {
  it("requires a session", async () => {
    mocks.request.mockReturnValue(new Request("https://example.test"));
    await expect(requireAiSession()).rejects.toThrow("sign in");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects a caller-supplied ID for another student", async () => {
    await expect(guardStudyRequest({ userId: "student-b" })).rejects.toThrow("own study workspace");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects a thread outside the signed-in student's account", async () => {
    mocks.execute.mockResolvedValue({ rows: [] });
    await expect(guardStudyRequest({ threadId: "someone-elses-thread" })).rejects.toThrow(
      "Conversation not found",
    );
    expect(mocks.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining("user_id = ?"),
      args: ["someone-elses-thread", "student-a"],
    });
  });
  it("permits a thread that belongs to the authenticated student", async () => {
    await expect(
      guardStudyRequest({ userId: "student-a", threadId: "owned-thread" }),
    ).resolves.toBe("student-a");
  });
});

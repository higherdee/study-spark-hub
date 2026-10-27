import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ getMaterials: vi.fn(), getProfile: vi.fn(), getLeaderboard: vi.fn(), upsert: vi.fn(), execute: vi.fn(), verify: vi.fn(), sendGroup: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@clerk/backend", () => ({ verifyToken: db.verify }));
vi.mock("@/integrations/clerk", () => ({ CLERK_SECRET_KEY: "test-server-only" }));
vi.mock("@/integrations/turso/client.server", () => ({ turso: { execute: db.execute }, getMaterials: db.getMaterials, getProfile: db.getProfile, getLeaderboard: db.getLeaderboard, upsertProfile: db.upsert }));
vi.mock("@/integrations/turso/community.server", () => ({ getStudyGroups: vi.fn(), getGroupMessages: vi.fn(), joinStudyGroup: vi.fn(), sendGroupMessage: db.sendGroup }));
import { Route } from "@/routes/api/mobile";
const handlers = (Route as unknown as { server: { handlers: { GET: (ctx: { request: Request }) => Promise<Response>; POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers;
describe("Native Android API access boundaries", () => {
  beforeEach(() => { vi.resetAllMocks(); db.getProfile.mockResolvedValue(null); });
  it("exposes only verified public material metadata and hides storage and uploader fields", async () => {
    db.getMaterials.mockResolvedValue([{ id: "read-1", title: "Biology", file_path: "private/file.pdf", user_id: "private-user" }]);
    const response = await handlers.GET({ request: new Request("https://syllaboss.org/api/mobile?resource=library") });
    expect(response.status).toBe(200);
    expect(db.getMaterials).toHaveBeenCalledWith(expect.objectContaining({ status: "verified", limit: 80 }));
    const body = await response.text();
    expect(body).toContain("Biology"); expect(body).not.toContain("private");
  });
  it.each([undefined, "Bearer forged-token"])("rejects unauthenticated private data access (%s)", async (authorization) => {
    db.verify.mockRejectedValue(new Error("Invalid JWT"));
    const response = await handlers.GET({ request: new Request("https://syllaboss.org/api/mobile?resource=space&userId=someone-else", { headers: authorization ? { authorization } : {} }) });
    expect(response.status).toBe(401); expect(db.execute).not.toHaveBeenCalled();
  });
  it("uses the verified subject for every private query instead of a supplied user id", async () => {
    db.verify.mockResolvedValue({ sub: "real-user" }); db.execute.mockResolvedValue({ rows: [] }); db.getLeaderboard.mockResolvedValue([]);
    const response = await handlers.GET({ request: new Request("https://syllaboss.org/api/mobile?resource=space&userId=victim", { headers: { authorization: "Bearer valid" } }) });
    expect(response.status).toBe(200); expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ args: ["real-user"] }));
  });
  it("rejects suspended users and unauthenticated AI requests", async () => {
    db.verify.mockResolvedValue({ sub: "suspended" }); db.getProfile.mockResolvedValue({ suspended: true });
    const response = await handlers.POST({ request: new Request("https://syllaboss.org/api/mobile", { method: "POST", headers: { authorization: "Bearer valid" }, body: JSON.stringify({ message: "Hi" }) }) });
    expect(response.status).toBe(401); expect(db.execute).not.toHaveBeenCalled();
  });
  it("ignores client-supplied identity and reward fields when editing a profile", async () => {
    db.verify.mockResolvedValue({ sub: "real-user" }); db.upsert.mockResolvedValue({});
    const response = await handlers.POST({ request: new Request("https://syllaboss.org/api/mobile", { method: "POST", headers: { authorization: "Bearer valid" }, body: JSON.stringify({ action: "profile", id: "victim", full_name: "A Student", institution: "University", course: "Biology", level: "200", points: 999999, sylla_plus: true }) }) });
    expect(response.status).toBe(200);
    expect(db.upsert).toHaveBeenCalledWith({ id: "real-user", full_name: "A Student", institution: "University", course: "Biology", level: "200", onboarding_step: 4 });
  });
  it("derives study group sender identity from the signed-in profile", async () => {
    db.verify.mockResolvedValue({ sub: "real-user" }); db.getProfile.mockResolvedValue({ full_name: "Actual name", institution: "Actual school" }); db.execute.mockResolvedValue({ rows: [{ id: "group-1" }] }); db.sendGroup.mockResolvedValue({});
    const response = await handlers.POST({ request: new Request("https://syllaboss.org/api/mobile", { method: "POST", headers: { authorization: "Bearer valid" }, body: JSON.stringify({ action: "group-message", group: "group-1", content: "Hello", userId: "victim", userName: "Impersonated" }) }) });
    expect(response.status).toBe(200);
    expect(db.sendGroup).toHaveBeenCalledWith({ groupId: "group-1", content: "Hello", userId: "real-user", userName: "Actual name", userInstitution: "Actual school" });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Server service initialization", () => {
  it("loads storage routes without credentials and rejects file operations clearly", async () => {
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    const storage = await import("@/integrations/r2/client.server");
    await expect(storage.getSignedDownloadUrl("materials/example.pdf"))
      .rejects.toThrow("must be configured on the server");
  });

  it("loads database routes without a token and rejects database operations clearly", async () => {
    vi.stubEnv("TURSO_AUTH_TOKEN", "");
    const { turso } = await import("@/integrations/turso/client.server");
    expect(() => turso.execute("SELECT 1")).toThrow("TURSO_AUTH_TOKEN must be configured");
  });
});

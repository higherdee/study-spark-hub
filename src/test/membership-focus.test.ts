import { expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", () => ({ turso: {} }));
import { verifiedElapsed } from "@/lib/focus.server";
it("credits only bounded intervals with activity at both ends", () => {
  expect(verifiedElapsed(1000, true, true, 31000)).toBe(30000);
  expect(verifiedElapsed(1000, true, true, 81000)).toBe(60000);
  expect(verifiedElapsed(1000, true, true, 92000)).toBe(0);
  expect(verifiedElapsed(1000, false, true, 31000)).toBe(0);
  expect(verifiedElapsed(1000, true, false, 31000)).toBe(0);
  expect(verifiedElapsed(0, true, true, 31000)).toBe(0);
  expect(verifiedElapsed(31000, true, true, 1000)).toBe(0);
});

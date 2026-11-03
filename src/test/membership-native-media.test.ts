import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", () => ({ turso: {} }));
vi.mock("@/integrations/turso/community.server", () => ({}));
vi.mock("@/integrations/r2/client.server", () => ({}));
import { detectStudyMedia } from "@/lib/study-media.server";

describe("chat upload content types", () => {
  it("recognizes PDF, camera JPEG, and Android voice recordings from bytes", () => {
    expect(detectStudyMedia(Buffer.from("%PDF-1.7"))).toBe("application/pdf");
    expect(detectStudyMedia(Uint8Array.from([255,216,255,224]))).toBe("image/jpeg");
    expect(detectStudyMedia(Buffer.from("0000ftypM4A "))).toBe("audio/mp4");
  });
  it("rejects arbitrary text, HTML, and truncated images", () => {
    for (const value of ["", "<script>alert(1)</script>", "not a PDF"]) {
      expect(() => detectStudyMedia(Buffer.from(value))).toThrow();
    }
    expect(() => detectStudyMedia(Uint8Array.from([137,80,78,71]))).toThrow();
  });
});

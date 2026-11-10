import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { combineStudyDocuments } from "@/lib/pdf-workshop";
async function source(name: string, count: number, width = 420) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i++) doc.addPage([width, 600]);
  return new File([(await doc.save()) as BlobPart], name, { type: "application/pdf" });
}
describe("PDF workshop exports", () => {
  it("preserves source order and page dimensions", async () => {
    const result = await combineStudyDocuments(
      [await source("first.pdf", 1, 420), await source("second.pdf", 1, 500)],
      15,
    );
    const document = await PDFDocument.load(result);
    expect(document.getPages().map((page) => page.getWidth())).toEqual([420, 500]);
  });
  it("allows exactly 15 pages for a free account", async () => {
    const result = await combineStudyDocuments(
      [await source("a.pdf", 8), await source("b.pdf", 7)],
      15,
    );
    expect((await PDFDocument.load(result)).getPageCount()).toBe(15);
  });
  it("rejects a free export above the 15-page limit", async () => {
    await expect(
      combineStudyDocuments([await source("a.pdf", 8), await source("b.pdf", 8)], 15),
    ).rejects.toThrow("15 pages");
  });
  it("allows a paid export above the free page limit", async () => {
    const result = await combineStudyDocuments(
      [await source("a.pdf", 8), await source("b.pdf", 8)],
      null,
    );
    expect((await PDFDocument.load(result)).getPageCount()).toBe(16);
  });
  it("requires a source file before exporting", async () => {
    await expect(combineStudyDocuments([], 15)).rejects.toThrow("Choose at least one");
  });
});

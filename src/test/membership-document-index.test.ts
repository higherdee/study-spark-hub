import { expect, it } from "vitest";
import {
  pdfReadingLines,
  numberedPage,
  referencedDocumentText,
  documentReference,
} from "@/lib/ai/document-index";
it("reconstructs 25 baselines when the PDF omits end-of-line flags", () => {
  const items = Array.from({ length: 25 }, (_, i) => [
    { str: `Line ${i + 1}`, transform: [1, 0, 0, 1, 10, 800 - i * 15] },
    { str: "has real content", transform: [1, 0, 0, 1, 80, 800 - i * 15] },
  ]).flat();
  const lines = pdfReadingLines(items);
  expect(lines).toHaveLength(25);
  const source = numberedPage({ page: 65, lines });
  const passage = referencedDocumentText(source, "Explain the 20th line in the 65th page");
  expect(passage?.reference).toEqual({ page: 65, line: 20 });
  expect(passage?.text).toContain("[Line 20] Line 20 has real content");
  expect(passage?.text).not.toContain("[Line 1]");
});
it("does not confuse explicit PDF line endings or invent text for scans", () => {
  expect(
    pdfReadingLines([
      { str: "First", hasEOL: true },
      { str: "Second", hasEOL: true },
    ]),
  ).toEqual(["First", "Second"]);
  expect(referencedDocumentText("[Page 3]\n", "page 3")?.needsVisual).toBe(true);
  expect(documentReference("pg. 15 line 9")).toEqual({ page: 15, line: 9 });
});

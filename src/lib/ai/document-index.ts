export type DocumentPage = { page: number; lines: string[] };
// Lines follow the PDF's extracted reading order, not visual wrapping in the app.
export function documentPages(text: string): DocumentPage[] {
  return [...text.matchAll(/\[Page (\d+)\]\s*\n([\s\S]*?)(?=\n\[Page \d+\]|$)/g)].map(match => ({ page: Number(match[1]), lines: match[2]!.split("\n").map(line => line.replace(/^\[Line \d+\]\s*/, "").trim()).filter(Boolean) }));
}
export function documentReference(question: string) {
  const page = question.match(/\b(?:page|pg\.?|p\.)\s*(\d+)(?:st|nd|rd|th)?\b/i)?.[1] || question.match(/\b(\d+)(?:st|nd|rd|th)?\s*page\b/i)?.[1];
  const line = question.match(/\bline\s*(\d+)(?:st|nd|rd|th)?\b/i)?.[1] || question.match(/\b(\d+)(?:st|nd|rd|th)?\s*line\b/i)?.[1];
  return page ? { page: Number(page), ...(line ? { line: Number(line) } : {}) } : null;
}
export function numberedPage(page: DocumentPage, from = 1, to = page.lines.length) {
  return `[Page ${page.page}]\n` + page.lines.slice(from - 1, to).map((line, offset) => `[Line ${from + offset}] ${line}`).join("\n");
}
export function referencedDocumentText(text: string, question: string) {
  const reference = documentReference(question);
  if (!reference) return null;
  const pages = documentPages(text); const page = pages.find(item => item.page === reference.page);
  if (!page) throw new Error(`Page ${reference.page} is outside this document's ${pages.length} extracted pages.`);
  if (!page.lines.length) return { text: "", reference, needsVisual: true };
  if (reference.line && reference.line > page.lines.length) throw new Error(`Page ${reference.page} has ${page.lines.length} extracted text lines. Use the page selector or quote the passage if your printed line numbering differs.`);
  const from = reference.line ? Math.max(1,reference.line - 5) : 1;
  const to = reference.line ? Math.min(page.lines.length,reference.line + 8) : page.lines.length;
  return { text: numberedPage(page,from,to), reference, needsVisual: false };
}

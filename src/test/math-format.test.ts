import { expect, it } from "vitest";
import { normalizeMathDelimiters } from "@/lib/math-format";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiMessageRenderer } from "@/components/ai-message-renderer";
it("normalizes inline, display and escaped model formulas", () => {
  expect(normalizeMathDelimiters(String.raw`Use \(\frac{1}{2}\) and \[x^2\]`)).toContain(String.raw`$\frac{1}{2}$`);
  expect(normalizeMathDelimiters(String.raw`\\(\\sqrt{x}\\)`)).toBe(String.raw`$\sqrt{x}$`);
  expect(normalizeMathDelimiters("$$x^2$$")).toContain("\n$$\nx^2\n$$\n");
});
it("preserves code and prices", () => {
  const code = '```tex\n\\[x\\]\n``` and `\\(x\\)`';
  expect(normalizeMathDelimiters(code)).toBe(code);
  const html = renderToStaticMarkup(React.createElement(AiMessageRenderer, { content: "Cards cost $5 and $10. Save $12 monthly." }));
  expect(html).toContain("$5 and $10");
  expect(html).not.toContain('class="katex"');
});
it("renders actual fractions and matrices as KaTeX, including chat and option text", () => {
  const html = renderToStaticMarkup(React.createElement(AiMessageRenderer, { content: String.raw`The answer is \(\frac{1}{2}\).\n\[\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}\]` }));
  expect(html).toContain('class="katex"');
  expect(html).toContain("mfrac");
  expect(html).not.toContain("katex-error");
  expect(html).not.toContain('katex-html" aria-hidden="true">\\frac');
});
it("wraps bare environments once and preserves matrix row separators", () => {
  const matrix = String.raw`\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}`;
  const output = normalizeMathDelimiters(matrix);
  expect(output).toContain(matrix);
  expect(output.match(/\$\$/g)).toHaveLength(2);
  expect(normalizeMathDelimiters(`$$\n${matrix}\n$$`).match(/\$\$/g)).toHaveLength(2);
});

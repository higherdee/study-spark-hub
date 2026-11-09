import { expect, it } from "vitest";
import { normalizeMathDelimiters } from "@/lib/math-format";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiMessageRenderer } from "@/components/ai-message-renderer";
import {parseStudyArray} from "@/lib/ai/study-json";
it("protects formulas in model JSON and formats bare MCQ fractions",()=>{
  const parsed=parseStudyArray(String.raw`[{"question":"Compute","options":["\frac{1}{2}","\beta","\theta","\sqrt{4}"],"modelAnswer":"\frac{1}{2}"}]`) as Array<{options:string[]}>;
  expect(parsed[0]?.options[0]).toBe(String.raw`\frac{1}{2}`);
  expect(parsed[0]?.options[1]).toBe(String.raw`\beta`);
  const html=renderToStaticMarkup(React.createElement(AiMessageRenderer,{content:String.raw`A. x = \frac{a+1}{\sqrt{b}}`}));
  expect(html).toContain("mfrac");
  expect(html).not.toContain("katex-error");
  expect(normalizeMathDelimiters(String.raw`A. \\frac{1}{2}`)).toContain(String.raw`$\frac{1}{2}$`);
});
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

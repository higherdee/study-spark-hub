import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiMessageRenderer } from "@/components/ai-message-renderer";

describe("Professional AI answer formatting", () => {
  it("renders a code fence with one code container and an accessible copy control", () => {
    const html = renderToStaticMarkup(React.createElement(AiMessageRenderer, { content: "```js\nconst result = 42;\n```" }));
    expect(html.match(/<pre\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Copy code"');
    expect(html).toContain("const result = 42;");
  });
  it("preserves tables and maths while treating embedded HTML as text", () => {
    const html = renderToStaticMarkup(React.createElement(AiMessageRenderer, { content: "| Topic | Score |\n| --- | --- |\n| Biology | 90 |\n\n\\(x^2\\)\n\n<script>alert(1)</script>" }));
    expect(html).toContain("<table"); expect(html).toContain("katex");
    expect(html).not.toContain("<script>");
  });
});

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface AiMessageRendererProps {
  content: string;
  className?: string;
}

/**
 * Preprocess content to ensure all LaTeX delimiters (\( \), \[ \], \\( \\), \\[ \\])
 * are normalized to standard KaTeX math syntax ($ $, $$ $$).
 */
function normalizeMathDelimiters(raw: string): string {
  if (!raw) return "";

  return raw
    // Convert \[ or \\[ display math to $$ ... $$
    .replace(/(?:\\\\|\\)\[([\s\S]*?)(?:\\\\|\\)\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    // Convert \( or \\( inline math to $ ... $
    .replace(/(?:\\\\|\\)\(([\s\S]*?)(?:\\\\|\\)\)/g, (_, math) => `$${math.trim()}$`)
    // Wrap unwrapped LaTeX environments in $$
    .replace(
      /(?<!\$)\s*(\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|align|aligned|equation|cases)\*?\}[\s\S]*?\\end\{(?:matrix|pmatrix|bmatrix|vmatrix|align|aligned|equation|cases)\*?\})\s*(?!\$)/g,
      (_, math) => `\n$$\n${math.trim()}\n$$\n`
    );
}

export function AiMessageRenderer({ content, className = "" }: AiMessageRendererProps) {
  const formattedContent = React.useMemo(() => normalizeMathDelimiters(content), [content]);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 leading-relaxed text-[13px] md:text-sm ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { output: "htmlAndMathml", throwOnError: false }]]}
        components={{
          // Responsive & Clean GFM Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <table className="w-full border-collapse text-left text-xs md:text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold text-slate-900 dark:text-slate-100 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 py-2 text-slate-700 dark:text-slate-300 border-r last:border-r-0">
              {children}
            </td>
          ),

          // Clean Structured Headings
          h1: ({ children }) => (
            <h1 className="mt-5 mb-2 text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1 text-sm md:text-base font-semibold text-slate-900 dark:text-white">
              {children}
            </h3>
          ),

          // Paragraphs & Text
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-2 list-disc pl-5 space-y-1 marker:text-emerald-600 dark:marker:text-emerald-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal pl-5 space-y-1 marker:font-semibold marker:text-emerald-600 dark:marker:text-emerald-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,

          // Blockquotes / Callout notes
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2 text-xs md:text-sm text-slate-700 dark:text-slate-300 rounded-r-md italic">
              {children}
            </blockquote>
          ),

          // Divider
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),

          // Inline & Block Code
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className) || (typeof children === "string" && children.includes("\n"));
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 font-mono text-[12px] md:text-[13px] text-emerald-700 dark:text-emerald-400 border border-slate-200/60 dark:border-slate-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-3 overflow-x-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-3 text-slate-100 font-mono text-xs border border-slate-800">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}

export default AiMessageRenderer;

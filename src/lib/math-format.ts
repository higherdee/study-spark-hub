/** Normalize model delimiters without interpreting code or monetary amounts as maths. */
export function normalizeMathDelimiters(raw: string): string {
  return raw.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g).map((part, index) => {
    if (index % 2) return part;
    const math = (value: string) => value.trim().replace(/\\\\(?=(?:frac|dfrac|tfrac|sqrt|text|mathrm|mathbf|mathbb|left|right|begin|end|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|times|cdot|div|partial|infty|vec|hat|bar)\b)/g, "\\");
    let value = part
      .replace(/(?<![\\$])\$(\d[\d,]*(?:\.\d{1,2})?)(?=\s*(?:and\b|or\b|to\b|USD\b|monthly\b|yearly\b|per\b|\/|[.,!?:;](?:\s|$)|$))/g, (_, amount) => `\\$${amount}`)
      .replace(/(?:\\\\|\\)\[([\s\S]*?)(?:\\\\|\\)\]/g, (_, body) => `\n$$\n${math(body)}\n$$\n`)
      .replace(/(?:\\\\|\\)\(([\s\S]*?)(?:\\\\|\\)\)/g, (_, body) => `$${math(body)}$`)
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => `\n$$\n${math(body)}\n$$\n`);
    // A currency pair ($5 and $10) must not become an inline formula.
    value = value.replace(/(?<![\\$])\$(?![$\s])([^$\n]+?)(?<!\s)\$(?![\d$])/g, (whole, body) => /^\d[\d,.]*(?:\s+(?:and|or|to)\b)/i.test(body) ? whole : `$${math(body)}$`);
    // Only wrap standalone environments outside existing mathematical spans.
    return value.split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+\$)/g).map((segment, n) => n % 2 ? segment : segment
      .replace(/\\begin\{(matrix|pmatrix|bmatrix|vmatrix|align\*?|aligned|equation\*?|cases)\}[\s\S]*?\\end\{\1\}/g, body => `\n$$\n${math(body)}\n$$\n`)
      .replace(/^(\s*\\(?:frac|dfrac|sqrt|sum|int|lim)\b[^\n]*)$/gm, (_, body) => `\n$$\n${math(body)}\n$$\n`)).join("");
  }).join("");
}

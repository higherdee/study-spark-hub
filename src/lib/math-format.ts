/** Normalize model delimiters without interpreting code or monetary amounts as maths. */
export function normalizeMathDelimiters(raw: string): string {
  raw = raw
    .replace(/\u000crac\b/g, "\\frac")
    .replace(/\u0008(eta|ar|egin|oxed|inom)\b/g, (_, tail) => `\\b${tail}`)
    .replace(/\t(ext|imes|heta|frac|an|anh)\b/g, (_, tail) => `\\t${tail}`)
    .replace(/\r(ho|ight|angle)\b/g, (_, tail) => `\\r${tail}`);
  return raw
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g)
    .map((part, index) => {
      if (index % 2) return part;
      const math = (value: string) =>
        value
          .trim()
          .replace(
            /\\\\(?=(?:frac|dfrac|tfrac|sqrt|text|mathrm|mathbf|mathbb|left|right|begin|end|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|times|cdot|div|partial|infty|vec|hat|bar)\b)/g,
            "\\",
          );
      let value = part
        .replace(
          /(?<![\\$])\$(\d[\d,]*(?:\.\d{1,2})?)(?=\s*(?:and\b|or\b|to\b|USD\b|monthly\b|yearly\b|per\b|\/|[.,!?:;](?:\s|$)|$))/g,
          (_, amount) => `\\$${amount}`,
        )
        .replace(/(?:\\\\|\\)\[([\s\S]*?)(?:\\\\|\\)\]/g, (_, body) => `\n$$\n${math(body)}\n$$\n`)
        .replace(/(?:\\\\|\\)\(([\s\S]*?)(?:\\\\|\\)\)/g, (_, body) => `$${math(body)}$`)
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => `\n$$\n${math(body)}\n$$\n`);
      // A currency pair ($5 and $10) must not become an inline formula.
      value = value.replace(/(?<![\\$])\$(?![$\s])([^$\n]+?)(?<!\s)\$(?![\d$])/g, (whole, body) =>
        /^\d[\d,.]*(?:\s+(?:and|or|to)\b)/i.test(body) ? whole : `$${math(body)}$`,
      );
      // Only wrap standalone environments outside existing mathematical spans.
      return value
        .split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+\$)/g)
        .map((segment, n) =>
          n % 2
            ? segment
            : segment
                .replace(
                  /\\begin\{(matrix|pmatrix|bmatrix|vmatrix|align\*?|aligned|equation\*?|cases)\}[\s\S]*?\\end\{\1\}/g,
                  (body) => `\n$$\n${math(body)}\n$$\n`,
                )
                .replace(
                  /^(\s*\\(?:frac|dfrac|sqrt|sum|int|lim)\b[^\n]*)$/gm,
                  (_, body) => `\n$$\n${math(body)}\n$$\n`,
                ),
        )
        .join("")
        .split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+\$)/g)
        .map((segment, n) => (n % 2 ? segment : wrapBareTex(segment)))
        .join("");
    })
    .join("");
}
function wrapBareTex(raw: string) {
  raw=raw.replace(/\\\\(?=(?:frac|dfrac|tfrac|sqrt|binom|mathrm|mathbf|text|overline|underline|vec|hat|bar|boxed)\b)/g,"\\");
  const command =
    /\\(frac|dfrac|tfrac|sqrt|binom|mathrm|mathbf|text|overline|underline|vec|hat|bar|boxed)(?:\[[^\]]*\])?\s*\{/g;
  let output = "",
    cursor = 0;
  for (const match of raw.matchAll(command)) {
    if (match.index < cursor) continue;
    let end = match.index + match[0].length - 1;
    const groups = /frac|binom/.test(match[1]!) ? 2 : 1;
    let valid = true;
    for (let group = 0; group < groups; group++) {
      while (/\s/.test(raw[end] || "x")) end++;
      if (raw[end] !== "{") {
        valid = false;
        break;
      }
      let depth = 0;
      do {
        if (raw[end] === "{") depth++;
        else if (raw[end] === "}") depth--;
        end++;
      } while (depth > 0 && end < raw.length);
      if (depth) {
        valid = false;
        break;
      }
    }
    if (valid) {
      output += raw.slice(cursor, match.index) + "$" + raw.slice(match.index, end) + "$";
      cursor = end;
    }
  }
  return output + raw.slice(cursor);
}

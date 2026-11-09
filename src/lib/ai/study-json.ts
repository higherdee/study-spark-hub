/** Protect TeX from JSON control escapes: a model's \frac must never become a form-feed. */
export function repairJsonTexEscapes(raw: string) {
  return raw.replace(
    /(?<!\\)\\(?=(?:frac|dfrac|tfrac|sqrt|binom|text|mathrm|mathbf|mathbb|left|right|begin|end|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|nu|pi|rho|sigma|omega|times|cdot|div|partial|infty|vec|hat|bar|boxed|overline|underline|sin|cos|tan|log|ln|nabla)\b|[()[\]])/g,
    "\\\\",
  );
}
export function parseStudyArray(raw: string): unknown[] {
  raw = repairJsonTexEscapes(raw);
  const start = raw.indexOf("[");
  if (start < 0) return [];
  const candidate = raw.slice(start);
  const end = candidate.lastIndexOf("]");
  if (end >= 0) {
    try {
      const value = JSON.parse(candidate.slice(0, end + 1));
      if (Array.isArray(value)) return value;
    } catch {
      /* Recover complete objects only. */
    }
  }
  const lastObject = candidate.lastIndexOf("}");
  if (lastObject >= 0) {
    try {
      const value = JSON.parse(candidate.slice(0, lastObject + 1) + "]");
      if (Array.isArray(value)) return value;
    } catch {
      /* Incomplete content is not a study item. */
    }
  }
  return [];
}

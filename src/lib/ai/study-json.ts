export function parseStudyArray(raw: string): unknown[] {
  const start = raw.indexOf("[");
  if (start < 0) return [];
  const candidate = raw.slice(start);
  const end = candidate.lastIndexOf("]");
  if (end >= 0) { try { const value = JSON.parse(candidate.slice(0, end + 1)); if (Array.isArray(value)) return value; } catch { /* Recover complete objects only. */ } }
  const lastObject = candidate.lastIndexOf("}");
  if (lastObject >= 0) { try { const value = JSON.parse(candidate.slice(0, lastObject + 1) + "]"); if (Array.isArray(value)) return value; } catch { /* Incomplete content is not a study item. */ } }
  return [];
}

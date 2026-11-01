export const FREE_LIMITS = { generationItems: 5, aiResponseTokensPerDay: 1000, aiIntervalMs: 60_000, downloadsPerMonth: 6, chatDays: 7, downloadPromotionSeconds: 30, previewPromotionSeconds: 5 } as const;
export function utcDay(now = Date.now()) { return new Date(now).toISOString().slice(0, 10); }
export function utcMonth(now = Date.now()) { return utcDay(now).slice(0, 7); }
export function generationCount(requested: number, paid: boolean) {
  if (!Number.isInteger(requested) || requested < 1 || requested > 50) throw new Error("Choose between 1 and 50 items.");
  if (!paid && requested > FREE_LIMITS.generationItems) throw new MembershipLimitError("Free accounts can generate up to five items at a time. Choose five or get SyllaPlus.", 403);
  return requested;
}
export class MembershipLimitError extends Error {
  constructor(message: string, public readonly status = 429, public readonly retryAfter = 0) { super(message); }
}

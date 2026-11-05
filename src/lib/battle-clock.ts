/** Shared round windows. The server supplies the start time and judges deadlines. */
export function currentBattleRound(startMs: number, durations: readonly number[], nowMs: number) {
  if (nowMs < startMs) return { state: "waiting" as const, startsAt: startMs };
  let opensAt = startMs;
  for (const [index, seconds] of durations.entries()) {
    if (!Number.isInteger(seconds) || seconds <= 0) throw new Error("Invalid battle round duration.");
    const closesAt = opensAt + seconds * 1000;
    if (nowMs < closesAt) return { state: "playing" as const, index, opensAt, closesAt };
    opensAt = closesAt;
  }
  return { state: "finished" as const, finishedAt: opensAt };
}

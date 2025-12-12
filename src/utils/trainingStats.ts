export function getTotalGamesPlayed(
  statsTotalGamesPlayed: number | null | undefined,
  sessionsCount: number | null | undefined
): number {
  if (typeof statsTotalGamesPlayed === 'number' && Number.isFinite(statsTotalGamesPlayed)) {
    return statsTotalGamesPlayed
  }

  if (typeof sessionsCount === 'number' && Number.isFinite(sessionsCount)) {
    return sessionsCount
  }

  return 0
}

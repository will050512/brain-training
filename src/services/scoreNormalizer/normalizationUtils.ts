export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  return value
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizeReactionTimeMs(value: unknown): number {
  const rt = toFiniteNumber(value)
  if (rt === null || rt < 0) return 0

  // 若看起來是「秒」(例如 1.2, 5, 12)，轉為毫秒。
  // 人類反應時間幾乎不會 < 50ms。
  if (rt > 0 && rt < 50) return Math.round(rt * 1000)

  return Math.round(rt)
}

export function normalizeAccuracy(value: unknown, fallback: number): number {
  const accuracy = toFiniteNumber(value)
  if (accuracy === null) return clamp01(fallback)

  if (accuracy <= 1) return clamp01(accuracy)
  if (accuracy <= 100) return clamp01(accuracy / 100)

  return clamp01(fallback)
}

export function normalizeScoreWithMax(rawScore: unknown, maxPossibleScore: unknown): number {
  const score = toFiniteNumber(rawScore)
  if (score === null) return 0

  const maxScore = toFiniteNumber(maxPossibleScore)
  if (maxScore && maxScore > 0) {
    return clampScore((score / maxScore) * 100)
  }

  if (score >= 0 && score <= 100) return clampScore(score)

  return clampScore(score)
}

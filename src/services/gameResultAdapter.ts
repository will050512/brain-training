import type { GameResult, SubDifficulty, Difficulty, UnifiedGameResult } from '@/types/game'
import { scoreNormalizer } from '@/services/scoreNormalizer'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isLegacyGameResult(value: unknown): value is GameResult {
  if (!isRecord(value)) return false

  return (
    typeof value.gameId === 'string' &&
    (value.difficulty === 'easy' || value.difficulty === 'medium' || value.difficulty === 'hard') &&
    typeof value.score === 'number' &&
    typeof value.maxScore === 'number' &&
    typeof value.correctCount === 'number' &&
    typeof value.totalCount === 'number' &&
    typeof value.accuracy === 'number' &&
    typeof value.avgReactionTime === 'number' &&
    typeof value.duration === 'number'
  )
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!isFinite(value)) return null
  return value
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampScore0to100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeReactionTimeMs(value: number | null): number {
  if (value === null) return 0
  const rt = Number(value)
  if (!Number.isFinite(rt) || rt < 0) return 0

  // 若看起來是「秒」(例如 1.2, 5, 12)，轉為毫秒。
  // 人類反應時間幾乎不會 < 50ms。
  if (rt > 0 && rt < 50) return Math.round(rt * 1000)

  return Math.round(rt)
}

function coerceRawSummaryToLegacyGameResult(params: {
  gameId: string
  rawResult: unknown
  difficulty: Difficulty
  subDifficulty?: SubDifficulty
  durationSeconds: number
}): GameResult | null {
  if (!isRecord(params.rawResult)) return null
  const raw = params.rawResult

  const rawScore = toFiniteNumber(raw.score)
  if (rawScore === null) return null

  const rawMaxScore =
    toFiniteNumber(raw.maxScore) ??
    toFiniteNumber(raw.maxPossibleScore) ??
    toFiniteNumber(raw.maxPossible) ??
    null

  const score = (() => {
    if (rawMaxScore && rawMaxScore > 0) {
      return clampScore0to100((rawScore / rawMaxScore) * 100)
    }
    if (rawScore >= 0 && rawScore <= 100) {
      return clampScore0to100(rawScore)
    }
    // 無上限時，保守夾住，避免爆表
    return clampScore0to100(rawScore)
  })()

  // ===== 計數欄位相容 =====
  // 有些遊戲（例如 pattern-reasoning）使用 correct/total；
  // rhythm-mimic 使用 perfectCount/goodCount/missCount/totalBeats。
  const derivedFromRhythm = (() => {
    const perfect = toFiniteNumber(raw.perfectCount)
    const good = toFiniteNumber(raw.goodCount)
    const miss = toFiniteNumber(raw.missCount)
    const totalBeats = toFiniteNumber(raw.totalBeats) ?? toFiniteNumber(raw.totalNotes)
    if (perfect === null && good === null && miss === null && totalBeats === null) return null

    const p = perfect ?? 0
    const g = good ?? 0
    const m = miss ?? 0
    const total = totalBeats ?? Math.max(0, p + g + m)
    const ok = Math.max(0, total - p - g - m)

    return {
      correctCount: Math.max(0, p + g + ok),
      wrongCount: Math.max(0, m),
      totalCount: Math.max(0, total)
    }
  })()

  const correctCount =
    toFiniteNumber(raw.correctCount) ??
    toFiniteNumber(raw.correctRounds) ??
    toFiniteNumber(raw.matchedPairs) ??
    toFiniteNumber(raw.correct) ??
    derivedFromRhythm?.correctCount ??
    0

  const totalCountHint =
    toFiniteNumber(raw.totalCount) ??
    toFiniteNumber(raw.totalRounds) ??
    toFiniteNumber(raw.totalQuestions) ??
    toFiniteNumber(raw.total) ??
    toFiniteNumber(raw.totalBeats) ??
    toFiniteNumber(raw.totalNotes) ??
    derivedFromRhythm?.totalCount ??
    null

  const wrongCount =
    toFiniteNumber(raw.wrongCount) ??
    toFiniteNumber(raw.wrongRounds) ??
    toFiniteNumber(raw.missCount) ??
    derivedFromRhythm?.wrongCount ??
    (totalCountHint !== null ? Math.max(0, totalCountHint - correctCount) : 0)

  const totalCount =
    (totalCountHint !== null ? totalCountHint : null) ??
    Math.max(0, correctCount + wrongCount)

  const accuracy = (() => {
    const a = toFiniteNumber(raw.accuracy)
    if (a !== null) {
      if (a <= 1) return clamp01(a)
      if (a <= 100) return clamp01(a / 100)
    }
    return totalCount > 0 ? clamp01(correctCount / totalCount) : 0
  })()

  // 反應時間欄位相容：
  // - avgReactionTime / avgResponseTime: 多數遊戲
  // - avgTime: pattern-reasoning（秒）
  const avgReactionTime = normalizeReactionTimeMs(
    toFiniteNumber(raw.avgReactionTime) ??
      toFiniteNumber(raw.avgResponseTime) ??
      toFiniteNumber(raw.avgFoundTime) ??
      toFiniteNumber(raw.avgTime)
  )

  return {
    gameId: params.gameId,
    difficulty: params.difficulty,
    subDifficulty: params.subDifficulty,
    score,
    maxScore: 100,
    correctCount,
    totalCount,
    accuracy,
    avgReactionTime,
    duration: params.durationSeconds,
    timestamp: new Date()
  }
}

export function unifiedToLegacyGameResult(unified: UnifiedGameResult): GameResult {
  const correctCount = Number(unified.tracking.correctCount ?? 0)
  const wrongCount = Number(unified.tracking.wrongCount ?? 0)
  const missedCount = Number(unified.tracking.missedCount ?? 0)
  const totalCount = Math.max(0, correctCount + wrongCount + missedCount)

  return {
    gameId: unified.gameId,
    difficulty: unified.difficulty,
    subDifficulty: unified.subDifficulty,
    score: unified.score,
    maxScore: unified.maxScore,
    correctCount,
    totalCount,
    accuracy: unified.metrics.accuracy,
    avgReactionTime: normalizeReactionTimeMs(
      Number.isFinite(Number(unified.tracking.avgReactionTime))
        ? Number(unified.tracking.avgReactionTime)
        : 0
    ),
    duration: unified.duration,
    timestamp: unified.timestamp
  }
}

export function normalizeToLegacyGameResult(params: {
  gameId: string
  rawResult: unknown
  difficulty: Difficulty
  subDifficulty?: SubDifficulty
  durationSeconds: number
}): GameResult {
  // 先嘗試把常見的「結果摘要」形狀轉成舊 GameResult，避免 converter 缺漏時變成 0 分。
  const coerced = coerceRawSummaryToLegacyGameResult(params)

  const unified = scoreNormalizer.normalize(
    params.gameId,
    params.rawResult,
    params.difficulty,
    params.subDifficulty,
    params.durationSeconds
  )

  const legacy = {
    ...unifiedToLegacyGameResult(unified),
    gameId: params.gameId
  }

  // 如果 normalizer 無法辨識導致分數為 0，而 raw 結果其實有分數，優先使用 raw coerced。
  if (legacy.score === 0 && coerced && coerced.score > 0) {
    return coerced
  }

  return legacy
}

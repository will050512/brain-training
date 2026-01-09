import type { Difficulty, GameResult, SubDifficulty } from '@/types/game'
import { normalizeGameResult } from '@/services/scoreNormalizer'

export function convertFallback(
  gameId: string,
  rawResult: unknown,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): GameResult {
  const unified = normalizeGameResult(gameId, rawResult, difficulty, subDifficulty, duration)

  const correctCount = unified.tracking.correctCount ?? 0
  const wrongCount = unified.tracking.wrongCount ?? 0
  const missedCount = unified.tracking.missedCount ?? 0
  const totalCount = correctCount + wrongCount + missedCount

  const accuracy = totalCount > 0 ? correctCount / totalCount : unified.metrics.accuracy
  const avgReactionTime = unified.tracking.avgReactionTime ?? 0

  return {
    gameId,
    difficulty,
    subDifficulty,
    score: unified.score,
    maxScore: unified.maxScore,
    correctCount,
    totalCount,
    accuracy,
    avgReactionTime,
    duration: unified.duration,
    timestamp: unified.timestamp,
    grade: unified.grade,
    metrics: unified.metrics,
    tracking: unified.tracking,
    gameSpecific: unified.gameSpecific,
    displayStats: unified.displayStats,
  }
}


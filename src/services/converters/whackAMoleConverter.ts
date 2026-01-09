import type { Difficulty, GameResult, SubDifficulty } from '@/types/game'
import { normalizeGameResult } from '@/services/scoreNormalizer'

export function convertWhackAMole(
  rawResult: unknown,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): GameResult {
  const unified = normalizeGameResult('whack-a-mole', rawResult, difficulty, subDifficulty, duration)
  const correctCount = unified.tracking.correctCount ?? 0
  const wrongCount = unified.tracking.wrongCount ?? 0
  const missedCount = unified.tracking.missedCount ?? 0
  const totalCount = correctCount + wrongCount + missedCount

  return {
    gameId: 'whack-a-mole',
    difficulty,
    subDifficulty,
    score: unified.score,
    maxScore: unified.maxScore,
    correctCount,
    totalCount,
    accuracy: unified.metrics.accuracy,
    avgReactionTime: unified.tracking.avgReactionTime ?? 0,
    duration: unified.duration,
    timestamp: unified.timestamp,
    grade: unified.grade,
    metrics: unified.metrics,
    tracking: unified.tracking,
    gameSpecific: unified.gameSpecific,
    displayStats: unified.displayStats,
  }
}


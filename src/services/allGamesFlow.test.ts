import { describe, expect, it } from 'vitest'
import { getGameComponent } from '@/games'
import { hasGameResultConverter, scoreNormalizer } from '@/services/scoreNormalizer'
import { normalizeToLegacyGameResult } from '@/services/gameResultAdapter'

type Difficulty = 'easy' | 'medium' | 'hard'

const GAME_IDS = [
  'whack-a-mole',
  'balance-scale',
  'card-match',
  'stroop-test',
  'maze-navigation',
  'spot-difference',
  'math-calc',
  'instant-memory',
  'poker-memory',
  'rock-paper-scissors',
  'gesture-memory',
  'number-connect',
  'pattern-reasoning',
  'audio-memory',
  'rhythm-mimic',
] as const

describe('All games flow (15 games) - converter + adapter smoke', () => {
  it('all game IDs have a component loader', () => {
    for (const gameId of GAME_IDS) {
      expect(typeof getGameComponent(gameId)).toBe('function')
    }
  })

  it('all game IDs have a score normalizer converter', () => {
    for (const gameId of GAME_IDS) {
      expect(hasGameResultConverter(gameId)).toBe(true)
    }
  })

  it('all games normalize without NaN/overflow for allCorrect/partial/timeout scenarios', () => {
    const difficulty: Difficulty = 'easy'

    type ScenarioName = 'allCorrect' | 'partial' | 'timeout'
    type Fixture = { raw: any; durationSeconds: number }

    const fixtures: Record<(typeof GAME_IDS)[number], Record<ScenarioName, Fixture>> = {
      'whack-a-mole': {
        allCorrect: {
          durationSeconds: 30,
          raw: {
            score: 100,
            hitMoles: 20,
            totalMoles: 20,
            missedMoles: 0,
            hitBombs: 0,
            accuracy: 1,
            avgReactionTime: 380,
            maxCombo: 12,
            duration: 30,
          },
        },
        partial: {
          durationSeconds: 30,
          raw: {
            score: 55,
            hitMoles: 10,
            totalMoles: 20,
            missedMoles: 10,
            hitBombs: 1,
            accuracy: 0.5,
            avgReactionTime: 750,
            maxCombo: 4,
            duration: 30,
          },
        },
        timeout: {
          durationSeconds: 30,
          raw: {
            score: 0,
            hitMoles: 0,
            totalMoles: 20,
            missedMoles: 20,
            hitBombs: 0,
            accuracy: 0,
            avgReactionTime: 0,
            maxCombo: 0,
            duration: 30,
          },
        },
      },
      'balance-scale': {
        allCorrect: {
          durationSeconds: 96,
          raw: {
            score: 100,
            correctCount: 12,
            totalRounds: 12,
            accuracy: 1,
            avgReactionTime: 1200,
            duration: 96,
          },
        },
        partial: {
          durationSeconds: 96,
          raw: {
            score: 60,
            correctCount: 6,
            totalRounds: 12,
            accuracy: 0.5,
            avgReactionTime: 1800,
            duration: 96,
          },
        },
        timeout: {
          durationSeconds: 96,
          raw: {
            score: 0,
            correctCount: 0,
            totalRounds: 12,
            accuracy: 0,
            avgReactionTime: 0,
            duration: 96,
          },
        },
      },
      'card-match': {
        allCorrect: {
          durationSeconds: 70,
          raw: {
            score: 100,
            matchedPairs: 6,
            totalPairs: 6,
            moves: 12,
            avgMoveTime: 1600,
            duration: 70,
          },
        },
        partial: {
          durationSeconds: 70,
          raw: {
            score: 55,
            matchedPairs: 3,
            totalPairs: 6,
            moves: 18,
            avgMoveTime: 2600,
            duration: 70,
          },
        },
        timeout: {
          durationSeconds: 70,
          raw: {
            score: 0,
            matchedPairs: 0,
            totalPairs: 6,
            moves: 0,
            avgMoveTime: 0,
            duration: 70,
          },
        },
      },
      'stroop-test': {
        allCorrect: {
          durationSeconds: 90,
          raw: {
            score: 100,
            correctCount: 15,
            wrongCount: 0,
            totalCount: 15,
            accuracy: 1,
            avgReactionTime: 850,
          },
        },
        partial: {
          durationSeconds: 90,
          raw: {
            score: 55,
            correctCount: 8,
            wrongCount: 7,
            totalCount: 15,
            accuracy: 8 / 15,
            avgReactionTime: 1400,
          },
        },
        timeout: {
          durationSeconds: 90,
          raw: {
            score: 0,
            correctCount: 0,
            wrongCount: 15,
            totalCount: 15,
            accuracy: 0,
            avgReactionTime: 0,
          },
        },
      },
      'maze-navigation': {
        allCorrect: {
          durationSeconds: 35,
          raw: {
            score: 95,
            moves: 28,
            optimalMoves: 28,
            efficiency: 1,
            timeSpent: 35,
            avgMoveTime: 1250,
          },
        },
        partial: {
          durationSeconds: 80,
          raw: {
            score: 60,
            moves: 60,
            optimalMoves: 28,
            efficiency: 28 / 60,
            timeSpent: 80,
            avgMoveTime: 1333,
          },
        },
        timeout: {
          durationSeconds: 200,
          raw: {
            score: 10,
            moves: 120,
            optimalMoves: 28,
            efficiency: 28 / 120,
            timeSpent: 200,
            avgMoveTime: 1666,
          },
        },
      },
      'spot-difference': {
        allCorrect: {
          durationSeconds: 120,
          raw: {
            score: 100,
            totalFound: 12,
            totalDifferences: 12,
            accuracy: 1,
            avgFoundTime: 1500,
            wrongClicks: 0,
            duration: 120,
          },
        },
        partial: {
          durationSeconds: 120,
          raw: {
            score: 55,
            totalFound: 6,
            totalDifferences: 12,
            accuracy: 0.5,
            avgFoundTime: 3500,
            wrongClicks: 2,
            duration: 120,
          },
        },
        timeout: {
          durationSeconds: 120,
          raw: {
            score: 0,
            totalFound: 0,
            totalDifferences: 12,
            accuracy: 0,
            avgFoundTime: 0,
            wrongClicks: 5,
            duration: 120,
          },
        },
      },
      'math-calc': {
        allCorrect: {
          durationSeconds: 90,
          raw: {
            score: 100,
            correctCount: 20,
            wrongCount: 0,
            totalCount: 20,
            accuracy: 1,
            avgResponseTime: 1500,
            maxCombo: 10,
            duration: 90,
          },
        },
        partial: {
          durationSeconds: 90,
          raw: {
            score: 40,
            correctCount: 5,
            wrongCount: 5,
            totalCount: 10,
            accuracy: 0.5,
            avgResponseTime: 3000,
            maxCombo: 2,
            duration: 90,
          },
        },
        timeout: {
          durationSeconds: 90,
          raw: {
            score: 0,
            correctCount: 0,
            wrongCount: 10,
            totalCount: 10,
            accuracy: 0,
            avgResponseTime: 0,
            maxCombo: 0,
            duration: 90,
          },
        },
      },
      'instant-memory': {
        allCorrect: {
          durationSeconds: 60,
          raw: {
            score: 180,
            maxScore: 180,
            accuracy: 1,
            timeSpent: 60,
            correctCount: 10,
            wrongCount: 0,
            maxReached: 10,
            totalRounds: 10,
          },
        },
        partial: {
          durationSeconds: 60,
          raw: {
            score: 60,
            maxScore: 180,
            accuracy: 0.3,
            timeSpent: 60,
            correctCount: 3,
            wrongCount: 7,
            maxReached: 4,
            totalRounds: 10,
          },
        },
        timeout: {
          durationSeconds: 60,
          raw: {
            score: 0,
            maxScore: 180,
            accuracy: 0,
            timeSpent: 60,
            correctCount: 0,
            wrongCount: 10,
            maxReached: 0,
            totalRounds: 10,
          },
        },
      },
      'poker-memory': {
        allCorrect: {
          durationSeconds: 80,
          raw: {
            score: 100,
            matchedPairs: 6,
            totalPairs: 6,
            moves: 6,
            timeLeft: 60,
          },
        },
        partial: {
          durationSeconds: 80,
          raw: {
            score: 55,
            matchedPairs: 3,
            totalPairs: 6,
            moves: 12,
            timeLeft: 20,
          },
        },
        timeout: {
          durationSeconds: 80,
          raw: {
            score: 0,
            matchedPairs: 0,
            totalPairs: 6,
            moves: 0,
            timeLeft: 0,
          },
        },
      },
      'rock-paper-scissors': {
        allCorrect: {
          durationSeconds: 60,
          raw: {
            score: 100,
            wins: 10,
            losses: 0,
            ties: 0,
            totalRounds: 10,
            avgResponseTime: 650,
            reverseRounds: 3,
          },
        },
        partial: {
          durationSeconds: 60,
          raw: {
            score: 45,
            wins: 4,
            losses: 6,
            ties: 0,
            totalRounds: 10,
            avgResponseTime: 950,
            reverseRounds: 3,
          },
        },
        timeout: {
          durationSeconds: 60,
          raw: {
            score: 0,
            wins: 0,
            losses: 10,
            ties: 0,
            totalRounds: 10,
            avgResponseTime: 0,
            reverseRounds: 3,
          },
        },
      },
      'gesture-memory': {
        allCorrect: {
          durationSeconds: 90,
          raw: {
            score: 100,
            accuracy: 100,
            maxStreak: 10,
            totalRounds: 10,
            correctRounds: 10,
            maxLength: 10,
          },
        },
        partial: {
          durationSeconds: 90,
          raw: {
            score: 40,
            accuracy: 40,
            maxStreak: 2,
            totalRounds: 10,
            correctRounds: 4,
            maxLength: 6,
          },
        },
        timeout: {
          durationSeconds: 90,
          raw: {
            score: 0,
            accuracy: 0,
            maxStreak: 0,
            totalRounds: 10,
            correctRounds: 0,
            maxLength: 0,
          },
        },
      },
      'number-connect': {
        allCorrect: {
          durationSeconds: 30,
          raw: {
            score: 100,
            completed: true,
            progress: 10,
            totalNumbers: 10,
            errors: 0,
            duration: 30,
          },
        },
        partial: {
          durationSeconds: 45,
          raw: {
            score: 35,
            completed: false,
            progress: 4,
            totalNumbers: 10,
            errors: 1,
            duration: 45,
          },
        },
        timeout: {
          durationSeconds: 90,
          raw: {
            score: 0,
            completed: false,
            progress: 0,
            totalNumbers: 10,
            errors: 3,
            duration: 90,
          },
        },
      },
      'pattern-reasoning': {
        allCorrect: {
          durationSeconds: 75,
          raw: {
            score: 100,
            correct: 10,
            total: 10,
            accuracy: 100,
            avgTime: 1.2,
          },
        },
        partial: {
          durationSeconds: 75,
          raw: {
            score: 50,
            correct: 5,
            total: 10,
            accuracy: 50,
            avgTime: 2.5,
          },
        },
        timeout: {
          durationSeconds: 75,
          raw: {
            score: 0,
            correct: 0,
            total: 10,
            accuracy: 0,
            avgTime: 0,
          },
        },
      },
      'audio-memory': {
        allCorrect: {
          durationSeconds: 90,
          raw: {
            score: 100,
            accuracy: 100,
            correctRounds: 10,
            totalRounds: 10,
            maxStreak: 10,
            maxLength: 10,
          },
        },
        partial: {
          durationSeconds: 90,
          raw: {
            score: 60,
            accuracy: 60,
            correctRounds: 6,
            totalRounds: 10,
            maxStreak: 3,
            maxLength: 6,
          },
        },
        timeout: {
          durationSeconds: 90,
          raw: {
            score: 0,
            accuracy: 0,
            correctRounds: 0,
            totalRounds: 10,
            maxStreak: 0,
            maxLength: 0,
          },
        },
      },
      'rhythm-mimic': {
        allCorrect: {
          durationSeconds: 60,
          raw: {
            score: 100,
            perfectCount: 10,
            goodCount: 0,
            missCount: 0,
            totalBeats: 10,
            avgError: 0,
          },
        },
        partial: {
          durationSeconds: 60,
          raw: {
            score: 55,
            perfectCount: 3,
            goodCount: 3,
            missCount: 2,
            totalBeats: 10,
            avgError: 180,
          },
        },
        timeout: {
          durationSeconds: 60,
          raw: {
            score: 0,
            perfectCount: 0,
            goodCount: 0,
            missCount: 10,
            totalBeats: 10,
            avgError: 0,
          },
        },
      },
    }

    for (const gameId of GAME_IDS) {
      for (const scenarioName of ['allCorrect', 'partial', 'timeout'] as const) {
        const { raw, durationSeconds } = fixtures[gameId][scenarioName]

        const unified = scoreNormalizer.normalize(gameId, raw, difficulty, undefined, durationSeconds)
        expect(unified.gameId).toBe(gameId)
        if (!Number.isFinite(unified.score)) {
          throw new Error(`Non-finite unified.score for ${gameId}/${scenarioName}: ${String(unified.score)}`)
        }
        expect(unified.score).toBeGreaterThanOrEqual(0)
        expect(unified.score).toBeLessThanOrEqual(100)

        const legacy = normalizeToLegacyGameResult({
          gameId,
          rawResult: raw,
          difficulty,
          durationSeconds,
        })
        expect(Number.isFinite(legacy.score)).toBe(true)
        expect(legacy.score).toBeGreaterThanOrEqual(0)
        expect(legacy.score).toBeLessThanOrEqual(100)
        expect(Number.isFinite(legacy.accuracy)).toBe(true)
        expect(legacy.accuracy).toBeGreaterThanOrEqual(0)
        expect(legacy.accuracy).toBeLessThanOrEqual(1)
        expect(Number.isFinite(legacy.avgReactionTime)).toBe(true)
        expect(legacy.avgReactionTime).toBeGreaterThanOrEqual(0)
        expect(legacy.totalCount).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('all games edge cases: all-correct is high, any-correct earns points, and score ordering is monotonic', () => {
    const difficulty: Difficulty = 'easy'

    type ScenarioName = 'allCorrect' | 'partial' | 'timeout'
    type Fixture = { raw: any; durationSeconds: number }

    const fixtures: Record<(typeof GAME_IDS)[number], Record<ScenarioName, Fixture>> = {
      'whack-a-mole': {
        allCorrect: { durationSeconds: 30, raw: { hitMoles: 20, totalMoles: 20, missedMoles: 0, hitBombs: 0, avgReactionTime: 380, maxCombo: 12, score: 100 } },
        partial: { durationSeconds: 30, raw: { hitMoles: 10, totalMoles: 20, missedMoles: 10, hitBombs: 1, avgReactionTime: 750, maxCombo: 4, score: 55 } },
        timeout: { durationSeconds: 30, raw: { hitMoles: 0, totalMoles: 20, missedMoles: 20, hitBombs: 0, avgReactionTime: 0, maxCombo: 0, score: 0 } },
      },
      'balance-scale': {
        allCorrect: { durationSeconds: 96, raw: { correctCount: 12, totalRounds: 12, avgReactionTime: 1200, score: 100 } },
        partial: { durationSeconds: 96, raw: { correctCount: 6, totalRounds: 12, avgReactionTime: 1800, score: 60 } },
        timeout: { durationSeconds: 96, raw: { correctCount: 0, totalRounds: 12, avgReactionTime: 0, score: 0 } },
      },
      'card-match': {
        allCorrect: { durationSeconds: 70, raw: { matchedPairs: 6, totalPairs: 6, moves: 12, avgMoveTime: 1600, duration: 70, score: 100 } },
        partial: { durationSeconds: 70, raw: { matchedPairs: 3, totalPairs: 6, moves: 18, avgMoveTime: 2600, duration: 70, score: 55 } },
        timeout: { durationSeconds: 70, raw: { matchedPairs: 0, totalPairs: 6, moves: 0, avgMoveTime: 0, duration: 70, score: 0 } },
      },
      'stroop-test': {
        allCorrect: { durationSeconds: 90, raw: { correctCount: 15, wrongCount: 0, totalCount: 15, avgReactionTime: 850, score: 100 } },
        partial: { durationSeconds: 90, raw: { correctCount: 8, wrongCount: 7, totalCount: 15, avgReactionTime: 1400, score: 55 } },
        timeout: { durationSeconds: 90, raw: { correctCount: 0, wrongCount: 15, totalCount: 15, avgReactionTime: 0, score: 0 } },
      },
      'maze-navigation': {
        allCorrect: { durationSeconds: 35, raw: { moves: 28, optimalMoves: 28, efficiency: 1, timeSpent: 35, avgMoveTime: 1250, score: 95 } },
        partial: { durationSeconds: 80, raw: { moves: 60, optimalMoves: 28, efficiency: 28 / 60, timeSpent: 80, avgMoveTime: 1333, score: 60 } },
        timeout: { durationSeconds: 200, raw: { moves: 120, optimalMoves: 28, efficiency: 28 / 120, timeSpent: 200, avgMoveTime: 1666, score: 10 } },
      },
      'spot-difference': {
        allCorrect: { durationSeconds: 120, raw: { totalFound: 12, totalDifferences: 12, avgFoundTime: 1500, wrongClicks: 0, duration: 120, score: 100 } },
        partial: { durationSeconds: 120, raw: { totalFound: 6, totalDifferences: 12, avgFoundTime: 3500, wrongClicks: 2, duration: 120, score: 55 } },
        timeout: { durationSeconds: 120, raw: { totalFound: 0, totalDifferences: 12, avgFoundTime: 0, wrongClicks: 5, duration: 120, score: 0 } },
      },
      'math-calc': {
        allCorrect: { durationSeconds: 90, raw: { correctCount: 20, wrongCount: 0, totalCount: 20, avgResponseTime: 1500, maxCombo: 10, duration: 90, score: 100 } },
        partial: { durationSeconds: 90, raw: { correctCount: 5, wrongCount: 5, totalCount: 10, avgResponseTime: 3000, maxCombo: 2, duration: 90, score: 40 } },
        timeout: { durationSeconds: 90, raw: { correctCount: 0, wrongCount: 10, totalCount: 10, avgResponseTime: 0, maxCombo: 0, duration: 90, score: 0 } },
      },
      'instant-memory': {
        allCorrect: { durationSeconds: 60, raw: { score: 180, maxScore: 180, correctCount: 10, wrongCount: 0, accuracy: 1, timeSpent: 60, maxReached: 10 } },
        partial: { durationSeconds: 60, raw: { score: 60, maxScore: 180, correctCount: 3, wrongCount: 7, accuracy: 0.3, timeSpent: 60, maxReached: 4 } },
        timeout: { durationSeconds: 60, raw: { score: 0, maxScore: 180, correctCount: 0, wrongCount: 10, accuracy: 0, timeSpent: 60, maxReached: 0 } },
      },
      'poker-memory': {
        allCorrect: { durationSeconds: 80, raw: { matchedPairs: 6, totalPairs: 6, moves: 6, timeLeft: 60, score: 100 } },
        partial: { durationSeconds: 80, raw: { matchedPairs: 3, totalPairs: 6, moves: 12, timeLeft: 20, score: 55 } },
        timeout: { durationSeconds: 80, raw: { matchedPairs: 0, totalPairs: 6, moves: 0, timeLeft: 0, score: 0 } },
      },
      'rock-paper-scissors': {
        allCorrect: { durationSeconds: 60, raw: { wins: 10, losses: 0, ties: 0, totalRounds: 10, avgResponseTime: 650, reverseRounds: 3, score: 100 } },
        partial: { durationSeconds: 60, raw: { wins: 4, losses: 6, ties: 0, totalRounds: 10, avgResponseTime: 950, reverseRounds: 3, score: 45 } },
        timeout: { durationSeconds: 60, raw: { wins: 0, losses: 10, ties: 0, totalRounds: 10, avgResponseTime: 0, reverseRounds: 3, score: 0 } },
      },
      'gesture-memory': {
        allCorrect: { durationSeconds: 90, raw: { score: 100, accuracy: 100, totalRounds: 10, correctRounds: 10, maxStreak: 10, maxLength: 10 } },
        partial: { durationSeconds: 90, raw: { score: 40, accuracy: 40, totalRounds: 10, correctRounds: 4, maxStreak: 2, maxLength: 6 } },
        timeout: { durationSeconds: 90, raw: { score: 0, accuracy: 0, totalRounds: 10, correctRounds: 0, maxStreak: 0, maxLength: 0 } },
      },
      'number-connect': {
        allCorrect: { durationSeconds: 30, raw: { completed: true, progress: 10, totalNumbers: 10, errors: 0, duration: 30, score: 100 } },
        partial: { durationSeconds: 45, raw: { completed: false, progress: 4, totalNumbers: 10, errors: 1, duration: 45, score: 35 } },
        timeout: { durationSeconds: 90, raw: { completed: false, progress: 0, totalNumbers: 10, errors: 3, duration: 90, score: 0 } },
      },
      'pattern-reasoning': {
        allCorrect: { durationSeconds: 75, raw: { correct: 10, total: 10, avgTime: 1.2, accuracy: 100, score: 100 } },
        partial: { durationSeconds: 75, raw: { correct: 5, total: 10, avgTime: 2.5, accuracy: 50, score: 50 } },
        timeout: { durationSeconds: 75, raw: { correct: 0, total: 10, avgTime: 0, accuracy: 0, score: 0 } },
      },
      'audio-memory': {
        allCorrect: { durationSeconds: 90, raw: { accuracy: 100, correctRounds: 10, totalRounds: 10, maxStreak: 10, maxLength: 10, score: 100 } },
        partial: { durationSeconds: 90, raw: { accuracy: 60, correctRounds: 6, totalRounds: 10, maxStreak: 3, maxLength: 6, score: 60 } },
        timeout: { durationSeconds: 90, raw: { accuracy: 0, correctRounds: 0, totalRounds: 10, maxStreak: 0, maxLength: 0, score: 0 } },
      },
      'rhythm-mimic': {
        allCorrect: { durationSeconds: 60, raw: { perfectCount: 10, goodCount: 0, missCount: 0, totalBeats: 10, avgError: 0, score: 100 } },
        partial: { durationSeconds: 60, raw: { perfectCount: 3, goodCount: 3, missCount: 2, totalBeats: 10, avgError: 180, score: 55 } },
        timeout: { durationSeconds: 60, raw: { perfectCount: 0, goodCount: 0, missCount: 10, totalBeats: 10, avgError: 0, score: 0 } },
      },
    }

    for (const gameId of GAME_IDS) {
      const all = scoreNormalizer.normalize(gameId, fixtures[gameId].allCorrect.raw, difficulty, undefined, fixtures[gameId].allCorrect.durationSeconds).score
      const partial = scoreNormalizer.normalize(gameId, fixtures[gameId].partial.raw, difficulty, undefined, fixtures[gameId].partial.durationSeconds).score
      const timeout = scoreNormalizer.normalize(gameId, fixtures[gameId].timeout.raw, difficulty, undefined, fixtures[gameId].timeout.durationSeconds).score

      expect(all).toBeGreaterThanOrEqual(80)
      expect(partial).toBeGreaterThan(0)
      expect(all).toBeGreaterThanOrEqual(partial)
      expect(partial).toBeGreaterThanOrEqual(timeout)
    }
  })
})

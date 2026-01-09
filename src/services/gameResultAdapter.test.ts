import { describe, it, expect } from 'vitest'
import { normalizeToLegacyGameResult } from '@/services/gameResultAdapter'

describe('gameResultAdapter normalizeToLegacyGameResult', () => {
  it('maps pattern-reasoning raw result shape (correct/total/avgTime) into legacy counts and non-zero score', () => {
    const legacy = normalizeToLegacyGameResult({
      gameId: 'pattern-reasoning',
      rawResult: {
        score: 95,
        accuracy: 100,
        correct: 10,
        total: 10,
        avgTime: 1.5
      },
      difficulty: 'easy',
      durationSeconds: 30
    })

    expect(legacy.correctCount).toBe(10)
    expect(legacy.totalCount).toBe(10)
    expect(legacy.accuracy).toBe(1)
    expect(legacy.avgReactionTime).toBe(1500)
    expect(legacy.score).toBeGreaterThan(0)
  })

  it('maps rhythm-mimic raw result counts into legacy correct/total and non-zero score', () => {
    const legacy = normalizeToLegacyGameResult({
      gameId: 'rhythm-mimic',
      rawResult: {
        score: 80,
        accuracy: 85,
        perfectCount: 5,
        goodCount: 3,
        missCount: 2,
        totalBeats: 10,
        avgError: 120
      },
      difficulty: 'easy',
      durationSeconds: 45
    })

    expect(legacy.correctCount).toBe(8)
    expect(legacy.totalCount).toBe(10)
    // rhythm-mimic 在統一轉換中使用「加權準確率」做為 accuracy（Perfect=1, Good=0.8, Ok=0.5, Miss=0）
    expect(legacy.accuracy).toBeCloseTo(0.74, 5)
    expect(legacy.score).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import {
  normalizeAccuracy,
  normalizeReactionTimeMs,
  normalizeScoreWithMax,
} from '@/services/scoreNormalizer/normalizationUtils'

describe('normalizationUtils', () => {
  it('normalizes reaction time in seconds to milliseconds', () => {
    expect(normalizeReactionTimeMs(1.2)).toBe(1200)
    expect(normalizeReactionTimeMs(12)).toBe(12000)
    expect(normalizeReactionTimeMs(520)).toBe(520)
  })

  it('normalizes accuracy ratios and percentages', () => {
    expect(normalizeAccuracy(0.85, 0)).toBeCloseTo(0.85, 6)
    expect(normalizeAccuracy(85, 0)).toBeCloseTo(0.85, 6)
    expect(normalizeAccuracy(undefined, 0.5)).toBeCloseTo(0.5, 6)
  })

  it('normalizes scores with and without max values', () => {
    expect(normalizeScoreWithMax(5, 10)).toBe(50)
    expect(normalizeScoreWithMax(120, undefined)).toBe(100)
    expect(normalizeScoreWithMax('bad', 10)).toBe(0)
  })
})

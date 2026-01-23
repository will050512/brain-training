import { describe, expect, it } from 'vitest'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import { calculateCognitiveDomainScores } from '@/services/scoreCalculator'

const buildScores = (overrides: Partial<CognitiveScores> = {}): CognitiveScores => ({
  reaction: 0,
  logic: 0,
  memory: 0,
  cognition: 0,
  coordination: 0,
  attention: 0,
  ...overrides,
})

const buildSampleCounts = (overrides: Partial<Record<CognitiveDimension, number>> = {}) => ({
  reaction: 1,
  logic: 1,
  memory: 1,
  cognition: 1,
  coordination: 1,
  attention: 1,
  ...overrides,
})

describe('calculateCognitiveDomainScores', () => {
  it('maps direct domains from matching dimensions', () => {
    const scores = buildScores({ memory: 82, attention: 64 })
    const result = calculateCognitiveDomainScores(scores)
    expect(result.memory).toBe(82)
    expect(result.attention).toBe(64)
  })

  it('derives composite domains with weights', () => {
    const scores = buildScores({
      reaction: 80,
      attention: 60,
      logic: 70,
      cognition: 50,
      coordination: 40,
    })
    const result = calculateCognitiveDomainScores(scores)

    // processing = reaction*0.7 + attention*0.3 = 74
    expect(result.processing).toBe(74)
    // executive = logic*0.6 + cognition*0.4 = 62
    expect(result.executive).toBe(62)
    // language = cognition*0.7 + coordination*0.3 = 47
    expect(result.language).toBe(47)
  })

  it('skips dimensions with zero samples when sampleCounts provided', () => {
    const scores = buildScores({
      reaction: 90,
      attention: 40,
    })
    const sampleCounts = buildSampleCounts({ reaction: 0 })
    const result = calculateCognitiveDomainScores(scores, sampleCounts)

    // processing should fall back to attention only: 40
    expect(result.processing).toBe(40)
  })
})

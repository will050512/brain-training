/**
 * 節拍模仿遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  getPatternsByDifficulty,
  selectRandomPattern,
  generateRoundPatterns,
  evaluateTap,
  evaluateRound,
  getPatternDuration,
  calculateScore,
  calculateGrade,
  countRatings,
  summarizeResult,
  RHYTHM_PATTERNS,
  DIFFICULTY_CONFIGS,
} from '../rhythmMimic'

describe('節拍模仿遊戲邏輯', () => {
  describe('getPatternsByDifficulty', () => {
    it('簡單難度應只包含簡單模式', () => {
      const patterns = getPatternsByDifficulty('easy')
      patterns.forEach(p => {
        expect(p.difficulty).toBe('easy')
      })
    })

    it('中等難度應包含簡單和中等模式', () => {
      const patterns = getPatternsByDifficulty('medium')
      patterns.forEach(p => {
        expect(['easy', 'medium']).toContain(p.difficulty)
      })
    })

    it('困難難度應包含所有模式', () => {
      const patterns = getPatternsByDifficulty('hard')
      const difficulties = new Set(patterns.map(p => p.difficulty))
      expect(difficulties.size).toBe(3)
    })
  })

  describe('selectRandomPattern', () => {
    it('應從給定的模式中選擇', () => {
      const patterns = getPatternsByDifficulty('easy')
      const selected = selectRandomPattern(patterns)
      expect(patterns).toContain(selected)
    })
  })

  describe('generateRoundPatterns', () => {
    it('應產生指定數量的模式', () => {
      const patterns = generateRoundPatterns(5, 'easy')
      expect(patterns.length).toBe(5)
    })

    it('模式應符合難度', () => {
      const patterns = generateRoundPatterns(5, 'easy')
      patterns.forEach(p => {
        expect(p.difficulty).toBe('easy')
      })
    })
  })

  describe('evaluateTap', () => {
    it('完美時機應評為 perfect', () => {
      const result = evaluateTap(1000, 1000, 300)
      expect(result.rating).toBe('perfect')
      expect(result.isGood).toBe(true)
    })

    it('接近時機應評為 good', () => {
      const result = evaluateTap(1100, 1000, 300)
      expect(result.rating).toBe('good')
      expect(result.isGood).toBe(true)
    })

    it('勉強及格應評為 ok', () => {
      const result = evaluateTap(1250, 1000, 300)
      expect(result.rating).toBe('ok')
      expect(result.isGood).toBe(true)
    })

    it('錯過時機應評為 miss', () => {
      const result = evaluateTap(1500, 1000, 300)
      expect(result.rating).toBe('miss')
      expect(result.isGood).toBe(false)
    })

    it('應正確計算誤差', () => {
      const result = evaluateTap(1100, 1000, 300)
      expect(result.error).toBe(100)
      expect(result.expected).toBe(1000)
      expect(result.actual).toBe(1100)
    })
  })

  describe('evaluateRound', () => {
    it('應評估所有節拍', () => {
      const pattern = RHYTHM_PATTERNS.find(p => p.id === 'simple_4')!
      const config = DIFFICULTY_CONFIGS.easy
      const userTaps = [0, 1000, 2000, 3000]

      const result = evaluateRound(userTaps, pattern, config)

      expect(result.taps.length).toBe(pattern.beats.length)
    })

    it('完美演奏應得高分', () => {
      const pattern = RHYTHM_PATTERNS.find(p => p.id === 'simple_4')!
      const config = DIFFICULTY_CONFIGS.easy
      const userTaps = pattern.beats.map(b => b.time)

      const result = evaluateRound(userTaps, pattern, config)

      expect(result.accuracy).toBeGreaterThan(80)
      expect(result.score).toBeGreaterThan(80)
    })

    it('同一個 tap 不應重複配對多個節拍', () => {
      const pattern = {
        id: 'two_beats',
        name: 'Two Beats',
        bpm: 60,
        difficulty: 'easy' as const,
        beats: [
          { time: 0, type: 'tap' as const },
          { time: 1000, type: 'tap' as const },
        ],
      }
      const config = DIFFICULTY_CONFIGS.easy
      const userTaps = [0]

      const result = evaluateRound(userTaps, pattern, config)

      expect(result.taps.length).toBe(2)
      expect(result.taps.filter(t => t.rating === 'miss').length).toBe(1)
      expect(result.accuracy).toBe(50)
      expect(result.score).toBe(50)
    })

    it('過度連點應降低準確度', () => {
      const pattern = RHYTHM_PATTERNS.find(p => p.id === 'simple_4')!
      const config = DIFFICULTY_CONFIGS.easy
      const userTaps = [0, 100, 200, 1000, 1100, 2000, 2100, 3000, 3100]

      const result = evaluateRound(userTaps, pattern, config)

      expect(result.stats.extra).toBeGreaterThan(0)
      expect(result.accuracy).toBeLessThan(60)
    })
  })

  describe('getPatternDuration', () => {
    it('應計算正確的持續時間', () => {
      const pattern = RHYTHM_PATTERNS.find(p => p.id === 'simple_4')!
      const duration = getPatternDuration(pattern)

      // 最後一個節拍是 3000ms，加上 500ms 緩衝
      expect(duration).toBe(3500)
    })

    it('空模式應返回 0', () => {
      const emptyPattern = {
        id: 'empty',
        name: 'Empty',
        bpm: 60,
        difficulty: 'easy' as const,
        beats: [],
      }
      const duration = getPatternDuration(emptyPattern)
      expect(duration).toBe(0)
    })
  })

  describe('calculateScore', () => {
    it('應計算回合平均分數', () => {
      const roundResults = [
        { accuracy: 100, taps: [], score: 100 },
        { accuracy: 80, taps: [], score: 80 },
        { accuracy: 60, taps: [], score: 60 },
      ]

      const score = calculateScore(roundResults)
      expect(score).toBe(80)
    })

    it('空結果應返回 0', () => {
      const score = calculateScore([])
      expect(score).toBe(0)
    })
  })

  describe('calculateGrade', () => {
    it('應根據分數返回等級', () => {
      expect(calculateGrade(95)).toBe('S')
      expect(calculateGrade(85)).toBe('A')
      expect(calculateGrade(75)).toBe('B')
      expect(calculateGrade(65)).toBe('C')
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('countRatings', () => {
    it('應正確統計各評分等級', () => {
      const roundResults = [
        {
          accuracy: 100,
          score: 100,
          taps: [
            { expected: 0, actual: 0, error: 0, isGood: true, rating: 'perfect' as const },
            { expected: 1000, actual: 1050, error: 50, isGood: true, rating: 'good' as const },
          ],
        },
        {
          accuracy: 50,
          score: 50,
          taps: [
            { expected: 0, actual: 200, error: 200, isGood: true, rating: 'ok' as const },
            { expected: 1000, actual: 2000, error: 1000, isGood: false, rating: 'miss' as const },
          ],
        },
      ]

      const counts = countRatings(roundResults)

      expect(counts.perfect).toBe(1)
      expect(counts.good).toBe(1)
      expect(counts.ok).toBe(1)
      expect(counts.miss).toBe(1)
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整結果', () => {
      const roundResults = [
        {
          accuracy: 100,
          score: 100,
          taps: [
            { expected: 0, actual: 0, error: 0, isGood: true, rating: 'perfect' as const },
            { expected: 1000, actual: 1000, error: 0, isGood: true, rating: 'perfect' as const },
          ],
        },
      ]

      const result = summarizeResult(roundResults)

      expect(result.score).toBe(100)
      expect(result.perfectCount).toBe(2)
      expect(result.totalBeats).toBe(2)
      expect(result.avgError).toBe(0)
    })
  })

  describe('RHYTHM_PATTERNS', () => {
    it('應有多種節奏模式', () => {
      expect(RHYTHM_PATTERNS.length).toBeGreaterThanOrEqual(6)
    })

    it('應有各難度的模式', () => {
      const difficulties = new Set(RHYTHM_PATTERNS.map(p => p.difficulty))
      expect(difficulties.has('easy')).toBe(true)
      expect(difficulties.has('medium')).toBe(true)
      expect(difficulties.has('hard')).toBe(true)
    })

    it('每個模式應有有效的節拍', () => {
      RHYTHM_PATTERNS.forEach(pattern => {
        expect(pattern.beats.length).toBeGreaterThan(0)
        pattern.beats.forEach(beat => {
          expect(beat.time).toBeGreaterThanOrEqual(0)
          expect(beat.type).toBe('tap')
        })
      })
    })

    it('模式 ID 應唯一', () => {
      const ids = RHYTHM_PATTERNS.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(RHYTHM_PATTERNS.length)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有更多播放次數', () => {
      expect(DIFFICULTY_CONFIGS.easy.playCount).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.hard.playCount
      )
    })

    it('困難難度應有較小容許誤差', () => {
      expect(DIFFICULTY_CONFIGS.hard.tolerance).toBeLessThan(
        DIFFICULTY_CONFIGS.easy.tolerance
      )
    })

    it('困難難度應有更多回合', () => {
      expect(DIFFICULTY_CONFIGS.hard.totalRounds).toBeGreaterThan(
        DIFFICULTY_CONFIGS.easy.totalRounds
      )
    })
  })
})

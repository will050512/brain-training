/**
 * 找不同遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateRound,
  isDifference,
  processClick,
  isRoundComplete,
  calculateScore,
  calculateGrade,
  summarizeResult,
  getRandomEmojiSet,
  EMOJI_SETS,
  DIFFICULTY_CONFIGS,
} from '../spotDifference'

describe('找不同遊戲邏輯', () => {
  describe('generateRound', () => {
    it('應產生有效的回合', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      expect(round.originalGrid).toBeDefined()
      expect(round.compareGrid).toBeDefined()
      expect(round.differences).toBeDefined()
      expect(round.differences.length).toBeGreaterThan(0)
    })

    it('應產生指定數量的不同點', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const round = generateRound(config)
      expect(round.differences.length).toBe(config.diffCount)
    })

    it('左右網格大小應一致', () => {
      const config = DIFFICULTY_CONFIGS.medium
      const round = generateRound(config)
      expect(round.originalGrid.length).toBe(round.compareGrid.length)
    })

    it('應支援非正方形網格', () => {
      const config = { ...DIFFICULTY_CONFIGS.easy, gridRows: 3, gridCols: 4 }
      const round = generateRound(config)
      expect(round.originalGrid.length).toBe(12)
      expect(round.compareGrid.length).toBe(12)
    })

    it('應在差異位置有不同的 emoji', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      for (const diffIndex of round.differences) {
        expect(round.originalGrid[diffIndex]).not.toBe(round.compareGrid[diffIndex])
      }
    })
  })

  describe('isDifference', () => {
    it('在差異位置應返回 true', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      const diffIndex = round.differences[0]!
      expect(isDifference(diffIndex, round.differences)).toBe(true)
    })

    it('在非差異位置應返回 false', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      // 找一個不是差異的位置
      let normalIndex = 0
      while (round.differences.includes(normalIndex)) {
        normalIndex++
      }
      expect(isDifference(normalIndex, round.differences)).toBe(false)
    })
  })

  describe('processClick', () => {
    it('點擊差異位置應返回正確', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      const diffIndex = round.differences[0]!
      const result = processClick(diffIndex, round.differences, [])
      expect(result.isCorrect).toBe(true)
      expect(result.isNewFind).toBe(true)
    })

    it('點擊非差異位置應返回錯誤', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      let normalIndex = 0
      while (round.differences.includes(normalIndex)) {
        normalIndex++
      }
      const result = processClick(normalIndex, round.differences, [])
      expect(result.isCorrect).toBe(false)
    })

    it('已找到的位置不應重複計算', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      const diffIndex = round.differences[0]!
      const result = processClick(diffIndex, round.differences, [diffIndex])
      expect(result.isCorrect).toBe(true)
      expect(result.isNewFind).toBe(false)
    })
  })

  describe('isRoundComplete', () => {
    it('全部找到應返回 true', () => {
      expect(isRoundComplete(3, 3)).toBe(true)
    })

    it('未全部找到應返回 false', () => {
      expect(isRoundComplete(2, 3)).toBe(false)
    })
  })

  describe('getRandomEmojiSet', () => {
    it('應返回有效的表情集', () => {
      const set = getRandomEmojiSet()
      expect(set).toBeDefined()
      expect(set.length).toBeGreaterThan(5)
    })
  })

  describe('calculateScore', () => {
    it('應根據找到數量和錯誤計算分數', () => {
      const score = calculateScore(3, 5, 1, 3000)
      expect(score).toBeGreaterThan(0)
    })

    it('完美表現應得高分', () => {
      const score = calculateScore(5, 5, 0, 2000)
      expect(score).toBeGreaterThan(80)
    })

    it('錯誤越多分數越低', () => {
      const goodScore = calculateScore(5, 5, 0, 3000)
      const badScore = calculateScore(5, 5, 10, 3000)
      expect(goodScore).toBeGreaterThan(badScore)
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

  describe('summarizeResult', () => {
    it('應正確彙整遊戲結果', () => {
      const result = summarizeResult(4, 3, 2, 5, [3000, 4000], DIFFICULTY_CONFIGS.easy)
      expect(result.totalFound).toBe(4)
      expect(result.wrongClicks).toBe(5)
      expect(result.avgFoundTime).toBe(3500)
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('EMOJI_SETS', () => {
    it('應有多種表情符號集', () => {
      expect(Object.keys(EMOJI_SETS).length).toBeGreaterThanOrEqual(3)
    })

    it('每個集合應有足夠的表情符號', () => {
      Object.values(EMOJI_SETS).forEach(set => {
        expect(set.length).toBeGreaterThanOrEqual(10)
      })
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少差異點', () => {
      expect(DIFFICULTY_CONFIGS.easy.diffCount).toBeLessThanOrEqual(
        DIFFICULTY_CONFIGS.hard.diffCount
      )
    })

    it('困難難度應有較大網格', () => {
      expect(DIFFICULTY_CONFIGS.hard.gridSize).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.gridSize
      )
    })
  })
})

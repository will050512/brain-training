/**
 * 天平秤重遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateRound,
  validateAnswer,
  calculateWeight,
  calculateArmRotation,
  calculateScore,
  calculateGrade,
  summarizeResult,
  WEIGHT_ITEMS,
  DIFFICULTY_CONFIGS,
} from '../balanceScale'

describe('天平秤重遊戲邏輯', () => {
  describe('generateRound', () => {
    it('應產生有效的回合', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      expect(round.leftItems).toBeDefined()
      expect(round.rightItems).toBeDefined()
      expect(round.leftWeight).toBeDefined()
      expect(round.rightWeight).toBeDefined()
      expect(round.correctAnswer).toBeDefined()
    })

    it('左右重量應不同', () => {
      for (let i = 0; i < 10; i++) {
        const round = generateRound(DIFFICULTY_CONFIGS.easy)
        expect(round.leftWeight).not.toBe(round.rightWeight)
      }
    })

    it('應有正確答案', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      expect(['left', 'right']).toContain(round.correctAnswer)
    })

    it('正確答案應對應較重的一邊', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      if (round.correctAnswer === 'left') {
        expect(round.leftWeight).toBeGreaterThan(round.rightWeight)
      } else {
        expect(round.rightWeight).toBeGreaterThan(round.leftWeight)
      }
    })
  })

  describe('validateAnswer', () => {
    it('選擇正確答案應返回 true', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      expect(validateAnswer(round.correctAnswer, round)).toBe(true)
    })

    it('選擇錯誤答案應返回 false', () => {
      const round = generateRound(DIFFICULTY_CONFIGS.easy)
      const wrongSide = round.correctAnswer === 'left' ? 'right' : 'left'
      expect(validateAnswer(wrongSide, round)).toBe(false)
    })
  })

  describe('calculateWeight', () => {
    it('應正確計算物品總重量', () => {
      const items = [
        { emoji: '🍎', weight: 1 },
        { emoji: '🍇', weight: 2 },
      ]
      expect(calculateWeight(items)).toBe(3)
    })

    it('空陣列應返回 0', () => {
      expect(calculateWeight([])).toBe(0)
    })
  })

  describe('calculateArmRotation', () => {
    it('相等重量且不顯示傾斜應返回 0', () => {
      expect(calculateArmRotation(5, 5, false)).toBe(0)
    })

    it('左重應傾斜正角度', () => {
      expect(calculateArmRotation(10, 5, true)).toBeGreaterThan(0)
    })

    it('右重應傾斜負角度', () => {
      expect(calculateArmRotation(5, 10, true)).toBeLessThan(0)
    })
  })

  describe('calculateScore', () => {
    it('應根據正確率計算分數', () => {
      const score = calculateScore(5, 10, 2000)
      expect(score).toBeGreaterThan(0)
    })

    it('完美表現應得高分', () => {
      const score = calculateScore(10, 10, 1000)
      expect(score).toBeGreaterThanOrEqual(80)
    })

    it('零正確應得低分', () => {
      const score = calculateScore(0, 10, 5000)
      expect(score).toBe(0)
    })
  })

  describe('calculateGrade', () => {
    it('90分以上應為S級', () => {
      expect(calculateGrade(95)).toBe('S')
    })

    it('80分應為A級', () => {
      expect(calculateGrade(85)).toBe('A')
    })

    it('50分應為D級', () => {
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整遊戲結果', () => {
      const result = summarizeResult(8, 10, [1000, 2000, 1500], DIFFICULTY_CONFIGS.easy)
      expect(result.correctCount).toBe(8)
      expect(result.totalRounds).toBe(10)
      expect(result.accuracy).toBe(0.8)
      expect(result.avgReactionTime).toBe(1500)
    })
  })

  describe('WEIGHT_ITEMS', () => {
    it('應有多種物品可用', () => {
      expect(WEIGHT_ITEMS.length).toBeGreaterThan(5)
    })

    it('每個物品應有有效的重量', () => {
      WEIGHT_ITEMS.forEach(item => {
        expect(item.weight).toBeGreaterThan(0)
        expect(item.emoji).toBeDefined()
      })
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少回合', () => {
      expect(DIFFICULTY_CONFIGS.easy.rounds).toBeLessThanOrEqual(
        DIFFICULTY_CONFIGS.hard.rounds
      )
    })

    it('困難難度應有更多物品上限', () => {
      expect(DIFFICULTY_CONFIGS.hard.maxItems).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.maxItems
      )
    })
  })
})

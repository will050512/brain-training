/**
 * 瞬間記憶遊戲邏輯單元測試
 */
import { describe, it, expect, vi } from 'vitest'
import {
  generateSequence,
  createRoundState,
  addUserInput,
  removeLastInput,
  isInputComplete,
  validateAnswer,
  calculateRoundScore,
  getNextLength,
  calculateMaxScore,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
} from '../instantMemory'

describe('瞬間記憶遊戲邏輯', () => {
  describe('generateSequence', () => {
    it('應產生指定長度的序列', () => {
      const sequence = generateSequence(5)
      expect(sequence.length).toBe(5)
    })

    it('序列應只包含 0-9 的數字', () => {
      const sequence = generateSequence(10)
      sequence.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(0)
        expect(num).toBeLessThanOrEqual(9)
      })
    })
  })

  describe('createRoundState', () => {
    it('應建立正確的初始狀態', () => {
      const state = createRoundState(4)
      expect(state.sequence.length).toBe(4)
      expect(state.userInput).toEqual([])
      expect(state.showingIndex).toBe(-1)
    })
  })

  describe('addUserInput', () => {
    it('應正確添加使用者輸入', () => {
      const state = createRoundState(3)
      const newState = addUserInput(state, 5)
      expect(newState.userInput).toEqual([5])
    })

    it('應能連續添加多個輸入', () => {
      let state = createRoundState(3)
      state = addUserInput(state, 1)
      state = addUserInput(state, 2)
      state = addUserInput(state, 3)
      expect(state.userInput).toEqual([1, 2, 3])
    })
  })

  describe('removeLastInput', () => {
    it('應刪除最後一個輸入', () => {
      let state = createRoundState(3)
      state = addUserInput(state, 1)
      state = addUserInput(state, 2)
      state = removeLastInput(state)
      expect(state.userInput).toEqual([1])
    })

    it('空輸入時不應出錯', () => {
      const state = createRoundState(3)
      const newState = removeLastInput(state)
      expect(newState.userInput).toEqual([])
    })
  })

  describe('isInputComplete', () => {
    it('輸入長度等於序列長度時應返回 true', () => {
      let state = createRoundState(2)
      state = addUserInput(state, 1)
      state = addUserInput(state, 2)
      expect(isInputComplete(state)).toBe(true)
    })

    it('輸入未完成時應返回 false', () => {
      let state = createRoundState(3)
      state = addUserInput(state, 1)
      expect(isInputComplete(state)).toBe(false)
    })
  })

  describe('validateAnswer', () => {
    it('正確答案應返回 true', () => {
      const state = createRoundState(3)
      state.sequence = [1, 2, 3]
      state.userInput = [1, 2, 3]
      expect(validateAnswer(state)).toBe(true)
    })

    it('錯誤答案應返回 false', () => {
      const state = createRoundState(3)
      state.sequence = [1, 2, 3]
      state.userInput = [1, 2, 4]
      expect(validateAnswer(state)).toBe(false)
    })

    it('部分答案應視為正確（如果匹配）', () => {
      const state = createRoundState(3)
      state.sequence = [1, 2, 3]
      state.userInput = [1, 2]
      expect(validateAnswer(state)).toBe(true)
    })
  })

  describe('calculateRoundScore', () => {
    it('正確答案應得分', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculateRoundScore(config, 4, true)
      expect(score).toBeGreaterThan(0)
    })

    it('錯誤答案應得 0 分', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculateRoundScore(config, 4, false)
      expect(score).toBe(0)
    })

    it('更長的序列應得更高分', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const shortScore = calculateRoundScore(config, config.startLength, true)
      const longScore = calculateRoundScore(config, config.maxLength, true)
      expect(longScore).toBeGreaterThan(shortScore)
    })
  })

  describe('getNextLength', () => {
    it('正確答案應增加長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(3, true, config)
      expect(nextLength).toBe(4)
    })

    it('錯誤答案應減少長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(5, false, config)
      expect(nextLength).toBe(4)
    })

    it('不應超過最大長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(config.maxLength, true, config)
      expect(nextLength).toBe(config.maxLength)
    })

    it('不應低於起始長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(config.startLength, false, config)
      expect(nextLength).toBe(config.startLength)
    })
  })

  describe('calculateMaxScore', () => {
    it('應計算正確的最大分數', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const maxScore = calculateMaxScore(config)
      expect(maxScore).toBeGreaterThan(0)
    })
  })

  describe('calculateGrade', () => {
    it('應根據百分比計算等級', () => {
      expect(calculateGrade(95, 100)).toBe('S')
      expect(calculateGrade(85, 100)).toBe('A')
      expect(calculateGrade(75, 100)).toBe('B')
      expect(calculateGrade(65, 100)).toBe('C')
      expect(calculateGrade(50, 100)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整結果', () => {
      vi.spyOn(Date, 'now').mockReturnValue(60000) // 60 秒後
      const config = DIFFICULTY_CONFIGS.easy
      const result = summarizeResult(100, 5, 3, 6, 0, config)

      expect(result.score).toBe(100)
      expect(result.correctCount).toBe(5)
      expect(result.wrongCount).toBe(3)
      expect(result.maxReached).toBe(6)
      expect(result.totalRounds).toBe(8)

      vi.restoreAllMocks()
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較長顯示時間', () => {
      expect(DIFFICULTY_CONFIGS.easy.showTime).toBeGreaterThan(
        DIFFICULTY_CONFIGS.hard.showTime
      )
    })

    it('困難難度應有更長序列', () => {
      expect(DIFFICULTY_CONFIGS.hard.maxLength).toBeGreaterThan(
        DIFFICULTY_CONFIGS.easy.maxLength
      )
    })

    it('困難難度應有更多回合', () => {
      expect(DIFFICULTY_CONFIGS.hard.rounds).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.rounds
      )
    })
  })
})

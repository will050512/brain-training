/**
 * 手勢記憶遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  getGesturePool,
  generateSequence,
  createRoundState,
  addUserInput,
  isInputComplete,
  validateAnswer,
  calculateRoundScore,
  getNextLength,
  calculateGrade,
  summarizeResult,
  GESTURES,
  DIFFICULTY_CONFIGS,
} from '../gestureMemory'

describe('手勢記憶遊戲邏輯', () => {
  describe('getGesturePool', () => {
    it('應返回指定數量的手勢', () => {
      const pool = getGesturePool(6)
      expect(pool.length).toBe(6)
    })

    it('不應超過可用手勢數量', () => {
      const pool = getGesturePool(100)
      expect(pool.length).toBe(GESTURES.length)
    })
  })

  describe('generateSequence', () => {
    it('應產生指定長度的序列', () => {
      const pool = getGesturePool(6)
      const sequence = generateSequence(4, pool)
      expect(sequence.length).toBe(4)
    })

    it('序列應只包含池中的手勢', () => {
      const pool = getGesturePool(4)
      const poolIds = pool.map(g => g.id)
      const sequence = generateSequence(10, pool)

      sequence.forEach(gesture => {
        expect(poolIds).toContain(gesture.id)
      })
    })
  })

  describe('createRoundState', () => {
    it('應建立正確的初始狀態', () => {
      const pool = getGesturePool(6)
      const state = createRoundState(3, pool)

      expect(state.sequence.length).toBe(3)
      expect(state.userInput).toEqual([])
      expect(state.currentShowIndex).toBe(-1)
    })
  })

  describe('addUserInput', () => {
    it('應正確添加使用者輸入', () => {
      const pool = getGesturePool(6)
      const state = createRoundState(3, pool)
      const gesture = pool[0]!
      const newState = addUserInput(state, gesture)

      expect(newState.userInput.length).toBe(1)
      expect(newState.userInput[0]?.id).toBe(gesture.id)
    })

    it('應能連續添加多個輸入', () => {
      const pool = getGesturePool(6)
      let state = createRoundState(3, pool)

      state = addUserInput(state, pool[0]!)
      state = addUserInput(state, pool[1]!)
      state = addUserInput(state, pool[2]!)

      expect(state.userInput.length).toBe(3)
    })
  })

  describe('isInputComplete', () => {
    it('輸入長度等於序列長度時應返回 true', () => {
      const pool = getGesturePool(6)
      let state = createRoundState(2, pool)

      state = addUserInput(state, pool[0]!)
      state = addUserInput(state, pool[1]!)

      expect(isInputComplete(state)).toBe(true)
    })

    it('輸入未完成時應返回 false', () => {
      const pool = getGesturePool(6)
      let state = createRoundState(3, pool)
      state = addUserInput(state, pool[0]!)

      expect(isInputComplete(state)).toBe(false)
    })
  })

  describe('validateAnswer', () => {
    it('正確答案應返回 true', () => {
      const pool = getGesturePool(6)
      const state = createRoundState(3, pool)

      // 模擬正確輸入
      state.userInput = [...state.sequence]

      expect(validateAnswer(state)).toBe(true)
    })

    it('錯誤答案應返回 false', () => {
      const pool = getGesturePool(6)
      const state = createRoundState(3, pool)

      // 模擬錯誤輸入
      state.userInput = [pool[5]!, pool[4]!, pool[3]!]

      // 除非剛好一樣，否則應該是錯的
      const isAllSame = state.userInput.every(
        (g, i) => g.id === state.sequence[i]?.id
      )
      if (!isAllSame) {
        expect(validateAnswer(state)).toBe(false)
      }
    })
  })

  describe('calculateRoundScore', () => {
    it('應根據序列長度計算分數', () => {
      const score = calculateRoundScore(3, 2, 1)
      expect(score).toBeGreaterThan(0)
    })

    it('更長的序列應得更高分', () => {
      const shortScore = calculateRoundScore(2, 2, 1)
      const longScore = calculateRoundScore(5, 2, 1)
      expect(longScore).toBeGreaterThan(shortScore)
    })

    it('連續正確應有獎勵', () => {
      const noStreakScore = calculateRoundScore(3, 2, 1)
      const streakScore = calculateRoundScore(3, 2, 5)
      expect(streakScore).toBeGreaterThan(noStreakScore)
    })
  })

  describe('getNextLength', () => {
    it('連續正確應增加長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(3, true, 3, config)
      expect(nextLength).toBe(4)
    })

    it('單次正確不應立即增加', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(3, true, 1, config)
      expect(nextLength).toBe(3)
    })

    it('錯誤應減少長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(4, false, 0, config)
      expect(nextLength).toBe(3)
    })

    it('不應超過最大長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(config.maxLength, true, 5, config)
      expect(nextLength).toBe(config.maxLength)
    })

    it('不應低於起始長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(config.startLength, false, 0, config)
      expect(nextLength).toBe(config.startLength)
    })
  })

  describe('calculateGrade', () => {
    it('應根據準確率計算等級', () => {
      expect(calculateGrade(95)).toBe('S')
      expect(calculateGrade(85)).toBe('A')
      expect(calculateGrade(75)).toBe('B')
      expect(calculateGrade(65)).toBe('C')
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整結果', () => {
      const result = summarizeResult(100, 8, 10, 5, 6, [1000, 2000])

      expect(result.score).toBe(100)
      expect(result.correctRounds).toBe(8)
      expect(result.totalRounds).toBe(10)
      expect(result.maxStreak).toBe(5)
      expect(result.maxLength).toBe(6)
      expect(result.accuracy).toBe(80)
      expect(result.avgResponseTime).toBe(1500)
    })

    it('空反應時間應返回0', () => {
      const result = summarizeResult(100, 8, 10, 5, 6, [])
      expect(result.avgResponseTime).toBe(0)
    })
  })

  describe('GESTURES', () => {
    it('應有多種手勢可用', () => {
      expect(GESTURES.length).toBeGreaterThanOrEqual(8)
    })

    it('每個手勢應有有效屬性', () => {
      GESTURES.forEach(gesture => {
        expect(gesture.id).toBeDefined()
        expect(gesture.name).toBeDefined()
        expect(gesture.icon).toBeDefined()
      })
    })

    it('手勢 ID 應唯一', () => {
      const ids = GESTURES.map(g => g.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(GESTURES.length)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較短序列', () => {
      expect(DIFFICULTY_CONFIGS.easy.startLength).toBeLessThanOrEqual(
        DIFFICULTY_CONFIGS.hard.startLength
      )
    })

    it('困難難度應有較長顯示時間較短', () => {
      expect(DIFFICULTY_CONFIGS.hard.showTime).toBeLessThan(
        DIFFICULTY_CONFIGS.easy.showTime
      )
    })

    it('困難難度應使用更多手勢', () => {
      expect(DIFFICULTY_CONFIGS.hard.gesturePool).toBeGreaterThan(
        DIFFICULTY_CONFIGS.easy.gesturePool
      )
    })
  })
})

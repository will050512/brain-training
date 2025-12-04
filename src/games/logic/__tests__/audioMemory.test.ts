/**
 * 聲音記憶遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  getSoundPool,
  generateSequence,
  createGameState,
  addUserInput,
  isInputComplete,
  validateAnswer,
  getNextLength,
  createNextRound,
  getCurrentPlayingSound,
  calculateRoundScore,
  calculateGrade,
  summarizeResult,
  SOUND_LIBRARY,
  DIFFICULTY_CONFIGS,
} from '../audioMemory'

describe('聲音記憶遊戲邏輯', () => {
  describe('getSoundPool', () => {
    it('應返回指定數量的聲音', () => {
      const pool = getSoundPool(6)
      expect(pool.length).toBe(6)
    })

    it('不應超過可用聲音數量', () => {
      const pool = getSoundPool(100)
      expect(pool.length).toBe(SOUND_LIBRARY.length)
    })
  })

  describe('generateSequence', () => {
    it('應產生指定長度的序列', () => {
      const pool = getSoundPool(6)
      const sequence = generateSequence(4, pool)
      expect(sequence.length).toBe(4)
    })

    it('序列應只包含池中的聲音', () => {
      const pool = getSoundPool(4)
      const poolIds = pool.map(s => s.id)
      const sequence = generateSequence(10, pool)

      sequence.forEach(sound => {
        expect(poolIds).toContain(sound.id)
      })
    })
  })

  describe('createGameState', () => {
    it('應建立正確的初始狀態', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)

      expect(state.sequence.length).toBe(config.startLength)
      expect(state.userInput).toEqual([])
      expect(state.currentRound).toBe(1)
      expect(state.currentLength).toBe(config.startLength)
      expect(state.isPlaying).toBe(false)
      expect(state.playingIndex).toBe(-1)
    })
  })

  describe('addUserInput', () => {
    it('應正確添加使用者輸入', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)
      const sound = getSoundPool(6)[0]!
      const newState = addUserInput(state, sound)

      expect(newState.userInput.length).toBe(1)
      expect(newState.userInput[0]?.id).toBe(sound.id)
    })
  })

  describe('isInputComplete', () => {
    it('輸入長度等於序列長度時應返回 true', () => {
      const config = DIFFICULTY_CONFIGS.easy
      let state = createGameState(config)
      const pool = getSoundPool(6)

      for (let i = 0; i < state.sequence.length; i++) {
        state = addUserInput(state, pool[0]!)
      }

      expect(isInputComplete(state)).toBe(true)
    })

    it('輸入未完成時應返回 false', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)

      expect(isInputComplete(state)).toBe(false)
    })
  })

  describe('validateAnswer', () => {
    it('正確答案應返回 true', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)

      // 模擬正確輸入
      state.userInput = [...state.sequence]

      expect(validateAnswer(state)).toBe(true)
    })

    it('錯誤答案應返回 false', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)
      const pool = getSoundPool(10)

      // 使用不同的聲音
      state.userInput = pool.slice(5, 5 + state.sequence.length)

      // 除非剛好相同
      const isAllSame = state.userInput.every(
        (s, i) => s.id === state.sequence[i]?.id
      )
      if (!isAllSame) {
        expect(validateAnswer(state)).toBe(false)
      }
    })
  })

  describe('getNextLength', () => {
    it('連續正確應增加長度', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nextLength = getNextLength(3, true, 3, config)
      expect(nextLength).toBe(4)
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

  describe('createNextRound', () => {
    it('應建立新回合狀態', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)
      const nextState = createNextRound(state, true, 2, config)

      expect(nextState.currentRound).toBe(2)
      expect(nextState.userInput).toEqual([])
      expect(nextState.isPlaying).toBe(false)
    })
  })

  describe('getCurrentPlayingSound', () => {
    it('正在播放時應返回當前聲音', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)
      state.isPlaying = true
      state.playingIndex = 0

      const sound = getCurrentPlayingSound(state)
      expect(sound).toEqual(state.sequence[0])
    })

    it('未播放時應返回 null', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)

      const sound = getCurrentPlayingSound(state)
      expect(sound).toBeNull()
    })
  })

  describe('calculateRoundScore', () => {
    it('正確應得分', () => {
      const score = calculateRoundScore(3, true, 1)
      expect(score).toBeGreaterThan(0)
    })

    it('錯誤應得 0 分', () => {
      const score = calculateRoundScore(3, false, 1)
      expect(score).toBe(0)
    })

    it('更長的序列應得更高分', () => {
      const shortScore = calculateRoundScore(2, true, 1)
      const longScore = calculateRoundScore(5, true, 1)
      expect(longScore).toBeGreaterThan(shortScore)
    })

    it('連續正確應有獎勵', () => {
      const noStreakScore = calculateRoundScore(3, true, 1)
      const streakScore = calculateRoundScore(3, true, 5)
      expect(streakScore).toBeGreaterThan(noStreakScore)
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
      const result = summarizeResult(100, 8, 10, 5, 6)

      expect(result.score).toBe(100)
      expect(result.correctRounds).toBe(8)
      expect(result.totalRounds).toBe(10)
      expect(result.maxStreak).toBe(5)
      expect(result.maxLength).toBe(6)
      expect(result.accuracy).toBe(80)
    })
  })

  describe('SOUND_LIBRARY', () => {
    it('應有多種聲音可用', () => {
      expect(SOUND_LIBRARY.length).toBeGreaterThanOrEqual(10)
    })

    it('每個聲音應有有效屬性', () => {
      SOUND_LIBRARY.forEach(sound => {
        expect(sound.id).toBeDefined()
        expect(sound.name).toBeDefined()
        expect(sound.category).toBeDefined()
        expect(sound.emoji).toBeDefined()
        expect(sound.audioPath).toBeDefined()
      })
    })

    it('聲音 ID 應唯一', () => {
      const ids = SOUND_LIBRARY.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(SOUND_LIBRARY.length)
    })

    it('應有多種分類', () => {
      const categories = new Set(SOUND_LIBRARY.map(s => s.category))
      expect(categories.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較短序列', () => {
      expect(DIFFICULTY_CONFIGS.easy.startLength).toBeLessThanOrEqual(
        DIFFICULTY_CONFIGS.hard.startLength
      )
    })

    it('困難難度應有較短間隔', () => {
      expect(DIFFICULTY_CONFIGS.hard.interval).toBeLessThan(
        DIFFICULTY_CONFIGS.easy.interval
      )
    })

    it('困難難度應使用更多聲音', () => {
      expect(DIFFICULTY_CONFIGS.hard.soundPoolSize).toBeGreaterThan(
        DIFFICULTY_CONFIGS.easy.soundPoolSize
      )
    })
  })
})

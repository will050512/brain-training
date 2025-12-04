/**
 * 猜拳遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  getRandomGesture,
  getResult,
  getWinningGesture,
  createRound,
  processChoice,
  processTimeout,
  calculateRoundScore,
  calculateMaxScore,
  calculateGrade,
  countResults,
  summarizeResult,
  getResultText,
  getResultColor,
  GESTURES,
  GESTURE_LIST,
  DIFFICULTY_CONFIGS,
} from '../rockPaperScissors'
import type { Gesture, RoundData } from '../rockPaperScissors'

describe('猜拳遊戲邏輯', () => {
  describe('getRandomGesture', () => {
    it('應返回有效的手勢', () => {
      const gesture = getRandomGesture()
      expect(GESTURE_LIST).toContain(gesture)
    })

    it('多次呼叫應產生不同結果（機率性）', () => {
      const results = new Set<Gesture>()
      for (let i = 0; i < 100; i++) {
        results.add(getRandomGesture())
      }
      // 100 次應該至少產生 2 種不同的結果
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('getResult', () => {
    it('石頭贏剪刀', () => {
      expect(getResult('rock', 'scissors', false)).toBe('win')
    })

    it('剪刀贏布', () => {
      expect(getResult('scissors', 'paper', false)).toBe('win')
    })

    it('布贏石頭', () => {
      expect(getResult('paper', 'rock', false)).toBe('win')
    })

    it('相同手勢平手', () => {
      expect(getResult('rock', 'rock', false)).toBe('tie')
      expect(getResult('paper', 'paper', false)).toBe('tie')
      expect(getResult('scissors', 'scissors', false)).toBe('tie')
    })

    it('反向模式結果相反', () => {
      // 正常模式石頭贏剪刀
      expect(getResult('rock', 'scissors', false)).toBe('win')
      // 反向模式石頭輸剪刀（因為要故意輸）
      expect(getResult('rock', 'scissors', true)).toBe('lose')
    })
  })

  describe('getWinningGesture', () => {
    it('正常模式：石頭需要布來贏', () => {
      expect(getWinningGesture('rock', false)).toBe('paper')
    })

    it('正常模式：布需要剪刀來贏', () => {
      expect(getWinningGesture('paper', false)).toBe('scissors')
    })

    it('正常模式：剪刀需要石頭來贏', () => {
      expect(getWinningGesture('scissors', false)).toBe('rock')
    })

    it('反向模式：需要輸的手勢', () => {
      expect(getWinningGesture('rock', true)).toBe('scissors')
    })
  })

  describe('createRound', () => {
    it('應建立有效的回合', () => {
      const round = createRound(0)
      expect(round.computerGesture).toBeDefined()
      expect(GESTURE_LIST).toContain(round.computerGesture)
    })

    it('反向機率 0 應不產生反向', () => {
      for (let i = 0; i < 10; i++) {
        const round = createRound(0)
        expect(round.isReverse).toBe(false)
      }
    })

    it('反向機率 1 應總是反向', () => {
      for (let i = 0; i < 10; i++) {
        const round = createRound(1)
        expect(round.isReverse).toBe(true)
      }
    })
  })

  describe('processChoice', () => {
    it('應處理玩家選擇', () => {
      const round = createRound(0)
      const result = processChoice(round, 'rock', 500)
      expect(result.playerGesture).toBe('rock')
      expect(result.responseTime).toBe(500)
      expect(result.result).toBeDefined()
    })
  })

  describe('processTimeout', () => {
    it('應處理超時', () => {
      const round = createRound(0)
      const result = processTimeout(round, 5000)
      expect(result.playerGesture).toBeNull()
      expect(result.result).toBe('timeout')
      expect(result.responseTime).toBe(5000)
    })
  })

  describe('calculateRoundScore', () => {
    it('贏得回合應得基礎分數加時間獎勵', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculateRoundScore(config, 'win', 500)
      expect(score).toBeGreaterThan(config.points)
    })

    it('平手應得部分分數', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculateRoundScore(config, 'tie', 500)
      expect(score).toBe(Math.floor(config.points / 2))
    })

    it('輸掉應得 0 分', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculateRoundScore(config, 'lose', 500)
      expect(score).toBe(0)
    })
  })

  describe('calculateMaxScore', () => {
    it('應計算最大可能分數', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const max = calculateMaxScore(config)
      expect(max).toBe(config.rounds * (config.points + 15))
    })
  })

  describe('calculateGrade', () => {
    it('90%勝率應為S級', () => {
      expect(calculateGrade(9, 10)).toBe('S')
    })

    it('80%勝率應為A級', () => {
      expect(calculateGrade(8, 10)).toBe('A')
    })

    it('70%勝率應為B級', () => {
      expect(calculateGrade(7, 10)).toBe('B')
    })

    it('60%勝率應為C級', () => {
      expect(calculateGrade(6, 10)).toBe('C')
    })

    it('50%勝率應為D級', () => {
      expect(calculateGrade(5, 10)).toBe('D')
    })
  })

  describe('countResults', () => {
    it('應正確統計結果', () => {
      const rounds: RoundData[] = [
        { computerGesture: 'rock', playerGesture: 'paper', isReverse: false, result: 'win', responseTime: 500 },
        { computerGesture: 'rock', playerGesture: 'scissors', isReverse: false, result: 'lose', responseTime: 500 },
        { computerGesture: 'rock', playerGesture: 'rock', isReverse: false, result: 'tie', responseTime: 500 },
        { computerGesture: 'rock', playerGesture: null, isReverse: true, result: 'timeout', responseTime: 5000 },
      ]
      const counts = countResults(rounds)
      expect(counts.wins).toBe(1)
      expect(counts.losses).toBe(1)
      expect(counts.ties).toBe(1)
      expect(counts.timeouts).toBe(1)
      expect(counts.reverseRounds).toBe(1)
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整遊戲結果', () => {
      const rounds: RoundData[] = [
        { computerGesture: 'rock', playerGesture: 'paper', isReverse: false, result: 'win', responseTime: 500 },
        { computerGesture: 'rock', playerGesture: 'paper', isReverse: false, result: 'win', responseTime: 600 },
      ]
      const result = summarizeResult(150, rounds, DIFFICULTY_CONFIGS.easy)
      expect(result.score).toBe(150)
      expect(result.wins).toBe(2)
      expect(result.avgResponseTime).toBe(550)
    })
  })

  describe('getResultText', () => {
    it('應返回正確的結果文字', () => {
      expect(getResultText('win', false)).toBe('你贏了！')
      expect(getResultText('lose', false)).toBe('你輸了！')
      expect(getResultText('tie', false)).toBe('平手！')
      expect(getResultText('timeout', false)).toBe('時間到！')
    })

    it('反向模式應有不同文字', () => {
      expect(getResultText('win', true)).toContain('成功輸了')
    })
  })

  describe('getResultColor', () => {
    it('應返回正確的顏色', () => {
      expect(getResultColor('win')).toBe('#22c55e')
      expect(getResultColor('lose')).toBe('#ef4444')
      expect(getResultColor('tie')).toBe('#f59e0b')
    })
  })

  describe('GESTURES', () => {
    it('應有三種手勢', () => {
      expect(Object.keys(GESTURES).length).toBe(3)
    })

    it('應包含石頭、布、剪刀', () => {
      expect(GESTURES.rock).toBeDefined()
      expect(GESTURES.paper).toBeDefined()
      expect(GESTURES.scissors).toBeDefined()
    })

    it('每個手勢應有 beats 屬性', () => {
      expect(GESTURES.rock.beats).toBe('scissors')
      expect(GESTURES.paper.beats).toBe('rock')
      expect(GESTURES.scissors.beats).toBe('paper')
    })
  })

  describe('難度配置', () => {
    it('所有難度應有有效配置', () => {
      expect(DIFFICULTY_CONFIGS.easy).toBeDefined()
      expect(DIFFICULTY_CONFIGS.medium).toBeDefined()
      expect(DIFFICULTY_CONFIGS.hard).toBeDefined()
    })

    it('簡單難度應有較長思考時間', () => {
      expect(DIFFICULTY_CONFIGS.easy.timePerRound).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.hard.timePerRound
      )
    })

    it('困難難度應有更多回合', () => {
      expect(DIFFICULTY_CONFIGS.hard.rounds).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.rounds
      )
    })

    it('困難難度應有較高反向機率', () => {
      expect(DIFFICULTY_CONFIGS.hard.reverseChance).toBeGreaterThan(0)
    })
  })
})

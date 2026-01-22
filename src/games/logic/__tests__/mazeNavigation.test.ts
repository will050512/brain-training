/**
 * 皇家花園迷宮遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateMaze,
  canMove,
  move,
  hasReachedEnd,
  indexToPosition,
  positionToIndex,
  getTargetPosition,
  getCellType,
  calculateScore,
  calculateGrade,
  calculateEfficiency,
  estimateOptimalMoves,
  summarizeResult,
  DIFFICULTY_CONFIGS,
} from '../mazeNavigation'

describe('皇家花園迷宮遊戲邏輯', () => {
  describe('generateMaze', () => {
    it('應產生有效的迷宮狀態', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      expect(state.cells).toBeDefined()
      expect(state.cells.length).toBe(config.size * config.size)
      expect(state.size).toBe(config.size)
    })

    it('應有有效的起點位置', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      expect(state.startPosition).toBeDefined()
      expect(state.playerPosition).toBe(state.startPosition)
    })

    it('應有有效的終點位置', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      expect(state.endPosition).toBeDefined()
      const endCell = state.cells[state.endPosition]
      expect(endCell).toBe('end')
    })

    it('起點和終點應不同', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      expect(state.startPosition).not.toBe(state.endPosition)
    })
  })

  describe('indexToPosition / positionToIndex', () => {
    it('索引轉位置應正確', () => {
      const pos = indexToPosition(10, 5)
      expect(pos.row).toBe(2)
      expect(pos.col).toBe(0)
    })

    it('位置轉索引應正確', () => {
      const index = positionToIndex(2, 3, 7)
      expect(index).toBe(17)
    })

    it('轉換應可逆', () => {
      const size = 7
      const original = 15
      const pos = indexToPosition(original, size)
      const back = positionToIndex(pos.row, pos.col, size)
      expect(back).toBe(original)
    })
  })

  describe('getTargetPosition', () => {
    it('向上移動應減少行數', () => {
      const target = getTargetPosition(10, 'up', 5)
      expect(target).toBe(5)
    })

    it('向下移動應增加行數', () => {
      const target = getTargetPosition(10, 'down', 5)
      expect(target).toBe(15)
    })

    it('向左移動應減少列數', () => {
      const target = getTargetPosition(11, 'left', 5)
      expect(target).toBe(10)
    })

    it('向右移動應增加列數', () => {
      const target = getTargetPosition(10, 'right', 5)
      expect(target).toBe(11)
    })

    it('越界應返回 null', () => {
      expect(getTargetPosition(0, 'up', 5)).toBeNull()
      expect(getTargetPosition(0, 'left', 5)).toBeNull()
    })
  })

  describe('canMove', () => {
    it('應能移動到非牆壁格子', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      // 找一個可以移動的方向
      const directions = ['up', 'down', 'left', 'right'] as const
      const hasValidMove = directions.some(dir => canMove(state, dir))
      expect(hasValidMove).toBe(true)
    })
  })

  describe('move', () => {
    it('有效移動應更新玩家位置', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      const initialPos = state.playerPosition

      // 找到一個可移動的方向
      const directions = ['up', 'down', 'left', 'right'] as const
      for (const dir of directions) {
        if (canMove(state, dir)) {
          const newState = move(state, dir)
          expect(newState).not.toBeNull()
          expect(newState!.playerPosition).not.toBe(initialPos)
          break
        }
      }
    })

    it('無效移動應返回 null', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      // 找一個不能移動的方向
      const directions = ['up', 'down', 'left', 'right'] as const
      for (const dir of directions) {
        if (!canMove(state, dir)) {
          const newState = move(state, dir)
          expect(newState).toBeNull()
          break
        }
      }
    })
  })

  describe('hasReachedEnd', () => {
    it('玩家在終點時應返回 true', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      // 將玩家位置設為終點
      const modifiedState = { ...state, playerPosition: state.endPosition }
      expect(hasReachedEnd(modifiedState)).toBe(true)
    })

    it('玩家不在終點時應返回 false', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      expect(hasReachedEnd(state)).toBe(false)
    })
  })

  describe('getCellType', () => {
    it('應返回正確的格子類型', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = generateMaze(config)
      const startType = getCellType(state, state.startPosition)
      expect(startType).toBe('start')
      const endType = getCellType(state, state.endPosition)
      expect(endType).toBe('end')
    })
  })

  describe('calculateEfficiency', () => {
    it('最佳步數應得 100% 效率', () => {
      expect(calculateEfficiency(10, 10)).toBe(1)
    })

    it('步數越多效率越低', () => {
      const good = calculateEfficiency(12, 10)
      const bad = calculateEfficiency(20, 10)
      expect(good).toBeGreaterThan(bad)
    })
  })

  describe('estimateOptimalMoves', () => {
    it('應返回合理的最佳步數估算', () => {
      const optimal = estimateOptimalMoves(7)
      expect(optimal).toBe(10) // (7-2)*2
    })
  })

  describe('calculateScore', () => {
    it('高效率且快速完成應得高分', () => {
      const score = calculateScore(10, 30, 7)
      expect(score).toBeGreaterThan(60)
    })

    it('步數太多應降低分數', () => {
      const goodScore = calculateScore(10, 30, 7)
      const badScore = calculateScore(50, 60, 7)
      expect(goodScore).toBeGreaterThan(badScore)
    })
  })

  describe('calculateGrade', () => {
    it('高分應獲得好等級', () => {
      expect(calculateGrade(95)).toBe('S')
      expect(calculateGrade(85)).toBe('A')
    })

    it('低分應獲得較差等級', () => {
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整結果', () => {
      const result = summarizeResult(15, 45, 7)
      expect(result.moves).toBe(15)
      expect(result.timeSpent).toBe(45)
      expect(result.optimalMoves).toBe(10)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較小迷宮', () => {
      expect(DIFFICULTY_CONFIGS.easy.size).toBeLessThan(DIFFICULTY_CONFIGS.hard.size)
    })

    it('困難難度應有較大迷宮', () => {
      expect(DIFFICULTY_CONFIGS.hard.size).toBeGreaterThan(DIFFICULTY_CONFIGS.medium.size)
    })
  })
})

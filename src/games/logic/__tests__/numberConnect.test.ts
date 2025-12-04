/**
 * 數字連連看遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  numberToChinese,
  getDisplayText,
  getDistance,
  generateNodes,
  createGameState,
  tryConnect,
  isCompleted,
  getHintPosition,
  calculateScore,
  calculateGrade,
  summarizeResult,
  CHINESE_NUMBERS,
  DIFFICULTY_CONFIGS,
} from '../numberConnect'

describe('數字連連看遊戲邏輯', () => {
  describe('numberToChinese', () => {
    it('應正確轉換阿拉伯數字為中文', () => {
      expect(numberToChinese(1)).toBe('一')
      expect(numberToChinese(5)).toBe('五')
      expect(numberToChinese(10)).toBe('十')
      expect(numberToChinese(15)).toBe('十五')
    })

    it('超出範圍應返回字串形式', () => {
      expect(numberToChinese(100)).toBe('100')
    })
  })

  describe('getDisplayText', () => {
    it('arabic 格式應返回阿拉伯數字', () => {
      expect(getDisplayText(5, 'arabic')).toBe('5')
    })

    it('chinese 格式應返回中文數字', () => {
      expect(getDisplayText(5, 'chinese')).toBe('五')
    })

    it('mixed 格式應返回其中一種', () => {
      const result = getDisplayText(5, 'mixed')
      expect(['5', '五']).toContain(result)
    })
  })

  describe('getDistance', () => {
    it('應正確計算兩點距離', () => {
      const distance = getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })
      expect(distance).toBe(5)
    })

    it('相同點距離為 0', () => {
      const distance = getDistance({ x: 5, y: 5 }, { x: 5, y: 5 })
      expect(distance).toBe(0)
    })
  })

  describe('generateNodes', () => {
    it('應產生指定數量的節點', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nodes = generateNodes(config)
      expect(nodes.length).toBeLessThanOrEqual(config.count)
    })

    it('節點數值應連續', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nodes = generateNodes(config)
      const values = nodes.map(n => n.value).sort((a, b) => a - b)

      for (let i = 0; i < values.length; i++) {
        expect(values[i]).toBe(i + 1)
      }
    })

    it('所有節點初始應未連接', () => {
      const nodes = generateNodes(DIFFICULTY_CONFIGS.easy)
      nodes.forEach(node => {
        expect(node.connected).toBe(false)
      })
    })

    it('節點之間應有最小間距', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const nodes = generateNodes(config)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const distance = getDistance(nodes[i]!.position, nodes[j]!.position)
          expect(distance).toBeGreaterThanOrEqual(config.minDistance * 0.8) // 允許一點誤差
        }
      }
    })
  })

  describe('createGameState', () => {
    it('應建立正確的初始狀態', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)

      expect(state.currentTarget).toBe(1)
      expect(state.connectedPath).toEqual([])
      expect(state.errors).toBe(0)
      expect(state.nodes.length).toBeGreaterThan(0)
    })
  })

  describe('tryConnect', () => {
    it('連接正確數字應成功', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      const result = tryConnect(state, 1)

      expect(result.success).toBe(true)
      expect(result.newState.currentTarget).toBe(2)
    })

    it('連接錯誤數字應失敗並增加錯誤', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      const result = tryConnect(state, 5)

      expect(result.success).toBe(false)
      expect(result.newState.errors).toBe(1)
    })

    it('成功連接應更新路徑', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      const result = tryConnect(state, 1)

      expect(result.newState.connectedPath.length).toBe(1)
    })

    it('成功連接應標記節點為已連接', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      const result = tryConnect(state, 1)

      const connectedNode = result.newState.nodes.find(n => n.value === 1)
      expect(connectedNode?.connected).toBe(true)
    })
  })

  describe('isCompleted', () => {
    it('所有節點連接後應返回 true', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      state.nodes = state.nodes.map(n => ({ ...n, connected: true }))

      expect(isCompleted(state)).toBe(true)
    })

    it('有未連接節點應返回 false', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      expect(isCompleted(state)).toBe(false)
    })
  })

  describe('getHintPosition', () => {
    it('應返回當前目標的位置', () => {
      const state = createGameState(DIFFICULTY_CONFIGS.easy)
      const hint = getHintPosition(state)

      const targetNode = state.nodes.find(n => n.value === 1)
      expect(hint).toEqual(targetNode?.position)
    })
  })

  describe('calculateScore', () => {
    it('完成且少錯誤應得高分', () => {
      const score = calculateScore(10, 10, 0, 30, 60)
      expect(score).toBeGreaterThan(80)
    })

    it('未完成應得較低分', () => {
      const completeScore = calculateScore(10, 10, 0, 30, 60)
      const incompleteScore = calculateScore(5, 10, 0, 30, 60)
      expect(completeScore).toBeGreaterThan(incompleteScore)
    })

    it('錯誤越多分數越低', () => {
      const goodScore = calculateScore(10, 10, 0, 30, 60)
      const badScore = calculateScore(10, 10, 10, 30, 60)
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
      const config = DIFFICULTY_CONFIGS.easy
      const state = createGameState(config)
      state.nodes = state.nodes.map(n => ({ ...n, connected: true }))

      const result = summarizeResult(state, 45, config)

      expect(result.completed).toBe(true)
      expect(result.completionTime).toBe(45)
      expect(result.totalCount).toBe(config.count)
    })
  })

  describe('CHINESE_NUMBERS', () => {
    it('應有足夠的中文數字', () => {
      expect(CHINESE_NUMBERS.length).toBeGreaterThanOrEqual(20)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少數字', () => {
      expect(DIFFICULTY_CONFIGS.easy.count).toBeLessThan(
        DIFFICULTY_CONFIGS.hard.count
      )
    })

    it('困難難度應有較大畫布', () => {
      expect(DIFFICULTY_CONFIGS.hard.canvasWidth).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.canvasWidth
      )
    })

    it('困難難度可能使用混合格式', () => {
      expect(DIFFICULTY_CONFIGS.hard.format).toBe('mixed')
    })
  })
})

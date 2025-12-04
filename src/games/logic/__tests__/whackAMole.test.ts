/**
 * 打地鼠遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  createInitialHoles,
  findInactiveHoles,
  determineSpawnType,
  spawnAtHole,
  hideHole,
  calculateHitScore,
  processHoleClick,
  clearHoleAfterHit,
  calculateFinalScore,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
} from '../whackAMole'

describe('打地鼠遊戲邏輯', () => {
  describe('createInitialHoles', () => {
    it('應產生指定數量的洞', () => {
      const holes = createInitialHoles(6)
      expect(holes).toHaveLength(6)
    })

    it('所有洞初始應該沒有地鼠', () => {
      const holes = createInitialHoles(9)
      holes.forEach(hole => {
        expect(hole.active).toBe(false)
        expect(hole.type).toBeNull()
        expect(hole.hit).toBe(false)
      })
    })
  })

  describe('findInactiveHoles', () => {
    it('應找到所有未激活的洞穴', () => {
      const holes = createInitialHoles(4)
      const inactive = findInactiveHoles(holes)
      expect(inactive).toHaveLength(4)
    })

    it('應排除已激活的洞穴', () => {
      const holes = createInitialHoles(4)
      const spawned = spawnAtHole(holes, 1, 'mole')
      const inactive = findInactiveHoles(spawned)
      expect(inactive).toHaveLength(3)
      expect(inactive).not.toContain(1)
    })
  })

  describe('determineSpawnType', () => {
    it('炸彈機率 0 應只產生地鼠', () => {
      for (let i = 0; i < 10; i++) {
        expect(determineSpawnType(0)).toBe('mole')
      }
    })

    it('炸彈機率 1 應只產生炸彈', () => {
      for (let i = 0; i < 10; i++) {
        expect(determineSpawnType(1)).toBe('bomb')
      }
    })
  })

  describe('spawnAtHole', () => {
    it('應在指定位置生成地鼠', () => {
      const holes = createInitialHoles(6)
      const updated = spawnAtHole(holes, 0, 'mole')
      expect(updated[0]?.active).toBe(true)
      expect(updated[0]?.type).toBe('mole')
    })

    it('其他洞不應受影響', () => {
      const holes = createInitialHoles(6)
      const updated = spawnAtHole(holes, 0, 'mole')
      for (let i = 1; i < 6; i++) {
        expect(updated[i]?.active).toBe(false)
      }
    })
  })

  describe('hideHole', () => {
    it('應隱藏指定洞穴的內容', () => {
      const holes = createInitialHoles(4)
      const spawned = spawnAtHole(holes, 0, 'mole')
      const hidden = hideHole(spawned, 0)
      expect(hidden[0].active).toBe(false)
      expect(hidden[0].type).toBeNull()
    })
  })

  describe('calculateHitScore', () => {
    it('基礎分數應正確計算', () => {
      expect(calculateHitScore(10, 0)).toBe(10)
    })

    it('連擊獎勵應正確累加', () => {
      expect(calculateHitScore(10, 3)).toBe(16) // 10 + 3*2
    })
  })

  describe('processHoleClick', () => {
    it('打中地鼠應返回成功並增加連擊', () => {
      let holes = createInitialHoles(6)
      holes = spawnAtHole(holes, 2, 'mole')
      const result = processHoleClick(holes, 2, DIFFICULTY_CONFIGS.easy, 0)
      expect(result.isMoleHit).toBe(true)
      expect(result.newCombo).toBe(1)
      expect(result.scoreChange).toBeGreaterThan(0)
    })

    it('打中炸彈應返回失敗並重置連擊', () => {
      let holes = createInitialHoles(6)
      holes = spawnAtHole(holes, 2, 'bomb')
      const result = processHoleClick(holes, 2, DIFFICULTY_CONFIGS.easy, 5)
      expect(result.isBombHit).toBe(true)
      expect(result.newCombo).toBe(0)
      expect(result.scoreChange).toBeLessThan(0)
    })

    it('打空洞應無效果', () => {
      const holes = createInitialHoles(6)
      const result = processHoleClick(holes, 0, DIFFICULTY_CONFIGS.easy, 3)
      expect(result.isMoleHit).toBe(false)
      expect(result.isBombHit).toBe(false)
      expect(result.scoreChange).toBe(0)
    })
  })

  describe('clearHoleAfterHit', () => {
    it('應清除洞穴狀態', () => {
      let holes = createInitialHoles(4)
      holes = spawnAtHole(holes, 0, 'mole')
      const cleared = clearHoleAfterHit(holes, 0)
      expect(cleared[0].active).toBe(false)
      expect(cleared[0].showScore).toBe(false)
    })
  })

  describe('calculateFinalScore', () => {
    it('應根據命中率計算分數', () => {
      const score = calculateFinalScore(5, 10, 0, 400)
      expect(score).toBeGreaterThan(0)
    })

    it('完美命中應得到高分', () => {
      const score = calculateFinalScore(10, 10, 0, 300)
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('零命中應返回低分', () => {
      const score = calculateFinalScore(0, 10, 0, 0)
      expect(score).toBe(0)
    })
  })

  describe('calculateGrade', () => {
    it('90分以上應為S級', () => {
      expect(calculateGrade(95)).toBe('S')
    })

    it('80-89分應為A級', () => {
      expect(calculateGrade(85)).toBe('A')
    })

    it('60分以下應為D級', () => {
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整遊戲結果', () => {
      const result = summarizeResult(8, 10, 1, [300, 400, 350], 5, 30)
      expect(result.hitMoles).toBe(8)
      expect(result.totalMoles).toBe(10)
      expect(result.hitBombs).toBe(1)
      expect(result.accuracy).toBe(0.8)
      expect(result.maxCombo).toBe(5)
      expect(result.avgReactionTime).toBe(350)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少洞和較長間隔', () => {
      const easy = DIFFICULTY_CONFIGS.easy
      expect(easy.holes).toBeLessThanOrEqual(DIFFICULTY_CONFIGS.medium.holes)
      expect(easy.interval).toBeGreaterThanOrEqual(DIFFICULTY_CONFIGS.medium.interval)
    })

    it('困難難度應有較多洞和較短間隔', () => {
      const hard = DIFFICULTY_CONFIGS.hard
      expect(hard.holes).toBeGreaterThanOrEqual(DIFFICULTY_CONFIGS.medium.holes)
      expect(hard.interval).toBeLessThanOrEqual(DIFFICULTY_CONFIGS.medium.interval)
    })
  })
})

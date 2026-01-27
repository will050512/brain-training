/**
 * 打地鼠遊戲邏輯模組
 * 訓練：反應速度、注意力、手眼協調
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export type HoleContent = 'mole' | 'bomb' | null

export interface Hole {
  /** 是否激活 */
  active: boolean
  /** 內容類型 */
  type: HoleContent
  /** 是否已被擊中 */
  hit: boolean
  /** 是否顯示得分 */
  showScore: boolean
  /** 得分文字 */
  scoreText: string
  /** 得分樣式類別 */
  scoreClass: string
}

export interface WhackAMoleConfig {
  /** 地鼠出現間隔（毫秒） */
  interval: number
  /** 地鼠顯示時間（毫秒） */
  duration: number
  /** 洞的數量 */
  holes: number
  /** 炸彈出現機率 */
  bombChance: number
  /** 遊戲時間（秒） */
  gameTime: number
  /** 基礎分數 */
  baseScore: number
  /** 炸彈扣分 */
  bombPenalty: number
}

export interface WhackAMoleResult {
  /** 最終分數 (0-100) */
  score: number
  /** 打中的地鼠數 */
  hitMoles: number
  /** 漏掉的地鼠數 */
  missedMoles: number
  /** 總共出現的地鼠數 */
  totalMoles: number
  /** 打中的炸彈數 */
  hitBombs: number
  /** 準確率 */
  accuracy: number
  /** 平均反應時間（毫秒） */
  avgReactionTime: number
  /** 最高連擊 */
  maxCombo: number
  /** 遊戲時長（秒） */
  duration: number
  /** 兼容統計：正確數 */
  correctCount: number
  /** 兼容統計：錯誤數（誤打炸彈） */
  wrongCount: number
  /** 兼容統計：總數 */
  totalCount: number
}

// ==================== 難度配置 ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, WhackAMoleConfig> = {
  easy: {
    interval: 2400,
    duration: 1800,
    holes: 3,
    bombChance: 0.1,
    gameTime: 40,
    baseScore: 10,
    bombPenalty: 20,
  },
  medium: {
    interval: 1900,
    duration: 1400,
    holes: 6,
    bombChance: 0.15,
    gameTime: 50,
    baseScore: 10,
    bombPenalty: 20,
  },
  hard: {
    interval: 1500,
    duration: 1100,
    holes: 9,
    bombChance: 0.2,
    gameTime: 60,
    baseScore: 10,
    bombPenalty: 20,
  },
}

// ==================== 工具函數 ====================

/**
 * 建立初始洞穴狀態
 */
export function createInitialHoles(count: number): Hole[] {
  return Array(count).fill(null).map(() => ({
    active: false,
    type: null,
    hit: false,
    showScore: false,
    scoreText: '',
    scoreClass: '',
  }))
}

/**
 * 尋找可用的洞穴索引
 */
export function findInactiveHoles(holes: Hole[]): number[] {
  return holes
    .map((h, i) => (!h.active ? i : -1))
    .filter(i => i !== -1)
}

/**
 * 決定產生地鼠或炸彈
 */
export function determineSpawnType(bombChance: number): HoleContent {
  return Math.random() < bombChance ? 'bomb' : 'mole'
}

/**
 * 產生地鼠/炸彈到指定洞穴
 */
export function spawnAtHole(
  holes: Hole[],
  holeIndex: number,
  type: HoleContent
): Hole[] {
  return holes.map((hole, index) => {
    if (index === holeIndex) {
      return {
        ...hole,
        active: true,
        type,
        hit: false,
        showScore: false,
      }
    }
    return hole
  })
}

/**
 * 隱藏指定洞穴的內容
 */
export function hideHole(holes: Hole[], holeIndex: number): Hole[] {
  return holes.map((hole, index) => {
    if (index === holeIndex) {
      return {
        ...hole,
        active: false,
        type: null,
      }
    }
    return hole
  })
}

/**
 * 計算擊中得分
 */
export function calculateHitScore(baseScore: number, combo: number): number {
  const comboBonus = Math.min(combo, 5) * 2
  return baseScore + comboBonus
}

/**
 * 處理洞穴點擊
 */
export function processHoleClick(
  holes: Hole[],
  holeIndex: number,
  config: WhackAMoleConfig,
  currentCombo: number
): {
  holes: Hole[]
  scoreChange: number
  newCombo: number
  isMoleHit: boolean
  isBombHit: boolean
} {
  const hole = holes[holeIndex]
  
  if (!hole || !hole.active || hole.hit) {
    return {
      holes,
      scoreChange: 0,
      newCombo: currentCombo,
      isMoleHit: false,
      isBombHit: false,
    }
  }

  const isMole = hole.type === 'mole'
  const isBomb = hole.type === 'bomb'
  
  let scoreChange = 0
  let newCombo = currentCombo
  let scoreText = ''
  let scoreClass = ''

  if (isMole) {
    newCombo = currentCombo + 1
    scoreChange = calculateHitScore(config.baseScore, newCombo)
    scoreText = `+${scoreChange}`
    scoreClass = 'text-green-500'
  } else if (isBomb) {
    newCombo = 0
    scoreChange = -config.bombPenalty
    scoreText = `${scoreChange}`
    scoreClass = 'text-red-500'
  }

  const updatedHoles = holes.map((h, index) => {
    if (index === holeIndex) {
      return {
        ...h,
        hit: true,
        showScore: true,
        scoreText,
        scoreClass,
      }
    }
    return h
  })

  return {
    holes: updatedHoles,
    scoreChange,
    newCombo,
    isMoleHit: isMole,
    isBombHit: isBomb,
  }
}

/**
 * 清除得分顯示並隱藏洞穴
 */
export function clearHoleAfterHit(holes: Hole[], holeIndex: number): Hole[] {
  return holes.map((hole, index) => {
    if (index === holeIndex) {
      return {
        ...hole,
        active: false,
        showScore: false,
        type: null,
      }
    }
    return hole
  })
}

// ==================== 評分函數 ====================

/**
 * 計算最終分數 (0-100)
 */
export function calculateFinalScore(
  hitMoles: number,
  totalMoles: number,
  hitBombs: number,
  avgReactionTime: number
): number {
  if (totalMoles === 0) return 0

  // 正確率 60%
  const accuracy = hitMoles / totalMoles
  const accuracyScore = accuracy * 60

  // 反應時間 30%（450ms 為最佳基準，較友善）
  const reactionScore = avgReactionTime > 0
    ? Math.max(0, 30 - (avgReactionTime - 450) / 70)
    : 0

  // 連擊獎勵 10%
  const comboScore = Math.min(10, hitMoles / 2)

  return Math.round(Math.min(100, accuracyScore + reactionScore + comboScore))
}

/**
 * 計算等級
 */
export function calculateGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  hitMoles: number,
  totalMoles: number,
  hitBombs: number,
  reactionTimes: number[],
  maxCombo: number,
  gameTime: number
): WhackAMoleResult {
  const accuracy = totalMoles > 0 ? hitMoles / totalMoles : 0
  const missedMoles = Math.max(0, totalMoles - hitMoles)
  const avgReactionTime = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0

  const score = calculateFinalScore(hitMoles, totalMoles, hitBombs, avgReactionTime)

  return {
    score,
    hitMoles,
    missedMoles,
    totalMoles,
    hitBombs,
    accuracy,
    avgReactionTime,
    maxCombo,
    duration: gameTime,
    correctCount: hitMoles,
    wrongCount: hitBombs,
    totalCount: totalMoles,
  }
}

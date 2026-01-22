/**
 * 找不同遊戲邏輯模組
 * 訓練：視覺辨識、注意力、觀察力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface SpotDifferenceConfig {
  /** 網格大小 */
  gridSize: number
  /** 網格列數（可選，若提供則優先使用） */
  gridRows?: number
  /** 網格欄數（可選，若提供則優先使用） */
  gridCols?: number
  /** 不同之處數量 */
  diffCount: number
  /** 總回合數 */
  rounds: number
  /** 每回合時間（秒） */
  timePerRound: number
  /** 最大提示次數 */
  maxHints: number
}

export interface RoundData {
  /** 原圖網格 */
  originalGrid: string[]
  /** 比對圖網格 */
  compareGrid: string[]
  /** 不同之處位置索引 */
  differences: number[]
}

export interface SpotDifferenceResult {
  /** 最終分數 (0-100) */
  score: number
  /** 找到的不同總數 */
  totalFound: number
  /** 總共需要找的不同數 */
  totalDifferences: number
  /** 網格列數 */
  gridRows?: number
  /** 網格欄數 */
  gridCols?: number
  /** 每回合不同點數 */
  diffCount?: number
  /** 總回合數 */
  totalRounds?: number
  /** 準確率 */
  accuracy: number
  /** 平均找到時間（毫秒） */
  avgFoundTime: number
  /** 錯誤點擊次數 */
  wrongClicks: number
  /** 遊戲時長（秒） */
  duration: number
}

// ==================== 常數配置 ====================

export const EMOJI_SETS = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
  fruits: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🥝', '🍒', '🍑', '🥭', '🍍', '🥥', '🍌', '🫐', '🍈'],
  nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌵', '🌲', '🌴', '🍁', '🍂', '🌾', '🌱', '🌿'],
  objects: ['⭐', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈', '💎', '🔮', '🎈', '🎁', '🎀', '🎄', '🎃'],
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, SpotDifferenceConfig> = {
  easy: {
    gridSize: 4,
    diffCount: 2,
    rounds: 3,
    timePerRound: 45,
    maxHints: 3,
  },
  medium: {
    gridSize: 5,
    diffCount: 3,
    rounds: 4,
    timePerRound: 40,
    maxHints: 2,
  },
  hard: {
    gridSize: 6,
    diffCount: 4,
    rounds: 5,
    timePerRound: 35,
    maxHints: 1,
  },
}

function resolveGridShape(config: SpotDifferenceConfig): { rows: number; cols: number } {
  const rows = config.gridRows ?? config.gridSize
  const cols = config.gridCols ?? config.gridSize
  return {
    rows: Math.max(1, Math.round(rows)),
    cols: Math.max(1, Math.round(cols)),
  }
}

// ==================== 工具函數 ====================

/**
 * 取得隨機 Emoji 集合
 */
export function getRandomEmojiSet(): string[] {
  const keys = Object.keys(EMOJI_SETS) as (keyof typeof EMOJI_SETS)[]
  const randomKey = keys[Math.floor(Math.random() * keys.length)]!
  return EMOJI_SETS[randomKey]
}

/**
 * 從陣列隨機選擇一個元素
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/**
 * 產生一回合的題目
 */
export function generateRound(config: SpotDifferenceConfig): RoundData {
  const { diffCount } = config
  const { rows, cols } = resolveGridShape(config)
  const totalCells = rows * cols
  const emojiSet = getRandomEmojiSet()

  // 產生原圖
  const originalGrid: string[] = []
  for (let i = 0; i < totalCells; i++) {
    originalGrid.push(randomFrom(emojiSet))
  }

  // 複製為比對圖
  const compareGrid = [...originalGrid]

  // 隨機選擇不同的位置
  const differences: number[] = []
  while (differences.length < diffCount) {
    const pos = Math.floor(Math.random() * totalCells)
    if (!differences.includes(pos)) {
      differences.push(pos)

      // 替換為不同的 emoji
      let newEmoji = randomFrom(emojiSet)
      while (newEmoji === originalGrid[pos]) {
        newEmoji = randomFrom(emojiSet)
      }
      compareGrid[pos] = newEmoji
    }
  }

  return {
    originalGrid,
    compareGrid,
    differences,
  }
}

/**
 * 檢查是否為不同點
 */
export function isDifference(index: number, differences: number[]): boolean {
  return differences.includes(index)
}

/**
 * 處理點擊
 */
export function processClick(
  index: number,
  differences: number[],
  foundDifferences: number[]
): {
  isCorrect: boolean
  isNewFind: boolean
} {
  const isCorrect = isDifference(index, differences)
  const isNewFind = isCorrect && !foundDifferences.includes(index)

  return { isCorrect, isNewFind }
}

/**
 * 檢查是否全部找到
 */
export function isRoundComplete(
  foundCount: number,
  totalDifferences: number
): boolean {
  return foundCount >= totalDifferences
}

// ==================== 評分函數 ====================

/**
 * 計算最終分數 (0-100)
 */
export function calculateScore(
  totalFound: number,
  totalDifferences: number,
  wrongClicks: number,
  avgFoundTime: number
): number {
  if (totalDifferences === 0) return 0

  const accuracy = totalFound / totalDifferences

  // 準確率佔 70%
  const accuracyScore = accuracy * 70

  // 扣分項目：每次錯誤扣 2 分，最多扣 20 分
  const penaltyScore = Math.max(0, 20 - wrongClicks * 2)

  // 速度獎勵：5 秒內找到得滿分，最多 10 分
  const speedBonus = avgFoundTime > 0 && avgFoundTime < 5000
    ? Math.min(10, (5000 - avgFoundTime) / 500)
    : 0

  return Math.round(Math.min(100, accuracyScore + penaltyScore + speedBonus))
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
  totalFound: number,
  totalRounds: number,
  diffCount: number,
  wrongClicks: number,
  foundTimes: number[],
  config: SpotDifferenceConfig
): SpotDifferenceResult {
  const totalDifferences = totalRounds * diffCount
  const accuracy = totalDifferences > 0 ? totalFound / totalDifferences : 0
  const avgFoundTime = foundTimes.length > 0
    ? Math.round(foundTimes.reduce((a, b) => a + b, 0) / foundTimes.length)
    : 0

  const score = calculateScore(totalFound, totalDifferences, wrongClicks, avgFoundTime)
  const { rows, cols } = resolveGridShape(config)

  return {
    score,
    totalFound,
    totalDifferences,
    gridRows: rows,
    gridCols: cols,
    diffCount,
    totalRounds,
    accuracy,
    avgFoundTime,
    wrongClicks,
    duration: totalRounds * config.timePerRound,
  }
}

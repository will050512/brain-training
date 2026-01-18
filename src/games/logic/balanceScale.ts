/**
 * 天平秤重遊戲邏輯模組
 * 訓練：數量比較、視覺判斷、認知能力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface WeightItem {
  emoji: string
  weight: number
}

export interface BalanceScaleConfig {
  /** 總回合數 */
  rounds: number
  /** 每側最大物品數 */
  maxItems: number
  /** 最小重量差 */
  minDiff: number
  /** 最大重量差 */
  maxDiff: number
  /** 每回合時間限制（秒） */
  timePerRound: number
  /** 是否顯示重量提示 */
  showWeightHint: boolean
  /** 是否顯示天平傾斜提示 */
  showTilt: boolean
  /** 天平傾斜強度 */
  tiltStrength: number
  /** 天平最大傾斜角度 */
  maxTilt: number
}

export interface RoundData {
  leftItems: WeightItem[]
  rightItems: WeightItem[]
  leftWeight: number
  rightWeight: number
  correctAnswer: 'left' | 'right'
}

export interface BalanceScaleResult {
  /** 最終分數 (0-100) */
  score: number
  /** 正確次數 */
  correctCount: number
  /** 總回合數 */
  totalRounds: number
  /** 準確率 */
  accuracy: number
  /** 平均反應時間（毫秒） */
  avgReactionTime: number
  /** 遊戲時長（秒） */
  duration: number
}

// ==================== 常數配置 ====================

export const WEIGHT_ITEMS: WeightItem[] = [
  { emoji: '🍎', weight: 1 },
  { emoji: '🍊', weight: 1 },
  { emoji: '🍋', weight: 1 },
  { emoji: '🍇', weight: 2 },
  { emoji: '🍉', weight: 3 },
  { emoji: '🥝', weight: 1 },
  { emoji: '🍓', weight: 1 },
  { emoji: '🥕', weight: 1 },
  { emoji: '🥔', weight: 2 },
  { emoji: '🎃', weight: 4 },
  { emoji: '🏀', weight: 3 },
  { emoji: '⚽', weight: 2 },
  { emoji: '🎱', weight: 2 },
  { emoji: '🏋️', weight: 5 },
]

export const DIFFICULTY_CONFIGS: Record<Difficulty, BalanceScaleConfig> = {
  easy: {
    rounds: 8,
    maxItems: 4,
    minDiff: 2,
    maxDiff: 4,
    timePerRound: 10,
    showWeightHint: true,
    showTilt: true,
    tiltStrength: 3.5,
    maxTilt: 20,
  },
  medium: {
    rounds: 12,
    maxItems: 5,
    minDiff: 2,
    maxDiff: 3,
    timePerRound: 8,
    showWeightHint: false,
    showTilt: true,
    tiltStrength: 3,
    maxTilt: 18,
  },
  hard: {
    rounds: 15,
    maxItems: 6,
    minDiff: 1,
    maxDiff: 2,
    timePerRound: 6,
    showWeightHint: false,
    showTilt: true,
    tiltStrength: 2.5,
    maxTilt: 14,
  },
}

// ==================== 工具函數 ====================

/**
 * 隨機選擇物品
 */
function getWeightPool(config: BalanceScaleConfig): WeightItem[] {
  const maxWeight = config.maxItems >= 6 ? 5 : config.maxItems >= 5 ? 4 : 3
  const pool = WEIGHT_ITEMS.filter(item => item.weight <= maxWeight)
  return pool.length > 0 ? pool : WEIGHT_ITEMS
}

function getRandomItem(pool: WeightItem[]): WeightItem {
  const index = Math.floor(Math.random() * pool.length)
  return pool[index] ?? pool[0]!
}

/**
 * 產生一側的物品
 */
function generateSideItems(count: number, pool: WeightItem[]): WeightItem[] {
  const items: WeightItem[] = []
  for (let i = 0; i < count; i++) {
    items.push(getRandomItem(pool))
  }
  return items
}

/**
 * 計算物品總重量
 */
export function calculateWeight(items: WeightItem[]): number {
  return items.reduce((sum, item) => sum + item.weight, 0)
}

/**
 * 產生一回合的題目
 */
export function generateRound(config: BalanceScaleConfig): RoundData {
  const maxItems = Math.max(1, config.maxItems)
  const minDiff = Math.max(1, config.minDiff)
  const maxDiff = Math.max(minDiff, config.maxDiff)
  const pool = getWeightPool(config)

  let leftItems: WeightItem[] = []
  let rightItems: WeightItem[] = []
  let leftWeight = 0
  let rightWeight = 0
  let attempts = 0

  while (attempts < 40) {
    attempts += 1
    const leftCount = Math.floor(Math.random() * maxItems) + 1
    const rightCount = Math.floor(Math.random() * maxItems) + 1

    leftItems = generateSideItems(leftCount, pool)
    rightItems = generateSideItems(rightCount, pool)

    leftWeight = calculateWeight(leftItems)
    rightWeight = calculateWeight(rightItems)

    const diff = Math.abs(leftWeight - rightWeight)
    if (diff >= minDiff && diff <= maxDiff) {
      break
    }
  }

  if (leftWeight === rightWeight) {
    const extraItem = getRandomItem(pool)
    leftItems = [...leftItems, extraItem]
    leftWeight = calculateWeight(leftItems)
  }

  return {
    leftItems,
    rightItems,
    leftWeight,
    rightWeight,
    correctAnswer: leftWeight > rightWeight ? 'left' : 'right',
  }
}

/**
 * 驗證答案
 */
export function validateAnswer(
  selectedSide: 'left' | 'right',
  round: RoundData
): boolean {
  return selectedSide === round.correctAnswer
}

/**
 * 計算天平臂旋轉角度
 */
export function calculateArmRotation(
  leftWeight: number,
  rightWeight: number,
  showTilt: boolean,
  tiltStrength: number = 3,
  maxTilt: number = 18
): number {
  if (!showTilt) return 0
  const diff = leftWeight - rightWeight
  const rotation = diff * tiltStrength
  return Math.max(-maxTilt, Math.min(maxTilt, rotation))
}

// ==================== 評分函數 ====================

/**
 * 計算最終分數 (0-100)
 */
export function calculateScore(
  correctCount: number,
  totalRounds: number,
  avgReactionTime: number
): number {
  if (totalRounds === 0) return 0

  const accuracy = correctCount / totalRounds
  
  // 正確率佔 80%
  const accuracyScore = accuracy * 80
  
  // 速度獎勵佔 20%（3 秒內反應得滿分）
  const speedBonus = avgReactionTime > 0 && avgReactionTime < 3000
    ? Math.min(20, (3000 - avgReactionTime) / 150)
    : 0

  return Math.round(Math.min(100, accuracyScore + speedBonus))
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
  correctCount: number,
  totalRounds: number,
  reactionTimes: number[],
  config: BalanceScaleConfig
): BalanceScaleResult {
  const accuracy = totalRounds > 0 ? correctCount / totalRounds : 0
  const avgReactionTime = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0

  const score = calculateScore(correctCount, totalRounds, avgReactionTime)

  return {
    score,
    correctCount,
    totalRounds,
    accuracy,
    avgReactionTime,
    duration: totalRounds * config.timePerRound,
  }
}

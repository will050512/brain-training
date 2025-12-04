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
  /** 每回合時間限制（秒） */
  timePerRound: number
  /** 是否顯示重量提示 */
  showWeightHint: boolean
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
]

export const DIFFICULTY_CONFIGS: Record<Difficulty, BalanceScaleConfig> = {
  easy: {
    rounds: 8,
    maxItems: 4,
    timePerRound: 10,
    showWeightHint: true,
  },
  medium: {
    rounds: 12,
    maxItems: 5,
    timePerRound: 8,
    showWeightHint: false,
  },
  hard: {
    rounds: 15,
    maxItems: 6,
    timePerRound: 6,
    showWeightHint: false,
  },
}

// ==================== 工具函數 ====================

/**
 * 隨機選擇物品
 */
function getRandomItem(): WeightItem {
  const index = Math.floor(Math.random() * WEIGHT_ITEMS.length)
  return WEIGHT_ITEMS[index] ?? WEIGHT_ITEMS[0]!
}

/**
 * 產生一側的物品
 */
function generateSideItems(count: number): WeightItem[] {
  const items: WeightItem[] = []
  for (let i = 0; i < count; i++) {
    items.push(getRandomItem())
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
  const leftCount = Math.floor(Math.random() * config.maxItems) + 1
  const rightCount = Math.floor(Math.random() * config.maxItems) + 1

  let leftItems = generateSideItems(leftCount)
  let rightItems = generateSideItems(rightCount)

  let leftWeight = calculateWeight(leftItems)
  let rightWeight = calculateWeight(rightItems)

  // 確保有明確的重量差異
  if (leftWeight === rightWeight) {
    const extraItem = getRandomItem()
    if (leftCount <= rightCount) {
      leftItems = [...leftItems, extraItem]
      leftWeight += extraItem.weight
    } else {
      rightItems = [...rightItems, extraItem]
      rightWeight += extraItem.weight
    }
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
  showTilt: boolean
): number {
  if (!showTilt) return 0
  const diff = leftWeight - rightWeight
  return Math.max(-15, Math.min(15, diff * 3))
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

/**
 * 遊戲分數計算 Composable
 * 提供統一的分數計算邏輯
 */

import { ref, computed, readonly } from 'vue'
import type { ScoreOptions } from './gameTypes'

export interface UseGameScoreOptions {
  /** 基礎分數 */
  baseScore?: number
  /** 時間加成係數 (每秒) */
  timeBonusPerSecond?: number
  /** 最大時間加成 */
  maxTimeBonus?: number
  /** 連擊加成係數 */
  comboMultiplier?: number
  /** 最大連擊加成 */
  maxComboBonus?: number
  /** 完美答題加成 */
  perfectBonus?: number
  /** 快速答題閾值（毫秒） */
  fastAnswerThreshold?: number
  /** 快速答題加成 */
  fastAnswerBonus?: number
}

export function useGameScore(options: UseGameScoreOptions = {}) {
  const {
    baseScore = 10,
    timeBonusPerSecond = 1,
    maxTimeBonus = 10,
    comboMultiplier = 2,
    maxComboBonus = 20,
    perfectBonus = 50,
    fastAnswerThreshold = 2000,
    fastAnswerBonus = 5,
  } = options

  // ===== 狀態 =====
  const totalScore = ref(0)
  const lastEarnedScore = ref(0)
  const currentCombo = ref(0)
  const maxCombo = ref(0)
  const perfectStreak = ref(0)
  const fastAnswerCount = ref(0)

  // ===== 計算屬性 =====
  
  /** 當前連擊加成 */
  const comboBonus = computed(() => 
    Math.min(currentCombo.value * comboMultiplier, maxComboBonus)
  )

  // ===== 方法 =====

  /**
   * 計算答題分數
   * @param isCorrect 是否正確
   * @param reactionTime 反應時間（毫秒）
   * @param remainingTime 剩餘時間（秒），可選
   * @param customBase 自訂基礎分數，可選
   */
  function calculateScore(
    isCorrect: boolean,
    reactionTime: number = 0,
    remainingTime?: number,
    customBase?: number
  ): number {
    if (!isCorrect) {
      // 答錯：重置連擊
      currentCombo.value = 0
      perfectStreak.value = 0
      lastEarnedScore.value = 0
      return 0
    }

    const base = customBase ?? baseScore
    let score = base

    // 連擊加成
    currentCombo.value++
    if (currentCombo.value > maxCombo.value) {
      maxCombo.value = currentCombo.value
    }
    score += Math.min(currentCombo.value * comboMultiplier, maxComboBonus)

    // 時間加成（基於剩餘時間）
    if (remainingTime !== undefined && remainingTime > 0) {
      const timeBonus = Math.min(
        Math.floor(remainingTime * timeBonusPerSecond),
        maxTimeBonus
      )
      score += timeBonus
    }

    // 快速答題加成
    if (reactionTime > 0 && reactionTime < fastAnswerThreshold) {
      score += fastAnswerBonus
      fastAnswerCount.value++
    }

    lastEarnedScore.value = score
    totalScore.value += score

    return score
  }

  /**
   * 計算帶時間壓力的分數（反應越快分越高）
   * @param isCorrect 是否正確
   * @param reactionTime 反應時間（毫秒）
   * @param maxReactionTime 最大反應時間（毫秒）
   * @param customBase 自訂基礎分數
   */
  function calculateTimeBasedScore(
    isCorrect: boolean,
    reactionTime: number,
    maxReactionTime: number = 5000,
    customBase?: number
  ): number {
    if (!isCorrect) {
      currentCombo.value = 0
      perfectStreak.value = 0
      lastEarnedScore.value = 0
      return 0
    }

    const base = customBase ?? baseScore
    
    // 時間因子：反應越快，分數越高 (0-1)
    const timeFactor = Math.max(0, 1 - reactionTime / maxReactionTime)
    
    // 基礎分數 + 時間加成
    let score = base + Math.round(base * timeFactor)

    // 連擊加成
    currentCombo.value++
    if (currentCombo.value > maxCombo.value) {
      maxCombo.value = currentCombo.value
    }
    score += Math.min(currentCombo.value * comboMultiplier, maxComboBonus)

    lastEarnedScore.value = score
    totalScore.value += score

    return score
  }

  /**
   * 記錄完美答題
   */
  function recordPerfect(): number {
    perfectStreak.value++
    const bonus = perfectBonus
    totalScore.value += bonus
    lastEarnedScore.value += bonus
    return bonus
  }

  /**
   * 直接增加分數
   */
  function addScore(points: number) {
    totalScore.value += points
    lastEarnedScore.value = points
  }

  /**
   * 扣除分數
   */
  function deductScore(points: number) {
    totalScore.value = Math.max(0, totalScore.value - points)
    lastEarnedScore.value = -points
  }

  /**
   * 重置分數狀態
   */
  function resetScore() {
    totalScore.value = 0
    lastEarnedScore.value = 0
    currentCombo.value = 0
    maxCombo.value = 0
    perfectStreak.value = 0
    fastAnswerCount.value = 0
  }

  /**
   * 計算最終分數（滿分 100）
   * @param correctCount 正確數
   * @param totalCount 總數
   * @param avgReactionTime 平均反應時間（毫秒）
   * @param targetReactionTime 目標反應時間（毫秒）
   */
  function calculateFinalScore(
    correctCount: number,
    totalCount: number,
    avgReactionTime?: number,
    targetReactionTime: number = 3000
  ): number {
    if (totalCount === 0) return 0

    // 正確率分數 (70%)
    const accuracyScore = (correctCount / totalCount) * 70

    // 速度分數 (30%)
    let speedScore = 0
    if (avgReactionTime !== undefined && avgReactionTime > 0) {
      speedScore = Math.max(0, 30 * (1 - avgReactionTime / targetReactionTime))
    } else {
      // 沒有反應時間數據時，以連擊數作為替代
      speedScore = Math.min(30, maxCombo.value * 3)
    }

    return Math.round(Math.min(100, accuracyScore + speedScore))
  }

  return {
    // 狀態（唯讀）
    totalScore: readonly(totalScore),
    lastEarnedScore: readonly(lastEarnedScore),
    currentCombo: readonly(currentCombo),
    maxCombo: readonly(maxCombo),
    perfectStreak: readonly(perfectStreak),
    fastAnswerCount: readonly(fastAnswerCount),
    
    // 計算屬性
    comboBonus,
    
    // 方法
    calculateScore,
    calculateTimeBasedScore,
    recordPerfect,
    addScore,
    deductScore,
    resetScore,
    calculateFinalScore,
  }
}

export type UseGameScoreReturn = ReturnType<typeof useGameScore>

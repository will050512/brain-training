/**
 * 瞬間記憶遊戲邏輯模組
 * 訓練：短期記憶、注意力、工作記憶
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface InstantMemoryConfig {
  /** 起始數字長度 */
  startLength: number
  /** 最大數字長度 */
  maxLength: number
  /** 每個數字顯示時間（毫秒） */
  showTime: number
  /** 總回合數 */
  rounds: number
  /** 每題基礎分數 */
  points: number
}

export interface RoundState {
  /** 當前序列 */
  sequence: number[]
  /** 使用者輸入 */
  userInput: number[]
  /** 當前顯示的數字索引 */
  showingIndex: number
}

export interface InstantMemoryResult {
  /** 最終分數 */
  score: number
  /** 滿分 */
  maxScore: number
  /** 準確率 */
  accuracy: number
  /** 遊戲時長（秒） */
  timeSpent: number
  /** 正確回合數 */
  correctCount: number
  /** 錯誤回合數 */
  wrongCount: number
  /** 達到的最大長度 */
  maxReached: number
  /** 總回合數 */
  totalRounds: number
}

// ==================== 難度配置 ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, InstantMemoryConfig> = {
  easy: {
    startLength: 3,
    maxLength: 6,
    showTime: 2000,
    rounds: 8,
    points: 15,
  },
  medium: {
    startLength: 4,
    maxLength: 8,
    showTime: 1500,
    rounds: 10,
    points: 20,
  },
  hard: {
    startLength: 5,
    maxLength: 10,
    showTime: 1000,
    rounds: 12,
    points: 25,
  },
}

// ==================== 工具函數 ====================

/**
 * 產生指定長度的數字序列
 */
export function generateSequence(length: number): number[] {
  const sequence: number[] = []
  for (let i = 0; i < length; i++) {
    sequence.push(Math.floor(Math.random() * 10))
  }
  return sequence
}

/**
 * 建立初始回合狀態
 */
export function createRoundState(sequenceLength: number): RoundState {
  return {
    sequence: generateSequence(sequenceLength),
    userInput: [],
    showingIndex: -1,
  }
}

/**
 * 添加使用者輸入
 */
export function addUserInput(state: RoundState, digit: number): RoundState {
  return {
    ...state,
    userInput: [...state.userInput, digit],
  }
}

/**
 * 刪除最後一個輸入
 */
export function removeLastInput(state: RoundState): RoundState {
  return {
    ...state,
    userInput: state.userInput.slice(0, -1),
  }
}

/**
 * 檢查輸入是否完成
 */
export function isInputComplete(state: RoundState): boolean {
  return state.userInput.length >= state.sequence.length
}

/**
 * 驗證答案
 */
export function validateAnswer(state: RoundState): boolean {
  return state.userInput.every(
    (num, index) => num === state.sequence[index]
  )
}

/**
 * 計算回合分數
 */
export function calculateRoundScore(
  config: InstantMemoryConfig,
  currentLength: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0

  const lengthBonus = (currentLength - config.startLength) * 5
  return config.points + lengthBonus
}

/**
 * 計算下一回合的序列長度
 */
export function getNextLength(
  currentLength: number,
  isCorrect: boolean,
  config: InstantMemoryConfig
): number {
  if (isCorrect) {
    return Math.min(currentLength + 1, config.maxLength)
  } else {
    return Math.max(currentLength - 1, config.startLength)
  }
}

/**
 * 計算每個數字的顯示時間
 */
export function getDigitShowTime(config: InstantMemoryConfig, sequenceLength: number): number {
  return Math.round(config.showTime / sequenceLength) + 200
}

// ==================== 評分函數 ====================

/**
 * 計算最大可能分數
 */
export function calculateMaxScore(config: InstantMemoryConfig): number {
  return config.rounds * (config.points + (config.maxLength - config.startLength) * 5)
}

/**
 * 計算等級
 */
export function calculateGrade(score: number, maxScore: number): string {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  if (percentage >= 90) return 'S'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  score: number,
  correctCount: number,
  wrongCount: number,
  maxReached: number,
  startTime: number,
  config: InstantMemoryConfig
): InstantMemoryResult {
  const timeSpent = Math.round((Date.now() - startTime) / 1000)
  const totalRounds = correctCount + wrongCount
  const accuracy = totalRounds > 0 ? correctCount / totalRounds : 0
  const maxScore = calculateMaxScore(config)

  return {
    score,
    maxScore,
    accuracy,
    timeSpent,
    correctCount,
    wrongCount,
    maxReached,
    totalRounds,
  }
}

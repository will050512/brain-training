/**
 * 手勢記憶遊戲邏輯模組
 * 訓練：記憶力、協調力、序列記憶
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface Gesture {
  id: string
  name: string
  icon: string
  description: string
}

export interface GestureMemoryConfig {
  /** 起始序列長度 */
  startLength: number
  /** 最大序列長度 */
  maxLength: number
  /** 每個手勢顯示時間（毫秒） */
  showTime: number
  /** 可用手勢數量 */
  gesturePool: number
  /** 總回合數 */
  totalRounds: number
}

export interface RoundState {
  /** 當前序列 */
  sequence: Gesture[]
  /** 使用者輸入 */
  userInput: Gesture[]
  /** 當前顯示的手勢索引 */
  currentShowIndex: number
}

export interface GestureMemoryResult {
  /** 最終分數 */
  score: number
  /** 準確率 */
  accuracy: number
  /** 最長連續正確 */
  maxStreak: number
  /** 總回合數 */
  totalRounds: number
  /** 正確回合數 */
  correctRounds: number
  /** 平均反應時間（毫秒） */
  avgResponseTime: number
  /** 達到的最大長度 */
  maxLength: number
}

// ==================== 常數配置 ====================

export const GESTURES: Gesture[] = [
  { id: 'wave', name: '揮手', icon: '👋', description: '揮手打招呼' },
  { id: 'thumbsUp', name: '讚', icon: '👍', description: '豎起大拇指' },
  { id: 'thumbsDown', name: '倒讚', icon: '👎', description: '大拇指向下' },
  { id: 'peace', name: '勝利', icon: '✌️', description: '比出勝利手勢' },
  { id: 'ok', name: 'OK', icon: '👌', description: '比出 OK 手勢' },
  { id: 'fist', name: '拳頭', icon: '✊', description: '握緊拳頭' },
  { id: 'point', name: '指', icon: '👆', description: '伸出食指' },
  { id: 'clap', name: '拍手', icon: '👏', description: '拍手鼓掌' },
  { id: 'pray', name: '合掌', icon: '🙏', description: '雙手合十' },
  { id: 'muscle', name: '肌肉', icon: '💪', description: '展示肌肉' },
  { id: 'wave_bye', name: '再見', icon: '🖐️', description: '張開手掌揮手' },
  { id: 'call', name: '打電話', icon: '🤙', description: '打電話手勢' },
]

export const DIFFICULTY_CONFIGS: Record<Difficulty, GestureMemoryConfig> = {
  easy: {
    startLength: 2,
    maxLength: 4,
    showTime: 1800,
    gesturePool: 6,
    totalRounds: 8,
  },
  medium: {
    startLength: 3,
    maxLength: 6,
    showTime: 1500,
    gesturePool: 8,
    totalRounds: 10,
  },
  hard: {
    startLength: 4,
    maxLength: 8,
    showTime: 1200,
    gesturePool: 9,
    totalRounds: 12,
  },
}

// ==================== 工具函數 ====================

/**
 * 取得可用的手勢池
 */
export function getGesturePool(poolSize: number): Gesture[] {
  return GESTURES.slice(0, poolSize)
}

/**
 * 產生隨機序列
 */
export function generateSequence(length: number, pool: Gesture[]): Gesture[] {
  const result: Gesture[] = []
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length)
    const gesture = pool[randomIndex]
    if (gesture) {
      result.push(gesture)
    }
  }
  return result
}

/**
 * 建立初始回合狀態
 */
export function createRoundState(length: number, pool: Gesture[]): RoundState {
  return {
    sequence: generateSequence(length, pool),
    userInput: [],
    currentShowIndex: -1,
  }
}

/**
 * 添加使用者輸入
 */
export function addUserInput(state: RoundState, gesture: Gesture): RoundState {
  return {
    ...state,
    userInput: [...state.userInput, gesture],
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
    (gesture, index) => gesture.id === state.sequence[index]?.id
  )
}

/**
 * 計算回合分數
 */
export function calculateRoundScore(
  sequenceLength: number,
  startLength: number,
  streak: number
): number {
  const baseScore = sequenceLength * 10
  const streakBonus = Math.min(streak - 1, 5) * 5
  return baseScore + Math.max(0, streakBonus)
}

/**
 * 計算下一回合的序列長度
 */
export function getNextLength(
  currentLength: number,
  isCorrect: boolean,
  streak: number,
  config: GestureMemoryConfig
): number {
  if (isCorrect && streak >= 2) {
    return Math.min(currentLength + 1, config.maxLength)
  } else if (!isCorrect) {
    return Math.max(currentLength - 1, config.startLength)
  }
  return currentLength
}

// ==================== 評分函數 ====================

/**
 * 計算等級
 */
export function calculateGrade(accuracy: number): string {
  if (accuracy >= 90) return 'S'
  if (accuracy >= 80) return 'A'
  if (accuracy >= 70) return 'B'
  if (accuracy >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  score: number,
  correctRounds: number,
  totalRounds: number,
  maxStreak: number,
  maxLength: number,
  responseTimes: number[]
): GestureMemoryResult {
  const accuracy = totalRounds > 0
    ? (correctRounds / totalRounds) * 100
    : 0

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0

  return {
    score,
    accuracy: Math.round(accuracy),
    maxStreak,
    totalRounds,
    correctRounds,
    avgResponseTime: Math.round(avgResponseTime),
    maxLength,
  }
}

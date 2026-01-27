/**
 * 猜拳遊戲邏輯模組
 * 訓練：反應速度、認知彈性、決策能力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export type Gesture = 'rock' | 'paper' | 'scissors'
export type RoundResult = 'win' | 'lose' | 'tie' | 'timeout'

export interface GestureInfo {
  emoji: string
  name: string
  beats: Gesture
}

export interface RockPaperScissorsConfig {
  /** 總回合數 */
  rounds: number
  /** 每回合時間（秒） */
  timePerRound: number
  /** 反向模式機率 */
  reverseChance: number
  /** 每回合基礎分數 */
  points: number
}

export interface RoundData {
  /** 電腦出的手勢 */
  computerGesture: Gesture
  /** 玩家出的手勢 */
  playerGesture: Gesture | null
  /** 是否為反向模式 */
  isReverse: boolean
  /** 回合結果 */
  result: RoundResult | null
  /** 反應時間（毫秒） */
  responseTime: number
}

export interface RockPaperScissorsResult {
  /** 最終分數 */
  score: number
  /** 滿分 */
  maxScore: number
  /** 準確率（勝率） */
  accuracy: number
  /** 平均反應時間（毫秒） */
  avgResponseTime: number
  /** 勝利次數 */
  wins: number
  /** 失敗次數 */
  losses: number
  /** 平手次數 */
  ties: number
  /** 總回合數 */
  totalRounds: number
  /** 反向模式回合數 */
  reverseRounds: number
}

// ==================== 常數配置 ====================

export const GESTURES: Record<Gesture, GestureInfo> = {
  rock: { emoji: '✊', name: '石頭', beats: 'scissors' },
  paper: { emoji: '✋', name: '布', beats: 'rock' },
  scissors: { emoji: '✌️', name: '剪刀', beats: 'paper' },
}

export const GESTURE_LIST: Gesture[] = ['rock', 'paper', 'scissors']

export const DIFFICULTY_CONFIGS: Record<Difficulty, RockPaperScissorsConfig> = {
  easy: {
    rounds: 10,
    timePerRound: 6,
    reverseChance: 0,
    points: 10,
  },
  medium: {
    rounds: 12,
    timePerRound: 5,
    reverseChance: 0.25,
    points: 15,
  },
  hard: {
    rounds: 15,
    timePerRound: 4,
    reverseChance: 0.4,
    points: 20,
  },
}

// ==================== 工具函數 ====================

/**
 * 取得隨機手勢
 */
export function getRandomGesture(): Gesture {
  const index = Math.floor(Math.random() * GESTURE_LIST.length)
  return GESTURE_LIST[index]!
}

/**
 * 判斷正常模式結果（玩家 vs 電腦）
 */
function getNormalResult(player: Gesture, computer: Gesture): 'win' | 'lose' | 'tie' {
  if (player === computer) return 'tie'
  return GESTURES[player].beats === computer ? 'win' : 'lose'
}

/**
 * 判斷回合結果
 */
export function getResult(
  player: Gesture,
  computer: Gesture,
  isReverse: boolean
): 'win' | 'lose' | 'tie' {
  const normalResult = getNormalResult(player, computer)

  if (normalResult === 'tie') return 'tie'

  // 反向模式：需要輸才算贏
  if (isReverse) {
    return normalResult === 'win' ? 'lose' : 'win'
  }

  return normalResult
}

/**
 * 建立新回合數據
 */
export function createRound(reverseChance: number): Omit<RoundData, 'playerGesture' | 'result' | 'responseTime'> {
  return {
    computerGesture: getRandomGesture(),
    isReverse: Math.random() < reverseChance,
  }
}

/**
 * 處理玩家選擇
 */
export function processChoice(
  round: Pick<RoundData, 'computerGesture' | 'isReverse'>,
  playerGesture: Gesture,
  responseTime: number
): RoundData {
  return {
    ...round,
    playerGesture,
    result: getResult(playerGesture, round.computerGesture, round.isReverse),
    responseTime,
  }
}

/**
 * 處理超時
 */
export function processTimeout(
  round: Pick<RoundData, 'computerGesture' | 'isReverse'>,
  timeoutDuration: number
): RoundData {
  return {
    ...round,
    playerGesture: null,
    result: 'timeout',
    responseTime: timeoutDuration,
  }
}

/**
 * 取得正確答案（應該選什麼才能贏）
 */
export function getWinningGesture(computer: Gesture, isReverse: boolean): Gesture {
  if (isReverse) {
    // 反向模式：找會輸的手勢
    return GESTURE_LIST.find(g => GESTURES[computer].beats === g)!
  }
  // 正常模式：找會贏的手勢
  return GESTURE_LIST.find(g => GESTURES[g].beats === computer)!
}

// ==================== 評分函數 ====================

/**
 * 計算回合分數
 */
export function calculateRoundScore(
  config: RockPaperScissorsConfig,
  result: RoundResult,
  responseTime: number
): number {
  if (result === 'win') {
    const rawBonus = Math.floor((config.timePerRound * 1000 - responseTime) / 250)
    const timeBonus = Math.max(0, Math.min(12, rawBonus))
    return config.points + timeBonus
  }
  if (result === 'tie') {
    return Math.floor(config.points / 2)
  }
  return 0
}

/**
 * 計算最大可能分數
 */
export function calculateMaxScore(config: RockPaperScissorsConfig): number {
  return config.rounds * (config.points + 12)
}

/**
 * 計算等級
 */
export function calculateGrade(wins: number, totalRounds: number): string {
  const winRate = totalRounds > 0 ? wins / totalRounds : 0
  if (winRate >= 0.9) return 'S'
  if (winRate >= 0.8) return 'A'
  if (winRate >= 0.7) return 'B'
  if (winRate >= 0.6) return 'C'
  return 'D'
}

/**
 * 統計回合結果
 */
export function countResults(rounds: RoundData[]): {
  wins: number
  losses: number
  ties: number
  timeouts: number
  reverseRounds: number
} {
  return {
    wins: rounds.filter(r => r.result === 'win').length,
    losses: rounds.filter(r => r.result === 'lose').length,
    ties: rounds.filter(r => r.result === 'tie').length,
    timeouts: rounds.filter(r => r.result === 'timeout').length,
    reverseRounds: rounds.filter(r => r.isReverse).length,
  }
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  score: number,
  rounds: RoundData[],
  config: RockPaperScissorsConfig
): RockPaperScissorsResult {
  const stats = countResults(rounds)
  const validRounds = rounds.filter(r => r.result !== 'timeout')
  const avgResponseTime = validRounds.length > 0
    ? validRounds.reduce((sum, r) => sum + r.responseTime, 0) / validRounds.length
    : 0

  return {
    score,
    maxScore: calculateMaxScore(config),
    accuracy: stats.wins / config.rounds,
    avgResponseTime: Math.round(avgResponseTime),
    wins: stats.wins,
    losses: stats.losses + stats.timeouts,
    ties: stats.ties,
    totalRounds: config.rounds,
    reverseRounds: stats.reverseRounds,
  }
}

/**
 * 取得結果文字
 */
export function getResultText(result: RoundResult, isReverse: boolean): string {
  switch (result) {
    case 'win':
      return isReverse ? '正確！成功輸了！' : '你贏了！'
    case 'lose':
      return isReverse ? '錯誤！你贏了！' : '你輸了！'
    case 'tie':
      return '平手！'
    case 'timeout':
      return '時間到！'
  }
}

/**
 * 取得結果顏色
 */
export function getResultColor(result: RoundResult): string {
  switch (result) {
    case 'win':
      return '#22c55e'
    case 'lose':
    case 'timeout':
      return '#ef4444'
    case 'tie':
      return '#f59e0b'
  }
}

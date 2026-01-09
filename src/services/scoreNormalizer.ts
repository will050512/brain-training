/**
 * 分數標準化服務
 * 將各遊戲的原始結果轉換為統一的 0-100 分數格式
 */

import type {
  Difficulty,
  SubDifficulty,
  UnifiedGameResult,
  StandardizedMetrics,
  TrackingData,
  DisplayStat,
  GameGrade,
  GameResultConverter,
  ReactionTimeBenchmark,
  GameScoreConfig,
  GameScoreType
} from '@/types/game'
import {
  REACTION_TIME_BENCHMARKS,
  getGradeFromScore
} from '@/types/game'

// ========== 遊戲評分配置 ==========

export const GAME_SCORE_CONFIGS: Record<string, GameScoreConfig> = {
  'whack-a-mole': {
    type: 'reaction',
    weights: { accuracy: 60, speed: 30, combo: 10 },
    reactionBenchmark: 'instant',
    hasCombo: true,
    trackMissed: true
  },
  'balance-scale': {
    type: 'accuracy',
    weights: { accuracy: 80, speed: 20 },
    reactionBenchmark: 'normal',
    hasCombo: false,
    trackMissed: false
  },
  'card-match': {
    type: 'completion',
    weights: { completion: 50, efficiency: 30, speed: 20 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: false
  },
  'stroop-test': {
    type: 'accuracy',
    weights: { accuracy: 75, speed: 25 },
    reactionBenchmark: 'quick',
    hasCombo: false,
    trackMissed: false
  },
  'maze-navigation': {
    type: 'completion',
    weights: { efficiency: 60, speed: 40 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: false
  },
  'spot-difference': {
    type: 'mixed',
    weights: { accuracy: 70, speed: 10, efficiency: 20 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: true
  },
  'math-calc': {
    type: 'accuracy',
    weights: { accuracy: 70, speed: 20, combo: 10 },
    reactionBenchmark: 'quick',
    hasCombo: true,
    trackMissed: false
  },
  'instant-memory': {
    type: 'memory',
    weights: { accuracy: 100 },
    reactionBenchmark: 'quick',
    hasCombo: false,
    trackMissed: false
  },
  'poker-memory': {
    type: 'completion',
    weights: { completion: 60, efficiency: 40 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: false
  },
  'rock-paper-scissors': {
    type: 'reaction',
    weights: { accuracy: 70, speed: 30 },
    reactionBenchmark: 'instant',
    hasCombo: false,
    trackMissed: false
  },
  'gesture-memory': {
    type: 'memory',
    weights: { accuracy: 80, combo: 20 },
    reactionBenchmark: 'quick',
    hasCombo: true,
    trackMissed: false
  },
  'number-connect': {
    type: 'completion',
    weights: { completion: 60, speed: 20, efficiency: 20 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: true
  },
  'pattern-reasoning': {
    type: 'accuracy',
    weights: { accuracy: 70, speed: 30 },
    reactionBenchmark: 'normal',
    hasCombo: false,
    trackMissed: false
  },
  'audio-memory': {
    type: 'memory',
    weights: { accuracy: 80, combo: 20 },
    reactionBenchmark: 'quick',
    hasCombo: true,
    trackMissed: false
  },
  'rhythm-mimic': {
    type: 'precision',
    weights: { accuracy: 100 },
    reactionBenchmark: 'quick',
    hasCombo: false,
    trackMissed: false
  },
  'clock-drawing': {
    type: 'accuracy',
    weights: { accuracy: 100 },
    reactionBenchmark: 'extended',
    hasCombo: false,
    trackMissed: false
  }
}

// ========== 工具函數 ==========

/**
 * 計算速度評分（根據反應時間基準）
 */
export function calculateSpeedScore(
  avgReactionTime: number,
  benchmark: ReactionTimeBenchmark
): number {
  const { excellent, good, acceptable } = REACTION_TIME_BENCHMARKS[benchmark]
  
  if (avgReactionTime <= excellent) return 100
  if (avgReactionTime <= good) {
    // excellent 到 good 之間線性插值（100 到 80）
    const ratio = (avgReactionTime - excellent) / (good - excellent)
    return 100 - ratio * 20
  }
  if (avgReactionTime <= acceptable) {
    // good 到 acceptable 之間線性插值（80 到 60）
    const ratio = (avgReactionTime - good) / (acceptable - good)
    return 80 - ratio * 20
  }
  // 超過 acceptable，逐漸降低但不低於 20
  const overRatio = Math.min((avgReactionTime - acceptable) / acceptable, 1)
  return Math.max(60 - overRatio * 40, 20)
}

/**
 * 計算效率評分（實際步數 vs 最佳步數）
 */
export function calculateEfficiencyScore(
  actualSteps: number,
  optimalSteps: number
): number {
  if (actualSteps <= optimalSteps) return 100
  const ratio = optimalSteps / actualSteps
  return Math.max(ratio * 100, 20)
}

/**
 * 計算連擊加分
 */
export function calculateComboBonus(maxCombo: number, totalCount: number): number {
  if (totalCount === 0) return 0
  const comboRatio = maxCombo / totalCount
  return Math.min(comboRatio * 100, 100)
}

/**
 * 限制分數在 0-100 範圍內
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

// ========== 通用轉換函數 ==========

/**
 * 通用分數標準化
 */
export function normalizeScore(
  rawScore: number,
  maxPossibleScore: number
): number {
  if (maxPossibleScore === 0) return 0
  return clampScore((rawScore / maxPossibleScore) * 100)
}

/**
 * 根據遊戲配置計算最終分數
 */
export function calculateFinalScore(
  metrics: StandardizedMetrics,
  config: GameScoreConfig,
  comboBonus: number = 0
): number {
  const { weights } = config
  let score = 0
  
  if (weights.accuracy) {
    score += (metrics.accuracy * 100) * (weights.accuracy / 100)
  }
  if (weights.speed) {
    score += metrics.speed * (weights.speed / 100)
  }
  if (weights.completion) {
    score += (metrics.completion * 100) * (weights.completion / 100)
  }
  if (weights.efficiency) {
    score += metrics.efficiency * (weights.efficiency / 100)
  }
  if (weights.combo) {
    score += comboBonus * (weights.combo / 100)
  }
  
  return clampScore(score)
}

// ========== 遊戲專屬轉換器 ==========

/**
 * 打地鼠結果轉換
 */
export function convertWhackAMoleResult(
  rawResult: {
    hitMoles: number
    missedMoles: number
    hitBombs: number
    totalMoles: number
    avgReactionTime: number
    maxCombo: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['whack-a-mole']!
  const { hitMoles, missedMoles, hitBombs, totalMoles, avgReactionTime, maxCombo } = rawResult
  
  const accuracy = totalMoles > 0 ? hitMoles / totalMoles : 0
  const speedScore = calculateSpeedScore(avgReactionTime, config.reactionBenchmark)
  const comboBonus = calculateComboBonus(maxCombo, totalMoles)
  
  const metrics: StandardizedMetrics = {
    completion: 1, // 限時遊戲總是完成
    accuracy,
    speed: speedScore,
    efficiency: 100 - (hitBombs * 10) // 炸彈扣分
  }
  
  const finalScore = calculateFinalScore(metrics, config, comboBonus)
  
  return {
    gameId: 'whack-a-mole',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 60,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: hitMoles,
      wrongCount: hitBombs,
      missedCount: missedMoles,
      maxCombo,
      avgReactionTime
    },
    gameSpecific: {
      hitMoles,
      hitBombs,
      missedMoles,
      totalMoles
    },
    displayStats: generateWhackAMoleDisplayStats(rawResult, finalScore)
  }
}

function generateWhackAMoleDisplayStats(
  rawResult: { hitMoles: number; missedMoles: number; hitBombs: number; totalMoles: number; avgReactionTime: number; maxCombo: number },
  finalScore: number
): DisplayStat[] {
  const accuracy = rawResult.totalMoles > 0 
    ? Math.round((rawResult.hitMoles / rawResult.totalMoles) * 100) 
    : 0
  
  return [
    { label: '命中率', value: accuracy, unit: '%', icon: '🎯', highlight: true },
    { label: '平均反應', value: Math.round(rawResult.avgReactionTime), unit: 'ms', icon: '⚡' },
    { label: '最高連擊', value: rawResult.maxCombo, icon: '🔥' },
    { label: '打中地鼠', value: rawResult.hitMoles, icon: '🐹' },
    { label: '漏掉地鼠', value: rawResult.missedMoles, icon: '💨' },
    { label: '誤打炸彈', value: rawResult.hitBombs, icon: '💣' }
  ]
}

/**
 * 天平比重結果轉換
 */
export function convertBalanceScaleResult(
  rawResult: {
    correctCount: number
    wrongCount: number
    totalQuestions: number
    avgReactionTime: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['balance-scale']!
  const { correctCount, wrongCount, totalQuestions, avgReactionTime } = rawResult
  
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0
  const speedScore = calculateSpeedScore(avgReactionTime, config.reactionBenchmark)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: speedScore,
    efficiency: 100
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'balance-scale',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      avgReactionTime
    },
    displayStats: [
      { label: '正確率', value: Math.round(accuracy * 100), unit: '%', icon: '✅', highlight: true },
      { label: '正確題數', value: `${correctCount}/${totalQuestions}`, icon: '📝' },
      { label: '平均反應', value: Math.round(avgReactionTime), unit: 'ms', icon: '⚡' }
    ]
  }
}

/**
 * 翻牌配對結果轉換
 */
export function convertCardMatchResult(
  rawResult: {
    matchedPairs: number
    totalPairs: number
    moves: number
    avgMoveTime: number
    duration: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['card-match']!
  const { matchedPairs, totalPairs, moves, avgMoveTime } = rawResult
  
  const completion = totalPairs > 0 ? matchedPairs / totalPairs : 0
  const optimalMoves = totalPairs * 2 // 最佳情況：每對只需翻兩次
  const efficiencyScore = calculateEfficiencyScore(moves, optimalMoves)
  const speedScore = calculateSpeedScore(avgMoveTime, config.reactionBenchmark)
  
  const metrics: StandardizedMetrics = {
    completion,
    accuracy: completion, // 對於配對遊戲，完成度等於準確率
    speed: speedScore,
    efficiency: efficiencyScore
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'card-match',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || rawResult.duration,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: matchedPairs,
      wrongCount: moves - matchedPairs * 2,
      avgReactionTime: avgMoveTime,
      totalActions: moves
    },
    gameSpecific: {
      matchedPairs,
      totalPairs,
      moves,
      optimalMoves
    },
    displayStats: [
      { label: '完成度', value: Math.round(completion * 100), unit: '%', icon: '✅', highlight: true },
      { label: '配對數', value: `${matchedPairs}/${totalPairs}`, icon: '🃏' },
      { label: '翻牌次數', value: moves, icon: '👆' },
      { label: '最佳次數', value: optimalMoves, icon: '⭐' },
      { label: '平均翻牌', value: Math.round(avgMoveTime / 1000 * 10) / 10, unit: '秒', icon: '⏱️' }
    ]
  }
}

/**
 * Stroop 測試結果轉換
 */
export function convertStroopResult(
  rawResult: {
    correctCount: number
    wrongCount: number
    totalCount: number
    avgReactionTime: number
    congruentCorrect?: number
    incongruentCorrect?: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['stroop-test']!
  const { correctCount, wrongCount, totalCount, avgReactionTime } = rawResult
  
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  const speedScore = calculateSpeedScore(avgReactionTime, config.reactionBenchmark)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: speedScore,
    efficiency: 100
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'stroop-test',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      avgReactionTime
    },
    gameSpecific: {
      congruentCorrect: rawResult.congruentCorrect,
      incongruentCorrect: rawResult.incongruentCorrect
    },
    displayStats: [
      { label: '正確率', value: Math.round(accuracy * 100), unit: '%', icon: '✅', highlight: true },
      { label: '正確題數', value: `${correctCount}/${totalCount}`, icon: '📝' },
      { label: '平均反應', value: Math.round(avgReactionTime), unit: 'ms', icon: '⚡' }
    ]
  }
}

/**
 * 迷宮導航結果轉換
 */
export function convertMazeResult(
  rawResult: {
    completed: boolean
    moves: number
    optimalMoves: number
    duration: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['maze-navigation']!
  const { completed, moves, optimalMoves } = rawResult
  
  const completion = completed ? 1 : 0
  const efficiencyScore = completed ? calculateEfficiencyScore(moves, optimalMoves) : 0
  const speedScore = completed ? Math.max(100 - (rawResult.duration / 60) * 20, 40) : 0
  
  const metrics: StandardizedMetrics = {
    completion,
    accuracy: efficiencyScore / 100,
    speed: speedScore,
    efficiency: efficiencyScore
  }
  
  const finalScore = completed ? calculateFinalScore(metrics, config) : 0
  
  return {
    gameId: 'maze-navigation',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || rawResult.duration,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: completed ? 1 : 0,
      wrongCount: 0,
      totalActions: moves
    },
    gameSpecific: {
      completed,
      moves,
      optimalMoves,
      efficiency: optimalMoves > 0 ? Math.round((optimalMoves / moves) * 100) : 0
    },
    displayStats: [
      { label: '完成狀態', value: completed ? '成功' : '未完成', icon: completed ? '🏆' : '❌', highlight: true },
      { label: '移動步數', value: moves, icon: '👣' },
      { label: '最佳步數', value: optimalMoves, icon: '⭐' },
      { label: '效率', value: optimalMoves > 0 ? Math.round((optimalMoves / moves) * 100) : 0, unit: '%', icon: '📊' }
    ]
  }
}

/**
 * 找不同結果轉換
 */
export function convertSpotDifferenceResult(
  rawResult: {
    foundCount: number
    totalDifferences: number
    wrongClicks: number
    avgFoundTime: number
    duration: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['spot-difference']!
  const { foundCount, totalDifferences, wrongClicks, avgFoundTime } = rawResult
  
  const accuracy = totalDifferences > 0 ? foundCount / totalDifferences : 0
  const speedScore = calculateSpeedScore(avgFoundTime, config.reactionBenchmark)
  const wrongPenalty = Math.min(wrongClicks * 5, 30) // 每次錯誤扣 5 分，最多扣 30
  const efficiencyScore = Math.max(100 - wrongPenalty, 50)
  
  const metrics: StandardizedMetrics = {
    completion: accuracy,
    accuracy,
    speed: speedScore,
    efficiency: efficiencyScore
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'spot-difference',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || rawResult.duration,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: foundCount,
      wrongCount: wrongClicks,
      missedCount: totalDifferences - foundCount,
      avgReactionTime: avgFoundTime
    },
    displayStats: [
      { label: '找到數量', value: `${foundCount}/${totalDifferences}`, icon: '🔍', highlight: true },
      { label: '準確率', value: Math.round(accuracy * 100), unit: '%', icon: '🎯' },
      { label: '錯誤點擊', value: wrongClicks, icon: '❌' },
      { label: '平均找到', value: Math.round(avgFoundTime / 1000 * 10) / 10, unit: '秒', icon: '⏱️' }
    ]
  }
}

/**
 * 加減乘除結果轉換
 */
export function convertMathGameResult(
  rawResult: any,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['math-calc']!
  const correctCount = Number(rawResult?.correctCount ?? 0)
  const wrongCount = Number(rawResult?.wrongCount ?? 0)
  const totalCount = Number(rawResult?.totalCount ?? (correctCount + wrongCount))
  const avgReactionTime = Number(rawResult?.avgReactionTime ?? rawResult?.avgResponseTime ?? 0)
  const maxCombo = Number(rawResult?.maxCombo ?? 0)
  const totalQuestions = totalCount
  
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  const speedScore = avgReactionTime > 0 ? calculateSpeedScore(avgReactionTime, config.reactionBenchmark) : 50
  const comboBonus = calculateComboBonus(maxCombo, totalCount)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: speedScore,
    efficiency: 100
  }
  
  const finalScore = calculateFinalScore(metrics, config, comboBonus)
  
  return {
    gameId: 'math-calc',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || Number(rawResult?.duration ?? 0),
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      maxCombo,
      avgReactionTime
    },
    displayStats: [
      { label: '正確率', value: Math.round(accuracy * 100), unit: '%', icon: '✅', highlight: true },
      { label: '正確題數', value: `${correctCount}/${totalQuestions}`, icon: '📝' },
      { label: '平均反應', value: Math.round(avgReactionTime), unit: 'ms', icon: '⚡' },
      { label: '最高連擊', value: maxCombo, icon: '🔥' }
    ]
  }
}

/**
 * 瞬間記憶結果轉換
 */
export function convertInstantMemoryResult(
  rawResult: {
    correctCount: number
    wrongCount: number
    maxReached: number
    score: number
    maxPossibleScore: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['instant-memory']!
  const { correctCount, wrongCount, maxReached, score, maxPossibleScore } = rawResult
  
  const normalizedScore = normalizeScore(score, maxPossibleScore)
  const accuracy = maxPossibleScore > 0 ? score / maxPossibleScore : 0
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: 100, // 記憶遊戲不計速度
    efficiency: 100
  }
  
  return {
    gameId: 'instant-memory',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: normalizedScore,
    maxScore: 100,
    grade: getGradeFromScore(normalizedScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount
    },
    gameSpecific: {
      maxReached
    },
    displayStats: [
      { label: '最高記憶', value: maxReached, unit: '個', icon: '🧠', highlight: true },
      { label: '正確回合', value: correctCount, icon: '✅' },
      { label: '錯誤回合', value: wrongCount, icon: '❌' }
    ]
  }
}

/**
 * 撲克記憶結果轉換
 */
export function convertPokerMemoryResult(
  rawResult: {
    matchedPairs: number
    totalPairs: number
    moves: number
    timeLeft: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['poker-memory']!
  const { matchedPairs, totalPairs, moves, timeLeft } = rawResult
  
  const completion = totalPairs > 0 ? matchedPairs / totalPairs : 0
  const optimalMoves = totalPairs
  const efficiencyScore = calculateEfficiencyScore(moves, optimalMoves)
  
  const metrics: StandardizedMetrics = {
    completion,
    accuracy: completion,
    speed: Math.min(timeLeft * 2, 100), // 剩餘時間加分
    efficiency: efficiencyScore
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'poker-memory',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: matchedPairs,
      wrongCount: moves - matchedPairs,
      totalActions: moves
    },
    gameSpecific: {
      matchedPairs,
      totalPairs,
      moves,
      timeLeft
    },
    displayStats: [
      { label: '配對數', value: `${matchedPairs}/${totalPairs}`, icon: '🃏', highlight: true },
      { label: '嘗試次數', value: moves, icon: '👆' },
      { label: '剩餘時間', value: timeLeft, unit: '秒', icon: '⏱️' }
    ]
  }
}

/**
 * 猜拳遊戲結果轉換
 */
export function convertRockPaperScissorsResult(
  rawResult: {
    wins: number
    losses: number
    ties: number
    totalRounds: number
    avgResponseTime: number
    reverseRounds: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['rock-paper-scissors']!
  const { wins, losses, ties, totalRounds, avgResponseTime } = rawResult
  
  const winRate = totalRounds > 0 ? wins / totalRounds : 0
  const speedScore = calculateSpeedScore(avgResponseTime, config.reactionBenchmark)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy: winRate,
    speed: speedScore,
    efficiency: 100
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'rock-paper-scissors',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: wins,
      wrongCount: losses,
      avgReactionTime: avgResponseTime
    },
    gameSpecific: {
      wins,
      losses,
      ties,
      reverseRounds: rawResult.reverseRounds
    },
    displayStats: [
      { label: '勝率', value: Math.round(winRate * 100), unit: '%', icon: '🏆', highlight: true },
      { label: '勝/負/平', value: `${wins}/${losses}/${ties}`, icon: '✊' },
      { label: '平均反應', value: Math.round(avgResponseTime), unit: 'ms', icon: '⚡' }
    ]
  }
}

/**
 * 手勢記憶結果轉換
 */
export function convertGestureMemoryResult(
  rawResult: {
    correctCount: number
    wrongCount: number
    maxStreak: number
    maxLength: number
    score: number
    maxPossibleScore: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['gesture-memory']!
  const { correctCount, wrongCount, maxStreak, maxLength, score, maxPossibleScore } = rawResult
  
  const normalizedScore = normalizeScore(score, maxPossibleScore)
  const accuracy = maxPossibleScore > 0 ? score / maxPossibleScore : 0
  const comboBonus = calculateComboBonus(maxStreak, correctCount + wrongCount)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: 100,
    efficiency: 100
  }
  
  const finalScore = Math.round(normalizedScore * 0.8 + comboBonus * 0.2)
  
  return {
    gameId: 'gesture-memory',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: clampScore(finalScore),
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      maxCombo: maxStreak
    },
    gameSpecific: {
      maxStreak,
      maxLength
    },
    displayStats: [
      { label: '最長序列', value: maxLength, unit: '個', icon: '🧠', highlight: true },
      { label: '最高連擊', value: maxStreak, icon: '🔥' },
      { label: '正確回合', value: correctCount, icon: '✅' },
      { label: '錯誤回合', value: wrongCount, icon: '❌' }
    ]
  }
}

/**
 * 數字連連看結果轉換
 */
export function convertNumberConnectResult(
  rawResult: {
    completed: boolean
    progress: number
    totalNumbers: number
    errors: number
    duration: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['number-connect']!
  const { completed, progress, totalNumbers, errors } = rawResult
  
  const completion = totalNumbers > 0 ? progress / totalNumbers : 0
  const errorPenalty = Math.min(errors * 5, 30)
  const efficiencyScore = Math.max(100 - errorPenalty, 50)
  const speedScore = completed ? Math.max(100 - (rawResult.duration / 60) * 20, 40) : 50
  
  const metrics: StandardizedMetrics = {
    completion,
    accuracy: 1 - (errors / Math.max(progress, 1)),
    speed: speedScore,
    efficiency: efficiencyScore
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'number-connect',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || rawResult.duration,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: progress,
      wrongCount: errors,
      missedCount: totalNumbers - progress
    },
    gameSpecific: {
      completed,
      progress,
      totalNumbers
    },
    displayStats: [
      { label: '完成狀態', value: completed ? '成功' : '未完成', icon: completed ? '🏆' : '❌', highlight: true },
      { label: '進度', value: `${progress}/${totalNumbers}`, icon: '🔢' },
      { label: '錯誤次數', value: errors, icon: '❌' }
    ]
  }
}

/**
 * 圖形推理結果轉換
 */
export function convertPatternReasoningResult(
  rawResult: {
    correctCount: number
    wrongCount: number
    totalQuestions: number
    avgReactionTime: number
    score: number
  },
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['pattern-reasoning']!
  const { correctCount, wrongCount, totalQuestions, avgReactionTime } = rawResult
  
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0
  const speedScore = calculateSpeedScore(avgReactionTime, config.reactionBenchmark)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: speedScore,
    efficiency: 100
  }
  
  const finalScore = calculateFinalScore(metrics, config)
  
  return {
    gameId: 'pattern-reasoning',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || 0,
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      avgReactionTime
    },
    displayStats: [
      { label: '正確率', value: Math.round(accuracy * 100), unit: '%', icon: '✅', highlight: true },
      { label: '正確題數', value: `${correctCount}/${totalQuestions}`, icon: '📝' },
      { label: '平均反應', value: Math.round(avgReactionTime / 1000 * 10) / 10, unit: '秒', icon: '⚡' }
    ]
  }
}

/**
 * 聽覺記憶結果轉換
 */
export function convertAuditoryMemoryResult(
  rawResult: any,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['audio-memory']!
  const correctCount = Number(rawResult?.correctRounds ?? rawResult?.correctCount ?? 0)
  const totalRounds = Number(rawResult?.totalRounds ?? 0)
  const wrongCount = Math.max(0, totalRounds - correctCount)
  const maxStreak = Number(rawResult?.maxStreak ?? 0)
  const maxLength = Number(rawResult?.maxLength ?? 0)
  const score = Number(rawResult?.score ?? rawResult?.accuracy ?? 0)
  const maxPossibleScore = 100
  
  const normalizedScore = normalizeScore(score, maxPossibleScore)
  const comboBonus = calculateComboBonus(maxStreak, correctCount + wrongCount)
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy: maxPossibleScore > 0 ? score / maxPossibleScore : 0,
    speed: 100,
    efficiency: 100
  }
  
  const finalScore = Math.round(normalizedScore * 0.8 + comboBonus * 0.2)
  
  return {
    gameId: 'audio-memory',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || Number(rawResult?.duration ?? 0),
    score: clampScore(finalScore),
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount,
      wrongCount,
      maxCombo: maxStreak
    },
    gameSpecific: {
      maxStreak,
      maxLength
    },
    displayStats: [
      { label: '最長序列', value: maxLength, unit: '個', icon: '🎵', highlight: true },
      { label: '最高連擊', value: maxStreak, icon: '🔥' },
      { label: '正確回合', value: correctCount, icon: '✅' },
      { label: '錯誤回合', value: wrongCount, icon: '❌' }
    ]
  }
}

/**
 * 節奏模仿結果轉換
 */
export function convertRhythmImitationResult(
  rawResult: any,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const config = GAME_SCORE_CONFIGS['rhythm-mimic']!
  const perfectCount = Number(rawResult?.perfectCount ?? 0)
  const goodCount = Number(rawResult?.goodCount ?? 0)
  const missCount = Number(rawResult?.missCount ?? 0)
  const totalNotes = Number(rawResult?.totalNotes ?? rawResult?.totalBeats ?? (perfectCount + goodCount + missCount))
  const okCount = Number(rawResult?.okCount ?? Math.max(0, totalNotes - perfectCount - goodCount - missCount))
  const avgError = Number(rawResult?.avgError ?? 0)
  
  // 加權計算準確率：Perfect=100%, Good=80%, Ok=50%, Miss=0%
  const weightedAccuracy = totalNotes > 0 
    ? (perfectCount * 1 + goodCount * 0.8 + okCount * 0.5) / totalNotes 
    : 0
  
  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy: weightedAccuracy,
    speed: 100,
    efficiency: 100
  }
  
  const finalScore = clampScore(weightedAccuracy * 100)
  
  return {
    gameId: 'rhythm-mimic',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || Number(rawResult?.duration ?? 0),
    score: finalScore,
    maxScore: 100,
    grade: getGradeFromScore(finalScore),
    metrics,
    tracking: {
      correctCount: perfectCount + goodCount,
      wrongCount: missCount
    },
    gameSpecific: {
      perfectCount,
      goodCount,
      okCount,
      missCount,
      avgError
    },
    displayStats: [
      { label: '準確度', value: Math.round(weightedAccuracy * 100), unit: '%', icon: '🎯', highlight: true },
      { label: 'Perfect', value: perfectCount, icon: '⭐' },
      { label: 'Good', value: goodCount, icon: '👍' },
      { label: 'OK', value: okCount, icon: '👌' },
      { label: 'Miss', value: missCount, icon: '❌' }
    ]
  }
}

/**
 * 時鐘繪圖結果轉換
 */
export function convertClockDrawingResult(
  rawResult: any,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const score = Number(rawResult?.score ?? 0)
  const maxRawScore = 3
  const normalizedScore = clampScore(normalizeScore(score, maxRawScore))
  const completionTimeMs = Number(rawResult?.completionTime ?? 0)
  const durationSeconds = duration ?? (completionTimeMs > 0 ? Math.round(completionTimeMs / 1000) : 0)
  const accuracy = maxRawScore > 0 ? Math.min(score / maxRawScore, 1) : 0

  const metrics: StandardizedMetrics = {
    completion: 1,
    accuracy,
    speed: 50,
    efficiency: 100
  }

  return {
    gameId: 'clock-drawing',
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: durationSeconds,
    score: normalizedScore,
    maxScore: 100,
    grade: getGradeFromScore(normalizedScore),
    metrics,
    tracking: {
      correctCount: Math.round(score),
      wrongCount: Math.max(0, maxRawScore - Math.round(score)),
      avgThinkingTime: completionTimeMs > 0 ? completionTimeMs : undefined
    },
    gameSpecific: {
      targetTime: rawResult?.targetTime,
      selfAssessment: rawResult?.selfAssessment,
      completionTime: completionTimeMs,
      imageData: rawResult?.imageData
    },
    displayStats: [
      { label: '完成度', value: Math.round(accuracy * 100), unit: '%', icon: 'OK', highlight: true },
      { label: '用時', value: Math.round(durationSeconds), unit: '秒', icon: 'TIME' }
    ]
  }
}

// ========== 主要轉換函數 ==========

/**
 * 統一轉換任意遊戲結果
 */
export function normalizeGameResult(
  gameId: string,
  rawResult: unknown,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const converters: Record<string, (raw: any, d: Difficulty, sd?: SubDifficulty, dur?: number) => UnifiedGameResult> = {
    'whack-a-mole': convertWhackAMoleResult,
    'balance-scale': convertBalanceScaleResult,
    'card-match': convertCardMatchResult,
    'stroop-test': convertStroopResult,
    'maze-navigation': convertMazeResult,
    'spot-difference': convertSpotDifferenceResult,
    'math-calc': convertMathGameResult,
    'instant-memory': convertInstantMemoryResult,
    'poker-memory': convertPokerMemoryResult,
    'rock-paper-scissors': convertRockPaperScissorsResult,
    'gesture-memory': convertGestureMemoryResult,
    'number-connect': convertNumberConnectResult,
    'pattern-reasoning': convertPatternReasoningResult,
    'audio-memory': convertAuditoryMemoryResult,
    'rhythm-mimic': convertRhythmImitationResult,
    'clock-drawing': convertClockDrawingResult
  }
  
  const converter = converters[gameId]
  
  if (converter) {
    return converter(rawResult, difficulty, subDifficulty, duration)
  }
  
  // 未知遊戲的通用轉換
  return createGenericResult(gameId, rawResult as Record<string, unknown>, difficulty, subDifficulty, duration)
}

/**
 * 通用結果轉換（用於未知遊戲）
 */
function createGenericResult(
  gameId: string,
  rawResult: Record<string, unknown>,
  difficulty: Difficulty,
  subDifficulty?: SubDifficulty,
  duration?: number
): UnifiedGameResult {
  const score = typeof rawResult.score === 'number' ? rawResult.score : 0
  const maxScore = typeof rawResult.maxScore === 'number' ? rawResult.maxScore : 100
  const normalizedScore = normalizeScore(score, maxScore)
  
  return {
    gameId,
    difficulty,
    subDifficulty,
    timestamp: new Date(),
    duration: duration || (typeof rawResult.duration === 'number' ? rawResult.duration : 0),
    score: normalizedScore,
    maxScore: 100,
    grade: getGradeFromScore(normalizedScore),
    metrics: {
      completion: 1,
      accuracy: normalizedScore / 100,
      speed: 50,
      efficiency: 50
    },
    tracking: {
      correctCount: typeof rawResult.correctCount === 'number' ? rawResult.correctCount : 0,
      wrongCount: typeof rawResult.wrongCount === 'number' ? rawResult.wrongCount : 0
    },
    gameSpecific: rawResult,
    displayStats: [
      { label: '分數', value: normalizedScore, unit: '分', icon: '📊', highlight: true }
    ]
  }
}

// ========== 導出服務類 ==========

export class ScoreNormalizer {
  /**
   * 轉換遊戲結果
   */
  normalize(
    gameId: string,
    rawResult: unknown,
    difficulty: Difficulty,
    subDifficulty?: SubDifficulty,
    duration?: number
  ): UnifiedGameResult {
    return normalizeGameResult(gameId, rawResult, difficulty, subDifficulty, duration)
  }
  
  /**
   * 取得遊戲評分配置
   */
  getConfig(gameId: string): GameScoreConfig | undefined {
    return GAME_SCORE_CONFIGS[gameId]
  }
  
  /**
   * 計算速度評分
   */
  calculateSpeed(avgReactionTime: number, benchmark: ReactionTimeBenchmark): number {
    return calculateSpeedScore(avgReactionTime, benchmark)
  }
  
  /**
   * 取得等級
   */
  getGrade(score: number): GameGrade {
    return getGradeFromScore(score)
  }
}

// 導出單例
export const scoreNormalizer = new ScoreNormalizer()

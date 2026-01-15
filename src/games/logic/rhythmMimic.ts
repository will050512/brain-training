/**
 * 節拍模仿遊戲邏輯模組
 * 訓練：節奏感、時間感知、協調能力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface Beat {
  /** 節拍時間（毫秒） */
  time: number
  /** 節拍類型 */
  type: 'tap' | 'hold'
  /** 持續時間（毫秒，僅 hold 類型） */
  duration?: number
}

export interface RhythmPattern {
  /** 模式 ID */
  id: string
  /** 模式名稱 */
  name: string
  /** BPM（每分鐘節拍數） */
  bpm: number
  /** 節拍序列 */
  beats: Beat[]
  /** 難度等級 */
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface RhythmMimicConfig {
  /** 總回合數 */
  totalRounds: number
  /** 允許誤差（毫秒） */
  tolerance: number
  /** 播放模式次數 */
  playCount: number
  /** 間隔等待時間（毫秒） */
  waitTime: number
  /** 輸入階段開始前的提示延遲（毫秒） */
  leadInMs: number
  /** 允許重播次數 */
  replayLimit: number
}

export interface TapResult {
  /** 預期時間 */
  expected: number
  /** 實際時間 */
  actual: number
  /** 誤差（毫秒） */
  error: number
  /** 是否在容許範圍內 */
  isGood: boolean
  /** 評分等級 */
  rating: 'perfect' | 'good' | 'ok' | 'miss'
}

export interface RoundResult {
  /** 節拍準確率 */
  accuracy: number
  /** 各節拍結果 */
  taps: TapResult[]
  /** 回合分數 */
  score: number
}

export interface RhythmMimicResult {
  /** 最終分數 */
  score: number
  /** 總體準確率 */
  accuracy: number
  /** 完美節拍數 */
  perfectCount: number
  /** 良好節拍數 */
  goodCount: number
  /** 失誤節拍數 */
  missCount: number
  /** 總節拍數 */
  totalBeats: number
  /** 平均誤差（毫秒） */
  avgError: number
  /** 各回合結果 */
  roundResults: RoundResult[]
}

// ==================== 常數配置 ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, RhythmMimicConfig> = {
  easy: {
    totalRounds: 5,
    tolerance: 300,
    playCount: 2,
    waitTime: 1000,
    leadInMs: 700,
    replayLimit: 2,
  },
  medium: {
    totalRounds: 7,
    tolerance: 200,
    playCount: 2,
    waitTime: 800,
    leadInMs: 600,
    replayLimit: 1,
  },
  hard: {
    totalRounds: 10,
    tolerance: 150,
    playCount: 1,
    waitTime: 600,
    leadInMs: 500,
    replayLimit: 0,
  },
}

/** 預設節奏模式庫 */
export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // 簡單模式 - 等距節拍
  {
    id: 'simple_4',
    name: '基本四拍',
    bpm: 60,
    difficulty: 'easy',
    beats: [
      { time: 0, type: 'tap' },
      { time: 1000, type: 'tap' },
      { time: 2000, type: 'tap' },
      { time: 3000, type: 'tap' },
    ],
  },
  {
    id: 'simple_3',
    name: '三拍子',
    bpm: 80,
    difficulty: 'easy',
    beats: [
      { time: 0, type: 'tap' },
      { time: 750, type: 'tap' },
      { time: 1500, type: 'tap' },
    ],
  },
  {
    id: 'waltz',
    name: '華爾滋',
    bpm: 90,
    difficulty: 'easy',
    beats: [
      { time: 0, type: 'tap' },
      { time: 667, type: 'tap' },
      { time: 1333, type: 'tap' },
      { time: 2000, type: 'tap' },
      { time: 2667, type: 'tap' },
      { time: 3333, type: 'tap' },
    ],
  },

  // 中等模式 - 變化節拍
  {
    id: 'syncopated',
    name: '切分音',
    bpm: 100,
    difficulty: 'medium',
    beats: [
      { time: 0, type: 'tap' },
      { time: 600, type: 'tap' },
      { time: 900, type: 'tap' },
      { time: 1500, type: 'tap' },
      { time: 2100, type: 'tap' },
      { time: 2400, type: 'tap' },
    ],
  },
  {
    id: 'dotted',
    name: '附點節奏',
    bpm: 80,
    difficulty: 'medium',
    beats: [
      { time: 0, type: 'tap' },
      { time: 750, type: 'tap' },
      { time: 1000, type: 'tap' },
      { time: 1750, type: 'tap' },
      { time: 2000, type: 'tap' },
      { time: 2750, type: 'tap' },
    ],
  },
  {
    id: 'march',
    name: '進行曲',
    bpm: 120,
    difficulty: 'medium',
    beats: [
      { time: 0, type: 'tap' },
      { time: 250, type: 'tap' },
      { time: 500, type: 'tap' },
      { time: 1000, type: 'tap' },
      { time: 1250, type: 'tap' },
      { time: 1500, type: 'tap' },
      { time: 2000, type: 'tap' },
    ],
  },

  // 困難模式 - 複雜節奏
  {
    id: 'triplet',
    name: '三連音',
    bpm: 90,
    difficulty: 'hard',
    beats: [
      { time: 0, type: 'tap' },
      { time: 222, type: 'tap' },
      { time: 444, type: 'tap' },
      { time: 667, type: 'tap' },
      { time: 889, type: 'tap' },
      { time: 1111, type: 'tap' },
      { time: 1333, type: 'tap' },
      { time: 1556, type: 'tap' },
      { time: 1778, type: 'tap' },
    ],
  },
  {
    id: 'complex',
    name: '複合節奏',
    bpm: 100,
    difficulty: 'hard',
    beats: [
      { time: 0, type: 'tap' },
      { time: 300, type: 'tap' },
      { time: 450, type: 'tap' },
      { time: 600, type: 'tap' },
      { time: 1000, type: 'tap' },
      { time: 1200, type: 'tap' },
      { time: 1500, type: 'tap' },
      { time: 1700, type: 'tap' },
      { time: 2000, type: 'tap' },
    ],
  },
  {
    id: 'jazz',
    name: '爵士節奏',
    bpm: 110,
    difficulty: 'hard',
    beats: [
      { time: 0, type: 'tap' },
      { time: 273, type: 'tap' },
      { time: 545, type: 'tap' },
      { time: 727, type: 'tap' },
      { time: 1091, type: 'tap' },
      { time: 1364, type: 'tap' },
      { time: 1545, type: 'tap' },
      { time: 1818, type: 'tap' },
    ],
  },
]

// ==================== 工具函數 ====================

/**
 * 根據難度取得可用的節奏模式
 */
export function getPatternsByDifficulty(difficulty: Difficulty): RhythmPattern[] {
  const difficultyMap: Record<Difficulty, ('easy' | 'medium' | 'hard')[]> = {
    easy: ['easy'],
    medium: ['easy', 'medium'],
    hard: ['easy', 'medium', 'hard'],
  }

  const allowedDifficulties = difficultyMap[difficulty]
  return RHYTHM_PATTERNS.filter(p => allowedDifficulties.includes(p.difficulty))
}

/**
 * 隨機選擇節奏模式
 */
export function selectRandomPattern(patterns: RhythmPattern[]): RhythmPattern {
  const index = Math.floor(Math.random() * patterns.length)
  return patterns[index] || patterns[0]!
}

/**
 * 產生回合的節奏模式序列
 */
export function generateRoundPatterns(
  totalRounds: number,
  difficulty: Difficulty
): RhythmPattern[] {
  const patterns: RhythmPattern[] = []
  const easyPool = getPatternsByDifficulty('easy')
  const mediumPool = getPatternsByDifficulty('medium')
  const hardPool = getPatternsByDifficulty('hard')

  for (let i = 0; i < totalRounds; i++) {
    const progress = (i + 1) / totalRounds
    let pool: RhythmPattern[]

    if (difficulty === 'easy') {
      pool = easyPool
    } else if (difficulty === 'medium') {
      pool = progress < 0.4 ? easyPool : mediumPool
    } else {
      if (progress < 0.3) {
        pool = mediumPool
      } else if (progress < 0.7) {
        pool = mediumPool
      } else {
        pool = hardPool
      }
    }

    patterns.push(selectRandomPattern(pool))
  }

  return patterns
}

/**
 * 評估單次點擊
 */
export function evaluateTap(
  actualTime: number,
  expectedTime: number,
  tolerance: number
): TapResult {
  const error = Math.abs(actualTime - expectedTime)

  let rating: TapResult['rating']
  if (error <= tolerance * 0.3) {
    rating = 'perfect'
  } else if (error <= tolerance * 0.6) {
    rating = 'good'
  } else if (error <= tolerance) {
    rating = 'ok'
  } else {
    rating = 'miss'
  }

  return {
    expected: expectedTime,
    actual: actualTime,
    error,
    isGood: rating !== 'miss',
    rating,
  }
}

/**
 * 評估回合結果
 */
export function evaluateRound(
  userTaps: number[],
  pattern: RhythmPattern,
  config: RhythmMimicConfig
): RoundResult {
  const expectedTimes = pattern.beats.map(b => b.time)
  const taps: TapResult[] = []

  // 依序比對：每個預期節拍對應同序號點擊，避免「最近點」造成錯亂
  for (let i = 0; i < expectedTimes.length; i++) {
    const expected = expectedTimes[i]!
    const actual = userTaps[i]
    if (typeof actual !== 'number') {
      taps.push(evaluateTap(expected + config.tolerance * 2, expected, config.tolerance))
      continue
    }
    taps.push(evaluateTap(actual, expected, config.tolerance))
  }

  // 多餘點擊視為失誤
  if (userTaps.length > expectedTimes.length) {
    for (let i = expectedTimes.length; i < userTaps.length; i++) {
      const actual = userTaps[i]
      if (typeof actual === 'number') {
        taps.push({
          expected: actual,
          actual,
          error: config.tolerance * 2,
          isGood: false,
          rating: 'miss',
        })
      }
    }
  }

  const goodTaps = taps.filter(t => t.isGood).length
  const accuracy = (goodTaps / taps.length) * 100

  // 計算分數
  const scoreMap = { perfect: 100, good: 70, ok: 40, miss: 0 }
  const totalScore = taps.reduce((sum, tap) => sum + scoreMap[tap.rating], 0)
  const score = Math.round(totalScore / taps.length)

  return {
    accuracy: Math.round(accuracy),
    taps,
    score,
  }
}

/**
 * 計算節拍的總持續時間
 */
export function getPatternDuration(pattern: RhythmPattern): number {
  if (pattern.beats.length === 0) return 0

  const lastBeat = pattern.beats[pattern.beats.length - 1]!
  return lastBeat.time + (lastBeat.duration || 0) + 500 // 加500ms緩衝
}

// ==================== 評分函數 ====================

/**
 * 計算最終分數
 */
export function calculateScore(roundResults: RoundResult[]): number {
  if (roundResults.length === 0) return 0

  const totalScore = roundResults.reduce((sum, r) => sum + r.score, 0)
  return Math.round(totalScore / roundResults.length)
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
 * 統計各評分等級數量
 */
export function countRatings(
  roundResults: RoundResult[]
): { perfect: number; good: number; ok: number; miss: number } {
  const counts = { perfect: 0, good: 0, ok: 0, miss: 0 }

  for (const round of roundResults) {
    for (const tap of round.taps) {
      counts[tap.rating]++
    }
  }

  return counts
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(roundResults: RoundResult[]): RhythmMimicResult {
  const counts = countRatings(roundResults)
  const totalBeats = counts.perfect + counts.good + counts.ok + counts.miss

  // 計算平均誤差
  let totalError = 0
  let tapCount = 0
  for (const round of roundResults) {
    for (const tap of round.taps) {
      totalError += tap.error
      tapCount++
    }
  }
  const avgError = tapCount > 0 ? totalError / tapCount : 0

  // 計算總體準確率
  const goodCount = counts.perfect + counts.good + counts.ok
  const accuracy = totalBeats > 0 ? (goodCount / totalBeats) * 100 : 0

  return {
    score: calculateScore(roundResults),
    accuracy: Math.round(accuracy),
    perfectCount: counts.perfect,
    goodCount: counts.good,
    missCount: counts.miss,
    totalBeats,
    avgError: Math.round(avgError),
    roundResults,
  }
}

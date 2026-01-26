/**
 * 節拍模仿遊戲邏輯模組 (3回合精華版)
 * 更新重點：
 * 1. 依難度提供不同回合數 (Easy < Medium < Hard)
 * 2. 新增更有趣、具備音樂性的節奏譜面 (Fun Patterns)
 * 3. 保持 1000ms 起始緩衝 (Start Buffer)
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface Beat {
  /** 節拍時間（毫秒） */
  time: number
  /** 節拍類型 */
  type: 'tap' | 'hold'
  /** 持續時間 */
  duration?: number
}

export interface RhythmPattern {
  id: string
  name: string
  bpm: number
  beats: Beat[]
  difficulty: 'easy' | 'medium' | 'hard'
  /** 視覺上的總長度 (用於時間軸顯示) */
  totalDuration?: number
}

export interface RhythmMimicConfig {
  totalRounds: number
  tolerance: number
  playCount: number
  waitTime: number
  leadInMs: number
  replayLimit: number
}

export interface TapResult {
  expected: number
  actual: number
  error: number
  isGood: boolean
  rating: 'perfect' | 'good' | 'ok' | 'miss'
  isGhost?: boolean
}

export interface RoundResult {
  accuracy: number
  taps: TapResult[]
  score: number
  stats: {
    perfect: number
    good: number
    ok: number
    miss: number
    extra: number
  }
}

export interface RhythmMimicResult {
  score: number
  accuracy: number
  perfectCount: number
  goodCount: number
  missCount: number
  totalBeats: number
  avgError: number
  roundResults: RoundSummary[]
}

export type RoundSummary = Pick<RoundResult, 'accuracy' | 'taps' | 'score'> & {
  stats?: RoundResult['stats']
}

export interface RatingCounts {
  perfect: number
  good: number
  ok: number
  miss: number
}

// ==================== 常數配置 ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, RhythmMimicConfig> = {
  easy: {
    totalRounds: 3,
    tolerance: 350,
    playCount: 2,
    waitTime: 1500,
    leadInMs: 1000,
    replayLimit: 3,
  },
  medium: {
    totalRounds: 4,
    tolerance: 250,
    playCount: 2,
    waitTime: 1200,
    leadInMs: 1000,
    replayLimit: 2,
  },
  hard: {
    totalRounds: 5,
    tolerance: 150,
    playCount: 1,
    waitTime: 1000,
    leadInMs: 800,
    replayLimit: 1,
  },
}

/** * 全新設計的趣味譜面庫 
 * 所有 Beats 時間皆已包含 1000ms 的起始緩衝
 */
export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // === 簡單模式 (規律、口號感) ===
  {
    id: 'simple_4',
    name: '簡單四拍',
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
    id: 'one_two_three_four',
    name: '做體操 1-2-3-4',
    bpm: 60,
    difficulty: 'easy',
    beats: [
      { time: 1000, type: 'tap' },
      { time: 2000, type: 'tap' },
      { time: 3000, type: 'tap' },
      { time: 4000, type: 'tap' },
    ],
  },
  {
    id: 'knock_knock_who',
    name: '敲敲門',
    bpm: 80,
    difficulty: 'easy',
    beats: [
      { time: 1000, type: 'tap' }, // 叩
      { time: 1300, type: 'tap' }, // 叩
      // 停頓
      { time: 2300, type: 'tap' }, // 請
      { time: 2800, type: 'tap' }, // 進
    ],
  },
  {
    id: 'heartbeat_simple',
    name: '噗通噗通',
    bpm: 70,
    difficulty: 'easy',
    beats: [
      { time: 1000, type: 'tap' },
      { time: 1250, type: 'tap' },
      // 休息
      { time: 2250, type: 'tap' },
      { time: 2500, type: 'tap' },
    ],
  },

  // === 中等模式 (經典節奏、切分) ===
  {
    id: 'rock_stomp',
    name: '搖滾震撼',
    bpm: 90,
    difficulty: 'medium',
    beats: [
      // 咚 咚 啪！ (We Will Rock You 風格)
      { time: 1000, type: 'tap' },
      { time: 1400, type: 'tap' },
      { time: 2000, type: 'tap' },
      
      // 重複一次
      { time: 3000, type: 'tap' },
      { time: 3400, type: 'tap' },
      { time: 4000, type: 'tap' },
    ],
  },
  {
    id: 'shave_haircut',
    name: '刮鬍子掉下來',
    bpm: 100,
    difficulty: 'medium',
    beats: [
      // 刮-鬍-子-掉-下-來
      { time: 1000, type: 'tap' },
      { time: 1250, type: 'tap' },
      { time: 1500, type: 'tap' },
      { time: 1750, type: 'tap' },
      { time: 2000, type: 'tap' },
      // 兩拍休息，接最後兩下 (沒打完，留白給難度)
      { time: 3000, type: 'tap' },
      { time: 3500, type: 'tap' },
    ],
  },
  {
    id: 'horse_gallop',
    name: '賽馬奔馳',
    bpm: 110,
    difficulty: 'medium',
    beats: [
      // 噠-噠-噠 (三連音感)
      { time: 1000, type: 'tap' },
      { time: 1200, type: 'tap' },
      { time: 1400, type: 'tap' },
      
      // 停一下
      { time: 2200, type: 'tap' },
      { time: 2400, type: 'tap' },
      { time: 2600, type: 'tap' },
    ],
  },

  // === 困難模式 (切分音、連續快速) ===
  {
    id: 'samba_whistle',
    name: '森巴哨子',
    bpm: 120,
    difficulty: 'hard',
    beats: [
      { time: 1000, type: 'tap' },
      { time: 1200, type: 'tap' }, // 快
      { time: 1400, type: 'tap' }, // 快
      { time: 1800, type: 'tap' }, // 切分
      { time: 2200, type: 'tap' },
      { time: 2400, type: 'tap' },
      { time: 2600, type: 'tap' },
    ],
  },
  {
    id: 'trap_beat',
    name: '陷阱節拍',
    bpm: 100,
    difficulty: 'hard',
    beats: [
      { time: 1000, type: 'tap' },
      // 快速三連打
      { time: 1700, type: 'tap' }, 
      { time: 1850, type: 'tap' }, 
      { time: 2000, type: 'tap' },
      // 反拍
      { time: 2750, type: 'tap' },
      { time: 3500, type: 'tap' },
    ],
  },
  {
    id: 'funky_sync',
    name: '放克切分',
    bpm: 110,
    difficulty: 'hard',
    beats: [
      { time: 1000, type: 'tap' },
      { time: 1750, type: 'tap' }, // 附點後
      { time: 2250, type: 'tap' }, // 反拍
      { time: 2750, type: 'tap' }, 
      { time: 3250, type: 'tap' }, 
      { time: 3500, type: 'tap' }, // 連接
    ],
  },
]

// ==================== 工具函數 ====================

export function getPatternsByPool(targetDifficulty: 'easy' | 'medium' | 'hard'): RhythmPattern[] {
  return RHYTHM_PATTERNS.filter(p => p.difficulty === targetDifficulty)
}

export function getPatternsByDifficulty(difficulty: Difficulty): RhythmPattern[] {
  if (difficulty === 'easy') {
    return getPatternsByPool('easy')
  }
  if (difficulty === 'medium') {
    return RHYTHM_PATTERNS.filter(p => p.difficulty === 'easy' || p.difficulty === 'medium')
  }
  return RHYTHM_PATTERNS.slice()
}

export function selectRandomPattern(patterns: RhythmPattern[]): RhythmPattern {
  if (patterns.length === 0) return RHYTHM_PATTERNS[0]!
  const index = Math.floor(Math.random() * patterns.length)
  return patterns[index]!
}

export function generateRoundPatterns(
  totalRounds: number,
  difficulty: Difficulty
): RhythmPattern[] {
  const patterns: RhythmPattern[] = []
  const easyPool = getPatternsByPool('easy')
  const mediumPool = getPatternsByPool('medium')
  const hardPool = getPatternsByPool('hard')

  for (let i = 0; i < totalRounds; i++) {
    // 針對 3 回合制的難度曲線優化
    // Round 1 (i=0): 暖身
    // Round 2 (i=1): 進階
    // Round 3 (i=2): 挑戰
    
    let pool: RhythmPattern[]

    if (difficulty === 'easy') {
      // Easy: 全程簡單
      pool = easyPool
    } else if (difficulty === 'medium') {
      // Medium: 簡單 -> 中等 -> 中等
      pool = i === 0 ? easyPool : mediumPool
    } else {
      // Hard: 中等 -> 困難 -> 困難
      pool = i === 0 ? mediumPool : hardPool
    }
    
    // 確保有東西可選，否則降級選取
    if (pool.length === 0) pool = easyPool
    
    patterns.push(selectRandomPattern(pool))
  }
  return patterns
}

function calculateRating(error: number, tolerance: number): TapResult['rating'] {
  if (error <= tolerance * 0.3) return 'perfect'
  if (error <= tolerance * 0.6) return 'good'
  if (error <= tolerance) return 'ok'
  return 'miss'
}

export function evaluateTap(
  actual: number,
  expected: number,
  tolerance: number
): TapResult {
  const error = Math.abs(actual - expected)
  const rating = calculateRating(error, tolerance)
  return {
    expected,
    actual,
    error,
    isGood: rating !== 'miss',
    rating,
  }
}

export function evaluateRound(
  userTaps: number[],
  pattern: RhythmPattern,
  config: RhythmMimicConfig
): RoundResult {
  const expectedTimes = pattern.beats.map(b => b.time)
  const results: TapResult[] = []
  
  const availableUserTaps = userTaps.map(time => ({ time, used: false }))
  const stats = { perfect: 0, good: 0, ok: 0, miss: 0, extra: 0 }

  // 1. 匹配階段
  for (const expected of expectedTimes) {
    let bestMatchIndex = -1
    let minError = Infinity

    for (let i = 0; i < availableUserTaps.length; i++) {
      const uTap = availableUserTaps[i]!
      if (uTap.used) continue

      const error = Math.abs(uTap.time - expected)
      if (error <= config.tolerance) {
        if (error < minError) {
          minError = error
          bestMatchIndex = i
        }
      }
    }

    if (bestMatchIndex !== -1) {
      availableUserTaps[bestMatchIndex]!.used = true
      const actual = availableUserTaps[bestMatchIndex]!.time
      const error = minError
      const rating = calculateRating(error, config.tolerance)
      
      stats[rating]++
      results.push({ expected, actual, error, isGood: rating !== 'miss', rating })
    } else {
      stats.miss++
      results.push({ expected, actual: -1, error: config.tolerance, isGood: false, rating: 'miss' })
    }
  }

  // 2. 多餘點擊
  for (const uTap of availableUserTaps) {
    if (!uTap.used) {
      stats.miss++ 
      stats.extra++
      results.push({
        expected: -1,
        actual: uTap.time,
        error: config.tolerance,
        isGood: false,
        rating: 'miss',
        isGhost: true,
      })
    }
  }

  // 3. 計算分數
  const maxPossibleScore = expectedTimes.length * 100
  const currentScore = (stats.perfect * 100) + (stats.good * 70) + (stats.ok * 40)
  const penalty = stats.extra * 10
  
  let finalScore = maxPossibleScore > 0 ? Math.round(((currentScore - penalty) / maxPossibleScore) * 100) : 0
  finalScore = Math.max(0, finalScore)

  const validHits = stats.perfect + stats.good + stats.ok
  const accuracy = expectedTimes.length > 0 ? (validHits / expectedTimes.length) * 100 : 0

  return {
    accuracy: Math.round(accuracy),
    taps: results.sort((a, b) => (a.actual > -1 ? a.actual : a.expected) - (b.actual > -1 ? b.actual : b.expected)),
    score: finalScore,
    stats
  }
}

/** 計算節奏總長度 */
export function getPatternDuration(pattern: RhythmPattern): number {
  if (pattern.beats.length === 0) return 0
  const lastBeat = pattern.beats[pattern.beats.length - 1]!
  // 保持結尾也有 500ms 的留白，讓視覺更平衡
  return lastBeat.time + 500 
}

export function calculateScore(roundResults: RoundSummary[]): number {
  if (roundResults.length === 0) return 0
  const totalScore = roundResults.reduce((sum, r) => sum + r.score, 0)
  return Math.round(totalScore / roundResults.length)
}

export function calculateGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

export function countRatings(roundResults: RoundSummary[]): RatingCounts {
  const counts: RatingCounts = { perfect: 0, good: 0, ok: 0, miss: 0 }
  for (const round of roundResults) {
    for (const tap of round.taps) {
      if (tap.rating === 'perfect') counts.perfect++
      else if (tap.rating === 'good') counts.good++
      else if (tap.rating === 'ok') counts.ok++
      else counts.miss++
    }
  }
  return counts
}

export function summarizeResult(roundResults: RoundSummary[]): RhythmMimicResult {
  let totalBeats = 0
  let perfectCount = 0
  let goodCount = 0
  let missCount = 0
  let totalErrorSum = 0
  let validHitCount = 0

  for (const round of roundResults) {
    const roundStats = round.stats ?? countRatings([round])
    perfectCount += roundStats.perfect
    goodCount += roundStats.good + roundStats.ok
    missCount += roundStats.miss 
    totalBeats += round.taps.filter(t => !t.isGhost).length

    for (const tap of round.taps) {
      if (tap.isGood && tap.actual !== -1) {
        totalErrorSum += tap.error
        validHitCount++
      }
    }
  }

  const avgError = validHitCount > 0 ? totalErrorSum / validHitCount : 0
  const finalScore = calculateScore(roundResults)
  
  const totalExpected = roundResults.reduce((sum, r) => sum + r.taps.filter(t => !t.isGhost).length, 0)
  const totalHits = perfectCount + goodCount
  const globalAccuracy = totalExpected > 0 ? (totalHits / totalExpected) * 100 : 0

  return {
    score: finalScore,
    accuracy: Math.round(globalAccuracy),
    perfectCount,
    goodCount,
    missCount,
    totalBeats,
    avgError: Math.round(avgError),
    roundResults,
  }
}

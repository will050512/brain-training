/**
 * 分數計算服務
 * 處理多維度權重計算、趨勢分析
 */

import type { 
  CognitiveDimension, 
  CognitiveScores, 
  GameSession,
  GameResult,
  Difficulty
} from '@/types'
import { gameRegistry } from '@/core/gameRegistry'
import { emptyCognitiveScores } from '@/types/cognitive'

// 定義難度乘數類型
const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
}

/**
 * 計算遊戲結果的認知維度分數
 * 根據遊戲的多維度權重分配分數
 */
export function calculateCognitiveScoresFromResult(
  gameId: string,
  result: GameResult
): Record<CognitiveDimension, number> {
  const weights = gameRegistry.getCognitiveWeights(gameId)
  const scores: Record<CognitiveDimension, number> = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0,
  }

  // 遍歷權重物件，計算各維度分數
  const entries = Object.entries(weights) as [CognitiveDimension, number][]
  entries.forEach(([dimension, weight]) => {
    if (weight && weight > 0) {
      scores[dimension] = result.score * weight
    }
  })

  return scores
}

/**
 * 計算使用者的綜合認知分數
 * 根據所有遊戲記錄加權平均
 */
export function calculateOverallCognitiveScores(
  sessions: GameSession[]
): CognitiveScores {
  if (sessions.length === 0) {
    return emptyCognitiveScores()
  }

  const dimensionMap = gameRegistry.getDimensionGameMap()
  const scores: CognitiveScores = emptyCognitiveScores()
  const weightSums: Record<CognitiveDimension, number> = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0,
  }

  // 遍歷每個維度
  for (const [dimension, gameWeights] of dimensionMap) {
    gameWeights.forEach((gw: { gameId: string; weight: number }) => {
      // 找出該遊戲的所有記錄
      const gameSessions = sessions.filter(s => s.gameId === gw.gameId)
      if (gameSessions.length > 0) {
        // 計算該遊戲的平均分數
        const avgScore = gameSessions.reduce((sum, s) => sum + s.result.score, 0) / gameSessions.length
        scores[dimension] += avgScore * gw.weight
        weightSums[dimension] += gw.weight
      }
    })

    // 計算加權平均
    const sumValue = weightSums[dimension]
    if (sumValue && sumValue > 0) {
      scores[dimension] = Math.round(scores[dimension] / sumValue)
    }
  }

  return scores
}

export type DimensionSampleCounts = Record<CognitiveDimension, number>

export function calculateDimensionSampleCounts(
  sessions: GameSession[]
): DimensionSampleCounts {
  const counts: DimensionSampleCounts = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0,
  }

  for (const session of sessions) {
    const weights = gameRegistry.getCognitiveWeights(session.gameId)
    const entries = Object.entries(weights) as [CognitiveDimension, number][]
    for (const [dimension, weight] of entries) {
      if (weight && weight > 0) {
        counts[dimension] += 1
      }
    }
  }

  return counts
}

// ===== 認知領域分數（PDF 專用） =====

export type CognitiveDomain =
  | 'memory'
  | 'attention'
  | 'processing'
  | 'executive'
  | 'language'

export interface CognitiveDomainScores {
  memory: number
  attention: number
  processing: number
  executive: number
  language: number
}

const DOMAIN_WEIGHTS: Record<CognitiveDomain, Partial<Record<CognitiveDimension, number>>> = {
  memory: { memory: 1 },
  attention: { attention: 1 },
  processing: { reaction: 0.7, attention: 0.3 },
  executive: { logic: 0.6, cognition: 0.4 },
  language: { cognition: 0.7, coordination: 0.3 },
}

// 對外提供：五大領域定義（供報表/關聯分析等一致使用）
export const COGNITIVE_DOMAIN_WEIGHTS = DOMAIN_WEIGHTS

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * 將六大認知維度映射為 PDF 使用的五大領域分數
 * - 注意：此為過渡性映射，待有獨立語言/執行/處理速度量表後再調整。
 */
export function calculateCognitiveDomainScores(
  scores: CognitiveScores,
  sampleCounts?: DimensionSampleCounts
): CognitiveDomainScores {
  const computeDomain = (domain: CognitiveDomain): number => {
    const weights = DOMAIN_WEIGHTS[domain]
    let totalWeight = 0
    let sum = 0

    for (const [dimension, weight] of Object.entries(weights)) {
      const dim = dimension as CognitiveDimension
      const dimWeight = weight ?? 0
      if (dimWeight <= 0) continue
      if (sampleCounts && (sampleCounts[dim] || 0) === 0) continue
      const value = scores[dim] ?? 0
      totalWeight += dimWeight
      sum += value * dimWeight
    }

    if (totalWeight === 0) return 0
    return clampScore(sum / totalWeight)
  }

  return {
    memory: computeDomain('memory'),
    attention: computeDomain('attention'),
    processing: computeDomain('processing'),
    executive: computeDomain('executive'),
    language: computeDomain('language'),
  }
}

/**
 * 計算特定時間範圍的認知分數
 */
export function calculateCognitiveScoresForPeriod(
  sessions: GameSession[],
  startDate: Date,
  endDate: Date
): CognitiveScores {
  const filteredSessions = sessions.filter(s => {
    const date = new Date(s.createdAt)
    return date >= startDate && date <= endDate
  })
  return calculateOverallCognitiveScores(filteredSessions)
}

/**
 * 計算分數趨勢（與前一期比較）
 */
export interface ScoreTrend {
  dimension: CognitiveDimension
  currentScore: number
  previousScore: number
  change: number          // 分數變化
  changePercent: number   // 變化百分比
  trend: 'improving' | 'stable' | 'declining'
}

export function calculateScoreTrends(
  currentScores: CognitiveScores,
  previousScores: CognitiveScores
): ScoreTrend[] {
  const dimensions: CognitiveDimension[] = [
    'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
  ]

  return dimensions.map(dimension => {
    const current = currentScores[dimension]
    const previous = previousScores[dimension]
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : 0

    let trend: 'improving' | 'stable' | 'declining'
    if (change > 5) {
      trend = 'improving'
    } else if (change < -5) {
      trend = 'declining'
    } else {
      trend = 'stable'
    }

    return {
      dimension,
      currentScore: current,
      previousScore: previous,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      trend,
    }
  })
}

/**
 * 計算歷史分數序列（用於趨勢圖）
 */
export interface ScoreHistory {
  date: string
  scores: CognitiveScores
  gamesPlayed: number
}

export function calculateScoreHistory(
  sessions: GameSession[],
  groupBy: 'day' | 'week' | 'month' = 'week'
): ScoreHistory[] {
  if (sessions.length === 0) return []

  // 按日期分組
  const groups = new Map<string, GameSession[]>()
  
  sessions.forEach(session => {
    const date = new Date(session.createdAt)
    let key: string

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0] || ''
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0] || ''
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(session)
  })

  // 轉換為歷史記錄
  const history: ScoreHistory[] = []
  for (const [date, groupSessions] of groups) {
    history.push({
      date,
      scores: calculateOverallCognitiveScores(groupSessions),
      gamesPlayed: groupSessions.length,
    })
  }

  // 按日期排序
  return history.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 計算單次遊戲的表現等級
 */
export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'needsWork'

export function getPerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'needsWork'
}

/**
 * 取得表現等級的顏色
 */
export function getPerformanceColor(level: PerformanceLevel): string {
  switch (level) {
    case 'excellent': return '#22c55e'  // green
    case 'good': return '#3b82f6'       // blue
    case 'average': return '#eab308'    // yellow
    case 'needsWork': return '#ef4444'  // red
  }
}

/**
 * 計算難度加權分數（用於排行榜等）
 */
export function calculateWeightedScore(score: number, difficulty: Difficulty): number {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] || 1.0
  return Math.round(score * multiplier)
}

/**
 * 計算綜合認知指數（0-100）
 */
export function calculateCognitiveIndex(scores: CognitiveScores): number {
  const values: number[] = Object.values(scores)
  if (values.every(v => v === 0)) return 0
  
  const sum = values.reduce((a: number, b: number) => a + b, 0)
  return Math.round(sum / values.length)
}

/**
 * 生成訓練建議
 */
export interface TrainingSuggestion {
  dimension: CognitiveDimension
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedGames: string[]
}

export function generateTrainingSuggestions(
  scores: CognitiveScores
): TrainingSuggestion[] {
  const dimensions: CognitiveDimension[] = [
    'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
  ]

  const dimensionNames: Record<CognitiveDimension, string> = {
    reaction: '反應力',
    logic: '邏輯力',
    memory: '記憶力',
    cognition: '認知力',
    coordination: '協調力',
    attention: '注意力',
  }

  const suggestions: TrainingSuggestion[] = []

  dimensions.forEach(dimension => {
    const score = scores[dimension]
    const games = gameRegistry.getByDimension(dimension)
    const gameNames = games.map((g: { name: string }) => g.name)

    let priority: 'high' | 'medium' | 'low'
    let message: string

    if (score < 50) {
      priority = 'high'
      message = `您的${dimensionNames[dimension]}需要加強訓練，建議每天練習相關遊戲。`
    } else if (score < 70) {
      priority = 'medium'
      message = `您的${dimensionNames[dimension]}表現中等，持續練習可以獲得提升。`
    } else {
      priority = 'low'
      message = `您的${dimensionNames[dimension]}表現良好，請繼續保持！`
    }

    suggestions.push({
      dimension,
      priority,
      message,
      suggestedGames: gameNames,
    })
  })

  // 按優先級排序
  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
}

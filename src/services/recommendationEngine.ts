/**
 * 智慧遊戲推薦引擎
 * 根據用戶認知表現、歷史記錄、弱項維度推薦適合的遊戲
 */

import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import type { GameSession, GameDefinition, Difficulty } from '@/types/game'
import { gameRegistry } from '@/core/gameRegistry'

export interface GameRecommendation {
  gameId: string
  game: GameDefinition
  score: number // 推薦分數 0-100
  reason: string
  suggestedDifficulty: Difficulty
  priority: 'high' | 'medium' | 'low'
}

export interface RecommendationConfig {
  // 弱項權重（越弱的維度越優先推薦）
  weaknessWeight: number
  // 新鮮度權重（越久沒玩越優先）
  freshnessWeight: number
  // 多樣性權重（避免重複玩同一遊戲）
  diversityWeight: number
  // 適難度權重（推薦適合難度的遊戲）
  difficultyMatchWeight: number
}

const DEFAULT_CONFIG: RecommendationConfig = {
  weaknessWeight: 0.4,
  freshnessWeight: 0.25,
  diversityWeight: 0.2,
  difficultyMatchWeight: 0.15,
}

/**
 * 分析認知弱項
 */
export function analyzeWeaknesses(scores: CognitiveScores): CognitiveDimension[] {
  const dimensions: [CognitiveDimension, number][] = [
    ['reaction', scores.reaction],
    ['logic', scores.logic],
    ['memory', scores.memory],
    ['cognition', scores.cognition],
    ['coordination', scores.coordination],
    ['attention', scores.attention],
  ]

  // 計算平均分
  const avg = dimensions.reduce((sum, [, score]) => sum + score, 0) / dimensions.length

  // 找出低於平均的維度（弱項）
  return dimensions
    .filter(([, score]) => score < avg)
    .sort((a, b) => a[1] - b[1]) // 從低到高排序
    .map(([dim]) => dim)
}

/**
 * 計算遊戲新鮮度分數
 * 越久沒玩分數越高
 */
function calculateFreshnessScore(
  gameId: string,
  sessions: GameSession[],
  maxDays: number = 7
): number {
  const gameSessions = sessions.filter(s => s.gameId === gameId)
  
  if (gameSessions.length === 0) {
    return 100 // 從未玩過，最高新鮮度
  }

  const lastPlayed = Math.max(...gameSessions.map(s => new Date(s.createdAt).getTime()))
  const daysSinceLastPlay = (Date.now() - lastPlayed) / (1000 * 60 * 60 * 24)

  return Math.min(100, (daysSinceLastPlay / maxDays) * 100)
}

/**
 * 計算多樣性分數
 * 最近玩得越少分數越高
 */
function calculateDiversityScore(
  gameId: string,
  recentSessions: GameSession[],
  lookbackCount: number = 10
): number {
  const recent = recentSessions.slice(0, lookbackCount)
  const playCount = recent.filter(s => s.gameId === gameId).length
  
  return Math.max(0, 100 - (playCount / lookbackCount) * 100)
}

/**
 * 根據表現建議難度
 */
export function suggestDifficulty(
  gameId: string,
  sessions: GameSession[],
  cognitiveScores: CognitiveScores
): Difficulty {
  const gameSessions = sessions.filter(s => s.gameId === gameId)
  
  if (gameSessions.length === 0) {
    // 從未玩過，根據整體認知水平決定
    const avgScore = (
      cognitiveScores.reaction +
      cognitiveScores.logic +
      cognitiveScores.memory +
      cognitiveScores.cognition +
      cognitiveScores.coordination +
      cognitiveScores.attention
    ) / 6

    if (avgScore >= 70) return 'medium'
    return 'easy'
  }

  // 取最近5次遊戲的平均正確率
  const recentGames = gameSessions.slice(-5)
  const avgAccuracy = recentGames.reduce((sum, s) => sum + s.result.accuracy, 0) / recentGames.length

  // 根據正確率調整難度
  if (avgAccuracy >= 0.85) return 'hard'
  if (avgAccuracy >= 0.65) return 'medium'
  return 'easy'
}

/**
 * 計算遊戲與弱項的匹配分數
 */
function calculateWeaknessMatchScore(
  game: GameDefinition,
  weaknesses: CognitiveDimension[]
): number {
  if (weaknesses.length === 0) return 50 // 無明顯弱項

  const weights = game.cognitiveWeights
  let totalWeight = 0
  let matchedWeight = 0

  Object.entries(weights).forEach(([dim, weight]) => {
    const w = weight as number
    totalWeight += w
    if (weaknesses.includes(dim as CognitiveDimension)) {
      // 越靠前的弱項（分數越低）匹配度越高
      const weaknessIndex = weaknesses.indexOf(dim as CognitiveDimension)
      const multiplier = 1 + (weaknesses.length - weaknessIndex) / weaknesses.length
      matchedWeight += w * multiplier
    }
  })

  return totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0
}

/**
 * 生成遊戲推薦
 */
export function generateRecommendations(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[],
  config: RecommendationConfig = DEFAULT_CONFIG
): GameRecommendation[] {
  const weaknesses = analyzeWeaknesses(cognitiveScores)
  const allGames = gameRegistry.getAll()
  
  const recommendations: GameRecommendation[] = allGames.map(game => {
    // 計算各項分數
    const weaknessScore = calculateWeaknessMatchScore(game, weaknesses)
    const freshnessScore = calculateFreshnessScore(game.id, sessions)
    const diversityScore = calculateDiversityScore(game.id, sessions)
    
    // 建議難度
    const suggestedDifficulty = suggestDifficulty(game.id, sessions, cognitiveScores)
    
    // 難度匹配分數（是否有對應難度）
    const difficultyMatchScore = game.difficulties.includes(suggestedDifficulty) ? 100 : 50

    // 加權總分
    const totalScore = 
      weaknessScore * config.weaknessWeight +
      freshnessScore * config.freshnessWeight +
      diversityScore * config.diversityWeight +
      difficultyMatchScore * config.difficultyMatchWeight

    // 生成推薦原因
    let reason = ''
    if (weaknessScore > 60) {
      const targetDimension = Object.entries(game.cognitiveWeights)
        .filter(([dim]) => weaknesses.includes(dim as CognitiveDimension))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]
      
      if (targetDimension) {
        const dimNames: Record<CognitiveDimension, string> = {
          reaction: '反應力',
          logic: '邏輯力',
          memory: '記憶力',
          cognition: '認知力',
          coordination: '協調力',
          attention: '專注力',
        }
        reason = `強化${dimNames[targetDimension[0] as CognitiveDimension]}`
      }
    } else if (freshnessScore > 80) {
      reason = '許久未玩，嘗試看看'
    } else if (diversityScore > 80) {
      reason = '增加遊戲多樣性'
    } else {
      reason = '均衡訓練'
    }

    // 決定優先級
    let priority: 'high' | 'medium' | 'low'
    if (totalScore >= 70) priority = 'high'
    else if (totalScore >= 45) priority = 'medium'
    else priority = 'low'

    return {
      gameId: game.id,
      game,
      score: Math.round(totalScore),
      reason,
      suggestedDifficulty,
      priority,
    }
  })

  // 按分數排序
  return recommendations.sort((a, b) => b.score - a.score)
}

/**
 * 取得今日推薦遊戲（前3個高優先級）
 */
export function getDailyRecommendations(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[],
  count: number = 3
): GameRecommendation[] {
  const all = generateRecommendations(cognitiveScores, sessions)
  
  // 優先選擇高優先級
  const highPriority = all.filter(r => r.priority === 'high')
  
  if (highPriority.length >= count) {
    return highPriority.slice(0, count)
  }

  // 補充中優先級
  const mediumPriority = all.filter(r => r.priority === 'medium')
  return [...highPriority, ...mediumPriority].slice(0, count)
}

/**
 * 取得針對特定維度的推薦
 */
export function getRecommendationsByDimension(
  dimension: CognitiveDimension,
  cognitiveScores: CognitiveScores,
  sessions: GameSession[]
): GameRecommendation[] {
  const all = generateRecommendations(cognitiveScores, sessions)
  
  return all.filter(r => {
    const weights = r.game.cognitiveWeights
    const weight = weights[dimension] as number | undefined
    return weight !== undefined && weight > 0.3
  })
}

/**
 * 取得用戶訓練建議
 */
export function getTrainingSuggestion(
  cognitiveScores: CognitiveScores
): { dimension: CognitiveDimension; message: string; games: string[] } {
  const weaknesses = analyzeWeaknesses(cognitiveScores)
  
  const dimNames: Record<CognitiveDimension, string> = {
    reaction: '反應力',
    logic: '邏輯力',
    memory: '記憶力',
    cognition: '認知力',
    coordination: '協調力',
    attention: '專注力',
  }

  if (weaknesses.length === 0) {
    // 無明顯弱項，取得分數最低的維度
    const allDims: CognitiveDimension[] = ['reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention']
    const sortedDims = allDims.sort((a, b) => cognitiveScores[a] - cognitiveScores[b])
    const lowestDim: CognitiveDimension = sortedDims[0] ?? 'memory'
    
    return {
      dimension: lowestDim,
      message: `您的認知能力表現均衡！建議持續訓練${dimNames[lowestDim]}保持狀態。`,
      games: gameRegistry.getByDimension(lowestDim).map(g => g.id),
    }
  }

  const targetDim: CognitiveDimension = weaknesses[0] ?? 'memory'
  const targetGames = gameRegistry.getByDimension(targetDim)

  return {
    dimension: targetDim,
    message: `建議加強訓練「${dimNames[targetDim]}」，以下遊戲特別適合您：`,
    games: targetGames.map(g => g.id),
  }
}

import type { CognitiveDimension, CognitiveScores } from '@/types/cognitive'
import type { GameSession } from '@/types/game'
import { calculateOverallCognitiveScores, calculateScoreHistory } from '@/services/scoreCalculator'
import { getLatestMiniCogResult } from '@/services/db'
import { getTrendSummary } from '@/services/declineDetectionService'
import type { DeclineDetectionMode } from '@/stores/settingsStore'
import {
  generatePersonalizedRecommendations,
  type PersonalizedNutritionResult,
  type ScoreHistory as NutritionScoreHistory,
  type UserNutritionProfile
} from '@/services/nutritionPlaceholder'

export interface NutritionRecommendationInput {
  odId: string
  age: number
  educationYears: number
  /** 可選：若未提供，會由 sessions 的最新分數推導 */
  cognitiveScores?: CognitiveScores
  sessions: GameSession[]
}

function getDeclineDetectionModeFromStorage(): DeclineDetectionMode {
  const settingsData = localStorage.getItem('brain-training-settings')
  if (!settingsData) return 'general'

  try {
    const parsed = JSON.parse(settingsData) as { declineDetectionMode?: DeclineDetectionMode }
    return parsed.declineDetectionMode ?? 'general'
  } catch {
    return 'general'
  }
}

async function getDeclineAreas(odId: string): Promise<CognitiveDimension[]> {
  try {
    const mode = getDeclineDetectionModeFromStorage()
    const summary = await getTrendSummary(odId, mode)

    return summary.dimensions
      .filter(d => d.trend === 'declining' || d.trend === 'severe-decline')
      .map(d => d.dimension)
  } catch {
    return []
  }
}

function toNutritionScoreHistory(sessions: GameSession[]): NutritionScoreHistory[] {
  const history = calculateScoreHistory(sessions, 'day')
  return history.map(h => ({ date: h.date, scores: h.scores }))
}

export async function generateNutritionResultForUser(
  input: NutritionRecommendationInput
): Promise<PersonalizedNutritionResult> {
  const [latestMiniCog, declineAreas] = await Promise.all([
    getLatestMiniCogResult(input.odId),
    getDeclineAreas(input.odId)
  ])

  const scoreHistory = toNutritionScoreHistory(input.sessions)

  const derivedScores = calculateOverallCognitiveScores(input.sessions)
  const latestFromHistory = scoreHistory.length > 0
    ? (scoreHistory[scoreHistory.length - 1]?.scores ?? derivedScores)
    : derivedScores

  const cognitiveScores = input.cognitiveScores ?? latestFromHistory

  const profile: UserNutritionProfile = {
    age: input.age,
    educationYears: input.educationYears,
    miniCogScore: latestMiniCog?.totalScore,
    miniCogAtRisk: latestMiniCog?.atRisk,
    cognitiveScores,
    scoreHistory,
    declineAreas
  }

  return generatePersonalizedRecommendations(profile)
}

/**
 * 每日訓練計畫服務
 * 根據用戶設定時長和認知弱項，智慧選擇遊戲組合
 * 支援中斷恢復功能
 * 整合 Mini-Cog 評估結果與行為分析進行個人化難度調整
 */

import type { CognitiveDimension, CognitiveScores } from '@/types/cognitive'
import type { Difficulty, SubDifficulty, GameDefinition } from '@/types/game'
import { gameRegistry } from '@/core/gameRegistry'
import { getLocalDateKey, parseLocalDateKey } from '@/utils/dateKey'
import { 
  getTodayTrainingSession, 
  saveDailyTrainingSession,
  deleteDailyTrainingSession,
  generateId,
  getLatestMiniCogResult,
  type DailyTrainingSession
} from '@/services/db'
import { analyzeWeaknesses, suggestDifficulty } from '@/services/recommendationEngine'
import { getCurrentGameDifficulty } from '@/services/db'
import type { DailyTrainingDuration } from '@/stores/settingsStore'

// 訓練狀態
export type TrainingStatus = 'not-started' | 'in-progress' | 'interrupted' | 'completed'

// 訓練遊戲項目
export interface TrainingGameItem {
  gameId: string
  game: GameDefinition
  difficulty: Difficulty
  subDifficulty: SubDifficulty
  estimatedTime: number
  targetDimensions: CognitiveDimension[]
  isCompleted: boolean
  order: number
}

// 每日訓練計畫
export interface DailyTrainingPlan {
  id: string
  date: string
  status: TrainingStatus
  games: TrainingGameItem[]
  totalEstimatedTime: number
  completedGames: number
  totalGames: number
  progress: number
  startedAt?: string
  completedAt?: string
  canContinue: boolean
}

// 個人化難度建議結果
export interface PersonalizedDifficultyRecommendation {
  difficulty: Difficulty
  subDifficulty: SubDifficulty
  reason: string
  adjustmentFactors: {
    miniCogScore?: number
    recentAccuracy?: number
    behaviorPattern?: string
    fatigueLevel?: string
  }
}

// 時長對應遊戲數量配置
// 10 分鐘使用迷你模式遊戲（平均每個約 40 秒），其他時長使用標準模式
const DURATION_GAME_CONFIG: Record<DailyTrainingDuration, { 
  min: number
  max: number
  useMiniMode: boolean  // 是否使用迷你模式
}> = {
  10: { min: 6, max: 6, useMiniMode: true },   // 迷你模式：6 個遊戲 × 40 秒 ≈ 4 分鐘（含緩衝）
  15: { min: 6, max: 7, useMiniMode: false },  // 標準模式
  20: { min: 6, max: 8, useMiniMode: false },
  30: { min: 6, max: 10, useMiniMode: false }
}

// Mini-Cog 分數對應基礎難度（強化限制）
// 分數 ≤2：限制 easy-1~2，避免過度挑戰
// 分數 3：限制 easy-3~medium-1
// 分數 4-5：允許較高難度
const MINICOG_DIFFICULTY_MAP: Record<number, { 
  difficulty: Difficulty
  subDifficulty: SubDifficulty
  maxDifficulty: Difficulty
  maxSubDifficulty: SubDifficulty
}> = {
  5: { difficulty: 'medium', subDifficulty: 2, maxDifficulty: 'hard', maxSubDifficulty: 3 },
  4: { difficulty: 'medium', subDifficulty: 1, maxDifficulty: 'hard', maxSubDifficulty: 1 },
  3: { difficulty: 'easy', subDifficulty: 3, maxDifficulty: 'medium', maxSubDifficulty: 2 },
  2: { difficulty: 'easy', subDifficulty: 2, maxDifficulty: 'easy', maxSubDifficulty: 3 },  // 限制
  1: { difficulty: 'easy', subDifficulty: 1, maxDifficulty: 'easy', maxSubDifficulty: 2 },  // 限制
  0: { difficulty: 'easy', subDifficulty: 1, maxDifficulty: 'easy', maxSubDifficulty: 1 }   // 限制
}

/**
 * 取得遊戲的主要認知維度
 */
function getGameDimensions(game: GameDefinition): CognitiveDimension[] {
  return Object.entries(game.cognitiveWeights)
    .filter(([_, weight]) => (weight as number) > 0.2)
    .map(([dim]) => dim as CognitiveDimension)
}

/**
 * 計算維度覆蓋分數
 */
function calculateCoverageScore(
  selectedGames: GameDefinition[],
  targetDimensions: CognitiveDimension[]
): number {
  const covered = new Set<CognitiveDimension>()
  
  for (const game of selectedGames) {
    const dims = getGameDimensions(game)
    dims.forEach(d => covered.add(d))
  }
  
  // 優先覆蓋目標維度
  let score = 0
  for (const dim of targetDimensions) {
    if (covered.has(dim)) score += 2
  }
  
  // 額外覆蓋其他維度
  score += covered.size
  
  return score
}

/**
 * 智慧選擇遊戲組合
 */
export function selectGamesForTraining(
  duration: DailyTrainingDuration,
  cognitiveScores: CognitiveScores,
  recentGames: string[] = [],
  options: {
    untestedDimensions?: CognitiveDimension[]
    prioritizeUntested?: boolean
  } = {}
): { games: GameDefinition[]; useMiniMode: boolean } {
  const config = DURATION_GAME_CONFIG[duration]
  const allGames = gameRegistry.getAll()
  const weaknesses = analyzeWeaknesses(cognitiveScores)

  const untestedDimensions = options.untestedDimensions || []
  const prioritizeUntested = options.prioritizeUntested === true
  
  // 所有維度（確保覆蓋）
  const allDimensions: CognitiveDimension[] = [
    'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
  ]
  
  // 優先維度（弱項優先）
  const basePriorityDimensions = weaknesses.length > 0 ? weaknesses : allDimensions.slice(0, 3)

  const priorityDimensions = (prioritizeUntested && untestedDimensions.length > 0)
    ? [...untestedDimensions, ...basePriorityDimensions.filter(d => !untestedDimensions.includes(d))]
    : basePriorityDimensions
  
  // 計算每個遊戲的推薦分數
  const scoredGames = allGames.map(game => {
    let score = 0
    const gameDims = getGameDimensions(game)
    
    // 覆蓋弱項維度加分
    for (const dim of priorityDimensions) {
      if (gameDims.includes(dim)) {
        const weight = game.cognitiveWeights[dim] as number || 0
        score += weight * 100
      }
    }
    
    // 最近玩過的減分（避免重複）
    if (recentGames.includes(game.id)) {
      score -= 30
    }
    
    // 確保每個維度都有遊戲
    for (const dim of allDimensions) {
      if (gameDims.includes(dim)) {
        score += 5
      }
    }
    
    return { game, score }
  })
  
  // 按分數排序
  scoredGames.sort((a, b) => b.score - a.score)
  
  // 貪婪選擇，確保維度覆蓋
  const selectedGames: GameDefinition[] = []
  const coveredDimensions = new Set<CognitiveDimension>()
  let totalTime = 0
  const avgTimePerGame = duration * 60 / ((config.min + config.max) / 2) // 秒
  
  // 第一輪：確保覆蓋所有 6 個維度（強制）
  const coverageOrder = (prioritizeUntested && untestedDimensions.length > 0)
    ? [...untestedDimensions, ...allDimensions.filter(d => !untestedDimensions.includes(d))]
    : allDimensions

  for (const dim of coverageOrder) {
    if (coveredDimensions.has(dim)) continue
    
    // 找出能覆蓋此維度且尚未選擇的遊戲，按分數排序
    const candidateGames = scoredGames.filter(({ game }) => {
      const dims = getGameDimensions(game)
      return dims.includes(dim) && !selectedGames.includes(game)
    })
    
    // 強制選擇一個遊戲來覆蓋此維度
    if (candidateGames.length > 0) {
      const best = candidateGames[0]?.game
      if (best) {
        selectedGames.push(best)
        getGameDimensions(best).forEach(d => coveredDimensions.add(d))
        totalTime += best.estimatedTime.medium
      }
    }
  }

  if (prioritizeUntested && untestedDimensions.length > 0) {
    const sorted = selectedGames
      .map((game, index) => {
        const dims = getGameDimensions(game)
        const coversUntested = untestedDimensions.some(d => dims.includes(d))
        return { game, index, coversUntested }
      })
      .sort((a, b) => {
        if (a.coversUntested === b.coversUntested) return a.index - b.index
        return a.coversUntested ? -1 : 1
      })
      .map(x => x.game)

    selectedGames.splice(0, selectedGames.length, ...sorted)
  }
  
  // 檢查是否覆蓋所有維度，如果沒有則嘗試用備選遊戲
  for (const dim of allDimensions) {
    if (coveredDimensions.has(dim)) continue
    
    // 降低閾值尋找可覆蓋此維度的遊戲
    const backupGames = allGames.filter(game => {
      const weight = game.cognitiveWeights[dim] as number || 0
      return weight > 0.1 && !selectedGames.includes(game)
    })
    
    if (backupGames.length > 0) {
      const backup = backupGames[0]
      if (backup) {
        selectedGames.push(backup)
        getGameDimensions(backup).forEach(d => coveredDimensions.add(d))
      }
    }
  }
  
  // 第二輪：填充到目標數量
  for (const { game } of scoredGames) {
    if (selectedGames.length >= config.max) break
    if (selectedGames.includes(game)) continue
    
    selectedGames.push(game)
  }
  
  // 確保至少達到最小數量
  while (selectedGames.length < config.min && scoredGames.length > selectedGames.length) {
    const remaining = scoredGames.filter(({ game }) => !selectedGames.includes(game))
    const first = remaining[0]?.game
    if (first) {
      selectedGames.push(first)
    } else {
      break
    }
  }
  
  return { games: selectedGames, useMiniMode: config.useMiniMode }
}

/**
 * 建立每日訓練計畫
 */
export async function createDailyTrainingPlan(
  odId: string,
  duration: DailyTrainingDuration,
  cognitiveScores: CognitiveScores,
  recentSessions: { gameId: string }[] = [],
  options: {
    untestedDimensions?: CognitiveDimension[]
    prioritizeUntested?: boolean
  } = {}
): Promise<DailyTrainingPlan> {
  const today = getLocalDateKey()
  
  // 檢查是否已有今日計畫
  const existingSession = await getTodayTrainingSession(odId)
  if (existingSession) {
    return convertSessionToPlan(existingSession)
  }
  
  // 取得最近遊玩的遊戲
  const recentGames = recentSessions.slice(0, 5).map(s => s.gameId)
  
  // 選擇遊戲
  const { games: selectedGames, useMiniMode } = selectGamesForTraining(duration, cognitiveScores, recentGames, options)
  
  // 建立計畫項目
  const games: TrainingGameItem[] = await Promise.all(
    selectedGames.map(async (game, index) => {
      // 取得建議難度
      const currentDiff = await getCurrentGameDifficulty(odId, game.id)
      const difficulty = currentDiff?.difficulty || 'easy'
      const subDifficulty = currentDiff?.subDifficulty || 2
      
      // 根據是否為迷你模式選擇時間
      const timeMode = useMiniMode ? 'mini' : difficulty
      
      return {
        gameId: game.id,
        game,
        difficulty,
        subDifficulty,
        estimatedTime: game.estimatedTime[timeMode],
        targetDimensions: getGameDimensions(game),
        isCompleted: false,
        order: index + 1
      }
    })
  )
  
  const totalEstimatedTime = games.reduce((sum, g) => sum + g.estimatedTime, 0)
  
  // 儲存會話
  const session: DailyTrainingSession = {
    id: generateId(),
    odId,
    date: today,
    plannedGames: games.map(g => ({
      gameId: g.gameId,
      difficulty: g.difficulty,
      subDifficulty: g.subDifficulty,
      estimatedTime: g.estimatedTime
    })),
    completedGames: [],
    interrupted: false,
    startedAt: new Date().toISOString(),
    totalDuration: 0
  }
  
  await saveDailyTrainingSession(session)
  
  return {
    id: session.id,
    date: today,
    status: 'not-started',
    games,
    totalEstimatedTime,
    completedGames: 0,
    totalGames: games.length,
    progress: 0,
    canContinue: false
  }
}

/**
 * 將儲存的會話轉換為計畫格式
 */
function convertSessionToPlan(session: DailyTrainingSession): DailyTrainingPlan {
  const games: TrainingGameItem[] = session.plannedGames.map((pg, index) => {
    const game = gameRegistry.get(pg.gameId)
    return {
      gameId: pg.gameId,
      game: game!,
      difficulty: pg.difficulty,
      subDifficulty: pg.subDifficulty,
      estimatedTime: pg.estimatedTime,
      targetDimensions: game ? getGameDimensions(game) : [],
      isCompleted: session.completedGames.includes(pg.gameId),
      order: index + 1
    }
  })
  
  const completedCount = session.completedGames.length
  const totalCount = session.plannedGames.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  
  let status: TrainingStatus
  if (completedCount === 0 && !session.startedAt) {
    status = 'not-started'
  } else if (completedCount === totalCount) {
    status = 'completed'
  } else if (session.interrupted) {
    status = 'interrupted'
  } else {
    status = 'in-progress'
  }
  
  return {
    id: session.id,
    date: session.date,
    status,
    games,
    totalEstimatedTime: games.reduce((sum, g) => sum + g.estimatedTime, 0),
    completedGames: completedCount,
    totalGames: totalCount,
    progress,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    canContinue: status === 'interrupted' || status === 'in-progress'
  }
}

/**
 * 取得今日訓練計畫
 */
export async function getTodayPlan(odId: string): Promise<DailyTrainingPlan | null> {
  const session = await getTodayTrainingSession(odId)
  if (!session) return null
  return convertSessionToPlan(session)
}

/**
 * 標記遊戲完成
 */
export async function markGameCompleted(
  odId: string,
  gameId: string,
  duration: number
): Promise<DailyTrainingPlan | null> {
  const session = await getTodayTrainingSession(odId)
  if (!session) return null
  
  if (!session.completedGames.includes(gameId)) {
    session.completedGames.push(gameId)
    session.totalDuration += duration
    session.interrupted = false
    
    // 檢查是否全部完成
    if (session.completedGames.length === session.plannedGames.length) {
      session.completedAt = new Date().toISOString()
    }
    
    await saveDailyTrainingSession(session)
  }
  
  return convertSessionToPlan(session)
}

/**
 * 標記訓練中斷
 */
export async function markTrainingInterrupted(odId: string): Promise<void> {
  const session = await getTodayTrainingSession(odId)
  if (session && session.completedGames.length < session.plannedGames.length) {
    session.interrupted = true
    await saveDailyTrainingSession(session)
  }
}

/**
 * 繼續訓練
 */
export async function resumeTraining(odId: string): Promise<DailyTrainingPlan | null> {
  const session = await getTodayTrainingSession(odId)
  if (session) {
    session.interrupted = false
    await saveDailyTrainingSession(session)
    return convertSessionToPlan(session)
  }
  return null
}

/**
 * 重新生成每日訓練計畫
 * 刪除今日現有計畫並重新生成
 */
export async function regenerateDailyPlan(
  odId: string,
  duration: DailyTrainingDuration,
  cognitiveScores: CognitiveScores,
  recentSessions: { gameId: string; accuracy?: number; id?: string }[] = [],
  options: {
    untestedDimensions?: CognitiveDimension[]
    prioritizeUntested?: boolean
  } = {}
): Promise<DailyTrainingPlan> {
  // 刪除今日現有計畫
  const existingSession = await getTodayTrainingSession(odId)
  if (existingSession) {
    await deleteDailyTrainingSession(existingSession.id)
  }
  
  // 重新生成個人化計畫
  return createPersonalizedTrainingPlan(odId, duration, cognitiveScores, recentSessions, options)
}

/**
 * 重新開始訓練
 */
export async function restartTraining(
  odId: string,
  duration: DailyTrainingDuration,
  cognitiveScores: CognitiveScores,
  recentSessions: { gameId: string }[] = [],
  options: {
    untestedDimensions?: CognitiveDimension[]
    prioritizeUntested?: boolean
  } = {}
): Promise<DailyTrainingPlan> {
  const today = getLocalDateKey()
  const recentGames = recentSessions.slice(0, 5).map(s => s.gameId)
  const { games: selectedGames, useMiniMode } = selectGamesForTraining(duration, cognitiveScores, recentGames, options)
  
  const games: TrainingGameItem[] = await Promise.all(
    selectedGames.map(async (game, index) => {
      const currentDiff = await getCurrentGameDifficulty(odId, game.id)
      const difficulty = currentDiff?.difficulty || 'easy'
      const subDifficulty = currentDiff?.subDifficulty || 2
      const timeMode = useMiniMode ? 'mini' : difficulty
      
      return {
        gameId: game.id,
        game,
        difficulty,
        subDifficulty,
        estimatedTime: game.estimatedTime[timeMode],
        targetDimensions: getGameDimensions(game),
        isCompleted: false,
        order: index + 1
      }
    })
  )
  
  const session: DailyTrainingSession = {
    id: generateId(),
    odId,
    date: today,
    plannedGames: games.map(g => ({
      gameId: g.gameId,
      difficulty: g.difficulty,
      subDifficulty: g.subDifficulty,
      estimatedTime: g.estimatedTime
    })),
    completedGames: [],
    interrupted: false,
    startedAt: new Date().toISOString(),
    totalDuration: 0
  }
  
  await saveDailyTrainingSession(session)
  
  return convertSessionToPlan(session)
}

/**
 * 取得下一個待完成的遊戲
 */
export async function getNextGame(odId: string): Promise<TrainingGameItem | null> {
  const plan = await getTodayPlan(odId)
  if (!plan) return null
  
  const nextGame = plan.games.find(g => !g.isCompleted)
  return nextGame || null
}

/**
 * 檢查今日訓練是否完成
 */
export async function isTodayTrainingCompleted(odId: string): Promise<boolean> {
  const plan = await getTodayPlan(odId)
  if (!plan) return false
  return plan.status === 'completed'
}

/**
 * 取得訓練統計
 */
export async function getTrainingStats(odId: string, days: number = 7): Promise<{
  totalDays: number
  completedDays: number
  totalGames: number
  averageProgress: number
  streak: number
}> {
  const { getUserDailyTrainingSessions } = await import('@/services/db')
  const sessions = await getUserDailyTrainingSessions(odId)
  
  const now = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const recentSessions = sessions.filter(s => {
    const date = parseLocalDateKey(s.date)
    if (!date) return false
    return date >= startDate && date <= now
  })
  
  const completedDays = recentSessions.filter(s => 
    s.completedGames.length === s.plannedGames.length
  ).length
  
  const totalGames = recentSessions.reduce((sum, s) => sum + s.completedGames.length, 0)
  
  const progressSum = recentSessions.reduce((sum, s) => {
    const progress = s.plannedGames.length > 0 
      ? (s.completedGames.length / s.plannedGames.length) * 100 
      : 0
    return sum + progress
  }, 0)
  
  const averageProgress = recentSessions.length > 0 
    ? Math.round(progressSum / recentSessions.length) 
    : 0
  
  // 計算連續天數
  let streak = 0
  const sortedSessions = [...sessions].sort((a, b) => {
    const da = parseLocalDateKey(a.date)?.getTime() ?? 0
    const db = parseLocalDateKey(b.date)?.getTime() ?? 0
    return db - da
  })
  
  for (const session of sortedSessions) {
    if (session.completedGames.length === session.plannedGames.length) {
      streak++
    } else {
      break
    }
  }
  
  return {
    totalDays: days,
    completedDays,
    totalGames,
    averageProgress,
    streak
  }
}

/**
 * 取得今日訓練狀態（用於首頁顯示）
 */
export async function getTodayTrainingStatus(): Promise<{
  progress: number
  completed: boolean
}> {
  const savedUserId = localStorage.getItem('brain-training-current-user')
  if (!savedUserId) {
    return { progress: 0, completed: false }
  }
  
  try {
    const session = await getTodayTrainingSession(savedUserId)
    
    if (!session) {
      return { progress: 0, completed: false }
    }
    
    const progress = session.plannedGames.length > 0
      ? Math.round((session.completedGames.length / session.plannedGames.length) * 100)
      : 0
    
    const completed = session.completedGames.length >= session.plannedGames.length
    
    return { progress, completed }
  } catch (error) {
    console.error('取得今日訓練狀態失敗:', error)
    return { progress: 0, completed: false }
  }
}

/**
 * 根據 Mini-Cog 評估結果和行為分析計算個人化難度建議
 */
export async function calculatePersonalizedDifficulty(
  odId: string,
  gameId: string,
  recentGameSessions: { accuracy?: number; averageReactionTime?: number }[] = []
): Promise<PersonalizedDifficultyRecommendation> {
  let baseDifficulty: Difficulty = 'easy'
  let baseSubDifficulty: SubDifficulty = 2
  const adjustmentFactors: PersonalizedDifficultyRecommendation['adjustmentFactors'] = {}
  const reasons: string[] = []

  // 1. 從 Mini-Cog 評估結果獲取基礎難度
  try {
    const miniCogResult = await getLatestMiniCogResult(odId)
    if (miniCogResult) {
      const score = miniCogResult.totalScore
      adjustmentFactors.miniCogScore = score
      
      const mapped = MINICOG_DIFFICULTY_MAP[score]
      if (mapped) {
        baseDifficulty = mapped.difficulty
        baseSubDifficulty = mapped.subDifficulty
        reasons.push(`Mini-Cog 分數 ${score}/5`)
      }
      
      // 如果有風險，進一步降低難度
      if (miniCogResult.atRisk) {
        if (baseDifficulty === 'medium') {
          baseDifficulty = 'easy'
          baseSubDifficulty = 3
        } else {
          baseSubDifficulty = Math.max(1, baseSubDifficulty - 1) as SubDifficulty
        }
        reasons.push('篩檢結果建議適度降低難度')
      }
    }
  } catch (error) {
    console.warn('無法獲取 Mini-Cog 結果:', error)
  }

  // 2. 從遊戲歷史難度獲取（如果沒有 Mini-Cog）
  try {
    const currentDiff = await getCurrentGameDifficulty(odId, gameId)
    if (currentDiff && !adjustmentFactors.miniCogScore) {
      baseDifficulty = currentDiff.difficulty
      baseSubDifficulty = currentDiff.subDifficulty
      reasons.push('沿用歷史難度設定')
    }
  } catch {
    // 忽略錯誤
  }

  // 3. 根據最近遊戲表現調整
  if (recentGameSessions.length >= 3) {
    const validAccuracies = recentGameSessions
      .filter(s => s.accuracy !== undefined)
      .map(s => s.accuracy as number)
    
    if (validAccuracies.length >= 3) {
      const avgAccuracy = validAccuracies.reduce((a, b) => a + b, 0) / validAccuracies.length
      adjustmentFactors.recentAccuracy = Math.round(avgAccuracy * 100) / 100

      if (avgAccuracy >= 0.9) {
        // 正確率很高，可以提升難度
        if (baseDifficulty === 'easy' && baseSubDifficulty >= 3) {
          baseDifficulty = 'medium'
          baseSubDifficulty = 1
          reasons.push('近期正確率優秀，提升難度')
        } else if (baseSubDifficulty < 3) {
          baseSubDifficulty = (baseSubDifficulty + 1) as SubDifficulty
          reasons.push('近期正確率優秀，小幅提升')
        }
      } else if (avgAccuracy < 0.5) {
        // 正確率較低，降低難度
        if (baseDifficulty === 'medium') {
          baseDifficulty = 'easy'
          baseSubDifficulty = 3
          reasons.push('近期正確率偏低，降低難度')
        } else if (baseSubDifficulty > 1) {
          baseSubDifficulty = (baseSubDifficulty - 1) as SubDifficulty
          reasons.push('近期正確率偏低，小幅降低')
        }
      }
    }
  }

  // 4. 嘗試獲取行為分析調整
  try {
    const { analyzeBehavior } = await import('@/services/behaviorAnalysisService')
    const recentSession = recentGameSessions[0] as { id?: string } | undefined
    
    if (recentSession?.id) {
      const analysis = await analyzeBehavior(recentSession.id)
      
      if (analysis) {
        // 疲勞調整
        if (analysis.fatigueIndicators.severity === 'severe') {
          if (baseSubDifficulty > 1) {
            baseSubDifficulty = (baseSubDifficulty - 1) as SubDifficulty
          }
          adjustmentFactors.fatigueLevel = analysis.fatigueIndicators.severity
          reasons.push('偵測到較高疲勞度')
        }
        
        // 思考模式調整
        if (analysis.thinkingTimeAnalysis) {
          adjustmentFactors.behaviorPattern = analysis.thinkingTimeAnalysis.pattern
          
          if (analysis.thinkingTimeAnalysis.pattern === 'impulsive') {
            // 衝動型可能需要稍微增加難度來促進思考
            if (baseSubDifficulty < 3) {
              baseSubDifficulty = (baseSubDifficulty + 1) as SubDifficulty
              reasons.push('建議提升思考深度')
            }
          } else if (analysis.thinkingTimeAnalysis.pattern === 'deliberate') {
            // 謹慎型可能需要適當難度避免壓力
            // 維持當前難度即可
          }
        }
      }
    }
  } catch {
    // 行為分析失敗，不影響主流程
  }

  return {
    difficulty: baseDifficulty,
    subDifficulty: baseSubDifficulty,
    reason: reasons.length > 0 ? reasons.join('；') : '預設難度',
    adjustmentFactors
  }
}

/**
 * 建立個人化的每日訓練計畫（含智慧難度調整）
 */
export async function createPersonalizedTrainingPlan(
  odId: string,
  duration: DailyTrainingDuration,
  cognitiveScores: CognitiveScores,
  recentSessions: { gameId: string; accuracy?: number; id?: string }[] = [],
  options: {
    untestedDimensions?: CognitiveDimension[]
    prioritizeUntested?: boolean
  } = {}
): Promise<DailyTrainingPlan> {
  const today = getLocalDateKey()
  
  // 檢查是否已有今日計畫
  const existingSession = await getTodayTrainingSession(odId)
  if (existingSession) {
    return convertSessionToPlan(existingSession)
  }
  
  // 取得最近遊玩的遊戲
  const recentGames = recentSessions.slice(0, 5).map(s => s.gameId)
  
  // 選擇遊戲
  const { games: selectedGames, useMiniMode } = selectGamesForTraining(duration, cognitiveScores, recentGames, options)
  
  // 為每個遊戲計算個人化難度
  const games: TrainingGameItem[] = await Promise.all(
    selectedGames.map(async (game, index) => {
      // 找出該遊戲的最近會話
      const gameRecentSessions = recentSessions.filter(s => s.gameId === game.id)
      
      // 計算個人化難度
      const recommendation = await calculatePersonalizedDifficulty(
        odId, 
        game.id, 
        gameRecentSessions
      )
      
      console.log(`[個人化訓練] ${game.name}: ${recommendation.difficulty}-${recommendation.subDifficulty} (${recommendation.reason})`)
      
      // 根據是否為迷你模式選擇時間
      const timeMode = useMiniMode ? 'mini' : recommendation.difficulty
      
      return {
        gameId: game.id,
        game,
        difficulty: recommendation.difficulty,
        subDifficulty: recommendation.subDifficulty,
        estimatedTime: game.estimatedTime[timeMode],
        targetDimensions: getGameDimensions(game),
        isCompleted: false,
        order: index + 1
      }
    })
  )
  
  // 儲存會話
  const session: DailyTrainingSession = {
    id: generateId(),
    odId,
    date: today,
    plannedGames: games.map(g => ({
      gameId: g.gameId,
      difficulty: g.difficulty,
      subDifficulty: g.subDifficulty,
      estimatedTime: g.estimatedTime
    })),
    completedGames: [],
    interrupted: false,
    startedAt: new Date().toISOString(),
    totalDuration: 0
  }
  
  await saveDailyTrainingSession(session)
  
  return {
    id: session.id,
    date: today,
    status: 'not-started',
    games,
    totalEstimatedTime: games.reduce((sum, g) => sum + g.estimatedTime, 0),
    completedGames: 0,
    totalGames: games.length,
    progress: 0,
    canContinue: false
  }
}

/**
 * 取得使用者認知能力概況（用於個人化推薦）
 */
export async function getUserCognitiveProfile(odId: string): Promise<{
  miniCogScore: number | null
  atRisk: boolean
  weakAreas: CognitiveDimension[]
  recommendedDifficulty: Difficulty
  lastAssessmentDate: string | null
}> {
  let miniCogScore: number | null = null
  let atRisk = false
  let lastAssessmentDate: string | null = null
  
  // 取得 Mini-Cog 結果
  try {
    const result = await getLatestMiniCogResult(odId)
    if (result) {
      miniCogScore = result.totalScore
      atRisk = result.atRisk
      lastAssessmentDate = result.completedAt.split('T')[0] || null
    }
  } catch {
    // 忽略錯誤
  }
  
  // 計算弱項（這裡簡化處理，實際應該從 cognitiveScores 分析）
  const weakAreas: CognitiveDimension[] = []
  
  // 根據 Mini-Cog 推斷可能的弱項
  if (miniCogScore !== null) {
    if (miniCogScore <= 2) {
      weakAreas.push('memory', 'cognition')
    } else if (miniCogScore <= 3) {
      weakAreas.push('memory')
    }
  }
  
  // 推薦難度
  let recommendedDifficulty: Difficulty = 'easy'
  if (miniCogScore !== null) {
    if (miniCogScore >= 4) {
      recommendedDifficulty = 'medium'
    }
  }
  
  return {
    miniCogScore,
    atRisk,
    weakAreas,
    recommendedDifficulty,
    lastAssessmentDate
  }
}

/**
 * 週訓練日期資訊
 */
export interface WeekDayInfo {
  /** 日期字串 (YYYY-MM-DD) */
  date: string
  /** 星期標籤 (S, M, T, W, T, F, S) */
  dayLabel: string
  /** 日期數字 (1-31) */
  dayNumber: number
  /** 是否已完成訓練 */
  completed: boolean
  /** 是否為今天 */
  isToday: boolean
  /** 訓練時長（分鐘） */
  minutes: number
  /** 遊戲次數 */
  sessions: number
}

/**
 * 週訓練完成資訊
 */
export interface WeeklyCompletedDaysResult {
  /** 已完成天數 */
  completedDays: number
  /** 總目標天數 */
  totalDays: number
  /** 週起始日期 */
  weekStartDate: string
  /** 週結束日期 */
  weekEndDate: string
  /** 每日詳細資訊 */
  weekDates: WeekDayInfo[]
  /** 總訓練分鐘數 */
  totalMinutes: number
  /** 總遊戲次數 */
  totalSessions: number
}

/**
 * 取得本週訓練完成天數（獨立 API）
 * @param odId 用戶 ID
 * @param weekStartDate 週起始日期（可選，預設為本週日）
 * @param dailyGoalMinutes 每日目標分鐘數（可選，預設 10 分鐘）
 */
export async function getWeeklyCompletedDays(
  odId: string,
  weekStartDate?: Date,
  dailyGoalMinutes: number = 10
): Promise<WeeklyCompletedDaysResult> {
  const { getGameSessionsByDate } = await import('@/services/db')
  
  // 計算本週起始日（週日）
  const now = new Date()
  let weekStart: Date
  
  if (weekStartDate) {
    weekStart = new Date(weekStartDate)
  } else {
    weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
  }
  weekStart.setHours(0, 0, 0, 0)
  
  // 計算週結束日（週六）
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const weekDates: WeekDayInfo[] = []
  let completedDays = 0
  let totalMinutes = 0
  let totalSessions = 0
  
  // 遍歷本週每一天
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const dateKey = getLocalDateKey(date)
    
    if (!dateKey) continue
    
    // 查詢該日的遊戲記錄
    let dayMinutes = 0
    let daySessions = 0
    
    try {
      const records = await getGameSessionsByDate(odId, dateKey)
      if (records && records.length > 0) {
        daySessions = records.length
        dayMinutes = records.reduce((sum, r) => {
          const duration = r.result?.duration || 0
          return sum + Math.round(duration / 60)
        }, 0)
      }
    } catch {
      // 忽略錯誤
    }
    
    const completed = dayMinutes >= dailyGoalMinutes
    const isToday = dateKey === getLocalDateKey(now)
    
    if (completed) {
      completedDays++
    }
    
    totalMinutes += dayMinutes
    totalSessions += daySessions
    
    weekDates.push({
      date: dateKey,
      dayLabel: dayLabels[i] || 'S',
      dayNumber: date.getDate(),
      completed,
      isToday,
      minutes: dayMinutes,
      sessions: daySessions,
    })
  }
  
  return {
    completedDays,
    totalDays: 7,
    weekStartDate: getLocalDateKey(weekStart),
    weekEndDate: getLocalDateKey(weekEnd),
    weekDates,
    totalMinutes,
    totalSessions,
  }
}

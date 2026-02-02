/**
 * IndexedDB 資料庫服務
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { User, UserSettings, UserStats, GameSession, DataConsentOptions } from '@/types'
import type { MiniCogResult } from '@/services/miniCogService'
import { getLocalDateKey } from '@/utils/dateKey'

// 每日訓練會話記錄
export interface DailyTrainingSession {
  id: string
  odId: string
  date: string // YYYY-MM-DD
  plannedGames: Array<{
    gameId: string
    difficulty: 'easy' | 'medium' | 'hard'
    subDifficulty: 1 | 2 | 3
    estimatedTime: number
    manualOverride?: boolean
  }>
  completedGames: string[] // gameId list
  interrupted: boolean
  startedAt: string
  completedAt?: string
  totalDuration: number // seconds
}

// 基準能力評估
export interface BaselineAssessment {
  id: string
  odId: string
  assessedAt: string
  cognitiveScores: {
    reaction: number
    logic: number
    memory: number
    cognition: number
    coordination: number
    attention: number
  }
  suggestedDifficulties: Record<string, 'easy' | 'medium' | 'hard'>
  overallLevel: 'beginner' | 'intermediate' | 'advanced'
  gamesPlayed: Array<{
    gameId: string
    score: number
    difficulty: string
  }>
}

// 退化警告記錄
export interface DeclineAlert {
  id: string
  odId: string
  dimension: string
  alertType: 'declining' | 'severe-decline'
  previousScore: number
  currentScore: number
  changePercent: number
  detectedAt: string
  acknowledged: boolean
}

// 難度歷史記錄
export interface DifficultyHistory {
  id: string
  odId: string
  gameId: string
  previousDifficulty: 'easy' | 'medium' | 'hard'
  previousSubDifficulty: 1 | 2 | 3
  newDifficulty: 'easy' | 'medium' | 'hard'
  newSubDifficulty: 1 | 2 | 3
  reason: 'accuracy-high' | 'accuracy-low' | 'manual' | 'reaction-improved' | 'reaction-declined' | 'inactivity'
  accuracy: number
  changedAt: string
}

// 行為日誌記錄
export interface BehaviorLog {
  id: string
  odId: string
  gameId: string
  sessionId: string
  timestamp: string
  eventType: 
    | 'click' 
    | 'hesitation' 
    | 'error' 
    | 'fatigue' 
    | 'attention-drift' 
    | 'correction' 
    | 'pattern-break' 
    | 'speed-change'
    | 'thinking-time'   // 思考時間
    | 'cancellation'    // 操作取消
    | 'regret'          // 反悔更改
    | 'rapid-response'  // 快速反應
    | 'timeout'         // 超時未作答
  data: Record<string, unknown>
  synced: boolean
}

// 待同步佇列
export interface PendingSyncItem {
  id: string
  type: 'behavior-log' | 'game-session' | 'daily-training-session' | 'assessment'
  data: Record<string, unknown>
  createdAt: string
  retryCount: number
}

// 營養品推薦記錄
export interface NutritionRecommendationRecord {
  id: string
  odId: string
  triggerId: string
  supplementType: string
  dimension: string
  priority: 'low' | 'medium' | 'high'
  reason: string
  recommendedAt: string
  viewed: boolean
  dismissed: boolean
}

// 資料庫結構定義
interface BrainTrainingDB extends DBSchema {
  users: {
    key: string
    value: User
    indexes: { 'by-name': string }
  }
  userSettings: {
    key: string
    value: UserSettings
  }
  userStats: {
    key: string
    value: UserStats
  }
  gameSessions: {
    key: string
    value: GameSession
    indexes: { 
      'by-odId': string
      'by-gameId': string
      'by-date': Date
    }
  }
  dataConsent: {
    key: string
    value: DataConsentOptions
  }
  miniCogResults: {
    key: string
    value: MiniCogResult
    indexes: {
      'by-odId': string
      'by-date': string
    }
  }
  // 新增資料表
  dailyTrainingSessions: {
    key: string
    value: DailyTrainingSession
    indexes: {
      'by-odId': string
      'by-date': string
    }
  }
  baselineAssessments: {
    key: string
    value: BaselineAssessment
    indexes: {
      'by-odId': string
    }
  }
  declineAlerts: {
    key: string
    value: DeclineAlert
    indexes: {
      'by-odId': string
      'by-dimension': string
    }
  }
  difficultyHistory: {
    key: string
    value: DifficultyHistory
    indexes: {
      'by-odId': string
      'by-gameId': string
    }
  }
  behaviorLogs: {
    key: string
    value: BehaviorLog
    indexes: {
      'by-odId': string
      'by-sessionId': string
      'by-synced': number
    }
  }
  pendingSyncQueue: {
    key: string
    value: PendingSyncItem
    indexes: {
      'by-type': string
    }
  }
  nutritionRecommendations: {
    key: string
    value: NutritionRecommendationRecord
    indexes: {
      'by-odId': string
    }
  }
}

const DB_NAME = 'brain-training-db'
const DB_VERSION = 4  // v4: 新增 API 同步支援與結果格式遷移

let dbInstance: IDBPDatabase<BrainTrainingDB> | null = null

/**
 * 初始化資料庫
 */
export async function initDatabase(): Promise<void> {
  await getDB()
}

/**
 * 取得資料庫實例
 */
export async function getDB(): Promise<IDBPDatabase<BrainTrainingDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<BrainTrainingDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // 使用者資料表
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' })
        userStore.createIndex('by-name', 'name')
      }

      // 使用者設定表
      if (!db.objectStoreNames.contains('userSettings')) {
        db.createObjectStore('userSettings', { keyPath: 'odId' })
      }

      // 使用者統計表
      if (!db.objectStoreNames.contains('userStats')) {
        db.createObjectStore('userStats', { keyPath: 'odId' })
      }

      // 遊戲會話記錄表
      if (!db.objectStoreNames.contains('gameSessions')) {
        const sessionStore = db.createObjectStore('gameSessions', { keyPath: 'id' })
        sessionStore.createIndex('by-odId', 'odId')
        sessionStore.createIndex('by-gameId', 'gameId')
        sessionStore.createIndex('by-date', 'createdAt')
      }

      // v2 新增：資料同意記錄表
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('dataConsent')) {
          db.createObjectStore('dataConsent', { keyPath: 'odId' })
        }

        // Mini-Cog 結果表
        if (!db.objectStoreNames.contains('miniCogResults')) {
          const miniCogStore = db.createObjectStore('miniCogResults', { keyPath: 'id' })
          miniCogStore.createIndex('by-odId', 'odId')
          miniCogStore.createIndex('by-date', 'completedAt')
        }
      }

      // v3 新增：完善訓練系統資料表
      if (oldVersion < 3) {
        // 每日訓練會話表
        if (!db.objectStoreNames.contains('dailyTrainingSessions')) {
          const dailyStore = db.createObjectStore('dailyTrainingSessions', { keyPath: 'id' })
          dailyStore.createIndex('by-odId', 'odId')
          dailyStore.createIndex('by-date', 'date')
        }

        // 基準能力評估表
        if (!db.objectStoreNames.contains('baselineAssessments')) {
          const baselineStore = db.createObjectStore('baselineAssessments', { keyPath: 'id' })
          baselineStore.createIndex('by-odId', 'odId')
        }

        // 退化警告記錄表
        if (!db.objectStoreNames.contains('declineAlerts')) {
          const alertStore = db.createObjectStore('declineAlerts', { keyPath: 'id' })
          alertStore.createIndex('by-odId', 'odId')
          alertStore.createIndex('by-dimension', 'dimension')
        }

        // 難度歷史記錄表
        if (!db.objectStoreNames.contains('difficultyHistory')) {
          const difficultyStore = db.createObjectStore('difficultyHistory', { keyPath: 'id' })
          difficultyStore.createIndex('by-odId', 'odId')
          difficultyStore.createIndex('by-gameId', 'gameId')
        }

        // 行為日誌記錄表
        if (!db.objectStoreNames.contains('behaviorLogs')) {
          const behaviorStore = db.createObjectStore('behaviorLogs', { keyPath: 'id' })
          behaviorStore.createIndex('by-odId', 'odId')
          behaviorStore.createIndex('by-sessionId', 'sessionId')
          behaviorStore.createIndex('by-synced', 'synced')
        }

        // 待同步佇列表
        if (!db.objectStoreNames.contains('pendingSyncQueue')) {
          const syncStore = db.createObjectStore('pendingSyncQueue', { keyPath: 'id' })
          syncStore.createIndex('by-type', 'type')
        }

        // 營養品推薦記錄表
        if (!db.objectStoreNames.contains('nutritionRecommendations')) {
          const nutritionStore = db.createObjectStore('nutritionRecommendations', { keyPath: 'id' })
          nutritionStore.createIndex('by-odId', 'odId')
        }
      }

      // v4 新增：API 同步支援與結果格式遷移
      // 注意：結構性變更在 upgrade 處理，資料遷移在 initDatabase 後執行
    },
  })

  return dbInstance
}

// ===== 使用者相關操作 =====

/**
 * 儲存使用者
 */
export async function saveUser(user: User): Promise<void> {
  const db = await getDB()
  await db.put('users', user)
}

/**
 * 取得使用者
 */
export async function getUser(id: string): Promise<User | undefined> {
  const db = await getDB()
  return db.get('users', id)
}

/**
 * 取得所有使用者
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDB()
  return db.getAll('users')
}

/**
 * 刪除使用者
 */
export async function deleteUser(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('users', id)
}

// ===== 使用者設定相關操作 =====

/**
 * 儲存使用者設定
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const db = await getDB()
  await db.put('userSettings', settings)
}

/**
 * 取得使用者設定
 */
export async function getUserSettings(odId: string): Promise<UserSettings | undefined> {
  const db = await getDB()
  return db.get('userSettings', odId)
}

// ===== 使用者統計相關操作 =====

/**
 * 儲存使用者統計
 */
export async function saveUserStats(stats: UserStats): Promise<void> {
  const db = await getDB()
  await db.put('userStats', stats)
}

/**
 * 取得使用者統計
 */
export async function getUserStats(odId: string): Promise<UserStats | undefined> {
  const db = await getDB()
  return db.get('userStats', odId)
}

// ===== 遊戲會話相關操作 =====

/**
 * 儲存遊戲會話
 */
export async function saveGameSession(session: GameSession): Promise<void> {
  const db = await getDB()
  await db.put('gameSessions', session)
}

/**
 * 批量儲存遊戲會話
 */
export async function saveGameSessions(sessions: GameSession[]): Promise<void> {
  if (sessions.length === 0) return
  const db = await getDB()
  const tx = db.transaction('gameSessions', 'readwrite')
  for (const session of sessions) {
    tx.store.put(session)
  }
  await tx.done
}

/**
 * 取得遊戲會話
 */
export async function getGameSession(id: string): Promise<GameSession | undefined> {
  const db = await getDB()
  return db.get('gameSessions', id)
}

/**
 * 取得使用者所有遊戲會話
 */
export async function getUserGameSessions(odId: string): Promise<GameSession[]> {
  const db = await getDB()
  return db.getAllFromIndex('gameSessions', 'by-odId', odId)
}

/**
 * 取得使用者特定遊戲的會話
 */
export async function getUserGameSessionsByGame(
  odId: string,
  gameId: string
): Promise<GameSession[]> {
  const sessions = await getUserGameSessions(odId)
  return sessions.filter(s => s.gameId === gameId)
}

/**
 * 取得使用者最近的遊戲會話
 */
export async function getRecentGameSessions(
  odId: string,
  limit: number = 10
): Promise<GameSession[]> {
  const sessions = await getUserGameSessions(odId)
  return sessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

/**
 * 取得使用者特定日期範圍的遊戲會話
 */
export async function getGameSessionsByDateRange(
  odId: string,
  startDate: Date,
  endDate: Date
): Promise<GameSession[]> {
  const sessions = await getUserGameSessions(odId)
  return sessions.filter(s => {
    const date = new Date(s.createdAt)
    return date >= startDate && date <= endDate
  })
}

/**
 * 取得使用者特定日期的遊戲會話（以 YYYY-MM-DD 格式）
 */
export async function getGameSessionsByDate(
  odId: string,
  dateKey: string
): Promise<GameSession[]> {
  const sessions = await getUserGameSessions(odId)
  return sessions.filter(s => {
    const sessionDate = getLocalDateKey(new Date(s.createdAt))
    return sessionDate === dateKey
  })
}

/**
 * 刪除遊戲會話
 */
export async function deleteGameSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('gameSessions', id)
}

/**
 * 清除使用者所有遊戲會話
 */
export async function clearUserGameSessions(odId: string): Promise<void> {
  const sessions = await getUserGameSessions(odId)
  const db = await getDB()
  const tx = db.transaction('gameSessions', 'readwrite')
  await Promise.all(sessions.map(s => tx.store.delete(s.id)))
  await tx.done
}

// ===== 工具函數 =====

/**
 * 產生唯一 ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 清除所有資料（謹慎使用）
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await db.clear('users')
  await db.clear('userSettings')
  await db.clear('userStats')
  await db.clear('gameSessions')
  await db.clear('dataConsent')
  await db.clear('miniCogResults')
}

// ===== 資料同意相關操作 =====

/**
 * 儲存資料同意記錄
 */
export async function saveDataConsent(consent: DataConsentOptions): Promise<void> {
  const db = await getDB()
  await db.put('dataConsent', consent)
}

/**
 * 取得資料同意記錄
 */
export async function getDataConsent(odId: string): Promise<DataConsentOptions | undefined> {
  const db = await getDB()
  return db.get('dataConsent', odId)
}

/**
 * 刪除資料同意記錄
 */
export async function deleteDataConsent(odId: string): Promise<void> {
  const db = await getDB()
  await db.delete('dataConsent', odId)
}

// ===== Mini-Cog 結果相關操作 =====

/**
 * 儲存 Mini-Cog 結果
 */
export async function saveMiniCogResult(result: MiniCogResult): Promise<void> {
  const db = await getDB()
  await db.put('miniCogResults', result)
}

/**
 * 批量儲存 Mini-Cog 結果
 */
export async function saveMiniCogResults(results: MiniCogResult[]): Promise<void> {
  if (results.length === 0) return
  const db = await getDB()
  const tx = db.transaction('miniCogResults', 'readwrite')
  for (const result of results) {
    tx.store.put(result)
  }
  await tx.done
}

/**
 * 取得 Mini-Cog 結果
 */
export async function getMiniCogResult(id: string): Promise<MiniCogResult | undefined> {
  const db = await getDB()
  return db.get('miniCogResults', id)
}

/**
 * 取得使用者所有 Mini-Cog 結果
 */
export async function getUserMiniCogResults(odId: string): Promise<MiniCogResult[]> {
  const db = await getDB()
  return db.getAllFromIndex('miniCogResults', 'by-odId', odId)
}

/**
 * 取得使用者最近一次 Mini-Cog 結果
 */
export async function getLatestMiniCogResult(odId: string): Promise<MiniCogResult | undefined> {
  const results = await getUserMiniCogResults(odId)
  if (results.length === 0) return undefined
  return results.sort((a, b) => 
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )[0]
}

/**
 * 刪除 Mini-Cog 結果
 */
export async function deleteMiniCogResult(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('miniCogResults', id)
}

// ===== 資料匿名化相關操作 =====

/**
 * SHA-256 雜湊函數
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 匿名化遊戲會話（移除可識別資訊）
 */
export async function anonymizeGameSession(session: GameSession): Promise<Record<string, unknown>> {
  const hashedOdId = await sha256(session.odId + 'brain-training-salt')
  
  return {
    hashedUserId: hashedOdId.substring(0, 16),
    gameId: session.gameId,
    difficulty: session.difficulty,
    score: session.result.score,
    accuracy: session.result.accuracy,
    avgReactionTime: session.result.avgReactionTime,
    duration: session.result.duration,
    cognitiveScores: session.cognitiveScores,
    // 模糊化日期（只保留日期，不保留精確時間）
    date: getLocalDateKey(new Date(session.createdAt)),
  }
}

/**
 * 匿名化 Mini-Cog 結果
 */
export async function anonymizeMiniCogResult(result: MiniCogResult): Promise<Record<string, unknown>> {
  const hashedOdId = await sha256(result.odId + 'brain-training-salt')
  
  return {
    hashedUserId: hashedOdId.substring(0, 16),
    totalScore: result.totalScore,
    wordRecallScore: result.wordRecall.score,
    clockDrawingScore: result.clockDrawing.score,
    clockSelfAssessment: result.clockDrawing.selfAssessment,
    atRisk: result.atRisk,
    locale: result.wordRecall.wordSet.locale,
    duration: result.duration,
    // 不包含 imageData
    // 模糊化日期
    date: result.completedAt.split('T')[0],
  }
}

/**
 * 匯出使用者去識別化資料（供研究用途）
 * 包含行為統計和時間序列趨勢資料
 */
export async function exportAnonymizedData(odId: string): Promise<{
  sessions: Record<string, unknown>[]
  miniCogResults: Record<string, unknown>[]
  behaviorStats: {
    totalBehaviorEvents: number
    eventTypeCounts: Record<string, number>
    averageThinkingTime: number
    decisionStabilityScore: number
    fatigueFrequency: number
    attentionDriftFrequency: number
  } | null
  weeklyTrends: {
    weekStartDate: string
    averageScore: number
    totalGames: number
    averageAccuracy: number
    averageReactionTime: number
    miniCogScore: number | null
    dominantCognitiveArea: string | null
  }[]
  exportedAt: string
}> {
  const sessions = await getUserGameSessions(odId)
  const miniCogResults = await getUserMiniCogResults(odId)
  
  const anonymizedSessions = await Promise.all(
    sessions.map(s => anonymizeGameSession(s))
  )
  
  const anonymizedMiniCog = await Promise.all(
    miniCogResults.map(r => anonymizeMiniCogResult(r))
  )
  
  // 計算行為統計
  const behaviorStats = await calculateBehaviorStats(odId)
  
  // 計算每週趨勢
  const weeklyTrends = await calculateWeeklyTrends(odId, sessions, miniCogResults)
  
  return {
    sessions: anonymizedSessions,
    miniCogResults: anonymizedMiniCog,
    behaviorStats,
    weeklyTrends,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * 計算行為統計資料
 */
async function calculateBehaviorStats(odId: string): Promise<{
  totalBehaviorEvents: number
  eventTypeCounts: Record<string, number>
  averageThinkingTime: number
  decisionStabilityScore: number
  fatigueFrequency: number
  attentionDriftFrequency: number
} | null> {
  try {
    const db = await getDB()
    const allLogs = await db.getAllFromIndex('behaviorLogs', 'by-odId', odId)
    
    if (allLogs.length === 0) return null
    
    const eventTypeCounts: Record<string, number> = {}
    let totalThinkingTime = 0
    let thinkingTimeCount = 0
    let cancellationCount = 0
    let regretCount = 0
    let fatigueCount = 0
    let driftCount = 0
    
    for (const log of allLogs) {
      eventTypeCounts[log.eventType] = (eventTypeCounts[log.eventType] || 0) + 1
      
      if (log.eventType === 'thinking-time' && log.data?.timeToFirstAction) {
        totalThinkingTime += log.data.timeToFirstAction as number
        thinkingTimeCount++
      }
      
      if (log.eventType === 'cancellation') cancellationCount++
      if (log.eventType === 'regret') regretCount++
      if (log.eventType === 'fatigue') fatigueCount++
      if (log.eventType === 'attention-drift') driftCount++
    }
    
    const averageThinkingTime = thinkingTimeCount > 0 ? totalThinkingTime / thinkingTimeCount : 0
    
    // 決策穩定性分數：0-100，越高越穩定
    const totalDecisionChanges = cancellationCount + regretCount
    const decisionStabilityScore = Math.max(0, 100 - (totalDecisionChanges / (allLogs.length / 10)) * 10)
    
    return {
      totalBehaviorEvents: allLogs.length,
      eventTypeCounts,
      averageThinkingTime: Math.round(averageThinkingTime),
      decisionStabilityScore: Math.round(decisionStabilityScore),
      fatigueFrequency: fatigueCount,
      attentionDriftFrequency: driftCount
    }
  } catch {
    return null
  }
}

/**
 * 計算每週趨勢資料
 */
async function calculateWeeklyTrends(
  odId: string, 
  sessions: GameSession[],
  miniCogResults: MiniCogResult[]
): Promise<{
  weekStartDate: string
  averageScore: number
  totalGames: number
  averageAccuracy: number
  averageReactionTime: number
  miniCogScore: number | null
  dominantCognitiveArea: string | null
}[]> {
  // 按週分組會話
  const weeklyData = new Map<string, {
    sessions: GameSession[]
    miniCogResults: MiniCogResult[]
  }>()
  
  // 獲取週的開始日期（週一）
  const getWeekStart = (date: Date): string => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return getLocalDateKey(d)
  }
  
  // 分組遊戲會話
  for (const session of sessions) {
    const sessionDate = session.endTime 
      ? new Date(session.endTime) 
      : session.startTime 
        ? new Date(session.startTime)
        : new Date(session.createdAt)
    const weekStart = getWeekStart(sessionDate)
    
    if (!weeklyData.has(weekStart)) {
      weeklyData.set(weekStart, { sessions: [], miniCogResults: [] })
    }
    weeklyData.get(weekStart)!.sessions.push(session)
  }
  
  // 分組 Mini-Cog 結果
  for (const result of miniCogResults) {
    const resultDate = new Date(result.completedAt)
    const weekStart = getWeekStart(resultDate)
    
    if (!weeklyData.has(weekStart)) {
      weeklyData.set(weekStart, { sessions: [], miniCogResults: [] })
    }
    weeklyData.get(weekStart)!.miniCogResults.push(result)
  }
  
  // 計算每週統計
  const trends: {
    weekStartDate: string
    averageScore: number
    totalGames: number
    averageAccuracy: number
    averageReactionTime: number
    miniCogScore: number | null
    dominantCognitiveArea: string | null
  }[] = []
  
  for (const [weekStart, data] of Array.from(weeklyData.entries())) {
    const { sessions: weekSessions, miniCogResults: weekMiniCog } = data
    
    // 計算該週平均分數
    const scores = weekSessions
      .filter((s: GameSession) => s.result?.score !== undefined)
      .map((s: GameSession) => s.result.score)
    const averageScore = scores.length > 0 
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
      : 0
    
    // 計算該週平均正確率
    const accuracies = weekSessions
      .filter((s: GameSession) => s.result?.accuracy !== undefined)
      .map((s: GameSession) => s.result.accuracy!)
    const averageAccuracy = accuracies.length > 0
      ? accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length
      : 0
    
    // 計算該週平均反應時間
    const reactionTimes = weekSessions
      .filter((s: GameSession) => s.result?.avgReactionTime !== undefined)
      .map((s: GameSession) => s.result.avgReactionTime!)
    const averageReactionTime = reactionTimes.length > 0
      ? reactionTimes.reduce((a: number, b: number) => a + b, 0) / reactionTimes.length
      : 0
    
    // 獲取該週最新的 Mini-Cog 分數
    const latestMiniCog = weekMiniCog.length > 0
      ? weekMiniCog.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )[0]
      : null
    
    // 計算主要認知領域（基於遊戲類型分布）
    const gameTypeCounts: Record<string, number> = {}
    for (const session of weekSessions) {
      gameTypeCounts[session.gameId] = (gameTypeCounts[session.gameId] || 0) + 1
    }
    const dominantCognitiveArea = Object.entries(gameTypeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null
    
    trends.push({
      weekStartDate: weekStart,
      averageScore: Math.round(averageScore * 10) / 10,
      totalGames: weekSessions.length,
      averageAccuracy: Math.round(averageAccuracy * 1000) / 10,
      averageReactionTime: Math.round(averageReactionTime),
      miniCogScore: latestMiniCog?.totalScore ?? null,
      dominantCognitiveArea
    })
  }
  
  // 按週排序
  return trends.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
}

/**
 * 完整刪除使用者所有資料（GDPR 刪除權）
 */
export async function purgeUserData(odId: string): Promise<{
  deletedCounts: {
    user: boolean
    settings: boolean
    stats: boolean
    sessions: number
    consent: boolean
    miniCogResults: number
  }
}> {
  const db = await getDB()
  
  // 刪除使用者基本資料
  // 注意：User 的 key 是 id，不是 odId，需要先找到對應的 user
  const users = await getAllUsers()
  let userDeleted = false
  for (const user of users) {
    // 透過某種方式確認是否為同一使用者
    // 這裡假設 odId 可能與 user.id 有關聯
    if (user.id === odId) {
      await db.delete('users', user.id)
      userDeleted = true
      break
    }
  }
  
  // 刪除設定
  let settingsDeleted = false
  try {
    await db.delete('userSettings', odId)
    settingsDeleted = true
  } catch {
    settingsDeleted = false
  }
  
  // 刪除統計
  let statsDeleted = false
  try {
    await db.delete('userStats', odId)
    statsDeleted = true
  } catch {
    statsDeleted = false
  }
  
  // 刪除遊戲會話
  const sessions = await getUserGameSessions(odId)
  const tx1 = db.transaction('gameSessions', 'readwrite')
  await Promise.all(sessions.map(s => tx1.store.delete(s.id)))
  await tx1.done
  
  // 刪除同意記錄
  let consentDeleted = false
  try {
    await db.delete('dataConsent', odId)
    consentDeleted = true
  } catch {
    consentDeleted = false
  }
  
  // 刪除 Mini-Cog 結果
  const miniCogResults = await getUserMiniCogResults(odId)
  const tx2 = db.transaction('miniCogResults', 'readwrite')
  await Promise.all(miniCogResults.map(r => tx2.store.delete(r.id)))
  await tx2.done
  
  return {
    deletedCounts: {
      user: userDeleted,
      settings: settingsDeleted,
      stats: statsDeleted,
      sessions: sessions.length,
      consent: consentDeleted,
      miniCogResults: miniCogResults.length,
    },
  }
}

/**
 * 完整刪除使用者本機資料（涵蓋所有資料表）
 */
export async function purgeUserDataById(odId: string): Promise<{
  deletedCounts: Record<string, number | boolean>
}> {
  const db = await getDB()
  const deletedCounts: Record<string, number | boolean> = {}

  const user = await db.get('users', odId)
  if (user) {
    await db.delete('users', odId)
    deletedCounts.user = true
  } else {
    deletedCounts.user = false
  }

  type StoreWithOdId =
    | 'gameSessions'
    | 'miniCogResults'
    | 'dailyTrainingSessions'
    | 'baselineAssessments'
    | 'declineAlerts'
    | 'difficultyHistory'
    | 'behaviorLogs'
    | 'nutritionRecommendations'

  const deleteByIndex = async (
    storeName: StoreWithOdId,
    countKey: string
  ): Promise<void> => {
    const items = await db.getAllFromIndex(storeName, 'by-odId', odId)
    const tx = db.transaction(storeName, 'readwrite')
    await Promise.all(items.map(item => tx.store.delete(item.id)))
    await tx.done
    deletedCounts[countKey] = items.length
  }

  try {
    await db.delete('userSettings', odId)
    deletedCounts.userSettings = true
  } catch {
    deletedCounts.userSettings = false
  }

  try {
    await db.delete('userStats', odId)
    deletedCounts.userStats = true
  } catch {
    deletedCounts.userStats = false
  }

  try {
    await db.delete('dataConsent', odId)
    deletedCounts.dataConsent = true
  } catch {
    deletedCounts.dataConsent = false
  }

  await deleteByIndex('gameSessions', 'gameSessions')
  await deleteByIndex('miniCogResults', 'miniCogResults')
  await deleteByIndex('dailyTrainingSessions', 'dailyTrainingSessions')
  await deleteByIndex('baselineAssessments', 'baselineAssessments')
  await deleteByIndex('declineAlerts', 'declineAlerts')
  await deleteByIndex('difficultyHistory', 'difficultyHistory')
  await deleteByIndex('behaviorLogs', 'behaviorLogs')
  await deleteByIndex('nutritionRecommendations', 'nutritionRecommendations')

  try {
    const pending = await db.getAll('pendingSyncQueue')
    const pendingToDelete = pending.filter(item => {
      const data = item.data as Record<string, unknown>
      return data?.odId === odId || data?.userId === odId
    })
    const tx = db.transaction('pendingSyncQueue', 'readwrite')
    await Promise.all(pendingToDelete.map(item => tx.store.delete(item.id)))
    await tx.done
    deletedCounts.pendingSyncQueue = pendingToDelete.length
  } catch {
    deletedCounts.pendingSyncQueue = 0
  }

  return { deletedCounts }
}

// 需要導入 DataConsentOptions 類型
import { CURRENT_CONSENT_VERSION, type DataConsentOptions as DataConsentType } from '@/types/user'

/**
 * 檢查同意版本是否需要更新
 */
export async function checkConsentVersionNeedsUpdate(odId: string): Promise<boolean> {
  const consent = await getDataConsent(odId)
  if (!consent) return true  // 沒有同意記錄，需要同意
  return consent.consentVersion !== CURRENT_CONSENT_VERSION
}

// ===== 每日訓練會話相關操作 =====

/**
 * 儲存每日訓練會話
 */
export async function saveDailyTrainingSession(session: DailyTrainingSession): Promise<void> {
  const db = await getDB()
  await db.put('dailyTrainingSessions', session)
}

/**
 * 取得單筆每日訓練會話
 */
export async function getDailyTrainingSession(id: string): Promise<DailyTrainingSession | undefined> {
  const db = await getDB()
  return db.get('dailyTrainingSessions', id)
}

/**
 * 批量儲存每日訓練會話
 */
export async function saveDailyTrainingSessions(sessions: DailyTrainingSession[]): Promise<void> {
  if (sessions.length === 0) return
  const db = await getDB()
  const tx = db.transaction('dailyTrainingSessions', 'readwrite')
  for (const session of sessions) {
    tx.store.put(session)
  }
  await tx.done
}

/**
 * 取得今日訓練會話
 */
export async function getTodayTrainingSession(odId: string): Promise<DailyTrainingSession | undefined> {
  const today = getLocalDateKey()
  const db = await getDB()
  const sessions = await db.getAllFromIndex('dailyTrainingSessions', 'by-odId', odId)
  return sessions.find(s => s.date === today)
}

/**
 * 取得使用者所有訓練會話
 */
export async function getUserDailyTrainingSessions(odId: string): Promise<DailyTrainingSession[]> {
  const db = await getDB()
  return db.getAllFromIndex('dailyTrainingSessions', 'by-odId', odId)
}

/**
 * 取得特定日期範圍的訓練會話
 */
export async function getDailyTrainingSessionsByDateRange(
  odId: string,
  startDate: string,
  endDate: string
): Promise<DailyTrainingSession[]> {
  const sessions = await getUserDailyTrainingSessions(odId)
  return sessions.filter(s => s.date >= startDate && s.date <= endDate)
}

/**
 * 刪除每日訓練會話
 */
export async function deleteDailyTrainingSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('dailyTrainingSessions', id)
}

// ===== 基準能力評估相關操作 =====

/**
 * 儲存基準能力評估
 */
export async function saveBaselineAssessment(assessment: BaselineAssessment): Promise<void> {
  const db = await getDB()
  await db.put('baselineAssessments', assessment)
}

/**
 * 批量儲存基準能力評估
 */
export async function saveBaselineAssessments(assessments: BaselineAssessment[]): Promise<void> {
  if (assessments.length === 0) return
  const db = await getDB()
  const tx = db.transaction('baselineAssessments', 'readwrite')
  for (const assessment of assessments) {
    tx.store.put(assessment)
  }
  await tx.done
}

/**
 * 取得使用者最新基準評估
 */
export async function getLatestBaselineAssessment(odId: string): Promise<BaselineAssessment | undefined> {
  const db = await getDB()
  const assessments = await db.getAllFromIndex('baselineAssessments', 'by-odId', odId)
  if (assessments.length === 0) return undefined
  return assessments.sort((a, b) => 
    new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
  )[0]
}

/**
 * 取得使用者所有基準評估
 */
export async function getUserBaselineAssessments(odId: string): Promise<BaselineAssessment[]> {
  const db = await getDB()
  return db.getAllFromIndex('baselineAssessments', 'by-odId', odId)
}

// ===== 退化警告相關操作 =====

/**
 * 儲存退化警告
 */
export async function saveDeclineAlert(alert: DeclineAlert): Promise<void> {
  const db = await getDB()
  await db.put('declineAlerts', alert)
}

/**
 * 批量儲存退化警告
 */
export async function saveDeclineAlerts(alerts: DeclineAlert[]): Promise<void> {
  if (alerts.length === 0) return
  const db = await getDB()
  const tx = db.transaction('declineAlerts', 'readwrite')
  for (const alert of alerts) {
    tx.store.put(alert)
  }
  await tx.done
}

/**
 * 取得使用者未確認的退化警告
 */
export async function getUnacknowledgedDeclineAlerts(odId: string): Promise<DeclineAlert[]> {
  const db = await getDB()
  const alerts = await db.getAllFromIndex('declineAlerts', 'by-odId', odId)
  return alerts.filter(a => !a.acknowledged)
}

/**
 * 取得使用者所有退化警告
 */
export async function getUserDeclineAlerts(odId: string): Promise<DeclineAlert[]> {
  const db = await getDB()
  return db.getAllFromIndex('declineAlerts', 'by-odId', odId)
}

/**
 * 確認退化警告
 */
export async function acknowledgeDeclineAlert(alertId: string): Promise<void> {
  const db = await getDB()
  const alert = await db.get('declineAlerts', alertId)
  if (alert) {
    alert.acknowledged = true
    await db.put('declineAlerts', alert)
  }
}

// ===== 難度歷史相關操作 =====

/**
 * 儲存難度歷史記錄
 */
export async function saveDifficultyHistory(history: DifficultyHistory): Promise<void> {
  const db = await getDB()
  await db.put('difficultyHistory', history)
}

/**
 * 取得遊戲的難度歷史
 */
export async function getGameDifficultyHistory(odId: string, gameId: string): Promise<DifficultyHistory[]> {
  const db = await getDB()
  const histories = await db.getAllFromIndex('difficultyHistory', 'by-odId', odId)
  return histories.filter(h => h.gameId === gameId).sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )
}

/**
 * 取得使用者當前遊戲難度
 */
export async function getCurrentGameDifficulty(odId: string, gameId: string): Promise<{
  difficulty: 'easy' | 'medium' | 'hard'
  subDifficulty: 1 | 2 | 3
} | undefined> {
  const history = await getGameDifficultyHistory(odId, gameId)
  if (history.length === 0) return undefined
  const latest = history[0]
  if (!latest) return undefined
  return {
    difficulty: latest.newDifficulty,
    subDifficulty: latest.newSubDifficulty
  }
}

// ===== 行為日誌相關操作 =====

/**
 * 儲存行為日誌
 */
export async function saveBehaviorLog(log: BehaviorLog): Promise<void> {
  const db = await getDB()
  await db.put('behaviorLogs', log)
}

/**
 * 批量儲存行為日誌
 */
export async function saveBehaviorLogs(logs: BehaviorLog[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('behaviorLogs', 'readwrite')
  for (const log of logs) {
    tx.store.put(log)
  }
  await tx.done
}

/**
 * 取得未同步的行為日誌
 */
export async function getUnsyncedBehaviorLogs(): Promise<BehaviorLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('behaviorLogs', 'by-synced', 0)
}

/**
 * 標記行為日誌為已同步
 */
export async function markBehaviorLogsSynced(ids: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('behaviorLogs', 'readwrite')
  for (const id of ids) {
    const log = await tx.store.get(id)
    if (log) {
      log.synced = true
      await tx.store.put(log)
    }
  }
  await tx.done
}

/**
 * 清除超過7天的已同步行為日誌
 */
export async function cleanupOldBehaviorLogs(): Promise<number> {
  const db = await getDB()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const allLogs = await db.getAll('behaviorLogs')
  const oldLogs = allLogs.filter(log => 
    log.synced && new Date(log.timestamp) < sevenDaysAgo
  )
  
  const tx = db.transaction('behaviorLogs', 'readwrite')
  await Promise.all(oldLogs.map(log => tx.store.delete(log.id)))
  await tx.done
  
  return oldLogs.length
}

/**
 * 取得遊戲會話的行為日誌
 */
export async function getSessionBehaviorLogs(sessionId: string): Promise<BehaviorLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('behaviorLogs', 'by-sessionId', sessionId)
}

// ===== 待同步佇列相關操作 =====

/**
 * 新增待同步項目
 */
export async function addPendingSyncItem(item: PendingSyncItem): Promise<void> {
  const db = await getDB()
  await db.put('pendingSyncQueue', item)
}

/**
 * 取得所有待同步項目
 */
export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  const db = await getDB()
  return db.getAll('pendingSyncQueue')
}

/**
 * 移除已同步項目
 */
export async function removePendingSyncItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingSyncQueue', id)
}

/**
 * 增加重試次數
 */
export async function incrementSyncRetryCount(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('pendingSyncQueue', id)
  if (item) {
    item.retryCount++
    await db.put('pendingSyncQueue', item)
  }
}

// ===== 營養品推薦相關操作 =====

/**
 * 儲存營養品推薦
 */
export async function saveNutritionRecommendation(recommendation: NutritionRecommendationRecord): Promise<void> {
  const db = await getDB()
  await db.put('nutritionRecommendations', recommendation)
}

/**
 * 批量儲存營養品推薦
 */
export async function saveNutritionRecommendations(recommendations: NutritionRecommendationRecord[]): Promise<void> {
  if (recommendations.length === 0) return
  const db = await getDB()
  const tx = db.transaction('nutritionRecommendations', 'readwrite')
  for (const recommendation of recommendations) {
    tx.store.put(recommendation)
  }
  await tx.done
}

/**
 * 取得使用者營養品推薦
 */
export async function getUserNutritionRecommendations(odId: string): Promise<NutritionRecommendationRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('nutritionRecommendations', 'by-odId', odId)
}

/**
 * 取得使用者未查看的營養品推薦
 */
export async function getUnviewedNutritionRecommendations(odId: string): Promise<NutritionRecommendationRecord[]> {
  const recommendations = await getUserNutritionRecommendations(odId)
  return recommendations.filter(r => !r.viewed && !r.dismissed)
}

/**
 * 標記營養品推薦為已查看
 */
export async function markNutritionRecommendationViewed(id: string): Promise<void> {
  const db = await getDB()
  const rec = await db.get('nutritionRecommendations', id)
  if (rec) {
    rec.viewed = true
    await db.put('nutritionRecommendations', rec)
  }
}

/**
 * 忽略營養品推薦
 */
export async function dismissNutritionRecommendation(id: string): Promise<void> {
  const db = await getDB()
  const rec = await db.get('nutritionRecommendations', id)
  if (rec) {
    rec.dismissed = true
    await db.put('nutritionRecommendations', rec)
  }
}

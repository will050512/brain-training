/**
 * 遊戲狀態管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  GameSession, 
  GameResult, 
  GameMode,
  Difficulty,
  SubDifficulty,
  SettingValue,
  CognitiveDimension,
  CognitiveScores,
  GameDefinition
} from '@/types'
import { gameRegistry } from '@/core/gameRegistry'
import { 
  saveGameSession, 
  getUserGameSessions, 
  generateId,
  getTodayTrainingSession
} from '@/services/db'
import type { DailyTrainingPlan } from '@/services/dailyTrainingService'
import { syncSessionToSheet } from '@/services/googleSheetSyncService'
import { 
  calculateCognitiveScoresFromResult,
  calculateOverallCognitiveScores,
  calculateDimensionSampleCounts,
  calculateScoreTrends,
  calculateScoreHistory,
  type ScoreTrend,
  type ScoreHistory
} from '@/services/scoreCalculator'
import { shiftDifficultyStep } from '@/services/adaptiveDifficultyService'
import { useUserStore } from './userStore'

// 每日訓練隊列項目
export interface TrainingQueueItem {
  gameId: string
  game: GameDefinition
  difficulty: Difficulty
  subDifficulty?: SubDifficulty
  isCompleted: boolean
  score?: number
  duration?: number
  manualOverride?: boolean
}

// 當日訓練摘要
export interface TodayTrainingSummary {
  completedGames: number
  totalGames: number
  averageScore: number
  totalDuration: number
  bestGameName?: string
  bestGameScore?: number
}

export const useGameStore = defineStore('game', () => {
  // 狀態
  const sessions = ref<GameSession[]>([])
  const currentGameId = ref<string | null>(null)
  const currentDifficulty = ref<Difficulty>('easy')
  const currentSubDifficulty = ref<SubDifficulty>(2)
  const isLoading = ref(false)
  
  // 每日訓練相關狀態
  const dailyTrainingQueue = ref<TrainingQueueItem[]>([])
  const currentTrainingIndex = ref(0)
  const isFromDailyTraining = ref(false)
  
  // 計算屬性
  const currentGame = computed(() => {
    if (!currentGameId.value) return null
    return gameRegistry.get(currentGameId.value)
  })

  const allGames = computed(() => gameRegistry.getAll())

  const cognitiveScores = computed((): CognitiveScores => {
    return calculateOverallCognitiveScores(sessions.value)
  })

  const dimensionSampleCounts = computed(() => {
    return calculateDimensionSampleCounts(sessions.value)
  })

  const untestedDimensions = computed((): CognitiveDimension[] => {
    const allDimensions: CognitiveDimension[] = [
      'reaction',
      'logic',
      'memory',
      'cognition',
      'coordination',
      'attention',
    ]

    const counts = dimensionSampleCounts.value
    return allDimensions.filter(dimension => (counts[dimension] || 0) === 0)
  })

  const recentSessions = computed(() => {
    return [...sessions.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  })

  const scoreHistory = computed((): ScoreHistory[] => {
    return calculateScoreHistory(sessions.value, 'week')
  })

  // 動作

  /**
   * 載入使用者的遊戲記錄
   */
  async function loadUserSessions(odId: string): Promise<void> {
    isLoading.value = true
    try {
      sessions.value = await getUserGameSessions(odId)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 選擇遊戲
   */
  function selectGame(gameId: string): void {
    if (gameRegistry.has(gameId)) {
      currentGameId.value = gameId
    }
  }

  /**
   * 選擇難度
   */
  function selectDifficulty(difficulty: Difficulty): void {
    currentDifficulty.value = difficulty
  }

  /**
   * 選擇子難度
   */
  function selectSubDifficulty(subDifficulty: SubDifficulty): void {
    currentSubDifficulty.value = subDifficulty
  }

  /**
   * 記錄遊戲結果
   */
  async function recordGameResult(result: GameResult, mode?: GameMode, sessionId?: string): Promise<GameSession> {
    const userStore = useUserStore()
    if (!userStore.currentUser) {
      throw new Error('使用者未登入')
    }

    const odId = userStore.currentUser.id
    const normalizedResult: GameResult = {
      ...result,
      mode: mode ?? result.mode ?? 'free'
    }
    const cognitiveScores = calculateCognitiveScoresFromResult(normalizedResult.gameId, normalizedResult)

    const session: GameSession = {
      id: sessionId || generateId(),
      odId,
      gameId: normalizedResult.gameId,
      difficulty: normalizedResult.difficulty,
      subDifficulty: normalizedResult.subDifficulty,
      result: normalizedResult,
      cognitiveScores,
      createdAt: new Date(),
    }

    await saveGameSession(session)
    sessions.value.push(session)

    // 更新使用者統計
    await userStore.recordGamePlayed(
      normalizedResult.score,
      normalizedResult.duration,
      normalizedResult.gameId,
      normalizedResult.mode ?? 'free'
    )

    // 即時同步到 Google Sheet（失敗時不影響主流程）
    try {
      const bestScore = getBestScore(normalizedResult.gameId, normalizedResult.difficulty)
      await syncSessionToSheet(session, bestScore)
    } catch (error) {
      console.error('syncSessionToSheet failed', error)
    }

    return session
  }

  /**
   * 取得特定遊戲的會話
   */
  function getSessionsByGame(gameId: string): GameSession[] {
    return sessions.value.filter((s: GameSession) => s.gameId === gameId)
  }

  /**
   * 取得特定遊戲的最佳分數
   */
  function getBestScore(gameId: string, difficulty?: Difficulty): number {
    let gameSessions = getSessionsByGame(gameId)
    if (difficulty) {
      gameSessions = gameSessions.filter(s => s.difficulty === difficulty)
    }
    if (gameSessions.length === 0) return 0
    return Math.max(...gameSessions.map(s => s.result.score))
  }

  /**
   * 取得特定遊戲的平均分數
   */
  function getAverageScore(gameId: string, difficulty?: Difficulty): number {
    let gameSessions = getSessionsByGame(gameId)
    if (difficulty) {
      gameSessions = gameSessions.filter(s => s.difficulty === difficulty)
    }
    if (gameSessions.length === 0) return 0
    const sum = gameSessions.reduce((acc, s) => acc + s.result.score, 0)
    return Math.round(sum / gameSessions.length)
  }

  /**
   * 計算與上週的分數趨勢比較
   */
  function getWeeklyTrends(): ScoreTrend[] {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const currentWeekSessions = sessions.value.filter((s: GameSession) => {
      const date = new Date(s.createdAt)
      return date >= oneWeekAgo && date <= now
    })

    const previousWeekSessions = sessions.value.filter((s: GameSession) => {
      const date = new Date(s.createdAt)
      return date >= twoWeeksAgo && date < oneWeekAgo
    })

    const currentScores = calculateOverallCognitiveScores(currentWeekSessions)
    const previousScores = calculateOverallCognitiveScores(previousWeekSessions)

    return calculateScoreTrends(currentScores, previousScores)
  }

  /**
   * 取得認知維度的遊戲
   */
  function getGamesByDimension(dimension: CognitiveDimension) {
    return gameRegistry.getByDimension(dimension)
  }

  /**
   * 取得遊戲的難度設定
   */
  function getDifficultySettings(gameId: string, difficulty: Difficulty): Record<string, SettingValue> {
    const game = gameRegistry.get(gameId)
    if (!game) return {}
    
    // 使用 defaultSettings 來取得難度設定
    return game.defaultSettings?.[difficulty] || {}
  }

  /**
   * 清除當前遊戲選擇
   */
  function clearSelection(): void {
    currentGameId.value = null
    currentDifficulty.value = 'easy'
    currentSubDifficulty.value = 2
  }

  // ===== 每日訓練相關功能 =====

  /**
   * 設定每日訓練隊列
   */
  function setDailyTrainingQueue(games: Array<{ gameId: string; difficulty: Difficulty; subDifficulty?: SubDifficulty; isCompleted?: boolean; score?: number; duration?: number; manualOverride?: boolean }>): void {
    dailyTrainingQueue.value = games.map(item => {
      const game = gameRegistry.get(item.gameId)
      return {
        gameId: item.gameId,
        game: game!,
        difficulty: item.difficulty,
        subDifficulty: item.subDifficulty,
        isCompleted: item.isCompleted ?? false,
        score: item.score,
        duration: item.duration,
        manualOverride: item.manualOverride ?? false
      }
    }).filter(item => item.game)
    currentTrainingIndex.value = 0
    isFromDailyTraining.value = true
  }

  /**
   * 標記當前訓練遊戲完成
   */
  function completeCurrentTrainingGame(score: number, duration: number, gameId?: string): void {
    const targetIndex = typeof gameId === 'string' && gameId
      ? dailyTrainingQueue.value.findIndex(item => item.gameId === gameId)
      : currentTrainingIndex.value
    if (targetIndex < 0 || targetIndex >= dailyTrainingQueue.value.length) return
    const current = dailyTrainingQueue.value[targetIndex]
    if (!current) return
    current.isCompleted = true
    current.score = score
    current.duration = duration
  }

  /**
   * 更新目前訓練項目的難度
   */
  function updateCurrentTrainingGameDifficulty(
    difficulty: Difficulty,
    subDifficulty: SubDifficulty,
    options?: { manualOverride?: boolean }
  ): void {
    const current = dailyTrainingQueue.value[currentTrainingIndex.value]
    if (!current) return
    current.difficulty = difficulty
    current.subDifficulty = subDifficulty
    if (options?.manualOverride !== undefined) {
      current.manualOverride = options.manualOverride
    }
  }

  /**
   * 更新指定訓練項目的難度
   */
  function updateTrainingGameDifficulty(
    gameId: string,
    difficulty: Difficulty,
    subDifficulty: SubDifficulty,
    options?: { manualOverride?: boolean }
  ): void {
    const item = dailyTrainingQueue.value.find(entry => entry.gameId === gameId)
    if (!item) return
    item.difficulty = difficulty
    item.subDifficulty = subDifficulty
    if (options?.manualOverride !== undefined) {
      item.manualOverride = options.manualOverride
    }
  }

  /**
   * 依方向調整後續訓練遊戲難度（跳過手動覆蓋）
   */
  function shiftRemainingTrainingDifficulties(direction: 1 | -1): Array<{ gameId: string; difficulty: Difficulty; subDifficulty: SubDifficulty; manualOverride?: boolean }> {
    const updates: Array<{ gameId: string; difficulty: Difficulty; subDifficulty: SubDifficulty; manualOverride?: boolean }> = []
    for (let i = currentTrainingIndex.value + 1; i < dailyTrainingQueue.value.length; i += 1) {
      const item = dailyTrainingQueue.value[i]
      if (!item || item.isCompleted) continue
      if (item.manualOverride) continue

      const currentSub = item.subDifficulty ?? 2
      const next = shiftDifficultyStep(item.difficulty, currentSub, direction)
      if (next.difficulty === item.difficulty && next.subDifficulty === currentSub) continue

      item.difficulty = next.difficulty
      item.subDifficulty = next.subDifficulty
      updates.push({ gameId: item.gameId, difficulty: next.difficulty, subDifficulty: next.subDifficulty, manualOverride: item.manualOverride })
    }

    return updates
  }

  /**
   * 移動到下一個訓練遊戲
   */
  function moveToNextTrainingGame(): boolean {
    if (currentTrainingIndex.value < dailyTrainingQueue.value.length - 1) {
      currentTrainingIndex.value++
      return true
    }
    return false
  }

  /**
   * 取得下一個訓練遊戲
   */
  function getNextTrainingGame(): TrainingQueueItem | null {
    const nextIndex = currentTrainingIndex.value + 1
    if (nextIndex < dailyTrainingQueue.value.length) {
      return dailyTrainingQueue.value[nextIndex] || null
    }
    return null
  }

  /**
   * 取得當前訓練遊戲
   */
  function getCurrentTrainingGame(): TrainingQueueItem | null {
    return dailyTrainingQueue.value[currentTrainingIndex.value] || null
  }

  /**
   * 檢查是否完成所有每日訓練
   */
  function isAllTrainingCompleted(): boolean {
    return dailyTrainingQueue.value.length > 0 && 
           dailyTrainingQueue.value.every(item => item.isCompleted)
  }

  /**
   * 取得今日訓練摘要
   */
  function getTodayTrainingSummary(): TodayTrainingSummary {
    const completed = dailyTrainingQueue.value.filter(item => item.isCompleted)
    const scores = completed.map(item => item.score || 0)
    const durations = completed.map(item => item.duration || 0)
    
    let bestGame: TrainingQueueItem | null = null
    let bestScore = 0
    for (const item of completed) {
      if ((item.score || 0) > bestScore) {
        bestScore = item.score || 0
        bestGame = item
      }
    }

    return {
      completedGames: completed.length,
      totalGames: dailyTrainingQueue.value.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      bestGameName: bestGame?.game?.name,
      bestGameScore: bestGame?.score
    }
  }

  /**
   * 清除每日訓練狀態
   */
  function clearDailyTraining(): void {
    dailyTrainingQueue.value = []
    currentTrainingIndex.value = 0
    isFromDailyTraining.value = false
  }

  /**
   * 取得其他維度的未玩遊戲（用於遊戲結束推薦）
   * 優先推薦用戶弱項維度的遊戲（1.5x 權重加成）
   */
  function getUnplayedGamesByOtherDimensions(currentGameId: string, count: number = 4): GameDefinition[] {
    const currentGame = gameRegistry.get(currentGameId)
    if (!currentGame) return []

    // 取得當前遊戲的主要維度
    const currentDimensions = Object.entries(currentGame.cognitiveWeights)
      .filter(([_, weight]) => (weight as number) > 0.3)
      .map(([dim]) => dim as CognitiveDimension)

    // 取得今日已玩過的遊戲
    const today = new Date().toDateString()
    const todayPlayedIds = new Set(
      sessions.value
        .filter(s => new Date(s.createdAt).toDateString() === today)
        .map(s => s.gameId)
    )
    todayPlayedIds.add(currentGameId)

    // 找出用戶的弱項維度（分數最低的維度）
    const scores = cognitiveScores.value
    const allDimensions: CognitiveDimension[] = ['reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention']
    
    // 計算有效分數的維度（排除 0 分的維度，可能是未測試過）
    const validScores = allDimensions
      .filter(dim => scores[dim] > 0)
      .map(dim => ({ dim, score: scores[dim] }))
    
    // 找出最低分的維度作為弱項
    const weakDimensions: CognitiveDimension[] = []
    if (validScores.length > 0) {
      const minScore = Math.min(...validScores.map(v => v.score))
      // 分數低於平均值的都算弱項
      const avgScore = validScores.reduce((sum, v) => sum + v.score, 0) / validScores.length
      weakDimensions.push(...validScores
        .filter(v => v.score <= avgScore)
        .map(v => v.dim)
      )
    }

    // 找其他維度的遊戲
    const allGames = gameRegistry.getAll()
    const otherDimensionGames: Array<{ game: GameDefinition; score: number }> = []

    for (const game of allGames) {
      if (todayPlayedIds.has(game.id)) continue

      // 計算與當前遊戲的維度差異分數
      const gameDimensions = Object.entries(game.cognitiveWeights)
        .filter(([_, weight]) => (weight as number) > 0.3)
        .map(([dim]) => dim as CognitiveDimension)

      // 優先推薦不同維度的遊戲
      const overlap = gameDimensions.filter(d => currentDimensions.includes(d)).length
      let diversityScore = gameDimensions.length - overlap

      // 弱項維度遊戲加成 1.5x 權重
      const hasWeakDimension = gameDimensions.some(d => weakDimensions.includes(d))
      if (hasWeakDimension) {
        diversityScore *= 1.5
      }

      otherDimensionGames.push({ game, score: diversityScore })
    }

    // 按多樣性分數排序，取前 N 個
    const picked = otherDimensionGames
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.game)

    // 若今天已玩過太多導致沒有候選，退而求其次：至少給「其他遊戲」避免結算畫面空白
    if (picked.length > 0) return picked

    return allGames
      .filter(g => g.id !== currentGameId)
      .slice(0, count)
  }

  /**
   * 從 DB 同步每日訓練狀態
   */
  async function syncDailyTrainingFromDB(odId: string): Promise<void> {
    const session = await getTodayTrainingSession(odId)
    if (!session) return

    // 若目前沒有隊列，直接用資料庫重建（避免重新載入後無法「繼續訓練」）
    if (dailyTrainingQueue.value.length === 0) {
      dailyTrainingQueue.value = session.plannedGames
        .map(item => {
          const game = gameRegistry.get(item.gameId)
          if (!game) return null
          return {
            gameId: item.gameId,
            game,
            difficulty: item.difficulty,
            subDifficulty: item.subDifficulty,
            isCompleted: session.completedGames.includes(item.gameId),
            manualOverride: item.manualOverride ?? false,
          } as TrainingQueueItem
        })
        .filter((g): g is TrainingQueueItem => Boolean(g))
      isFromDailyTraining.value = dailyTrainingQueue.value.length > 0
    } else {
      // 隊列已存在時，依據 DB 同步完成狀態
      dailyTrainingQueue.value.forEach(item => {
        if (session.completedGames.includes(item.gameId)) {
          item.isCompleted = true
        }
      })
    }

    // 根據已完成狀態更新目前索引
    if (dailyTrainingQueue.value.length > 0) {
      const firstUnfinished = dailyTrainingQueue.value.findIndex(item => !item.isCompleted)
      currentTrainingIndex.value = firstUnfinished !== -1
        ? firstUnfinished
        : dailyTrainingQueue.value.length
    }
  }

  return {
    // 狀態
    sessions,
    currentGameId,
    currentDifficulty,
    currentSubDifficulty,
    isLoading,
    dailyTrainingQueue,
    currentTrainingIndex,
    isFromDailyTraining,

    // 計算屬性
    currentGame,
    allGames,
    cognitiveScores,
    recentSessions,
    scoreHistory,
    dimensionSampleCounts,
    untestedDimensions,

    // 動作
    loadUserSessions,
    selectGame,
    selectDifficulty,
    selectSubDifficulty,
    recordGameResult,
    getSessionsByGame,
    getBestScore,
    getAverageScore,
    getWeeklyTrends,
    getGamesByDimension,
    getDifficultySettings,
    clearSelection,
    
    // 每日訓練
    setDailyTrainingQueue,
    completeCurrentTrainingGame,
    updateCurrentTrainingGameDifficulty,
    updateTrainingGameDifficulty,
    shiftRemainingTrainingDifficulties,
    moveToNextTrainingGame,
    getNextTrainingGame,
    getCurrentTrainingGame,
    isAllTrainingCompleted,
    getTodayTrainingSummary,
    clearDailyTraining,
    getUnplayedGamesByOtherDimensions,
    syncDailyTrainingFromDB,
  }
})

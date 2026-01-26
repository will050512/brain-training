/**
 * 動態難度調整服務
 * 根據用戶表現自動調整遊戲難度
 * 支援主難度（easy/medium/hard）和子難度（1/2/3）
 * 
 * v2 更新：
 * - 降低升級閾值（85% → 70%）適合長者
 * - 加入反應時間與思考時間因素
 * - 實作 7 天不活躍降級機制
 * - 強化 Mini-Cog 分數對初始難度的影響
 */

import type { Difficulty, SubDifficulty, GameResult, GameSession } from '@/types/game'
import { 
  saveDifficultyHistory, 
  getGameDifficultyHistory, 
  getCurrentGameDifficulty,
  getUserGameSessionsByGame,
  generateId,
  type DifficultyHistory
} from '@/services/db'

// 難度調整結果
export interface DifficultyAdjustment {
  shouldAdjust: boolean
  currentDifficulty: Difficulty
  currentSubDifficulty: SubDifficulty
  newDifficulty: Difficulty
  newSubDifficulty: SubDifficulty
  reason: 'accuracy-high' | 'accuracy-low' | 'reaction-improved' | 'reaction-declined' | 'inactivity' | 'stable' | 'manual'
  message: string
}

// 難度調整配置
export interface DifficultyConfig {
  // 升級閾值（正確率超過此值考慮升級）- 降低以適合長者
  upgradeThreshold: number
  // 降級閾值（正確率低於此值考慮降級）
  downgradeThreshold: number
  // 連續達標次數才調整
  consecutiveGamesRequired: number
  // 子難度升級時是否自動升主難度
  autoPromoteMainDifficulty: boolean
  // 反應時間改善閾值（百分比）
  reactionTimeImprovementThreshold: number
  // 反應時間惡化閾值（百分比）
  reactionTimeDeclineThreshold: number
  // 不活躍天數閾值（超過此天數自動降級）
  inactivityDaysThreshold: number
  // 是否啟用反應時間因素
  enableReactionTimeFactor: boolean
  // 是否啟用不活躍降級
  enableInactivityDowngrade: boolean
}

// 預設配置（針對長者優化）
const DEFAULT_CONFIG: DifficultyConfig = {
  upgradeThreshold: 0.70,        // 降低：85% → 70%
  downgradeThreshold: 0.45,      // 降低：50% → 45%
  consecutiveGamesRequired: 3,
  autoPromoteMainDifficulty: true,
  reactionTimeImprovementThreshold: 0.15,  // 反應時間改善 15%
  reactionTimeDeclineThreshold: 0.20,      // 反應時間惡化 20%
  inactivityDaysThreshold: 7,              // 7 天不活躍
  enableReactionTimeFactor: true,
  enableInactivityDowngrade: true
}

// Mini-Cog 分數對應的難度限制
export interface MiniCogDifficultyLimit {
  maxDifficulty: Difficulty
  maxSubDifficulty: SubDifficulty
  initialDifficulty: Difficulty
  initialSubDifficulty: SubDifficulty
}

export const MINICOG_DIFFICULTY_LIMITS: Record<number, MiniCogDifficultyLimit> = {
  0: { maxDifficulty: 'easy', maxSubDifficulty: 1, initialDifficulty: 'easy', initialSubDifficulty: 1 },
  1: { maxDifficulty: 'easy', maxSubDifficulty: 2, initialDifficulty: 'easy', initialSubDifficulty: 1 },
  2: { maxDifficulty: 'easy', maxSubDifficulty: 2, initialDifficulty: 'easy', initialSubDifficulty: 2 },
  3: { maxDifficulty: 'medium', maxSubDifficulty: 1, initialDifficulty: 'easy', initialSubDifficulty: 3 },
  4: { maxDifficulty: 'medium', maxSubDifficulty: 3, initialDifficulty: 'medium', initialSubDifficulty: 1 },
  5: { maxDifficulty: 'hard', maxSubDifficulty: 3, initialDifficulty: 'medium', initialSubDifficulty: 2 }
}

// 難度順序
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
const SUB_DIFFICULTY_ORDER: SubDifficulty[] = [1, 2, 3]

/**
 * 取得下一個較高的難度
 */
function getNextHigherDifficulty(
  current: Difficulty,
  currentSub: SubDifficulty
): { difficulty: Difficulty; subDifficulty: SubDifficulty } | null {
  const mainIndex = DIFFICULTY_ORDER.indexOf(current)
  const subIndex = SUB_DIFFICULTY_ORDER.indexOf(currentSub)
  
  // 先提升子難度
  if (subIndex < SUB_DIFFICULTY_ORDER.length - 1) {
    const nextSub = SUB_DIFFICULTY_ORDER[subIndex + 1]
    if (nextSub !== undefined) {
      return {
        difficulty: current,
        subDifficulty: nextSub
      }
    }
  }
  
  // 子難度已滿，提升主難度並重置子難度
  if (mainIndex < DIFFICULTY_ORDER.length - 1) {
    const nextMain = DIFFICULTY_ORDER[mainIndex + 1]
    if (nextMain !== undefined) {
      return {
        difficulty: nextMain,
        subDifficulty: 1
      }
    }
  }
  
  // 已經最高難度
  return null
}

/**
 * 取得下一個較低的難度
 */
function getNextLowerDifficulty(
  current: Difficulty,
  currentSub: SubDifficulty
): { difficulty: Difficulty; subDifficulty: SubDifficulty } | null {
  const mainIndex = DIFFICULTY_ORDER.indexOf(current)
  const subIndex = SUB_DIFFICULTY_ORDER.indexOf(currentSub)
  
  // 先降低子難度
  if (subIndex > 0) {
    const prevSub = SUB_DIFFICULTY_ORDER[subIndex - 1]
    if (prevSub !== undefined) {
      return {
        difficulty: current,
        subDifficulty: prevSub
      }
    }
  }
  
  // 子難度已最低，降低主難度並設最高子難度
  if (mainIndex > 0) {
    const prevMain = DIFFICULTY_ORDER[mainIndex - 1]
    if (prevMain !== undefined) {
      return {
        difficulty: prevMain,
        subDifficulty: 3
      }
    }
  }
  
  // 已經最低難度
  return null
}

/**
 * 分析最近遊戲表現（含反應時間分析）
 */
async function analyzeRecentPerformance(
  odId: string,
  gameId: string,
  gamesCount: number = 3
): Promise<{
  averageAccuracy: number
  averageScore: number
  averageReactionTime: number
  trend: 'improving' | 'stable' | 'declining'
  reactionTimeTrend: 'improving' | 'stable' | 'declining'
  consecutiveHighCount: number
  consecutiveLowCount: number
  daysSinceLastPlay: number
}> {
  const sessions = await getUserGameSessionsByGame(odId, gameId)
  
  if (sessions.length === 0) {
    return {
      averageAccuracy: 0.5,
      averageScore: 50,
      averageReactionTime: 0,
      trend: 'stable',
      reactionTimeTrend: 'stable',
      consecutiveHighCount: 0,
      consecutiveLowCount: 0,
      daysSinceLastPlay: 999
    }
  }
  
  // 計算距離上次遊玩的天數
  const sortedSessions = sessions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const firstSession = sortedSessions[0]
  if (!firstSession) {
    return {
      averageAccuracy: 0.5,
      averageScore: 50,
      averageReactionTime: 0,
      trend: 'stable',
      reactionTimeTrend: 'stable',
      consecutiveHighCount: 0,
      consecutiveLowCount: 0,
      daysSinceLastPlay: 999
    }
  }
  const lastPlayDate = new Date(firstSession.createdAt)
  const daysSinceLastPlay = Math.floor(
    (Date.now() - lastPlayDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // 取最近的 N 場遊戲
  const recentSessions = sortedSessions.slice(0, gamesCount)
  
  // 計算平均正確率和分數
  const accuracies = recentSessions.map(s => s.result.accuracy)
  const scores = recentSessions.map(s => s.result.score)
  const reactionTimes = recentSessions
    .map(s => s.result.avgReactionTime)
    .filter(t => t > 0)
  
  const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const averageReactionTime = reactionTimes.length > 0
    ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    : 0
  
  // 分析準確率趨勢
  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentSessions.length >= 2 && accuracies.length >= 2) {
    const first = accuracies[0] ?? 0
    const second = accuracies[1] ?? first
    const last = accuracies[accuracies.length - 1] ?? 0
    const secondLast = accuracies[accuracies.length - 2] ?? last
    
    const recentAvg = (first + second) / 2
    const olderAvg = (last + secondLast) / 2
    
    if (recentAvg > olderAvg + 0.1) {
      trend = 'improving'
    } else if (recentAvg < olderAvg - 0.1) {
      trend = 'declining'
    }
  }
  
  // 分析反應時間趨勢（反應時間下降表示進步）
  let reactionTimeTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (reactionTimes.length >= 2) {
    const recentRT = reactionTimes.slice(0, Math.ceil(reactionTimes.length / 2))
    const olderRT = reactionTimes.slice(Math.ceil(reactionTimes.length / 2))
    
    const recentAvgRT = recentRT.reduce((a, b) => a + b, 0) / recentRT.length
    const olderAvgRT = olderRT.reduce((a, b) => a + b, 0) / olderRT.length
    
    const changeRatio = (olderAvgRT - recentAvgRT) / olderAvgRT
    
    if (changeRatio > 0.15) {
      reactionTimeTrend = 'improving' // 反應時間減少 15%
    } else if (changeRatio < -0.20) {
      reactionTimeTrend = 'declining' // 反應時間增加 20%
    }
  }
  
  // 計算連續達標次數
  let consecutiveHighCount = 0
  let consecutiveLowCount = 0
  
  for (const session of recentSessions) {
    if (session.result.accuracy >= DEFAULT_CONFIG.upgradeThreshold) {
      consecutiveHighCount++
    } else {
      break
    }
  }
  
  for (const session of recentSessions) {
    if (session.result.accuracy < DEFAULT_CONFIG.downgradeThreshold) {
      consecutiveLowCount++
    } else {
      break
    }
  }
  
  return {
    averageAccuracy,
    averageScore,
    averageReactionTime,
    trend,
    reactionTimeTrend,
    consecutiveHighCount,
    consecutiveLowCount,
    daysSinceLastPlay
  }
}

/**
 * 計算難度調整建議（含反應時間與不活躍因素）
 */
export async function calculateDifficultyAdjustment(
  odId: string,
  gameId: string,
  currentResult?: GameResult,
  config: DifficultyConfig = DEFAULT_CONFIG,
  miniCogScore?: number
): Promise<DifficultyAdjustment> {
  // 取得當前難度
  const currentDiff = await getCurrentGameDifficulty(odId, gameId)
  const currentDifficulty = currentDiff?.difficulty || 'easy'
  const currentSubDifficulty = currentDiff?.subDifficulty || 2
  
  // 分析最近表現
  const performance = await analyzeRecentPerformance(odId, gameId, config.consecutiveGamesRequired)
  
  // 檢查不活躍降級（優先處理）
  if (config.enableInactivityDowngrade && performance.daysSinceLastPlay >= config.inactivityDaysThreshold) {
    const lower = getNextLowerDifficulty(currentDifficulty, currentSubDifficulty)
    if (lower) {
      return {
        shouldAdjust: true,
        currentDifficulty,
        currentSubDifficulty,
        newDifficulty: lower.difficulty,
        newSubDifficulty: lower.subDifficulty,
        reason: 'inactivity',
        message: `好久不見！已為您稍微降低難度，慢慢回復手感吧 💪`
      }
    }
  }
  
  // 如果有當前結果，更新連續計數
  let effectiveHighCount = performance.consecutiveHighCount
  let effectiveLowCount = performance.consecutiveLowCount
  
  if (currentResult) {
    if (currentResult.accuracy >= config.upgradeThreshold) {
      effectiveHighCount = performance.consecutiveHighCount + 1
      effectiveLowCount = 0
    } else if (currentResult.accuracy < config.downgradeThreshold) {
      effectiveLowCount = performance.consecutiveLowCount + 1
      effectiveHighCount = 0
    } else {
      effectiveHighCount = 0
      effectiveLowCount = 0
    }
  }
  
  // 判斷是否需要調整
  let shouldAdjust = false
  let newDifficulty = currentDifficulty
  let newSubDifficulty = currentSubDifficulty
  let reason: DifficultyAdjustment['reason'] = 'stable'
  let message = '難度維持不變'
  
  // 取得 Mini-Cog 限制（如果有）
  const miniCogLimit = miniCogScore !== undefined ? MINICOG_DIFFICULTY_LIMITS[miniCogScore] : null
  
  // 檢查升級條件（準確率）
  if (effectiveHighCount >= config.consecutiveGamesRequired) {
    const higher = getNextHigherDifficulty(currentDifficulty, currentSubDifficulty)
    if (higher) {
      // 檢查是否超過 Mini-Cog 限制
      const wouldExceedLimit = miniCogLimit && !isDifficultyWithinLimit(
        higher.difficulty, 
        higher.subDifficulty, 
        miniCogLimit
      )
      
      if (!wouldExceedLimit) {
        shouldAdjust = true
        newDifficulty = higher.difficulty
        newSubDifficulty = higher.subDifficulty
        reason = 'accuracy-high'
        
        if (newDifficulty !== currentDifficulty) {
          message = `表現優異！難度提升至「${getDifficultyLabel(newDifficulty)}」🎉`
        } else {
          message = `表現穩定進步！子難度提升至 ${newSubDifficulty} ⬆️`
        }
      } else {
        message = '表現很棒！已達建議最高難度，持續保持！'
      }
    } else {
      message = '已達最高難度，繼續保持！🏆'
    }
  }
  // 檢查反應時間改善升級（輔助條件）
  else if (
    config.enableReactionTimeFactor && 
    performance.reactionTimeTrend === 'improving' &&
    performance.averageAccuracy >= 0.60  // 至少 60% 正確率
  ) {
    const higher = getNextHigherDifficulty(currentDifficulty, currentSubDifficulty)
    if (higher && (!miniCogLimit || isDifficultyWithinLimit(higher.difficulty, higher.subDifficulty, miniCogLimit))) {
      shouldAdjust = true
      newDifficulty = higher.difficulty
      newSubDifficulty = higher.subDifficulty
      reason = 'reaction-improved'
      message = `反應速度明顯進步！嘗試更高難度 ⚡`
    }
  }
  // 檢查降級條件（準確率）
  else if (effectiveLowCount >= config.consecutiveGamesRequired) {
    const lower = getNextLowerDifficulty(currentDifficulty, currentSubDifficulty)
    if (lower) {
      shouldAdjust = true
      newDifficulty = lower.difficulty
      newSubDifficulty = lower.subDifficulty
      reason = 'accuracy-low'
      
      if (newDifficulty !== currentDifficulty) {
        message = `難度調整至「${getDifficultyLabel(newDifficulty)}」，循序漸進更有效！`
      } else {
        message = `子難度調整至 ${newSubDifficulty}，加油！💪`
      }
    } else {
      message = '難度已是最低，多練習會進步的！'
    }
  }
  // 檢查反應時間惡化降級（輔助條件）
  else if (
    config.enableReactionTimeFactor && 
    performance.reactionTimeTrend === 'declining' &&
    performance.averageAccuracy < 0.60
  ) {
    const lower = getNextLowerDifficulty(currentDifficulty, currentSubDifficulty)
    if (lower) {
      shouldAdjust = true
      newDifficulty = lower.difficulty
      newSubDifficulty = lower.subDifficulty
      reason = 'reaction-declined'
      message = `放慢節奏，穩扎穩打更重要 🌱`
    }
  }
  
  return {
    shouldAdjust,
    currentDifficulty,
    currentSubDifficulty,
    newDifficulty,
    newSubDifficulty,
    reason,
    message
  }
}

/**
 * 檢查難度是否在 Mini-Cog 限制內
 */
function isDifficultyWithinLimit(
  difficulty: Difficulty,
  subDifficulty: SubDifficulty,
  limit: MiniCogDifficultyLimit
): boolean {
  const mainIndex = DIFFICULTY_ORDER.indexOf(difficulty)
  const limitMainIndex = DIFFICULTY_ORDER.indexOf(limit.maxDifficulty)
  
  if (mainIndex < limitMainIndex) return true
  if (mainIndex > limitMainIndex) return false
  
  // 主難度相同，比較子難度
  return subDifficulty <= limit.maxSubDifficulty
}

/**
 * 根據 Mini-Cog 分數取得初始難度
 */
export function getInitialDifficultyFromMiniCog(
  miniCogScore: number
): { difficulty: Difficulty; subDifficulty: SubDifficulty } {
  const limit = MINICOG_DIFFICULTY_LIMITS[Math.min(Math.max(miniCogScore, 0), 5)]
  return {
    difficulty: limit?.initialDifficulty || 'easy',
    subDifficulty: limit?.initialSubDifficulty || 2
  }
}

/**
 * 套用難度調整
 */
export async function applyDifficultyAdjustment(
  odId: string,
  gameId: string,
  adjustment: DifficultyAdjustment,
  accuracy: number
): Promise<void> {
  if (!adjustment.shouldAdjust) return
  
  // 過濾掉 stable，只儲存實際調整
  const reason = adjustment.reason === 'stable' ? 'manual' : adjustment.reason
  
  const history: DifficultyHistory = {
    id: generateId(),
    odId,
    gameId,
    previousDifficulty: adjustment.currentDifficulty,
    previousSubDifficulty: adjustment.currentSubDifficulty,
    newDifficulty: adjustment.newDifficulty,
    newSubDifficulty: adjustment.newSubDifficulty,
    reason,
    accuracy,
    changedAt: new Date().toISOString()
  }
  
  await saveDifficultyHistory(history)
}

/**
 * 手動設定難度
 */
export async function setManualDifficulty(
  odId: string,
  gameId: string,
  difficulty: Difficulty,
  subDifficulty: SubDifficulty
): Promise<void> {
  const current = await getCurrentGameDifficulty(odId, gameId)
  
  const history: DifficultyHistory = {
    id: generateId(),
    odId,
    gameId,
    previousDifficulty: current?.difficulty || 'easy',
    previousSubDifficulty: current?.subDifficulty || 2,
    newDifficulty: difficulty,
    newSubDifficulty: subDifficulty,
    reason: 'manual',
    accuracy: 0,
    changedAt: new Date().toISOString()
  }
  
  await saveDifficultyHistory(history)
}

/**
 * 取得遊戲的建議難度
 */
export async function getSuggestedDifficulty(
  odId: string,
  gameId: string
): Promise<{ difficulty: Difficulty; subDifficulty: SubDifficulty }> {
  const current = await getCurrentGameDifficulty(odId, gameId)
  
  if (current) {
    return current
  }
  
  // 沒有歷史記錄，根據整體表現建議
  const sessions = await getUserGameSessionsByGame(odId, gameId)
  
  if (sessions.length === 0) {
    // 新遊戲，從簡單開始
    return { difficulty: 'easy', subDifficulty: 2 }
  }
  
  // 根據平均正確率建議
  const avgAccuracy = sessions.reduce((sum, s) => sum + s.result.accuracy, 0) / sessions.length
  
  if (avgAccuracy >= 0.85) {
    return { difficulty: 'hard', subDifficulty: 1 }
  } else if (avgAccuracy >= 0.70) {
    return { difficulty: 'medium', subDifficulty: 2 }
  } else if (avgAccuracy >= 0.50) {
    return { difficulty: 'medium', subDifficulty: 1 }
  } else {
    return { difficulty: 'easy', subDifficulty: 2 }
  }
}

/**
 * 取得難度標籤
 */
function getDifficultyLabel(difficulty: Difficulty): string {
  const labels: Record<Difficulty, string> = {
    easy: '簡單',
    medium: '中等',
    hard: '困難'
  }
  return labels[difficulty]
}

/**
 * 取得完整難度標籤
 */
export function getFullDifficultyLabel(difficulty: Difficulty, subDifficulty: SubDifficulty): string {
  const mainLabels: Record<Difficulty, string> = {
    easy: '簡單',
    medium: '中等',
    hard: '困難'
  }
  const subLabels: Record<SubDifficulty, string> = {
    1: '初階',
    2: '中階',
    3: '進階'
  }
  return `${mainLabels[difficulty]} - ${subLabels[subDifficulty]}`
}

/**
 * 取得難度歷史摘要
 */
export async function getDifficultyHistorySummary(
  odId: string,
  gameId: string
): Promise<{
  totalChanges: number
  upgrades: number
  downgrades: number
  currentStreak: number
  streakType: 'upgrade' | 'downgrade' | 'none'
}> {
  const history = await getGameDifficultyHistory(odId, gameId)
  
  if (history.length === 0) {
    return {
      totalChanges: 0,
      upgrades: 0,
      downgrades: 0,
      currentStreak: 0,
      streakType: 'none'
    }
  }
  
  let upgrades = 0
  let downgrades = 0
  
  for (const h of history) {
    if (h.reason === 'accuracy-high') {
      upgrades++
    } else if (h.reason === 'accuracy-low') {
      downgrades++
    }
  }
  
  // 計算當前連續
  let currentStreak = 0
  let streakType: 'upgrade' | 'downgrade' | 'none' = 'none'
  
  for (const h of history) {
    if (h.reason === 'accuracy-high') {
      if (streakType === 'upgrade' || streakType === 'none') {
        streakType = 'upgrade'
        currentStreak++
      } else {
        break
      }
    } else if (h.reason === 'accuracy-low') {
      if (streakType === 'downgrade' || streakType === 'none') {
        streakType = 'downgrade'
        currentStreak++
      } else {
        break
      }
    } else {
      break
    }
  }
  
  return {
    totalChanges: history.length,
    upgrades,
    downgrades,
    currentStreak,
    streakType
  }
}

/**
 * 根據子難度調整遊戲設定
 */
type AdjustableSettings = Record<string, number | string | boolean>

export function adjustSettingsForSubDifficulty<T extends object>(
  baseSettings: T,
  subDifficulty: SubDifficulty,
  modifiers?: {
    1: Record<string, number>
    2: Record<string, number>
    3: Record<string, number>
  }
): T {
  const adjusted: AdjustableSettings = { ...(baseSettings as AdjustableSettings) }

  if (!modifiers) {
    // 使用預設調整係數
    const defaultModifiers: Record<SubDifficulty, number> = {
      1: 0.85,  // 子難度1：降低15%
      2: 1.0,   // 子難度2：基準值
      3: 1.15   // 子難度3：提高15%
    }
    
    const modifier = defaultModifiers[subDifficulty]
    
    // 調整數值型設定
    for (const key of Object.keys(adjusted)) {
      const value = adjusted[key]
      if (typeof value === 'number') {
        const isTimeSetting = (
          key.includes('time') ||
          key.includes('Time') ||
          key.includes('duration') ||
          key.includes('interval') ||
          key.includes('leadIn')
        )
        const isProbability = value > 0 && value < 1

        if (isTimeSetting) {
          adjusted[key] = Math.round(value / modifier)
        } else if (isProbability) {
          adjusted[key] = Math.min(1, Math.max(0, Number((value * modifier).toFixed(3))))
        } else {
          adjusted[key] = Math.round(value * modifier)
        }
      }
    }
    
    return adjusted as T
  }
  
  // 使用自定義調整係數
  const mods = modifiers[subDifficulty]
  
  for (const [key, multiplier] of Object.entries(mods)) {
    if (key in adjusted && typeof adjusted[key] === 'number') {
      const value = adjusted[key] as number
      const isProbability = value > 0 && value < 1
      adjusted[key] = isProbability
        ? Math.min(1, Math.max(0, Number((value * multiplier).toFixed(3))))
        : Math.round(value * multiplier)
    }
  }
  
  return adjusted as T
}

/**
 * 依方向調整難度（每日訓練用）
 */
export function shiftDifficultyStep(
  current: Difficulty,
  currentSub: SubDifficulty,
  direction: 1 | -1
): { difficulty: Difficulty; subDifficulty: SubDifficulty } {
  if (direction === 1) {
    const higher = getNextHigherDifficulty(current, currentSub)
    return higher ?? { difficulty: current, subDifficulty: currentSub }
  }
  const lower = getNextLowerDifficulty(current, currentSub)
  return lower ?? { difficulty: current, subDifficulty: currentSub }
}

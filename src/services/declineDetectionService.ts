/**
 * 退化檢測服務
 * 分析用戶認知表現趨勢，偵測可能的退化跡象
 * 支援專業模式（7天+7%閾值）和一般模式（30天+15%閾值）
 */

import type { CognitiveDimension, CognitiveScores } from '@/types/cognitive'
import type { GameSession } from '@/types/game'
import { 
  getUserGameSessions, 
  getGameSessionsByDateRange,
  saveDeclineAlert,
  getUserDeclineAlerts,
  getLatestBaselineAssessment,
  generateId,
  type DeclineAlert
} from '@/services/db'
import { DECLINE_DETECTION_CONFIG, type DeclineDetectionMode } from '@/stores/settingsStore'
import { COGNITIVE_DIMENSIONS } from '@/types/cognitive'
import { syncDeclineAlertToSheet } from '@/services/userDataSheetSyncService'

// 趨勢類型
export type TrendType = 'improving' | 'stable' | 'declining' | 'severe-decline'

// 維度趨勢分析結果
export interface DimensionTrend {
  dimension: CognitiveDimension
  currentScore: number
  previousScore: number
  baselineScore?: number
  changePercent: number
  trend: TrendType
  trendIcon: string
  trendColor: string
  message: string
}

// 整體趨勢摘要
export interface TrendSummary {
  dimensions: DimensionTrend[]
  overallTrend: TrendType
  hasAlerts: boolean
  alertCount: number
  analyzedPeriod: {
    start: string
    end: string
    days: number
  }
  recommendations: string[]
}

// 趨勢圖示對應
const TREND_ICONS: Record<TrendType, string> = {
  'improving': '📈',
  'stable': '➖',
  'declining': '📉',
  'severe-decline': '⚠️'
}

// 趨勢顏色對應
const TREND_COLORS: Record<TrendType, string> = {
  'improving': '#22c55e',
  'stable': '#6b7280',
  'declining': '#f59e0b',
  'severe-decline': '#ef4444'
}

/**
 * 計算特定時間範圍內的維度平均分數
 */
function calculateAverageScores(sessions: GameSession[]): CognitiveScores {
  if (sessions.length === 0) {
    return {
      reaction: 0,
      logic: 0,
      memory: 0,
      cognition: 0,
      coordination: 0,
      attention: 0
    }
  }

  const totals: CognitiveScores = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0
  }

  const counts: CognitiveScores = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0
  }

  for (const session of sessions) {
    const scores = session.cognitiveScores
    for (const dim of Object.keys(scores) as CognitiveDimension[]) {
      if (scores[dim] > 0) {
        totals[dim] += scores[dim]
        counts[dim]++
      }
    }
  }

  const averages: CognitiveScores = {
    reaction: 0,
    logic: 0,
    memory: 0,
    cognition: 0,
    coordination: 0,
    attention: 0
  }

  for (const dim of Object.keys(totals) as CognitiveDimension[]) {
    averages[dim] = counts[dim] > 0 ? Math.round(totals[dim] / counts[dim]) : 0
  }

  return averages
}

/**
 * 判斷趨勢類型
 */
function determineTrend(
  changePercent: number,
  declineThreshold: number,
  severeDeclineThreshold: number
): TrendType {
  if (changePercent >= 5) {
    return 'improving'
  } else if (changePercent >= -declineThreshold * 100) {
    return 'stable'
  } else if (changePercent >= -severeDeclineThreshold * 100) {
    return 'declining'
  } else {
    return 'severe-decline'
  }
}

/**
 * 生成趨勢訊息
 */
function generateTrendMessage(
  dimension: CognitiveDimension,
  trend: TrendType,
  changePercent: number
): string {
  const dimName = COGNITIVE_DIMENSIONS[dimension].name

  switch (trend) {
    case 'improving':
      return `${dimName}表現進步 ${Math.abs(changePercent).toFixed(1)}%，持續保持！`
    case 'stable':
      return `${dimName}表現穩定，繼續維持訓練習慣。`
    case 'declining':
      return `${dimName}出現輕微下降 ${Math.abs(changePercent).toFixed(1)}%，建議加強訓練。`
    case 'severe-decline':
      return `${dimName}下降明顯 ${Math.abs(changePercent).toFixed(1)}%，請特別留意並增加訓練頻率。`
  }
}

/**
 * 分析單一維度的趨勢
 */
export async function analyzeDimensionTrend(
  odId: string,
  dimension: CognitiveDimension,
  mode: DeclineDetectionMode
): Promise<DimensionTrend> {
  const config = DECLINE_DETECTION_CONFIG[mode]
  const now = new Date()
  
  // 當前期間
  const currentEnd = now
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - config.lookbackDays)
  
  // 上一期間（用於比較）
  const previousEnd = new Date(currentStart)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - config.lookbackDays)
  
  // 取得兩個期間的遊戲會話
  const currentSessions = await getGameSessionsByDateRange(odId, currentStart, currentEnd)
  const previousSessions = await getGameSessionsByDateRange(odId, previousStart, previousEnd)
  
  // 計算平均分數
  const currentScores = calculateAverageScores(currentSessions)
  const previousScores = calculateAverageScores(previousSessions)
  
  // 取得基準分數
  const baseline = await getLatestBaselineAssessment(odId)
  const baselineScore = baseline?.cognitiveScores[dimension]
  
  const currentScore = currentScores[dimension]
  const previousScore = previousScores[dimension] || currentScore
  
  // 計算變化百分比
  const changePercent = previousScore > 0 
    ? ((currentScore - previousScore) / previousScore) * 100 
    : 0
  
  // 判斷趨勢
  const trend = determineTrend(changePercent, config.declineThreshold, config.severeDeclineThreshold)
  
  return {
    dimension,
    currentScore,
    previousScore,
    baselineScore,
    changePercent,
    trend,
    trendIcon: TREND_ICONS[trend],
    trendColor: TREND_COLORS[trend],
    message: generateTrendMessage(dimension, trend, changePercent)
  }
}

/**
 * 取得完整趨勢摘要
 */
export async function getTrendSummary(
  odId: string,
  mode: DeclineDetectionMode
): Promise<TrendSummary> {
  const config = DECLINE_DETECTION_CONFIG[mode]
  const now = new Date()
  
  const dimensions: CognitiveDimension[] = [
    'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
  ]
  
  // 分析所有維度
  const dimensionTrends: DimensionTrend[] = await Promise.all(
    dimensions.map(dim => analyzeDimensionTrend(odId, dim, mode))
  )
  
  // 計算整體趨勢
  let alertCount = 0
  let decliningCount = 0
  let improvingCount = 0
  
  for (const trend of dimensionTrends) {
    if (trend.trend === 'severe-decline') {
      alertCount++
      decliningCount++
    } else if (trend.trend === 'declining') {
      decliningCount++
    } else if (trend.trend === 'improving') {
      improvingCount++
    }
  }
  
  let overallTrend: TrendType
  if (alertCount > 0) {
    overallTrend = 'severe-decline'
  } else if (decliningCount > improvingCount && decliningCount >= 2) {
    overallTrend = 'declining'
  } else if (improvingCount > decliningCount) {
    overallTrend = 'improving'
  } else {
    overallTrend = 'stable'
  }
  
  // 生成建議
  const recommendations: string[] = []
  
  const severeDeclines = dimensionTrends.filter(t => t.trend === 'severe-decline')
  const declines = dimensionTrends.filter(t => t.trend === 'declining')
  
  if (severeDeclines.length > 0) {
    const dims = severeDeclines.map(t => COGNITIVE_DIMENSIONS[t.dimension].name).join('、')
    recommendations.push(`建議重點加強 ${dims} 的訓練，每日至少完成相關遊戲 2 次。`)
    recommendations.push('若持續下降超過兩週，建議諮詢專業醫療人員。')
  }
  
  if (declines.length > 0) {
    const dims = declines.map(t => COGNITIVE_DIMENSIONS[t.dimension].name).join('、')
    recommendations.push(`${dims} 有輕微下降趨勢，建議增加訓練頻率。`)
  }
  
  if (improvingCount > 0) {
    recommendations.push('部分認知維度有進步，請繼續保持訓練習慣！')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('認知表現穩定，建議維持每日訓練習慣。')
  }
  
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - config.lookbackDays)
  
  return {
    dimensions: dimensionTrends,
    overallTrend,
    hasAlerts: alertCount > 0,
    alertCount,
    analyzedPeriod: {
      start: startDate.toISOString().split('T')[0] || startDate.toLocaleDateString('sv-SE'),
      end: now.toISOString().split('T')[0] || now.toLocaleDateString('sv-SE'),
      days: config.lookbackDays
    },
    recommendations
  }
}

/**
 * 檢測並儲存退化警告
 */
export async function detectAndSaveDeclineAlerts(
  odId: string,
  mode: DeclineDetectionMode
): Promise<DeclineAlert[]> {
  const summary = await getTrendSummary(odId, mode)
  const newAlerts: DeclineAlert[] = []
  
  for (const trend of summary.dimensions) {
    if (trend.trend === 'declining' || trend.trend === 'severe-decline') {
      const alert: DeclineAlert = {
        id: generateId(),
        odId,
        dimension: trend.dimension,
        alertType: trend.trend,
        previousScore: trend.previousScore,
        currentScore: trend.currentScore,
        changePercent: trend.changePercent,
        detectedAt: new Date().toISOString(),
        acknowledged: false
      }
      
      await saveDeclineAlert(alert)
      await syncDeclineAlertToSheet(alert)
      newAlerts.push(alert)
    }
  }
  
  return newAlerts
}

/**
 * 取得維度趨勢圖示
 */
export function getTrendIcon(trend: TrendType): string {
  return TREND_ICONS[trend]
}

/**
 * 取得維度趨勢顏色
 */
export function getTrendColor(trend: TrendType): string {
  return TREND_COLORS[trend]
}

/**
 * 比較與基準的變化
 */
export async function compareWithBaseline(
  odId: string,
  currentScores: CognitiveScores
): Promise<Record<CognitiveDimension, { change: number; trend: TrendType }>> {
  const baseline = await getLatestBaselineAssessment(odId)
  const result: Record<CognitiveDimension, { change: number; trend: TrendType }> = {} as any
  
  const dimensions: CognitiveDimension[] = [
    'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
  ]
  
  for (const dim of dimensions) {
    const baseScore = baseline?.cognitiveScores[dim] ?? currentScores[dim]
    const change = baseScore > 0 
      ? ((currentScores[dim] - baseScore) / baseScore) * 100 
      : 0
    
    result[dim] = {
      change,
      trend: determineTrend(change, 0.10, 0.20) // 使用固定閾值與基準比較
    }
  }
  
  return result
}

/**
 * 檢查是否需要發出提醒
 */
export async function shouldNotifyUser(odId: string): Promise<{
  shouldNotify: boolean
  alerts: DeclineAlert[]
  message: string
}> {
  const unacknowledged = await getUserDeclineAlerts(odId)
  const recentAlerts = unacknowledged.filter(a => {
    const alertDate = new Date(a.detectedAt)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    return alertDate > oneDayAgo && !a.acknowledged
  })
  
  if (recentAlerts.length === 0) {
    return {
      shouldNotify: false,
      alerts: [],
      message: ''
    }
  }
  
  const severeCount = recentAlerts.filter(a => a.alertType === 'severe-decline').length
  const dimensions = [...new Set(recentAlerts.map(a => a.dimension))]
  const dimNames = dimensions.map(d => COGNITIVE_DIMENSIONS[d as CognitiveDimension].name)
  
  let message = ''
  if (severeCount > 0) {
    message = `⚠️ 注意：${dimNames.join('、')}出現明顯下降，建議加強訓練並留意變化。`
  } else {
    message = `📉 提醒：${dimNames.join('、')}有輕微下降趨勢，建議增加訓練頻率。`
  }
  
  return {
    shouldNotify: true,
    alerts: recentAlerts,
    message
  }
}

/**
 * 取得整體退化摘要（用於首頁顯示）
 */
export async function getOverallDeclineSummary(): Promise<{
  dimensions: Array<{
    dimension: CognitiveDimension
    currentAverage: number
    declinePercentage: number
    isDeclined: boolean
  }>
}> {
  // 取得當前使用者 ID
  const savedUserId = localStorage.getItem('brain-training-current-user')
  if (!savedUserId) {
    return { dimensions: [] }
  }
  
  const settingsData = localStorage.getItem('brain-training-settings')
  const mode: DeclineDetectionMode = settingsData 
    ? (JSON.parse(settingsData).declineDetectionMode || 'general')
    : 'general'
  
  try {
    const summary = await getTrendSummary(savedUserId, mode)
    
    return {
      dimensions: summary.dimensions.map(dim => ({
        dimension: dim.dimension,
        currentAverage: dim.currentScore,
        declinePercentage: Math.abs(dim.changePercent),
        isDeclined: dim.trend === 'declining' || dim.trend === 'severe-decline'
      }))
    }
  } catch (error) {
    console.error('取得退化摘要失敗:', error)
    return { dimensions: [] }
  }
}

/**
 * 行為偵測與分析服務
 * 追蹤遊戲中的細節指標，分析用戶認知行為模式
 */

import { 
  saveBehaviorLog, 
  saveBehaviorLogs,
  getSessionBehaviorLogs,
  generateId,
  type BehaviorLog 
} from '@/services/db'

// 行為事件類型（與 db.ts 同步）
export type BehaviorEventType = 
  | 'click'           // 點擊事件
  | 'hesitation'      // 猶豫（延遲回應）
  | 'error'           // 錯誤
  | 'correction'      // 自我修正
  | 'fatigue'         // 疲勞指標
  | 'attention-drift' // 注意力漂移
  | 'pattern-break'   // 模式中斷
  | 'speed-change'    // 速度變化

// 點擊精準度資料
export interface ClickAccuracyData {
  targetX: number
  targetY: number
  clickX: number
  clickY: number
  distance: number
  targetSize: number
  isHit: boolean
}

// 猶豫事件資料
export interface HesitationData {
  expectedTime: number
  actualTime: number
  ratio: number
  context: string
}

// 錯誤事件資料
export interface ErrorData {
  errorType: string
  expectedAnswer: string
  actualAnswer: string
  attemptNumber: number
}

// 疲勞指標資料
export interface FatigueData {
  gameProgress: number
  reactionTimeIncrease: number
  accuracyDecrease: number
  consecutiveSlowResponses: number
}

// 注意力漂移資料
export interface AttentionDriftData {
  inactiveTime: number
  missedEvents: number
  consecutiveErrors: number
}

// 行為分析結果
export interface BehaviorAnalysis {
  sessionId: string
  gameId: string
  totalEvents: number
  clickAccuracy: {
    averageDistance: number
    hitRate: number
    precision: 'high' | 'medium' | 'low'
  }
  responsePattern: {
    averageHesitationRatio: number
    hesitationFrequency: number
    pattern: 'consistent' | 'variable' | 'declining'
  }
  errorPattern: {
    totalErrors: number
    errorRate: number
    commonErrorTypes: string[]
    selfCorrectionRate: number
  }
  fatigueIndicators: {
    detected: boolean
    onsetPoint: number | null
    severity: 'none' | 'mild' | 'moderate' | 'severe'
  }
  attentionQuality: {
    driftEvents: number
    focusScore: number
    quality: 'excellent' | 'good' | 'fair' | 'poor'
  }
  insights: string[]
  recommendations: string[]
}

// 行為收集器（用於遊戲中即時收集）
export class BehaviorCollector {
  private logs: Omit<BehaviorLog, 'synced'>[] = []
  private odId: string
  private gameId: string
  private sessionId: string
  private startTime: number
  private lastEventTime: number
  private eventCount: number = 0

  constructor(odId: string, gameId: string, sessionId: string) {
    this.odId = odId
    this.gameId = gameId
    this.sessionId = sessionId
    this.startTime = Date.now()
    this.lastEventTime = this.startTime
  }

  /**
   * 記錄點擊事件
   */
  recordClick(data: ClickAccuracyData): void {
    this.addLog('click', data)
  }

  /**
   * 記錄猶豫事件
   */
  recordHesitation(data: HesitationData): void {
    this.addLog('hesitation', data)
  }

  /**
   * 記錄錯誤事件
   */
  recordError(data: ErrorData): void {
    this.addLog('error', data)
  }

  /**
   * 記錄自我修正
   */
  recordCorrection(originalError: string, correctedTo: string): void {
    this.addLog('correction', { originalError, correctedTo })
  }

  /**
   * 記錄疲勞指標
   */
  recordFatigue(data: FatigueData): void {
    this.addLog('fatigue', data)
  }

  /**
   * 記錄注意力漂移
   */
  recordAttentionDrift(data: AttentionDriftData): void {
    this.addLog('attention-drift', data)
  }

  /**
   * 記錄速度變化
   */
  recordSpeedChange(previousSpeed: number, currentSpeed: number, context: string): void {
    this.addLog('speed-change', { 
      previousSpeed, 
      currentSpeed, 
      change: currentSpeed - previousSpeed,
      context 
    })
  }

  /**
   * 添加日誌
   */
  private addLog(eventType: BehaviorEventType, data: ClickAccuracyData | HesitationData | ErrorData | FatigueData | AttentionDriftData | Record<string, unknown>): void {
    const now = Date.now()
    const timeSinceStart = now - this.startTime
    const timeSinceLastEvent = now - this.lastEventTime
    
    this.logs.push({
      id: generateId(),
      odId: this.odId,
      gameId: this.gameId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      eventType,
      data: {
        ...data,
        timeSinceStart,
        timeSinceLastEvent,
        eventIndex: this.eventCount++
      }
    })
    
    this.lastEventTime = now
  }

  /**
   * 取得所有日誌
   */
  getLogs(): Omit<BehaviorLog, 'synced'>[] {
    return [...this.logs]
  }

  /**
   * 儲存所有日誌到資料庫
   */
  async saveAll(): Promise<void> {
    const logsWithSync: BehaviorLog[] = this.logs.map(log => ({
      ...log,
      synced: false
    }))
    
    if (logsWithSync.length > 0) {
      await saveBehaviorLogs(logsWithSync)
    }
  }

  /**
   * 取得統計摘要
   */
  getSummary(): {
    totalEvents: number
    duration: number
    eventTypes: Record<BehaviorEventType, number>
  } {
    const eventTypes: Record<BehaviorEventType, number> = {
      'click': 0,
      'hesitation': 0,
      'error': 0,
      'correction': 0,
      'fatigue': 0,
      'attention-drift': 0,
      'pattern-break': 0,
      'speed-change': 0
    }
    
    for (const log of this.logs) {
      eventTypes[log.eventType]++
    }
    
    return {
      totalEvents: this.logs.length,
      duration: Date.now() - this.startTime,
      eventTypes
    }
  }
}

/**
 * 分析遊戲會話的行為資料
 */
export async function analyzeBehavior(sessionId: string): Promise<BehaviorAnalysis | null> {
  const logs = await getSessionBehaviorLogs(sessionId)
  
  if (logs.length === 0) {
    return null
  }

  const firstLog = logs[0]
  if (!firstLog) return null
  
  const gameId = firstLog.gameId

  // 分析點擊精準度
  const clickLogs = logs.filter(l => l.eventType === 'click')
  const clickData = clickLogs.map(l => l.data as unknown as ClickAccuracyData)
  
  const clickAccuracy = analyzeClickAccuracy(clickData)
  
  // 分析反應模式
  const hesitationLogs = logs.filter(l => l.eventType === 'hesitation')
  const hesitationData = hesitationLogs.map(l => l.data as unknown as HesitationData)
  
  const responsePattern = analyzeResponsePattern(hesitationData, logs)
  
  // 分析錯誤模式
  const errorLogs = logs.filter(l => l.eventType === 'error')
  const correctionLogs = logs.filter(l => l.eventType === 'correction')
  const errorData = errorLogs.map(l => l.data as unknown as ErrorData)
  
  const errorPattern = analyzeErrorPattern(errorData, correctionLogs.length)
  
  // 分析疲勞指標
  const fatigueLogs = logs.filter(l => l.eventType === 'fatigue')
  const fatigueData = fatigueLogs.map(l => l.data as unknown as FatigueData)
  
  const fatigueIndicators = analyzeFatigue(fatigueData)
  
  // 分析注意力品質
  const driftLogs = logs.filter(l => l.eventType === 'attention-drift')
  const driftData = driftLogs.map(l => l.data as unknown as AttentionDriftData)
  
  const attentionQuality = analyzeAttention(driftData, logs.length)
  
  // 生成洞察和建議
  const { insights, recommendations } = generateInsightsAndRecommendations(
    clickAccuracy,
    responsePattern,
    errorPattern,
    fatigueIndicators,
    attentionQuality
  )

  return {
    sessionId,
    gameId,
    totalEvents: logs.length,
    clickAccuracy,
    responsePattern,
    errorPattern,
    fatigueIndicators,
    attentionQuality,
    insights,
    recommendations
  }
}

/**
 * 分析點擊精準度
 */
function analyzeClickAccuracy(data: ClickAccuracyData[]): BehaviorAnalysis['clickAccuracy'] {
  if (data.length === 0) {
    return {
      averageDistance: 0,
      hitRate: 1,
      precision: 'high'
    }
  }
  
  const distances = data.map(d => d.distance)
  const averageDistance = distances.reduce((a, b) => a + b, 0) / distances.length
  const hits = data.filter(d => d.isHit).length
  const hitRate = hits / data.length
  
  let precision: 'high' | 'medium' | 'low'
  if (hitRate >= 0.9 && averageDistance < 20) {
    precision = 'high'
  } else if (hitRate >= 0.7) {
    precision = 'medium'
  } else {
    precision = 'low'
  }
  
  return { averageDistance, hitRate, precision }
}

/**
 * 分析反應模式
 */
function analyzeResponsePattern(
  hesitationData: HesitationData[],
  allLogs: BehaviorLog[]
): BehaviorAnalysis['responsePattern'] {
  const ratios = hesitationData.map(d => d.ratio)
  const averageRatio = ratios.length > 0 
    ? ratios.reduce((a, b) => a + b, 0) / ratios.length 
    : 1.0
  
  const frequency = allLogs.length > 0 
    ? hesitationData.length / allLogs.length 
    : 0
  
  // 分析趨勢
  let pattern: 'consistent' | 'variable' | 'declining' = 'consistent'
  
  if (ratios.length >= 3) {
    const firstHalf = ratios.slice(0, Math.floor(ratios.length / 2))
    const secondHalf = ratios.slice(Math.floor(ratios.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    if (secondAvg > firstAvg * 1.3) {
      pattern = 'declining'
    } else {
      const variance = ratios.reduce((sum, r) => sum + Math.pow(r - averageRatio, 2), 0) / ratios.length
      if (variance > 0.5) {
        pattern = 'variable'
      }
    }
  }
  
  return {
    averageHesitationRatio: averageRatio,
    hesitationFrequency: frequency,
    pattern
  }
}

/**
 * 分析錯誤模式
 */
function analyzeErrorPattern(
  errorData: ErrorData[],
  correctionCount: number
): BehaviorAnalysis['errorPattern'] {
  const errorTypes = errorData.map(e => e.errorType)
  const typeCounts: Record<string, number> = {}
  
  for (const type of errorTypes) {
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }
  
  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type)
  
  const selfCorrectionRate = errorData.length > 0 
    ? correctionCount / errorData.length 
    : 0
  
  return {
    totalErrors: errorData.length,
    errorRate: 0, // 需要總回合數來計算
    commonErrorTypes: sortedTypes,
    selfCorrectionRate
  }
}

/**
 * 分析疲勞指標
 */
function analyzeFatigue(fatigueData: FatigueData[]): BehaviorAnalysis['fatigueIndicators'] {
  if (fatigueData.length === 0) {
    return {
      detected: false,
      onsetPoint: null,
      severity: 'none'
    }
  }
  
  const detected = true
  const firstFatigue = fatigueData[0]
  const onsetPoint = firstFatigue?.gameProgress ?? 0
  
  const lastFatigue = fatigueData[fatigueData.length - 1]
  let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'mild'
  
  if (lastFatigue && (lastFatigue.reactionTimeIncrease > 50 || lastFatigue.accuracyDecrease > 30)) {
    severity = 'severe'
  } else if (lastFatigue && (lastFatigue.reactionTimeIncrease > 30 || lastFatigue.accuracyDecrease > 15)) {
    severity = 'moderate'
  }
  
  return { detected, onsetPoint, severity }
}

/**
 * 分析注意力品質
 */
function analyzeAttention(
  driftData: AttentionDriftData[],
  totalEvents: number
): BehaviorAnalysis['attentionQuality'] {
  const driftEvents = driftData.length
  
  const focusScore = totalEvents > 0 
    ? Math.max(0, 100 - (driftEvents / totalEvents) * 100) 
    : 100
  
  let quality: 'excellent' | 'good' | 'fair' | 'poor'
  if (focusScore >= 90) {
    quality = 'excellent'
  } else if (focusScore >= 70) {
    quality = 'good'
  } else if (focusScore >= 50) {
    quality = 'fair'
  } else {
    quality = 'poor'
  }
  
  return { driftEvents, focusScore, quality }
}

/**
 * 生成洞察和建議
 */
function generateInsightsAndRecommendations(
  clickAccuracy: BehaviorAnalysis['clickAccuracy'],
  responsePattern: BehaviorAnalysis['responsePattern'],
  errorPattern: BehaviorAnalysis['errorPattern'],
  fatigueIndicators: BehaviorAnalysis['fatigueIndicators'],
  attentionQuality: BehaviorAnalysis['attentionQuality']
): { insights: string[]; recommendations: string[] } {
  const insights: string[] = []
  const recommendations: string[] = []
  
  // 點擊精準度分析
  if (clickAccuracy.precision === 'low') {
    insights.push('點擊精準度較低，可能與手眼協調有關')
    recommendations.push('建議嘗試較大的觸控目標遊戲，逐步提升精準度')
  } else if (clickAccuracy.precision === 'high') {
    insights.push('點擊精準度優秀，手眼協調良好')
  }
  
  // 反應模式分析
  if (responsePattern.pattern === 'declining') {
    insights.push('遊戲後期反應速度下降，可能出現疲勞')
    recommendations.push('建議縮短單次遊戲時間，增加休息頻率')
  } else if (responsePattern.hesitationFrequency > 0.3) {
    insights.push('回應時經常出現猶豫，可能需要更多思考時間')
    recommendations.push('可嘗試降低難度，讓決策過程更流暢')
  }
  
  // 錯誤模式分析
  if (errorPattern.selfCorrectionRate > 0.5) {
    insights.push('自我修正能力強，能察覺並糾正錯誤')
  } else if (errorPattern.totalErrors > 5 && errorPattern.selfCorrectionRate < 0.2) {
    insights.push('錯誤較多且較少自我修正')
    recommendations.push('建議放慢速度，仔細確認後再作答')
  }
  
  // 疲勞分析
  if (fatigueIndicators.detected) {
    if (fatigueIndicators.severity === 'severe') {
      insights.push(`在遊戲 ${fatigueIndicators.onsetPoint}% 處出現明顯疲勞`)
      recommendations.push('強烈建議縮短遊戲時間，疲勞時訓練效果會大幅降低')
    } else if (fatigueIndicators.severity === 'moderate') {
      insights.push('遊戲後期出現輕度疲勞')
      recommendations.push('可考慮分段進行訓練')
    }
  }
  
  // 注意力分析
  if (attentionQuality.quality === 'poor') {
    insights.push('注意力集中度較低，有多次分心情況')
    recommendations.push('建議在安靜環境進行訓練，減少干擾')
  } else if (attentionQuality.quality === 'excellent') {
    insights.push('注意力集中度優秀，專注力良好')
  }
  
  return { insights, recommendations }
}

/**
 * 檢測即時疲勞
 */
export function detectRealTimeFatigue(
  recentReactionTimes: number[],
  baselineReactionTime: number,
  recentAccuracies: number[],
  baselineAccuracy: number
): FatigueData | null {
  if (recentReactionTimes.length < 3) return null
  
  const recentAvgTime = recentReactionTimes.slice(-5).reduce((a, b) => a + b, 0) / 
    Math.min(5, recentReactionTimes.length)
  
  const recentAvgAccuracy = recentAccuracies.slice(-5).reduce((a, b) => a + b, 0) / 
    Math.min(5, recentAccuracies.length)
  
  const reactionTimeIncrease = ((recentAvgTime - baselineReactionTime) / baselineReactionTime) * 100
  const accuracyDecrease = ((baselineAccuracy - recentAvgAccuracy) / baselineAccuracy) * 100
  
  // 計算連續慢反應次數
  let consecutiveSlowResponses = 0
  for (let i = recentReactionTimes.length - 1; i >= 0; i--) {
    const rt = recentReactionTimes[i]
    if (rt !== undefined && rt > baselineReactionTime * 1.3) {
      consecutiveSlowResponses++
    } else {
      break
    }
  }
  
  // 判斷是否檢測到疲勞
  if (reactionTimeIncrease > 20 || accuracyDecrease > 10 || consecutiveSlowResponses >= 3) {
    return {
      gameProgress: (recentReactionTimes.length / (recentReactionTimes.length + 10)) * 100,
      reactionTimeIncrease,
      accuracyDecrease,
      consecutiveSlowResponses
    }
  }
  
  return null
}

/**
 * 檢測注意力漂移
 */
export function detectAttentionDrift(
  lastActivityTime: number,
  currentTime: number,
  recentErrors: number[],
  threshold: number = 5000
): AttentionDriftData | null {
  const inactiveTime = currentTime - lastActivityTime
  
  // 計算連續錯誤
  let consecutiveErrors = 0
  for (let i = recentErrors.length - 1; i >= 0; i--) {
    if (recentErrors[i] === 1) {
      consecutiveErrors++
    } else {
      break
    }
  }
  
  if (inactiveTime > threshold || consecutiveErrors >= 3) {
    return {
      inactiveTime,
      missedEvents: 0,
      consecutiveErrors
    }
  }
  
  return null
}

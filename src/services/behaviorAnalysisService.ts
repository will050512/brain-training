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
import { syncBehaviorLogsToSheet } from '@/services/userDataSheetSyncService'
import { useSettingsStore } from '@/stores/settingsStore'

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
  | 'thinking-time'   // 思考時間（題目出現到首次操作）
  | 'cancellation'    // 操作取消（放棄當前選擇）
  | 'regret'          // 反悔（選擇後又更改答案）
  | 'rapid-response'  // 快速反應（可能是隨意點擊）
  | 'timeout'         // 超時未作答

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

// 思考時間資料
export interface ThinkingTimeData {
  questionId: string | number
  questionType: string
  timeToFirstAction: number      // 題目出現到首次操作的毫秒數
  expectedThinkingTime: number   // 預期思考時間
  ratio: number                  // 實際/預期比率
  difficulty: number             // 題目難度 1-5
}

// 操作取消資料
export interface CancellationData {
  questionId: string | number
  cancelledAction: string        // 被取消的操作描述
  timeBeforeCancel: number       // 取消前的操作時間
  reason?: string                // 可能的取消原因（推測）
}

// 反悔資料
export interface RegretData {
  questionId: string | number
  originalAnswer: string         // 原始答案
  newAnswer: string              // 更改後的答案
  timeBetweenChanges: number     // 兩次選擇之間的時間
  finalAnswerCorrect: boolean    // 最終答案是否正確
  originalAnswerCorrect: boolean // 原始答案是否正確
}

// 快速反應資料
export interface RapidResponseData {
  questionId: string | number
  responseTime: number           // 反應時間（毫秒）
  minimumExpectedTime: number    // 預期最少需要的時間
  isCorrect: boolean             // 是否正確
}

// 超時資料
export interface TimeoutData {
  questionId: string | number
  allowedTime: number            // 允許的時間
  elapsedTime: number            // 實際經過時間
  partialAnswer?: string         // 部分答案（如果有）
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
  // 新增精細行為分析
  thinkingTimeAnalysis: {
    averageThinkingTime: number
    thinkingTimeVariance: number
    prolongedThinkingCount: number    // 過長思考次數
    rushingCount: number              // 過快回應次數
    pattern: 'thoughtful' | 'impulsive' | 'mixed' | 'deliberate'
  }
  decisionStability: {
    cancellationCount: number
    regretCount: number
    changeToCorrectRate: number       // 反悔後改對的比率
    changeToWrongRate: number         // 反悔後改錯的比率
    stability: 'stable' | 'indecisive' | 'second-guessing'
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
   * 記錄思考時間
   */
  recordThinkingTime(data: ThinkingTimeData): void {
    this.addLog('thinking-time', data)
  }

  /**
   * 記錄操作取消
   */
  recordCancellation(data: CancellationData): void {
    this.addLog('cancellation', data)
  }

  /**
   * 記錄反悔行為
   */
  recordRegret(data: RegretData): void {
    this.addLog('regret', data)
  }

  /**
   * 記錄快速反應（可能的隨意點擊）
   */
  recordRapidResponse(data: RapidResponseData): void {
    this.addLog('rapid-response', data)
  }

  /**
   * 記錄超時
   */
  recordTimeout(data: TimeoutData): void {
    this.addLog('timeout', data)
  }

  /**
   * 添加日誌
   */
  private addLog(
    eventType: BehaviorEventType, 
    data: ClickAccuracyData | HesitationData | ErrorData | FatigueData | 
          AttentionDriftData | ThinkingTimeData | CancellationData | 
          RegretData | RapidResponseData | TimeoutData | Record<string, unknown>
  ): void {
    const settingsStore = useSettingsStore()
    if (!settingsStore.enableBehaviorTracking) return
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
      await syncBehaviorLogsToSheet(logsWithSync)
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
      'speed-change': 0,
      'thinking-time': 0,
      'cancellation': 0,
      'regret': 0,
      'rapid-response': 0,
      'timeout': 0
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
  
  // 分析思考時間
  const thinkingLogs = logs.filter(l => l.eventType === 'thinking-time')
  const rapidLogs = logs.filter(l => l.eventType === 'rapid-response')
  const thinkingData = thinkingLogs.map(l => l.data as unknown as ThinkingTimeData)
  const rapidData = rapidLogs.map(l => l.data as unknown as RapidResponseData)
  
  const thinkingTimeAnalysis = analyzeThinkingTime(thinkingData, rapidData)
  
  // 分析決策穩定性
  const cancellationLogs = logs.filter(l => l.eventType === 'cancellation')
  const regretLogs = logs.filter(l => l.eventType === 'regret')
  const cancellationData = cancellationLogs.map(l => l.data as unknown as CancellationData)
  const regretData = regretLogs.map(l => l.data as unknown as RegretData)
  
  const decisionStability = analyzeDecisionStability(cancellationData, regretData)
  
  // 生成洞察和建議
  const { insights, recommendations } = generateInsightsAndRecommendations(
    clickAccuracy,
    responsePattern,
    errorPattern,
    fatigueIndicators,
    attentionQuality,
    thinkingTimeAnalysis,
    decisionStability
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
    thinkingTimeAnalysis,
    decisionStability,
    insights,
    recommendations
  }
}

/**
 * 分析點擊精準度
 */
function analyzeClickAccuracy(data: ClickAccuracyData[]): BehaviorAnalysis['clickAccuracy'] {
  const validData = data.filter(d => Number.isFinite(d.distance) && d.targetSize > 0)
  if (validData.length === 0) {
    return {
      averageDistance: 0,
      hitRate: 1,
      precision: 'high'
    }
  }
  
  const distances = validData.map(d => d.distance)
  const averageDistance = distances.reduce((a, b) => a + b, 0) / distances.length
  const hits = validData.filter(d => d.isHit).length
  const hitRate = hits / validData.length
  
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
 * 分析思考時間模式
 */
function analyzeThinkingTime(
  thinkingData: ThinkingTimeData[],
  rapidData: RapidResponseData[]
): BehaviorAnalysis['thinkingTimeAnalysis'] {
  if (thinkingData.length === 0) {
    return {
      averageThinkingTime: 0,
      thinkingTimeVariance: 0,
      prolongedThinkingCount: 0,
      rushingCount: rapidData.length,
      pattern: 'mixed'
    }
  }
  
  const times = thinkingData.map(d => d.timeToFirstAction)
  const averageThinkingTime = times.reduce((a, b) => a + b, 0) / times.length
  
  // 計算變異數
  const variance = times.reduce((sum, t) => sum + Math.pow(t - averageThinkingTime, 2), 0) / times.length
  const thinkingTimeVariance = Math.sqrt(variance)
  
  // 計算過長思考次數（超過預期時間 2 倍）
  const prolongedThinkingCount = thinkingData.filter(d => d.ratio > 2).length
  
  // 快速反應次數（可能是隨意點擊）
  const rushingCount = rapidData.length
  
  // 判斷模式
  let pattern: 'thoughtful' | 'impulsive' | 'mixed' | 'deliberate'
  const rushRatio = rushingCount / (thinkingData.length + rushingCount || 1)
  const prolongedRatio = prolongedThinkingCount / (thinkingData.length || 1)
  
  if (rushRatio > 0.3) {
    pattern = 'impulsive'
  } else if (prolongedRatio > 0.3) {
    pattern = 'deliberate'
  } else if (thinkingTimeVariance < averageThinkingTime * 0.3) {
    pattern = 'thoughtful'
  } else {
    pattern = 'mixed'
  }
  
  return {
    averageThinkingTime,
    thinkingTimeVariance,
    prolongedThinkingCount,
    rushingCount,
    pattern
  }
}

/**
 * 分析決策穩定性
 */
function analyzeDecisionStability(
  cancellationData: CancellationData[],
  regretData: RegretData[]
): BehaviorAnalysis['decisionStability'] {
  const cancellationCount = cancellationData.length
  const regretCount = regretData.length
  
  // 計算反悔後改對/改錯的比率
  const changedToCorrect = regretData.filter(d => d.finalAnswerCorrect && !d.originalAnswerCorrect).length
  const changedToWrong = regretData.filter(d => !d.finalAnswerCorrect && d.originalAnswerCorrect).length
  
  const changeToCorrectRate = regretCount > 0 ? changedToCorrect / regretCount : 0
  const changeToWrongRate = regretCount > 0 ? changedToWrong / regretCount : 0
  
  // 判斷穩定性
  let stability: 'stable' | 'indecisive' | 'second-guessing'
  
  const totalChanges = cancellationCount + regretCount
  if (totalChanges <= 2) {
    stability = 'stable'
  } else if (changeToWrongRate > changeToCorrectRate) {
    stability = 'second-guessing'  // 反悔後反而更常改錯
  } else {
    stability = 'indecisive'
  }
  
  return {
    cancellationCount,
    regretCount,
    changeToCorrectRate,
    changeToWrongRate,
    stability
  }
}

/**
 * 生成洞察和建議
 */
function generateInsightsAndRecommendations(
  clickAccuracy: BehaviorAnalysis['clickAccuracy'],
  responsePattern: BehaviorAnalysis['responsePattern'],
  errorPattern: BehaviorAnalysis['errorPattern'],
  fatigueIndicators: BehaviorAnalysis['fatigueIndicators'],
  attentionQuality: BehaviorAnalysis['attentionQuality'],
  thinkingTimeAnalysis: BehaviorAnalysis['thinkingTimeAnalysis'],
  decisionStability: BehaviorAnalysis['decisionStability']
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
  
  // 思考時間分析
  if (thinkingTimeAnalysis.pattern === 'impulsive') {
    insights.push('反應模式偏向衝動，經常快速作答而未充分思考')
    recommendations.push('建議放慢節奏，在作答前多思考幾秒鐘')
  } else if (thinkingTimeAnalysis.pattern === 'deliberate') {
    insights.push('思考模式謹慎，傾向花較長時間考慮')
    if (thinkingTimeAnalysis.prolongedThinkingCount > 5) {
      recommendations.push('可嘗試在有時間壓力的遊戲中練習決策速度')
    }
  } else if (thinkingTimeAnalysis.pattern === 'thoughtful') {
    insights.push('思考時間穩定適中，展現良好的認知節奏')
  }
  
  if (thinkingTimeAnalysis.rushingCount > 3) {
    insights.push(`有 ${thinkingTimeAnalysis.rushingCount} 次過快反應，可能是隨意點擊`)
    recommendations.push('請確保每次作答都經過思考，避免隨意點擊')
  }
  
  // 決策穩定性分析
  if (decisionStability.stability === 'second-guessing') {
    insights.push('有反悔行為且反悔後答案反而更常出錯')
    recommendations.push('建議相信自己的第一直覺，減少反覆更改答案')
  } else if (decisionStability.stability === 'indecisive') {
    insights.push('決策過程較不穩定，有多次取消或更改選擇')
    recommendations.push('可嘗試先在心中確認答案再進行操作')
  } else if (decisionStability.cancellationCount === 0 && decisionStability.regretCount === 0) {
    insights.push('決策穩定，作答後較少反悔更改')
  }
  
  if (decisionStability.changeToCorrectRate > 0.5 && decisionStability.regretCount >= 2) {
    insights.push('反悔後經常改為正確答案，顯示有良好的自我檢視能力')
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

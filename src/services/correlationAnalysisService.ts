/**
 * 關聯分析服務
 * 提供 Mini-Cog 評估結果與遊戲訓練分數的統計分析功能
 */

import { type MiniCogResult } from './miniCogService'
import type { GameSession } from '@/types/game'

export interface CorrelationResult {
  /** 皮爾森相關係數 (-1 到 1) */
  coefficient: number
  /** 統計顯著性 (p-value) */
  pValue: number
  /** 是否具有統計顯著性 (p < 0.05) */
  isSignificant: boolean
  /** 相關性強度描述 */
  strength: 'very-weak' | 'weak' | 'moderate' | 'strong' | 'very-strong'
  /** 相關性方向 */
  direction: 'positive' | 'negative' | 'none'
  /** 資料點數量 */
  sampleSize: number
}

export interface CorrelationDataPoint {
  /** Mini-Cog 評估日期 */
  date: string
  /** Mini-Cog 總分 */
  miniCogScore: number
  /** 對應時期的平均遊戲分數 */
  averageGameScore: number
  /** 遊戲次數 */
  gameCount: number
}

export interface DomainCorrelation {
  /** 認知領域 */
  domain: string
  /** 該領域的相關分析結果 */
  correlation: CorrelationResult | null
  /** 該領域的資料點 */
  dataPoints: { miniCogScore: number; domainScore: number }[]
}

/** 最小資料點數量要求（統計顯著性需求） */
export const MINIMUM_DATA_POINTS = 5

/**
 * 檢查是否有足夠的資料進行關聯分析
 */
export function hasEnoughDataForCorrelation(dataCount: number): boolean {
  return dataCount >= MINIMUM_DATA_POINTS
}

/**
 * 計算皮爾森相關係數
 * @param x - X 軸資料陣列
 * @param y - Y 軸資料陣列
 * @returns 皮爾森相關係數 (-1 到 1)
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return NaN
  }

  const n = x.length
  
  // 計算平均值
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n
  
  // 計算協方差與標準差
  let covariance = 0
  let varX = 0
  let varY = 0
  
  for (let i = 0; i < n; i++) {
    const xi = x[i] ?? 0
    const yi = y[i] ?? 0
    const diffX = xi - meanX
    const diffY = yi - meanY
    covariance += diffX * diffY
    varX += diffX * diffX
    varY += diffY * diffY
  }
  
  // 避免除以零
  if (varX === 0 || varY === 0) {
    return 0
  }
  
  return covariance / Math.sqrt(varX * varY)
}

/**
 * 計算相關係數的 t 統計量和 p 值
 * 使用 t 分佈近似
 */
function calculatePValue(r: number, n: number): number {
  if (n <= 2 || Math.abs(r) >= 1) {
    return 1
  }
  
  // t = r * sqrt((n-2) / (1-r^2))
  const t = r * Math.sqrt((n - 2) / (1 - r * r))
  const df = n - 2
  
  // 使用 t 分佈的近似 p 值計算
  // 這是一個簡化的近似計算
  const x = df / (df + t * t)
  const pValue = incompleteBeta(df / 2, 0.5, x)
  
  return pValue
}

/**
 * 不完全 Beta 函數的近似計算（用於 p 值估算）
 */
function incompleteBeta(a: number, b: number, x: number): number {
  // 使用 Lentz 連分數近似
  if (x === 0 || x === 1) {
    return x
  }
  
  const EPSILON = 1e-10
  const MAX_ITERATIONS = 200
  
  let fpmin = 1e-30
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  
  if (Math.abs(d) < fpmin) d = fpmin
  d = 1 / d
  let h = d
  
  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    h *= d * c
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    const del = d * c
    h *= del
    
    if (Math.abs(del - 1) < EPSILON) break
  }
  
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  )
  
  return bt * h / a
}

/**
 * 對數伽瑪函數的近似計算
 */
function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ]
  
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  
  for (let j = 0; j < 6; j++) {
    y += 1
    const coef = coefficients[j] ?? 0
    ser += coef / y
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}

/**
 * 判斷相關係數的強度
 */
function getCorrelationStrength(r: number): CorrelationResult['strength'] {
  const absR = Math.abs(r)
  
  if (absR < 0.1) return 'very-weak'
  if (absR < 0.3) return 'weak'
  if (absR < 0.5) return 'moderate'
  if (absR < 0.7) return 'strong'
  return 'very-strong'
}

/**
 * 判斷相關係數的方向
 */
function getCorrelationDirection(r: number): CorrelationResult['direction'] {
  if (Math.abs(r) < 0.1) return 'none'
  return r > 0 ? 'positive' : 'negative'
}

/**
 * 執行完整的相關分析
 */
export function performCorrelationAnalysis(x: number[], y: number[]): CorrelationResult | null {
  if (!hasEnoughDataForCorrelation(x.length)) {
    return null
  }
  
  const coefficient = calculatePearsonCorrelation(x, y)
  
  if (isNaN(coefficient)) {
    return null
  }
  
  const pValue = calculatePValue(coefficient, x.length)
  
  return {
    coefficient,
    pValue,
    isSignificant: pValue < 0.05,
    strength: getCorrelationStrength(coefficient),
    direction: getCorrelationDirection(coefficient),
    sampleSize: x.length
  }
}

/**
 * 獲取 Mini-Cog 與遊戲分數的關聯資料
 * 將 Mini-Cog 評估前後一週的遊戲訓練成績作為配對資料
 * @param miniCogResults - Mini-Cog 評估結果陣列
 * @param gameSessions - 遊戲會話記錄陣列
 */
export function getMiniCogGameCorrelationData(
  miniCogResults: MiniCogResult[],
  gameSessions: GameSession[]
): CorrelationDataPoint[] {
  if (!miniCogResults || miniCogResults.length === 0) {
    return []
  }
  
  if (!gameSessions || gameSessions.length === 0) {
    return []
  }
  
  const correlationData: CorrelationDataPoint[] = []
  
  for (const result of miniCogResults) {
    const assessmentDate = new Date(result.completedAt)
    
    // 查找評估前後 7 天內的遊戲記錄
    const windowStart = new Date(assessmentDate)
    windowStart.setDate(windowStart.getDate() - 7)
    const windowEnd = new Date(assessmentDate)
    windowEnd.setDate(windowEnd.getDate() + 7)
    
    const relevantGames = gameSessions.filter((session: GameSession) => {
      const gameDate = new Date(session.createdAt)
      return gameDate >= windowStart && gameDate <= windowEnd
    })
    
    if (relevantGames.length > 0) {
      // 計算這段時間的平均遊戲分數
      const avgScore = relevantGames.reduce((sum: number, s: GameSession) => sum + (s.result?.score || 0), 0) / relevantGames.length
      
      const dateStr = assessmentDate.toISOString().split('T')[0]
      correlationData.push({
        date: dateStr || '',
        miniCogScore: result.totalScore,
        averageGameScore: Math.round(avgScore * 100) / 100,
        gameCount: relevantGames.length
      })
    }
  }
  
  // 按日期排序
  correlationData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return correlationData
}

/**
 * 執行 Mini-Cog 與遊戲分數的關聯分析
 */
export function analyzeMiniCogGameCorrelation(
  miniCogResults: MiniCogResult[],
  gameSessions: GameSession[]
): {
  hasEnoughData: boolean
  dataPoints: CorrelationDataPoint[]
  correlation: CorrelationResult | null
  message: string
} {
  const dataPoints = getMiniCogGameCorrelationData(miniCogResults, gameSessions)
  
  if (!hasEnoughDataForCorrelation(dataPoints.length)) {
    return {
      hasEnoughData: false,
      dataPoints,
      correlation: null,
      message: `資料不足：目前僅有 ${dataPoints.length} 筆配對資料，需要至少 ${MINIMUM_DATA_POINTS} 筆才能進行統計分析。`
    }
  }
  
  const miniCogScores = dataPoints.map(d => d.miniCogScore)
  const gameScores = dataPoints.map(d => d.averageGameScore)
  
  const correlation = performCorrelationAnalysis(miniCogScores, gameScores)
  
  let message = ''
  if (correlation) {
    const strengthText = {
      'very-weak': '非常微弱',
      'weak': '微弱',
      'moderate': '中等',
      'strong': '強',
      'very-strong': '非常強'
    }[correlation.strength]
    
    const directionText = {
      'positive': '正',
      'negative': '負',
      'none': '無'
    }[correlation.direction]
    
    message = `Mini-Cog 評估分數與遊戲訓練分數呈現${strengthText}的${directionText}相關 (r = ${correlation.coefficient.toFixed(3)})。`
    
    if (correlation.isSignificant) {
      message += ' 此相關性具有統計顯著性 (p < 0.05)。'
    } else {
      message += ' 此相關性尚未達到統計顯著水準。'
    }
  }
  
  return {
    hasEnoughData: true,
    dataPoints,
    correlation,
    message
  }
}

/**
 * 按認知領域分析關聯性
 */
export function analyzeByDomain(
  miniCogResults: MiniCogResult[],
  gameSessions: GameSession[]
): DomainCorrelation[] {
  if (!miniCogResults || miniCogResults.length === 0 || !gameSessions || gameSessions.length === 0) {
    return []
  }
  
  // 定義認知領域與遊戲的對應
  const domainGameMap: Record<string, string[]> = {
    '記憶力': ['card-match', 'instant-memory', 'poker-memory', 'audio-memory'],
    '注意力': ['whack-a-mole', 'spot-difference', 'number-connect'],
    '執行功能': ['maze-navigation', 'balance-scale', 'math-calc'],
    '視覺空間': ['clock-drawing', 'pattern-reasoning', 'gesture-memory'],
    '反應能力': ['rock-paper-scissors', 'rhythm-mimic']
  }
  
  const results: DomainCorrelation[] = []
  
  for (const [domain, games] of Object.entries(domainGameMap)) {
    const dataPoints: { miniCogScore: number; domainScore: number }[] = []
    
    for (const result of miniCogResults) {
      const assessmentDate = new Date(result.completedAt)
      
      // 查找評估前後 7 天內特定領域的遊戲記錄
      const windowStart = new Date(assessmentDate)
      windowStart.setDate(windowStart.getDate() - 7)
      const windowEnd = new Date(assessmentDate)
      windowEnd.setDate(windowEnd.getDate() + 7)
      
      const domainGames = gameSessions.filter((session: GameSession) => {
        const gameDate = new Date(session.createdAt)
        return gameDate >= windowStart && 
               gameDate <= windowEnd && 
               games.includes(session.gameId)
      })
      
      if (domainGames.length > 0) {
        const avgDomainScore = domainGames.reduce((sum: number, s: GameSession) => sum + (s.result?.score || 0), 0) / domainGames.length
        dataPoints.push({
          miniCogScore: result.totalScore,
          domainScore: avgDomainScore
        })
      }
    }
    
    let correlation: CorrelationResult | null = null
    
    if (hasEnoughDataForCorrelation(dataPoints.length)) {
      correlation = performCorrelationAnalysis(
        dataPoints.map(d => d.miniCogScore),
        dataPoints.map(d => d.domainScore)
      )
    }
    
    results.push({
      domain,
      correlation,
      dataPoints
    })
  }
  
  return results
}

/**
 * 獲取關聯分析的描述性摘要
 */
export function getCorrelationSummary(correlation: CorrelationResult): string {
  const { coefficient, strength, direction, isSignificant, sampleSize } = correlation
  
  const strengthMap: Record<string, string> = {
    'very-weak': '非常微弱',
    'weak': '微弱',
    'moderate': '中等程度',
    'strong': '強',
    'very-strong': '非常強'
  }
  
  const directionMap: Record<string, string> = {
    'positive': '正向',
    'negative': '負向',
    'none': '無明顯'
  }
  
  let summary = `基於 ${sampleSize} 筆資料的分析顯示，`
  summary += `Mini-Cog 評估分數與訓練分數之間存在${strengthMap[strength]}的${directionMap[direction]}關聯`
  summary += ` (r = ${coefficient.toFixed(3)})。`
  
  if (direction === 'positive') {
    summary += '\n\n這表示 Mini-Cog 評估分數較高的時期，訓練遊戲的表現也傾向較好。'
  } else if (direction === 'negative') {
    summary += '\n\n這表示 Mini-Cog 評估分數與訓練表現呈反向關係，可能需要進一步了解原因。'
  }
  
  if (isSignificant) {
    summary += '\n此結果具有統計顯著性，可作為參考依據。'
  } else {
    summary += '\n此結果尚未達統計顯著水準，建議累積更多資料後再做判斷。'
  }
  
  return summary
}

/**
 * 格式化相關係數顯示
 */
export function formatCorrelationCoefficient(r: number): string {
  if (isNaN(r)) return 'N/A'
  return r.toFixed(3)
}

/**
 * 獲取相關強度的顏色
 */
export function getCorrelationColor(strength: CorrelationResult['strength'], direction: CorrelationResult['direction']): string {
  if (direction === 'none') return '#9ca3af' // gray
  
  const colorMap = {
    'very-weak': '#d1d5db',
    'weak': direction === 'positive' ? '#86efac' : '#fca5a5',
    'moderate': direction === 'positive' ? '#4ade80' : '#f87171',
    'strong': direction === 'positive' ? '#22c55e' : '#ef4444',
    'very-strong': direction === 'positive' ? '#16a34a' : '#dc2626'
  }
  
  return colorMap[strength]
}

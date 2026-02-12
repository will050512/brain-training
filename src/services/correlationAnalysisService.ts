/**
 * 關聯分析服務
 * 提供 Mini-Cog 評估結果與遊戲訓練分數的統計分析功能
 */

import { type MiniCogResult } from './miniCogService'
import type { GameSession } from '@/types/game'
import {
  calculateOverallCognitiveScores,
  calculateDimensionSampleCounts,
  calculateCognitiveDomainScores,
  COGNITIVE_DOMAIN_WEIGHTS,
  type CognitiveDomain
} from '@/services/scoreCalculator'

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
  if (n <= 2) {
    return 1
  }
  if (Math.abs(r) >= 1) {
    return 0
  }
  
  // t = r * sqrt((n-2) / (1-r^2))
  const t = r * Math.sqrt((n - 2) / (1 - r * r))
  const df = n - 2

  // two-tailed p-value: p = 2 * (1 - CDF_t(|t|, df))
  const cdf = studentTCdf(Math.abs(t), df)
  const pValue = 2 * (1 - cdf)
  return clamp01(pValue)
}

/**
 * Clamp to [0, 1]
 */
function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

/**
 * Regularized incomplete beta I_x(a, b)
 * Numerical Recipes style (continued fraction + symmetry transform)
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(x)) return NaN
  if (a <= 0 || b <= 0) return NaN
  if (x <= 0) return 0
  if (x >= 1) return 1

  const lnBeta = logGamma(a + b) - logGamma(a) - logGamma(b)
  const bt = Math.exp(lnBeta + a * Math.log(x) + b * Math.log(1 - x))

  // Use symmetry transform for better convergence
  const threshold = (a + 1) / (a + b + 2)
  if (x < threshold) {
    return clamp01((bt * betaContinuedFraction(a, b, x)) / a)
  }
  return clamp01(1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b)
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX_ITERATIONS = 200
  const EPSILON = 3e-7
  const FPMIN = 1e-30

  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const m2 = 2 * m

    // even step
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c

    // odd step
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del

    if (Math.abs(del - 1) < EPSILON) break
  }

  return h
}

/**
 * Student's t CDF for t >= 0.
 */
function studentTCdf(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df)) return NaN
  if (df <= 0) return NaN
  if (t === 0) return 0.5
  if (t < 0) return 1 - studentTCdf(-t, df)

  const x = df / (df + t * t)
  const a = df / 2
  const b = 0.5
  const ib = regularizedIncompleteBeta(a, b, x)
  // For t>0: CDF = 1 - 0.5 * I_{df/(df+t^2)}(df/2, 1/2)
  return clamp01(1 - 0.5 * ib)
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

  const toValidDate = (value: unknown): Date | null => {
    const d = new Date(value as never)
    return Number.isFinite(d.getTime()) ? d : null
  }
  
  for (const result of miniCogResults) {
    const assessmentDate = toValidDate(result.completedAt)
    if (!assessmentDate) continue
    
    // 查找評估前後 7 天內的遊戲記錄
    const windowStart = new Date(assessmentDate)
    windowStart.setDate(windowStart.getDate() - 7)
    const windowEnd = new Date(assessmentDate)
    windowEnd.setDate(windowEnd.getDate() + 7)
    
    const relevantGames = gameSessions.filter((session: GameSession) => {
      const gameDate = toValidDate(session.createdAt)
      if (!gameDate) return false
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

  const domainLabels: Record<CognitiveDomain, string> = {
    memory: '記憶',
    attention: '注意',
    processing: '處理速度',
    executive: '執行功能',
    language: '語言'
  }

  const domains = Object.keys(COGNITIVE_DOMAIN_WEIGHTS) as CognitiveDomain[]
  const results: DomainCorrelation[] = domains.map(domain => ({
    domain: domainLabels[domain] ?? domain,
    correlation: null,
    dataPoints: []
  }))

  const domainIndex = new Map<CognitiveDomain, number>(domains.map((d, i) => [d, i]))

  const toValidDate = (value: unknown): Date | null => {
    const d = new Date(value as never)
    return Number.isFinite(d.getTime()) ? d : null
  }

  for (const miniCog of miniCogResults) {
    const assessmentDate = toValidDate(miniCog.completedAt)
    if (!assessmentDate) continue
    const windowStart = new Date(assessmentDate)
    windowStart.setDate(windowStart.getDate() - 7)
    const windowEnd = new Date(assessmentDate)
    windowEnd.setDate(windowEnd.getDate() + 7)

    const windowSessions = gameSessions.filter((session: GameSession) => {
      const gameDate = toValidDate(session.createdAt)
      if (!gameDate) return false
      return gameDate >= windowStart && gameDate <= windowEnd
    })

    if (windowSessions.length === 0) continue

    const cognitiveScores = calculateOverallCognitiveScores(windowSessions)
    const sampleCounts = calculateDimensionSampleCounts(windowSessions)
    const domainScores = calculateCognitiveDomainScores(cognitiveScores, sampleCounts)

    for (const domain of domains) {
      const idx = domainIndex.get(domain)
      if (idx === undefined) continue

      const target = results[idx]
      if (!target) continue

      // If the domain has no contributing samples in this window, skip the point.
      const domainWeights = COGNITIVE_DOMAIN_WEIGHTS[domain]
      const hasSamples = Object.keys(domainWeights).some(dim => {
        const dimension = dim as keyof typeof sampleCounts
        return (domainWeights[dimension] ?? 0) > 0 && (sampleCounts[dimension] ?? 0) > 0
      })
      if (!hasSamples) continue

      target.dataPoints.push({
        miniCogScore: miniCog.totalScore,
        domainScore: domainScores[domain] ?? 0
      })
    }
  }

  for (const r of results) {
    if (hasEnoughDataForCorrelation(r.dataPoints.length)) {
      r.correlation = performCorrelationAnalysis(
        r.dataPoints.map(d => d.miniCogScore),
        r.dataPoints.map(d => d.domainScore)
      )
    }
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

/**
 * 台灣認知評估常模資料
 * 
 * 資料來源：
 * 1. CASI: Teng EL et al. Neurology 1994;44:609-614
 * 2. MMSE: 劉景寬等《簡易智能狀態測驗之中文版》臨床醫學 1993；Liu HC et al.
 * 3. MoCA: Nasreddine ZS et al. JAGS 2005；台灣中文版驗證研究 2012-2024
 * 4. 台灣失智症協會《失智症診療指引》
 * 
 * 教育分界：6年（國小以下 vs 國中以上）
 */

// =============================================
// 類型定義
// =============================================

export type TestType = 'CASI' | 'MMSE' | 'MoCA'
export type AgeGroup = '50-59' | '60-69' | '70-79' | '80+'
export type EducationLevel = 'low' | 'high' // low: ≤6年, high: >6年

export type RiskLevel = 'normal' | 'warning' | 'mci' | 'dementia'

export interface NormativeData {
  dementiaCutoff: number    // 失智切點（≤此值為異常）
  mciCutoff: number         // MCI 預防警訊切點
  healthyMean: number       // 健康平均值
  healthySD: number         // 標準差
}

export interface RiskAssessment {
  score: number
  testType: TestType
  riskLevel: RiskLevel
  riskLabel: string
  riskColor: string
  percentile: number        // 同齡百分位（估算）
  message: string
  recommendation: string
}

// =============================================
// CASI 常模資料 (滿分 100)
// =============================================

const CASI_NORMS: Record<AgeGroup, Record<EducationLevel, NormativeData>> = {
  '50-59': {
    low: { dementiaCutoff: 67, mciCutoff: 75, healthyMean: 82, healthySD: 8 },
    high: { dementiaCutoff: 79, mciCutoff: 85, healthyMean: 92, healthySD: 5 }
  },
  '60-69': {
    low: { dementiaCutoff: 67, mciCutoff: 73, healthyMean: 80, healthySD: 9 },
    high: { dementiaCutoff: 79, mciCutoff: 84, healthyMean: 90, healthySD: 6 }
  },
  '70-79': {
    low: { dementiaCutoff: 67, mciCutoff: 70, healthyMean: 76, healthySD: 10 },
    high: { dementiaCutoff: 79, mciCutoff: 82, healthyMean: 87, healthySD: 7 }
  },
  '80+': {
    low: { dementiaCutoff: 49, mciCutoff: 60, healthyMean: 68, healthySD: 12 },
    high: { dementiaCutoff: 79, mciCutoff: 80, healthyMean: 84, healthySD: 8 }
  }
}

// 不識字特殊切點
const CASI_ILLITERATE_CUTOFF = 49

// =============================================
// MMSE 常模資料 (滿分 30)
// =============================================

const MMSE_NORMS: Record<AgeGroup, Record<EducationLevel, NormativeData>> = {
  '50-59': {
    low: { dementiaCutoff: 20, mciCutoff: 24, healthyMean: 26, healthySD: 3 },
    high: { dementiaCutoff: 23, mciCutoff: 26, healthyMean: 28, healthySD: 2 }
  },
  '60-69': {
    low: { dementiaCutoff: 20, mciCutoff: 23, healthyMean: 25, healthySD: 3 },
    high: { dementiaCutoff: 23, mciCutoff: 25, healthyMean: 27, healthySD: 2 }
  },
  '70-79': {
    low: { dementiaCutoff: 20, mciCutoff: 22, healthyMean: 24, healthySD: 4 },
    high: { dementiaCutoff: 23, mciCutoff: 24, healthyMean: 26, healthySD: 3 }
  },
  '80+': {
    low: { dementiaCutoff: 16, mciCutoff: 19, healthyMean: 22, healthySD: 4 },
    high: { dementiaCutoff: 21, mciCutoff: 23, healthyMean: 25, healthySD: 3 }
  }
}

// 不識字特殊切點
const MMSE_ILLITERATE_CUTOFF = 16

// =============================================
// MoCA 常模資料 (滿分 30)
// =============================================

const MOCA_NORMS: Record<AgeGroup, Record<EducationLevel, NormativeData>> = {
  '50-59': {
    low: { dementiaCutoff: 23, mciCutoff: 23, healthyMean: 22.8, healthySD: 4.5 },
    high: { dementiaCutoff: 23, mciCutoff: 26, healthyMean: 27.0, healthySD: 2.4 }
  },
  '60-69': {
    low: { dementiaCutoff: 23, mciCutoff: 21, healthyMean: 20.9, healthySD: 5.0 },
    high: { dementiaCutoff: 23, mciCutoff: 25, healthyMean: 26.6, healthySD: 2.7 }
  },
  '70-79': {
    low: { dementiaCutoff: 23, mciCutoff: 18, healthyMean: 18.2, healthySD: 5.2 },
    high: { dementiaCutoff: 23, mciCutoff: 24, healthyMean: 25.6, healthySD: 3.4 }
  },
  '80+': {
    low: { dementiaCutoff: 23, mciCutoff: 16, healthyMean: 16.5, healthySD: 5.5 },
    high: { dementiaCutoff: 23, mciCutoff: 22, healthyMean: 24.0, healthySD: 4.0 }
  }
}

// =============================================
// 風險等級定義
// =============================================

const RISK_LABELS: Record<RiskLevel, string> = {
  normal: '正常',
  warning: '輕微偏低',
  mci: '疑似輕度認知障礙',
  dementia: '疑似失智'
}

const RISK_COLORS: Record<RiskLevel, string> = {
  normal: '#22c55e',    // 綠色
  warning: '#f59e0b',   // 黃色
  mci: '#f97316',       // 橙色
  dementia: '#ef4444'   // 紅色
}

// =============================================
// 工具函數
// =============================================

/**
 * 根據年齡取得年齡組別
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age < 60) return '50-59'
  if (age < 70) return '60-69'
  if (age < 80) return '70-79'
  return '80+'
}

/**
 * 根據教育年數取得教育程度
 * @param years 教育年數（0 表示不識字）
 */
export function getEducationLevel(years: number): EducationLevel {
  return years <= 6 ? 'low' : 'high'
}

/**
 * 檢查是否為不識字（0 年教育）
 */
export function isIlliterate(educationYears: number): boolean {
  return educationYears === 0
}

/**
 * 取得特定條件的常模資料
 */
export function getNormativeData(
  testType: TestType,
  age: number,
  educationYears: number
): NormativeData {
  const ageGroup = getAgeGroup(age)
  const eduLevel = getEducationLevel(educationYears)
  
  switch (testType) {
    case 'CASI':
      return CASI_NORMS[ageGroup][eduLevel]
    case 'MMSE':
      return MMSE_NORMS[ageGroup][eduLevel]
    case 'MoCA':
      return MOCA_NORMS[ageGroup][eduLevel]
  }
}

/**
 * 取得失智切點
 */
export function getDementiaCutoff(
  testType: TestType,
  age: number,
  educationYears: number
): number {
  // 不識字有特殊切點
  if (isIlliterate(educationYears)) {
    switch (testType) {
      case 'CASI': return CASI_ILLITERATE_CUTOFF
      case 'MMSE': return MMSE_ILLITERATE_CUTOFF
      case 'MoCA': return 23 // MoCA 不區分
    }
  }
  
  return getNormativeData(testType, age, educationYears).dementiaCutoff
}

/**
 * 取得 MCI 預防警訊切點
 */
export function getMciCutoff(
  testType: TestType,
  age: number,
  educationYears: number
): number {
  return getNormativeData(testType, age, educationYears).mciCutoff
}

/**
 * 計算 Z 分數
 */
export function calculateZScore(
  score: number,
  mean: number,
  sd: number
): number {
  if (sd === 0) return 0
  return (score - mean) / sd
}

/**
 * Z 分數轉百分位（使用標準常態分布近似）
 */
export function zScoreToPercentile(z: number): number {
  // 使用誤差函數近似
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  
  const sign = z < 0 ? -1 : 1
  const absZ = Math.abs(z) / Math.sqrt(2)
  
  const t = 1.0 / (1.0 + p * absZ)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ)
  
  const cdf = 0.5 * (1.0 + sign * y)
  return Math.round(cdf * 100)
}

/**
 * 判斷風險等級
 */
export function getRiskLevel(
  score: number,
  testType: TestType,
  age: number,
  educationYears: number
): RiskLevel {
  const norm = getNormativeData(testType, age, educationYears)
  const dementiaCutoff = getDementiaCutoff(testType, age, educationYears)
  
  // 低於失智切點
  if (score <= dementiaCutoff) {
    return 'dementia'
  }
  
  // 低於 MCI 切點
  if (score <= norm.mciCutoff) {
    return 'mci'
  }
  
  // 低於健康平均值減一個標準差
  const warningThreshold = norm.healthyMean - norm.healthySD
  if (score < warningThreshold) {
    return 'warning'
  }
  
  return 'normal'
}

/**
 * 完整風險評估
 */
export function assessRisk(
  score: number,
  testType: TestType,
  age: number,
  educationYears: number
): RiskAssessment {
  const norm = getNormativeData(testType, age, educationYears)
  const riskLevel = getRiskLevel(score, testType, age, educationYears)
  
  // 計算百分位
  const zScore = calculateZScore(score, norm.healthyMean, norm.healthySD)
  const percentile = zScoreToPercentile(zScore)
  
  // 生成訊息
  let message: string
  let recommendation: string
  
  switch (riskLevel) {
    case 'normal':
      message = `您的${getTestName(testType)}分數為 ${score} 分，處於正常範圍。`
      recommendation = '建議持續維持認知訓練習慣，保持大腦活力。'
      break
    case 'warning':
      message = `您的${getTestName(testType)}分數為 ${score} 分，略低於同齡平均值（${norm.healthyMean.toFixed(1)}分）。`
      recommendation = '建議增加認知訓練頻率，並注意睡眠與營養攝取。'
      break
    case 'mci':
      message = `您的${getTestName(testType)}分數為 ${score} 分，低於 MCI 預防警訊切點（${norm.mciCutoff}分）。`
      recommendation = '建議諮詢醫師進行進一步評估，並積極進行認知訓練。'
      break
    case 'dementia':
      const cutoff = getDementiaCutoff(testType, age, educationYears)
      message = `您的${getTestName(testType)}分數為 ${score} 分，低於失智篩檢切點（${cutoff}分）。`
      recommendation = '強烈建議盡快至神經內科或精神科進行完整評估。'
      break
  }
  
  return {
    score,
    testType,
    riskLevel,
    riskLabel: RISK_LABELS[riskLevel],
    riskColor: RISK_COLORS[riskLevel],
    percentile,
    message,
    recommendation
  }
}

/**
 * 取得量表中文名稱
 */
export function getTestName(testType: TestType): string {
  switch (testType) {
    case 'CASI': return '認知能力篩檢量表 (CASI)'
    case 'MMSE': return '簡易心智量表 (MMSE)'
    case 'MoCA': return '蒙特利爾認知評估 (MoCA)'
  }
}

/**
 * 取得量表滿分
 */
export function getMaxScore(testType: TestType): number {
  switch (testType) {
    case 'CASI': return 100
    case 'MMSE': return 30
    case 'MoCA': return 30
  }
}

/**
 * 取得風險等級標籤
 */
export function getRiskLabel(level: RiskLevel): string {
  return RISK_LABELS[level]
}

/**
 * 取得風險等級顏色
 */
export function getRiskColor(level: RiskLevel): string {
  return RISK_COLORS[level]
}

/**
 * 比較與同齡人的表現
 */
export function compareWithPeers(
  score: number,
  testType: TestType,
  age: number,
  educationYears: number
): {
  percentile: number
  comparison: 'above' | 'average' | 'below'
  description: string
} {
  const norm = getNormativeData(testType, age, educationYears)
  const zScore = calculateZScore(score, norm.healthyMean, norm.healthySD)
  const percentile = zScoreToPercentile(zScore)
  
  let comparison: 'above' | 'average' | 'below'
  let description: string
  
  if (percentile >= 75) {
    comparison = 'above'
    description = `您的表現優於 ${percentile}% 的同齡人`
  } else if (percentile >= 25) {
    comparison = 'average'
    description = `您的表現與大多數同齡人相當（第 ${percentile} 百分位）`
  } else {
    comparison = 'below'
    description = `您的表現低於 ${100 - percentile}% 的同齡人，建議加強訓練`
  }
  
  return { percentile, comparison, description }
}

/**
 * 取得所有量表的快速參考切點（用於 UI 顯示）
 */
export function getQuickReferenceCutoffs(
  age: number,
  educationYears: number
): Record<TestType, { dementia: number; mci: number; healthy: number }> {
  return {
    CASI: {
      dementia: getDementiaCutoff('CASI', age, educationYears),
      mci: getMciCutoff('CASI', age, educationYears),
      healthy: getNormativeData('CASI', age, educationYears).healthyMean
    },
    MMSE: {
      dementia: getDementiaCutoff('MMSE', age, educationYears),
      mci: getMciCutoff('MMSE', age, educationYears),
      healthy: getNormativeData('MMSE', age, educationYears).healthyMean
    },
    MoCA: {
      dementia: getDementiaCutoff('MoCA', age, educationYears),
      mci: getMciCutoff('MoCA', age, educationYears),
      healthy: getNormativeData('MoCA', age, educationYears).healthyMean
    }
  }
}

/**
 * 資料來源說明
 */
export const DATA_SOURCES = {
  CASI: 'Teng EL et al. Neurology 1994; 台灣失智症診療指引',
  MMSE: '劉景寬等 臨床醫學 1993; Liu HC et al.',
  MoCA: 'Nasreddine ZS et al. JAGS 2005; 台灣中文版驗證研究 2012-2024'
}

/**
 * 免責聲明
 */
export const DISCLAIMER = 
  '本系統提供的認知評估分數為基於遊戲表現的估算值，僅供參考，不可作為醫療診斷依據。' +
  '常模資料來源：CASI (Teng et al. 1994)、MMSE (劉景寬等 1993)、MoCA (台灣中文版 2012-2024)。' +
  '如有認知功能相關疑慮，請諮詢專業醫師進行正式評估。'

/**
 * 專業認知評估分數計算服務
 * 基於遊戲表現估算 MMSE、MoCA、CASI 分數
 * 
 * 注意：這些分數僅供參考，不可作為醫療診斷依據
 */

import type { CognitiveScores } from '@/types/cognitive'
import type { GameSession } from '@/types/game'
import { gameRegistry } from '@/core/gameRegistry'
import {
  assessRisk,
  compareWithPeers,
  getQuickReferenceCutoffs,
  getRiskLevel,
  type RiskAssessment,
  type TestType,
  DISCLAIMER
} from './taiwanNormativeData'

/**
 * MMSE (Mini-Mental State Examination) 估算
 * 滿分 30 分
 * 
 * 組成：
 * - 定向力 (10分): 時間定向(5) + 地點定向(5)
 * - 登錄 (3分): 即時記憶
 * - 注意力與計算 (5分): 連續減7或倒拼
 * - 回憶 (3分): 延遲回憶
 * - 語言 (8分): 命名(2) + 複述(1) + 理解(3) + 閱讀(1) + 書寫(1)
 * - 視覺空間 (1分): 圖形臨摹
 */
export interface MMSEEstimate {
  total: number        // 0-30
  orientation: number  // 0-10
  registration: number // 0-3
  attention: number    // 0-5
  recall: number       // 0-3
  language: number     // 0-8
  visuospatial: number // 0-1
  interpretation: 'normal' | 'mild' | 'moderate' | 'severe'
}

/**
 * MoCA (Montreal Cognitive Assessment) 估算
 * 滿分 30 分
 * 
 * 組成：
 * - 視覺空間/執行功能 (5分): 連線測試(1) + 立方體(1) + 畫鐘(3)
 * - 命名 (3分): 動物命名
 * - 注意力 (6分): 數字順序(2) + 字母辨認(1) + 連續減7(3)
 * - 語言 (3分): 複述(2) + 流暢性(1)
 * - 抽象 (2分): 類比推理
 * - 延遲回憶 (5分)
 * - 定向 (6分)
 */
export interface MoCAEstimate {
  total: number              // 0-30
  visuospatialExecutive: number // 0-5
  naming: number             // 0-3
  attention: number          // 0-6
  language: number           // 0-3
  abstraction: number        // 0-2
  delayedRecall: number      // 0-5
  orientation: number        // 0-6
  interpretation: 'normal' | 'mci' | 'dementia'
}

/**
 * CASI (Cognitive Abilities Screening Instrument) 估算
 * 滿分 100 分
 * 
 * 九大認知領域：
 * - 注意力 (8分)
 * - 集中力 (10分)
 * - 定向力 (18分)
 * - 短期記憶 (12分)
 * - 長期記憶 (10分)
 * - 語言能力 (10分)
 * - 視覺構造 (10分)
 * - 思考流暢 (10分)
 * - 抽象思考 (12分)
 */
export interface CASIEstimate {
  total: number         // 0-100
  attention: number     // 0-8
  concentration: number // 0-10
  orientation: number   // 0-18
  shortTermMemory: number // 0-12
  longTermMemory: number  // 0-10
  language: number      // 0-10
  visualConstruction: number // 0-10
  fluency: number       // 0-10
  abstraction: number   // 0-12
  interpretation: 'normal' | 'mild' | 'moderate' | 'severe'
}

/**
 * 完整專業評估結果
 */
export interface ProfessionalAssessment {
  mmse: MMSEEstimate
  moca: MoCAEstimate
  casi: CASIEstimate
  assessedAt: string
  sessionCount: number
  disclaimer: string
}

// 遊戲到專業指標的映射權重
const GAME_TO_PROFESSIONAL_MAP: Record<string, {
  mmse: Partial<Record<keyof Omit<MMSEEstimate, 'total' | 'interpretation'>, number>>
  moca: Partial<Record<keyof Omit<MoCAEstimate, 'total' | 'interpretation'>, number>>
  casi: Partial<Record<keyof Omit<CASIEstimate, 'total' | 'interpretation'>, number>>
}> = {
  // 打地鼠 - 反應力為主
  'whack-a-mole': {
    mmse: { attention: 0.6 },
    moca: { attention: 0.5 },
    casi: { attention: 0.7, concentration: 0.3 },
  },
  // 天平比重 - 邏輯為主
  'balance-scale': {
    mmse: { attention: 0.3 },
    moca: { abstraction: 0.7, visuospatialExecutive: 0.3 },
    casi: { abstraction: 0.6, concentration: 0.4 },
  },
  // 翻牌配對 - 記憶力為主
  'card-match': {
    mmse: { registration: 0.3, recall: 0.7 },
    moca: { delayedRecall: 0.6, attention: 0.4 },
    casi: { shortTermMemory: 0.7, attention: 0.3 },
  },
  // Stroop測試 - 認知為主
  'stroop-test': {
    mmse: { attention: 0.5, language: 0.3 },
    moca: { visuospatialExecutive: 0.4, attention: 0.6 },
    casi: { concentration: 0.5, abstraction: 0.5 },
  },
  // 皇家花園迷宮 - 協調為主
  'maze-navigation': {
    mmse: { visuospatial: 0.8, attention: 0.2 },
    moca: { visuospatialExecutive: 0.8, attention: 0.2 },
    casi: { visualConstruction: 0.7, concentration: 0.3 },
  },
  // 找不同 - 注意力為主
  'spot-difference': {
    mmse: { attention: 0.7, visuospatial: 0.3 },
    moca: { attention: 0.6, visuospatialExecutive: 0.4 },
    casi: { attention: 0.5, concentration: 0.5 },
  },
  // 加減乘除 - 邏輯+處理速度
  'math-calc': {
    mmse: { attention: 0.8, registration: 0.2 },
    moca: { attention: 0.7, abstraction: 0.3 },
    casi: { concentration: 0.6, abstraction: 0.4 },
  },
  // 瞬間記憶 - 短期記憶
  'instant-memory': {
    mmse: { registration: 0.6, recall: 0.4 },
    moca: { delayedRecall: 0.7, attention: 0.3 },
    casi: { shortTermMemory: 0.8, attention: 0.2 },
  },
  // 撲克記憶 - 記憶+注意
  'poker-memory': {
    mmse: { registration: 0.4, recall: 0.6 },
    moca: { delayedRecall: 0.5, attention: 0.5 },
    casi: { shortTermMemory: 0.5, longTermMemory: 0.3, attention: 0.2 },
  },
  // 猜拳遊戲 - 反應+認知
  'rock-paper-scissors': {
    mmse: { attention: 0.5, language: 0.3 },
    moca: { attention: 0.6, visuospatialExecutive: 0.4 },
    casi: { attention: 0.4, concentration: 0.4, abstraction: 0.2 },
  },
}

/**
 * 計算 MMSE 估算分數
 */
export function calculateMMSEEstimate(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[]
): MMSEEstimate {
  // 基礎分數映射（假設認知分數 0-100 映射到各子項目滿分）
  const baseScores = {
    orientation: Math.min(10, Math.round((cognitiveScores.cognition / 100) * 10)),
    registration: Math.min(3, Math.round((cognitiveScores.memory / 100) * 3)),
    attention: Math.min(5, Math.round((cognitiveScores.attention / 100) * 5)),
    recall: Math.min(3, Math.round((cognitiveScores.memory / 100) * 3)),
    language: Math.min(8, Math.round(((cognitiveScores.cognition + cognitiveScores.reaction) / 200) * 8)),
    visuospatial: Math.min(1, Math.round((cognitiveScores.coordination / 100) * 1)),
  }

  // 根據遊戲記錄調整
  const gameAdjustments = calculateGameAdjustments(sessions, 'mmse')
  
  const adjusted = {
    orientation: Math.min(10, Math.max(0, baseScores.orientation + (gameAdjustments.orientation || 0))),
    registration: Math.min(3, Math.max(0, baseScores.registration + (gameAdjustments.registration || 0))),
    attention: Math.min(5, Math.max(0, baseScores.attention + (gameAdjustments.attention || 0))),
    recall: Math.min(3, Math.max(0, baseScores.recall + (gameAdjustments.recall || 0))),
    language: Math.min(8, Math.max(0, baseScores.language + (gameAdjustments.language || 0))),
    visuospatial: Math.min(1, Math.max(0, baseScores.visuospatial + (gameAdjustments.visuospatial || 0))),
  }

  const total = adjusted.orientation + adjusted.registration + adjusted.attention + 
                adjusted.recall + adjusted.language + adjusted.visuospatial

  let interpretation: MMSEEstimate['interpretation']
  // 使用台灣常模標準（高教育）：≥24 正常, 21-23 輕度, 10-20 中度, <10 重度
  if (total >= 24) interpretation = 'normal'
  else if (total >= 21) interpretation = 'mild'
  else if (total >= 10) interpretation = 'moderate'
  else interpretation = 'severe'

  return { total, ...adjusted, interpretation }
}

/**
 * 計算 MoCA 估算分數
 */
export function calculateMoCAEstimate(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[]
): MoCAEstimate {
  const baseScores = {
    visuospatialExecutive: Math.min(5, Math.round(((cognitiveScores.coordination + cognitiveScores.logic) / 200) * 5)),
    naming: Math.min(3, Math.round((cognitiveScores.cognition / 100) * 3)),
    attention: Math.min(6, Math.round((cognitiveScores.attention / 100) * 6)),
    language: Math.min(3, Math.round((cognitiveScores.cognition / 100) * 3)),
    abstraction: Math.min(2, Math.round((cognitiveScores.logic / 100) * 2)),
    delayedRecall: Math.min(5, Math.round((cognitiveScores.memory / 100) * 5)),
    orientation: Math.min(6, Math.round((cognitiveScores.cognition / 100) * 6)),
  }

  const gameAdjustments = calculateGameAdjustments(sessions, 'moca')

  const adjusted = {
    visuospatialExecutive: Math.min(5, Math.max(0, baseScores.visuospatialExecutive + (gameAdjustments.visuospatialExecutive || 0))),
    naming: Math.min(3, Math.max(0, baseScores.naming + (gameAdjustments.naming || 0))),
    attention: Math.min(6, Math.max(0, baseScores.attention + (gameAdjustments.attention || 0))),
    language: Math.min(3, Math.max(0, baseScores.language + (gameAdjustments.language || 0))),
    abstraction: Math.min(2, Math.max(0, baseScores.abstraction + (gameAdjustments.abstraction || 0))),
    delayedRecall: Math.min(5, Math.max(0, baseScores.delayedRecall + (gameAdjustments.delayedRecall || 0))),
    orientation: Math.min(6, Math.max(0, baseScores.orientation + (gameAdjustments.orientation || 0))),
  }

  const total = adjusted.visuospatialExecutive + adjusted.naming + adjusted.attention +
                adjusted.language + adjusted.abstraction + adjusted.delayedRecall + adjusted.orientation

  let interpretation: MoCAEstimate['interpretation']
  // 使用台灣常模標準：≥26 正常（高教育）, 23-25 MCI 疑慮, <23 失智疑慮
  if (total >= 26) interpretation = 'normal'
  else if (total >= 23) interpretation = 'mci'
  else interpretation = 'dementia'

  return { total, ...adjusted, interpretation }
}

/**
 * 計算 CASI 估算分數
 */
export function calculateCASIEstimate(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[]
): CASIEstimate {
  const baseScores = {
    attention: Math.min(8, Math.round((cognitiveScores.attention / 100) * 8)),
    concentration: Math.min(10, Math.round(((cognitiveScores.attention + cognitiveScores.reaction) / 200) * 10)),
    orientation: Math.min(18, Math.round((cognitiveScores.cognition / 100) * 18)),
    shortTermMemory: Math.min(12, Math.round((cognitiveScores.memory / 100) * 12)),
    longTermMemory: Math.min(10, Math.round((cognitiveScores.memory / 100) * 10)),
    language: Math.min(10, Math.round((cognitiveScores.cognition / 100) * 10)),
    visualConstruction: Math.min(10, Math.round((cognitiveScores.coordination / 100) * 10)),
    fluency: Math.min(10, Math.round(((cognitiveScores.reaction + cognitiveScores.cognition) / 200) * 10)),
    abstraction: Math.min(12, Math.round((cognitiveScores.logic / 100) * 12)),
  }

  const gameAdjustments = calculateGameAdjustments(sessions, 'casi')

  const adjusted = {
    attention: Math.min(8, Math.max(0, baseScores.attention + (gameAdjustments.attention || 0))),
    concentration: Math.min(10, Math.max(0, baseScores.concentration + (gameAdjustments.concentration || 0))),
    orientation: Math.min(18, Math.max(0, baseScores.orientation + (gameAdjustments.orientation || 0))),
    shortTermMemory: Math.min(12, Math.max(0, baseScores.shortTermMemory + (gameAdjustments.shortTermMemory || 0))),
    longTermMemory: Math.min(10, Math.max(0, baseScores.longTermMemory + (gameAdjustments.longTermMemory || 0))),
    language: Math.min(10, Math.max(0, baseScores.language + (gameAdjustments.language || 0))),
    visualConstruction: Math.min(10, Math.max(0, baseScores.visualConstruction + (gameAdjustments.visualConstruction || 0))),
    fluency: Math.min(10, Math.max(0, baseScores.fluency + (gameAdjustments.fluency || 0))),
    abstraction: Math.min(12, Math.max(0, baseScores.abstraction + (gameAdjustments.abstraction || 0))),
  }

  const total = adjusted.attention + adjusted.concentration + adjusted.orientation +
                adjusted.shortTermMemory + adjusted.longTermMemory + adjusted.language +
                adjusted.visualConstruction + adjusted.fluency + adjusted.abstraction

  let interpretation: CASIEstimate['interpretation']
  // 使用台灣常模標準（高教育）：≥80 正常, 68-79 輕度（MCI）, 50-67 中度, <50 重度
  if (total >= 80) interpretation = 'normal'
  else if (total >= 68) interpretation = 'mild'
  else if (total >= 50) interpretation = 'moderate'
  else interpretation = 'severe'

  return { total, ...adjusted, interpretation }
}

/**
 * 根據遊戲記錄計算調整值
 */
function calculateGameAdjustments(
  sessions: GameSession[],
  assessmentType: 'mmse' | 'moca' | 'casi'
): Record<string, number> {
  const adjustments: Record<string, number> = {}
  
  if (sessions.length === 0) return adjustments

  // 按遊戲分組計算平均分數
  const gameScores: Record<string, { sum: number; count: number }> = {}
  
  sessions.forEach(session => {
    const existing = gameScores[session.gameId]
    if (!existing) {
      gameScores[session.gameId] = { sum: 0, count: 0 }
    }
    const current = gameScores[session.gameId]!
    current.sum += session.result.score
    current.count++
  })

  // 根據遊戲表現調整分數
  Object.entries(gameScores).forEach(([gameId, { sum, count }]) => {
    const avgScore = sum / count
    const mapping = GAME_TO_PROFESSIONAL_MAP[gameId]?.[assessmentType]
    
    if (mapping) {
      Object.entries(mapping).forEach(([dimension, weight]) => {
        // 根據遊戲平均分數計算調整值（-2 到 +2）
        const adjustment = ((avgScore - 50) / 50) * 2 * (weight as number)
        adjustments[dimension] = (adjustments[dimension] || 0) + adjustment
      })
    }
  })

  // 四捨五入調整值
  Object.keys(adjustments).forEach(key => {
    const value = adjustments[key]
    if (value !== undefined) {
      adjustments[key] = Math.round(value * 10) / 10
    }
  })

  return adjustments
}

/**
 * 計算完整專業評估
 */
export function calculateProfessionalAssessment(
  cognitiveScores: CognitiveScores,
  sessions: GameSession[]
): ProfessionalAssessment {
  return {
    mmse: calculateMMSEEstimate(cognitiveScores, sessions),
    moca: calculateMoCAEstimate(cognitiveScores, sessions),
    casi: calculateCASIEstimate(cognitiveScores, sessions),
    assessedAt: new Date().toISOString(),
    sessionCount: sessions.length,
    disclaimer: '本系統提供的 MMSE/MoCA/CASI 分數為基於遊戲表現的估算值，僅供參考，不可作為醫療診斷依據。如有認知功能相關疑慮，請諮詢專業醫師或職能治療師進行正式評估。',
  }
}

/**
 * 取得解讀說明
 */
export function getInterpretationDescription(
  type: 'mmse' | 'moca' | 'casi',
  interpretation: string
): string {
  const descriptions: Record<string, Record<string, string>> = {
    mmse: {
      normal: '認知功能正常範圍',
      mild: '輕度認知障礙可能',
      moderate: '中度認知障礙可能',
      severe: '重度認知障礙可能',
    },
    moca: {
      normal: '認知功能正常範圍',
      mci: '輕度認知障礙 (MCI) 可能',
      dementia: '失智症可能',
    },
    casi: {
      normal: '認知功能正常範圍',
      mild: '輕度認知功能下降',
      moderate: '中度認知功能下降',
      severe: '重度認知功能下降',
    },
  }

  return descriptions[type]?.[interpretation] || '未知狀態'
}

/**
 * 取得建議行動
 */
export function getRecommendedAction(assessment: ProfessionalAssessment): string {
  const { mmse, moca, casi } = assessment
  
  // 如果任一指標顯示中度或重度問題
  if (mmse.interpretation === 'severe' || 
      moca.interpretation === 'dementia' || 
      casi.interpretation === 'severe') {
    return '建議盡快諮詢神經內科或精神科醫師進行詳細評估。'
  }
  
  if (mmse.interpretation === 'moderate' || casi.interpretation === 'moderate') {
    return '建議安排專業認知功能評估，並諮詢醫師意見。'
  }
  
  if (mmse.interpretation === 'mild' || moca.interpretation === 'mci' || casi.interpretation === 'mild') {
    return '建議持續進行認知訓練，並定期追蹤認知功能變化。如有疑慮可諮詢醫師。'
  }
  
  return '認知功能表現良好，建議持續進行認知訓練以維持大腦健康。'
}

// =============================================
// 台灣常模整合函數
// =============================================

/**
 * 使用台灣常模進行詳細風險評估
 */
export function assessWithTaiwanNorms(
  assessment: ProfessionalAssessment,
  age: number,
  educationYears: number
): {
  mmseRisk: RiskAssessment
  mocaRisk: RiskAssessment
  casiRisk: RiskAssessment
  overallRisk: 'normal' | 'warning' | 'mci' | 'dementia'
  cutoffs: ReturnType<typeof getQuickReferenceCutoffs>
} {
  const mmseRisk = assessRisk(assessment.mmse.total, 'MMSE', age, educationYears)
  const mocaRisk = assessRisk(assessment.moca.total, 'MoCA', age, educationYears)
  const casiRisk = assessRisk(assessment.casi.total, 'CASI', age, educationYears)
  
  // 計算整體風險（取最嚴重的）
  const riskLevels = [mmseRisk.riskLevel, mocaRisk.riskLevel, casiRisk.riskLevel]
  let overallRisk: 'normal' | 'warning' | 'mci' | 'dementia' = 'normal'
  
  if (riskLevels.includes('dementia')) {
    overallRisk = 'dementia'
  } else if (riskLevels.includes('mci')) {
    overallRisk = 'mci'
  } else if (riskLevels.includes('warning')) {
    overallRisk = 'warning'
  }
  
  return {
    mmseRisk,
    mocaRisk,
    casiRisk,
    overallRisk,
    cutoffs: getQuickReferenceCutoffs(age, educationYears)
  }
}

/**
 * 取得與同齡人比較結果
 */
export function getPeerComparison(
  assessment: ProfessionalAssessment,
  age: number,
  educationYears: number
): {
  mmse: ReturnType<typeof compareWithPeers>
  moca: ReturnType<typeof compareWithPeers>
  casi: ReturnType<typeof compareWithPeers>
} {
  return {
    mmse: compareWithPeers(assessment.mmse.total, 'MMSE', age, educationYears),
    moca: compareWithPeers(assessment.moca.total, 'MoCA', age, educationYears),
    casi: compareWithPeers(assessment.casi.total, 'CASI', age, educationYears)
  }
}

/**
 * 取得個人化風險訊息
 */
export function getPersonalizedRiskMessage(
  assessment: ProfessionalAssessment,
  age: number,
  educationYears: number
): string {
  const taiwanAssessment = assessWithTaiwanNorms(assessment, age, educationYears)
  const ageGroup = age < 60 ? '中年' : age < 70 ? '60-69歲' : age < 80 ? '70-79歲' : '80歲以上'
  const eduLevel = educationYears <= 6 ? '國小以下' : '國中以上'
  
  let message = `根據台灣${ageGroup}、${eduLevel}學歷常模標準：\n\n`
  
  // MMSE
  message += `📊 MMSE：${assessment.mmse.total}分 - ${taiwanAssessment.mmseRisk.riskLabel}\n`
  message += `   （切點：${taiwanAssessment.cutoffs.MMSE.dementia}分）\n\n`
  
  // MoCA  
  message += `📊 MoCA：${assessment.moca.total}分 - ${taiwanAssessment.mocaRisk.riskLabel}\n`
  message += `   （切點：${taiwanAssessment.cutoffs.MoCA.dementia}分）\n\n`
  
  // CASI
  message += `📊 CASI：${assessment.casi.total}分 - ${taiwanAssessment.casiRisk.riskLabel}\n`
  message += `   （切點：${taiwanAssessment.cutoffs.CASI.dementia}分）\n\n`
  
  // 整體建議
  switch (taiwanAssessment.overallRisk) {
    case 'normal':
      message += '✅ 整體認知功能在正常範圍，請持續保持訓練習慣！'
      break
    case 'warning':
      message += '⚠️ 部分指標略低於同齡平均，建議增加訓練頻率並注意生活作息。'
      break
    case 'mci':
      message += '🔔 有輕度認知障礙（MCI）疑慮，建議諮詢專業醫師進行進一步評估。'
      break
    case 'dementia':
      message += '🚨 認知功能明顯低於正常範圍，強烈建議盡快就醫進行完整評估。'
      break
  }
  
  return message
}

/**
 * 取得常模資料來源說明
 */
export function getDataSourceInfo(): string {
  return DISCLAIMER
}

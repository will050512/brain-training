/**
 * 營養品建議 Placeholder 架構
 * 
 * 此模組定義營養品觸發條件與建議邏輯的架構。
 * 目前為 placeholder 實作，待行為與退化偵測穩定後再實作具體建議邏輯。
 * 
 * 注意：營養品建議僅供參考，不構成醫療建議。
 * 使用者應諮詢專業醫療人員後再決定是否補充。
 */

import type { CognitiveDimension, CognitiveScores } from '@/types/cognitive'

// ===== 類型定義 =====

/** 營養補充品類型 */
export type SupplementType = 
  | 'omega3'              // Omega-3 魚油
  | 'vitaminB'            // 維生素 B 群
  | 'vitaminD'            // 維生素 D
  | 'vitaminE'            // 維生素 E
  | 'lecithin'            // 卵磷脂
  | 'ginkgo'              // 銀杏
  | 'phosphatidylserine'  // 磷脂醯絲胺酸 (PS)
  | 'coq10'               // 輔酶 Q10
  | 'curcumin'            // 薑黃素
  | 'ginkgoGoldenCordyceps' // 銀杏果黃金蟲草（合作廠商：宏潤生技）
  | 'antrodiaCinnamomea'    // 牛樟芝（合作廠商：神農真菌）

/** 觸發條件類型 */
export type TriggerCondition = 
  | 'below_threshold'     // 分數低於閾值
  | 'declining_trend'     // 下降趨勢
  | 'consecutive_low'     // 連續多日低分
  | 'sudden_drop'         // 突然大幅下降

/** 觸發優先級 */
export type TriggerPriority = 'low' | 'medium' | 'high'

/** 營養品觸發條件定義 */
export interface NutritionTrigger {
  /** 觸發條件 ID */
  id: string
  /** 相關認知維度 */
  dimension: CognitiveDimension
  /** 觸發條件類型 */
  condition: TriggerCondition
  /** 閾值（0-100） */
  threshold: number
  /** 連續天數要求（用於 consecutive_low） */
  consecutiveDays?: number
  /** 下降幅度百分比（用於 declining_trend, sudden_drop） */
  dropPercentage?: number
  /** 建議的營養品類型（可多個） */
  supplementTypes: SupplementType[]
  /** 優先級 */
  priority: TriggerPriority
  /** 是否啟用 */
  enabled: boolean
}

/** 營養品資訊 */
export interface SupplementInfo {
  type: SupplementType
  /** 中文名稱 */
  name: string
  /** 英文名稱 */
  nameEn: string
  /** 描述 */
  description: string
  /** 主要功效 */
  benefits: string[]
  /** 相關認知維度 */
  relatedDimensions: CognitiveDimension[]
  /** 認知維度權重（0-1） */
  dimensionWeights?: Partial<Record<CognitiveDimension, number>>
  /** 建議劑量範圍 */
  dosageRange: string
  /** 注意事項 */
  precautions: string[]
  /** 可能的交互作用 */
  interactions: string[]
  /** 是否為合作廠商產品 */
  isPartnerProduct?: boolean
  /** 合作廠商名稱 */
  partnerName?: string
  /** 合作廠商官網 */
  partnerUrl?: string
  /** 商城購買連結（預留） */
  shopUrl?: string
}

/** 營養品建議 */
export interface NutritionRecommendation {
  /** 建議 ID */
  id: string
  /** 觸發此建議的條件 */
  triggerId: string
  /** 建議的營養品 */
  supplement: SupplementInfo
  /** 建議原因 */
  reason: string
  /** 相關認知維度 */
  dimension: CognitiveDimension
  /** 優先級 */
  priority: TriggerPriority
  /** 建議時間 */
  recommendedAt: string
  /** 是否已被使用者查看 */
  viewed: boolean
  /** 是否已被使用者忽略 */
  dismissed: boolean
}

/** 歷史分數記錄（用於趨勢分析） */
export interface ScoreHistory {
  date: string
  scores: CognitiveScores
}

// ===== 營養品資訊定義 =====

export const SUPPLEMENT_INFO: Record<SupplementType, SupplementInfo> = {
  omega3: {
    type: 'omega3',
    name: 'Omega-3 魚油',
    nameEn: 'Omega-3 Fish Oil',
    description: 'Omega-3 脂肪酸（EPA 和 DHA）是大腦細胞膜的重要組成成分，有助於維持腦部健康。',
    benefits: ['支持腦部認知功能', '維持神經細胞健康', '可能有助於記憶力維持'],
    relatedDimensions: ['memory', 'cognition', 'attention'],
    dosageRange: 'EPA+DHA 每日 1000-2000mg',
    precautions: ['服用抗凝血藥物者應先諮詢醫師', '手術前兩週應停止服用'],
    interactions: ['可能增強抗凝血藥物效果'],
  },
  vitaminB: {
    type: 'vitaminB',
    name: '維生素 B 群',
    nameEn: 'Vitamin B Complex',
    description: 'B 群維生素參與神經系統運作，特別是 B6、B9（葉酸）和 B12 對認知功能重要。',
    benefits: ['支持神經系統健康', '參與能量代謝', '有助於維持正常認知功能'],
    relatedDimensions: ['reaction', 'cognition', 'attention'],
    dosageRange: '依各種 B 群維生素建議攝取量',
    precautions: ['高劑量 B6 可能導致神經損傷', '應遵循建議劑量'],
    interactions: ['某些藥物可能影響 B 群吸收'],
  },
  vitaminD: {
    type: 'vitaminD',
    name: '維生素 D',
    nameEn: 'Vitamin D',
    description: '維生素 D 受體存在於大腦中，研究顯示維生素 D 可能與認知功能相關。',
    benefits: ['支持神經系統健康', '可能有助於情緒穩定', '維持骨骼健康'],
    relatedDimensions: ['cognition', 'memory'],
    dosageRange: '每日 800-2000 IU',
    precautions: ['過量可能導致中毒', '應定期檢測血液濃度'],
    interactions: ['某些藥物可能影響維生素 D 代謝'],
  },
  vitaminE: {
    type: 'vitaminE',
    name: '維生素 E',
    nameEn: 'Vitamin E',
    description: '維生素 E 是一種抗氧化劑，可能有助於保護腦細胞免受氧化壓力損傷。',
    benefits: ['抗氧化保護', '可能有助於維持認知功能'],
    relatedDimensions: ['memory', 'cognition'],
    dosageRange: '每日 15-400 IU',
    precautions: ['高劑量可能增加出血風險', '服用抗凝血藥物者應謹慎'],
    interactions: ['可能增強抗凝血藥物效果'],
  },
  lecithin: {
    type: 'lecithin',
    name: '卵磷脂',
    nameEn: 'Lecithin',
    description: '卵磷脂含有膽鹼，是神經傳導物質乙醯膽鹼的前驅物。',
    benefits: ['提供膽鹼來源', '支持神經傳導', '可能有助於記憶功能'],
    relatedDimensions: ['memory', 'cognition'],
    dosageRange: '每日 1200-2400mg',
    precautions: ['對大豆過敏者應避免大豆來源產品'],
    interactions: ['通常耐受性良好'],
  },
  ginkgo: {
    type: 'ginkgo',
    name: '銀杏',
    nameEn: 'Ginkgo Biloba',
    description: '銀杏萃取物可能有助於改善腦部血液循環。',
    benefits: ['可能改善腦部血流', '抗氧化作用', '傳統上用於認知支持'],
    relatedDimensions: ['memory', 'attention', 'reaction'],
    dosageRange: '每日 120-240mg 標準化萃取物',
    precautions: ['服用抗凝血藥物者應先諮詢醫師', '手術前應停止服用'],
    interactions: ['可能增強抗凝血藥物效果', '可能與某些精神科藥物交互作用'],
  },
  phosphatidylserine: {
    type: 'phosphatidylserine',
    name: '磷脂醯絲胺酸 (PS)',
    nameEn: 'Phosphatidylserine',
    description: '磷脂醯絲胺酸是細胞膜的重要組成成分，特別是在腦細胞中含量豐富。',
    benefits: ['支持腦細胞膜結構', '可能有助於認知功能', '研究中用於認知支持'],
    relatedDimensions: ['memory', 'cognition', 'attention'],
    dosageRange: '每日 100-300mg',
    precautions: ['可能與抗凝血藥物交互作用'],
    interactions: ['可能影響抗凝血藥物效果'],
  },
  coq10: {
    type: 'coq10',
    name: '輔酶 Q10',
    nameEn: 'Coenzyme Q10',
    description: '輔酶 Q10 參與細胞能量產生，具有抗氧化作用。',
    benefits: ['支持細胞能量產生', '抗氧化保護', '可能有助於維持腦部健康'],
    relatedDimensions: ['cognition', 'reaction'],
    dosageRange: '每日 100-200mg',
    precautions: ['可能降低抗凝血藥物效果'],
    interactions: ['可能與某些心血管藥物交互作用'],
  },
  curcumin: {
    type: 'curcumin',
    name: '薑黃素',
    nameEn: 'Curcumin',
    description: '薑黃素是薑黃中的活性成分，具有抗氧化和抗發炎特性。',
    benefits: ['抗氧化作用', '抗發炎特性', '研究中探索對認知的潛在益處'],
    relatedDimensions: ['memory', 'cognition'],
    dosageRange: '每日 500-2000mg（需與胡椒素或脂質共同服用以提高吸收）',
    precautions: ['可能影響膽囊功能', '手術前應停止服用'],
    interactions: ['可能增強抗凝血藥物效果'],
  },
  
  // ===== 合作廠商產品 =====
  
  ginkgoGoldenCordyceps: {
    type: 'ginkgoGoldenCordyceps',
    name: '銀杏果黃金蟲草',
    nameEn: 'Ginkgo Golden Cordyceps',
    description: '宏潤生技專利研發，全球唯一以銀杏果培養的黃金蟲草子實體。富含高濃度蟲草素，具有卓越的食用、保健價值。2020年取得經濟部智慧財產局發明專利。',
    benefits: [
      '富含高濃度蟲草素，超越傳統冬蟲夏草',
      '結合銀杏果與蟲草雙重營養價值',
      '支持認知功能與記憶力維持',
      '有助於維持腦部健康與反應力',
      '台灣專利技術，品質有保障'
    ],
    relatedDimensions: ['memory', 'cognition', 'reaction', 'attention'],
    dimensionWeights: {
      memory: 0.9,
      cognition: 0.8,
      attention: 0.6,
      reaction: 0.5
    },
    dosageRange: '依產品標示建議',
    precautions: ['孕婦及哺乳期婦女應先諮詢醫師', '服用其他藥物者建議諮詢專業人員'],
    interactions: ['建議與其他保健品間隔服用'],
    isPartnerProduct: true,
    partnerName: '宏潤生物科技',
    partnerUrl: 'https://www.twmit.com/',
    shopUrl: '', // 預留商城連結
  },
  
  antrodiaCinnamomea: {
    type: 'antrodiaCinnamomea',
    name: '牛樟芝',
    nameEn: 'Antrodia Cinnamomea',
    description: '神農真菌生技公司提供的台灣特有珍貴真菌，採用100%子實體與固態培育技術。通過衛福部備查的90天毒理實驗，具有高度保健價值。',
    benefits: [
      '台灣特有珍貴真菌，營養價值極高',
      '100%子實體，品質純正',
      '支持認知功能與注意力',
      '抗氧化保護，維持腦部健康',
      '通過多項安全檢驗認證'
    ],
    relatedDimensions: ['cognition', 'memory', 'attention'],
    dimensionWeights: {
      cognition: 0.7,
      memory: 0.6,
      attention: 0.5
    },
    dosageRange: '依產品標示建議',
    precautions: ['孕婦及哺乳期婦女應先諮詢醫師', '肝腎功能異常者請諮詢專業人員'],
    interactions: ['服用西藥者建議間隔服用'],
    isPartnerProduct: true,
    partnerName: '神農真菌生技',
    partnerUrl: 'https://www.snzjbio.com/',
    shopUrl: '', // 預留商城連結
  },
}

// ===== 預設觸發條件（Placeholder） =====

export const DEFAULT_TRIGGERS: NutritionTrigger[] = [
  // 記憶力相關觸發（加入合作產品）
  {
    id: 'memory_low_partner',
    dimension: 'memory',
    condition: 'consecutive_low',
    threshold: 60,
    consecutiveDays: 5,
    supplementTypes: ['ginkgoGoldenCordyceps', 'antrodiaCinnamomea', 'omega3'],
    priority: 'medium',
    enabled: true,
  },
  {
    id: 'memory_low_omega3',
    dimension: 'memory',
    condition: 'consecutive_low',
    threshold: 60,
    consecutiveDays: 7,
    supplementTypes: ['omega3', 'phosphatidylserine'],
    priority: 'medium',
    enabled: true,
  },
  // 認知力相關觸發（加入合作產品）
  {
    id: 'cognition_decline_partner',
    dimension: 'cognition',
    condition: 'declining_trend',
    threshold: 55,
    dropPercentage: 10,
    supplementTypes: ['ginkgoGoldenCordyceps', 'antrodiaCinnamomea', 'vitaminB'],
    priority: 'high',
    enabled: true,
  },
  {
    id: 'cognition_decline_vitb',
    dimension: 'cognition',
    condition: 'declining_trend',
    threshold: 50,
    dropPercentage: 15,
    supplementTypes: ['vitaminB', 'vitaminD'],
    priority: 'medium',
    enabled: true,
  },
  // 注意力相關觸發（加入合作產品）
  {
    id: 'attention_low_partner',
    dimension: 'attention',
    condition: 'below_threshold',
    threshold: 55,
    supplementTypes: ['ginkgoGoldenCordyceps', 'antrodiaCinnamomea', 'ginkgo'],
    priority: 'medium',
    enabled: true,
  },
  {
    id: 'attention_low_ginkgo',
    dimension: 'attention',
    condition: 'below_threshold',
    threshold: 50,
    supplementTypes: ['ginkgo', 'vitaminB'],
    priority: 'low',
    enabled: true,
  },
  // 反應力相關觸發（加入合作產品）
  {
    id: 'reaction_decline_partner',
    dimension: 'reaction',
    condition: 'declining_trend',
    threshold: 50,
    dropPercentage: 15,
    supplementTypes: ['ginkgoGoldenCordyceps', 'coq10', 'vitaminB'],
    priority: 'high',
    enabled: true,
  },
  {
    id: 'reaction_sudden_drop',
    dimension: 'reaction',
    condition: 'sudden_drop',
    threshold: 40,
    dropPercentage: 25,
    supplementTypes: ['vitaminB', 'coq10'],
    priority: 'high',
    enabled: true,
  },
  {
    id: 'memory_chronic_low',
    dimension: 'memory',
    condition: 'consecutive_low',
    threshold: 50,
    consecutiveDays: 14,
    supplementTypes: ['ginkgoGoldenCordyceps', 'omega3', 'lecithin', 'curcumin'],
    priority: 'high',
    enabled: true,
  },
]

// ===== 核心函數 =====

/**
 * 檢查低於閾值條件
 */
function checkBelowThreshold(
  scores: CognitiveScores,
  trigger: NutritionTrigger
): boolean {
  const score = scores[trigger.dimension]
  return score !== undefined && score < trigger.threshold
}

/**
 * 檢查連續低分條件
 */
function checkConsecutiveLow(
  scoreHistory: ScoreHistory[],
  trigger: NutritionTrigger
): boolean {
  if (!trigger.consecutiveDays || scoreHistory.length < trigger.consecutiveDays) {
    return false
  }

  // 取最近 N 天的資料
  const recentHistory = scoreHistory.slice(-trigger.consecutiveDays)
  
  // 檢查每天的分數是否都低於閾值
  return recentHistory.every(record => {
    const score = record.scores[trigger.dimension]
    return score !== undefined && score < trigger.threshold
  })
}

/**
 * 檢查下降趨勢條件
 */
function checkDecliningTrend(
  currentScores: CognitiveScores,
  scoreHistory: ScoreHistory[],
  trigger: NutritionTrigger
): boolean {
  if (!trigger.dropPercentage || scoreHistory.length < 3) {
    return false
  }

  // 取最早期的分數作為基準
  const oldestScores = scoreHistory.slice(0, Math.min(3, Math.ceil(scoreHistory.length / 3)))
  const averageOldScore = oldestScores.reduce((sum, record) => {
    return sum + (record.scores[trigger.dimension] ?? 0)
  }, 0) / oldestScores.length

  const currentScore = currentScores[trigger.dimension]
  if (currentScore === undefined || averageOldScore === 0) {
    return false
  }

  // 計算下降百分比
  const dropPercent = ((averageOldScore - currentScore) / averageOldScore) * 100
  return dropPercent >= trigger.dropPercentage
}

/**
 * 檢查突然下降條件
 */
function checkSuddenDrop(
  currentScores: CognitiveScores,
  scoreHistory: ScoreHistory[],
  trigger: NutritionTrigger
): boolean {
  if (!trigger.dropPercentage || scoreHistory.length < 2) {
    return false
  }

  // 取最近一次的分數
  const previousRecord = scoreHistory[scoreHistory.length - 1]
  if (!previousRecord) {
    return false
  }
  
  const previousScore = previousRecord.scores[trigger.dimension]
  const currentScore = currentScores[trigger.dimension]

  if (previousScore === undefined || currentScore === undefined || previousScore === 0) {
    return false
  }

  // 計算單次下降百分比
  const dropPercent = ((previousScore - currentScore) / previousScore) * 100
  return dropPercent >= trigger.dropPercentage && currentScore < trigger.threshold
}

/**
 * 檢查營養品觸發條件
 * 
 * @param currentScores 當前認知分數
 * @param scoreHistory 歷史分數記錄
 * @param triggers 觸發條件列表（預設使用 DEFAULT_TRIGGERS）
 * @returns 營養品建議列表
 */
export function checkNutritionTriggers(
  currentScores: CognitiveScores,
  scoreHistory: ScoreHistory[] = [],
  triggers: NutritionTrigger[] = DEFAULT_TRIGGERS
): NutritionRecommendation[] {
  const recommendations: NutritionRecommendation[] = []
  const triggeredSupplements = new Set<SupplementType>()

  for (const trigger of triggers) {
    if (!trigger.enabled) continue

    let triggered = false
    let reason = ''

    switch (trigger.condition) {
      case 'below_threshold':
        triggered = checkBelowThreshold(currentScores, trigger)
        reason = `您的${getDimensionName(trigger.dimension)}分數低於 ${trigger.threshold} 分`
        break

      case 'consecutive_low':
        triggered = checkConsecutiveLow(scoreHistory, trigger)
        reason = `您的${getDimensionName(trigger.dimension)}已連續 ${trigger.consecutiveDays} 天低於 ${trigger.threshold} 分`
        break

      case 'declining_trend':
        triggered = checkDecliningTrend(currentScores, scoreHistory, trigger)
        reason = `您的${getDimensionName(trigger.dimension)}呈現下降趨勢，降幅超過 ${trigger.dropPercentage}%`
        break

      case 'sudden_drop':
        triggered = checkSuddenDrop(currentScores, scoreHistory, trigger)
        reason = `您的${getDimensionName(trigger.dimension)}突然下降超過 ${trigger.dropPercentage}%`
        break
    }

    if (triggered) {
      // 為每個建議的營養品建立推薦（避免重複）
      for (const supplementType of trigger.supplementTypes) {
        if (!triggeredSupplements.has(supplementType)) {
          triggeredSupplements.add(supplementType)
          recommendations.push(
            createNutritionRecommendation(trigger, supplementType, reason)
          )
        }
      }
    }
  }

  // 依優先級排序（保守策略：不對合作產品做加權）
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    let scoreA = priorityOrder[a.priority]
    let scoreB = priorityOrder[b.priority]
    
    // 根據維度權重進一步排序
    const weightA = a.supplement.dimensionWeights?.[a.dimension] || 0
    const weightB = b.supplement.dimensionWeights?.[b.dimension] || 0
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB
    }
    
    // 同優先級時，權重高的排前面
    return weightB - weightA
  })
}

/**
 * 取得認知維度的中文名稱
 */
function getDimensionName(dimension: CognitiveDimension): string {
  const names: Record<CognitiveDimension, string> = {
    memory: '記憶力',
    attention: '注意力',
    reaction: '反應力',
    logic: '邏輯力',
    cognition: '認知力',
    coordination: '協調力'
  }
  return names[dimension] || dimension
}

/**
 * 取得營養品資訊
 */
export function getSupplementInfo(type: SupplementType): SupplementInfo {
  return SUPPLEMENT_INFO[type]
}

/**
 * 取得所有營養品資訊
 */
export function getAllSupplements(): SupplementInfo[] {
  return Object.values(SUPPLEMENT_INFO)
}

/**
 * 根據認知維度取得相關營養品
 */
export function getSupplementsByDimension(dimension: CognitiveDimension): SupplementInfo[] {
  return Object.values(SUPPLEMENT_INFO).filter(
    s => s.relatedDimensions.includes(dimension)
  )
}

/**
 * 建立營養品建議
 * 
 * @note Placeholder 函數，供未來整合使用
 */
export function createNutritionRecommendation(
  trigger: NutritionTrigger,
  supplementType: SupplementType,
  reason: string
): NutritionRecommendation {
  const supplement = getSupplementInfo(supplementType)
  
  return {
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    triggerId: trigger.id,
    supplement,
    reason,
    dimension: trigger.dimension,
    priority: trigger.priority,
    recommendedAt: new Date().toISOString(),
    viewed: false,
    dismissed: false,
  }
}

/**
 * 格式化營養品建議為顯示文字
 */
export function formatRecommendation(recommendation: NutritionRecommendation): string {
  const { supplement, reason, priority } = recommendation
  const priorityIcon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'
  
  return `
${priorityIcon} ${supplement.name}（${supplement.nameEn}）
建議原因：${reason}
主要功效：${supplement.benefits.join('、')}
建議劑量：${supplement.dosageRange}
注意事項：${supplement.precautions.join('；')}

⚠️ 此建議僅供參考，請諮詢專業醫療人員後再決定是否補充。
`.trim()
}

/**
 * 免責聲明
 */
export const NUTRITION_DISCLAIMER = `
營養補充品建議免責聲明
=====================

本系統提供的營養補充品建議僅供參考，不構成醫療診斷或治療建議。

1. 所有建議均基於認知訓練表現數據，無法取代專業醫療評估。
2. 在開始任何營養補充計畫前，請諮詢醫師或營養師。
3. 若您正在服用藥物，請告知醫師以避免可能的交互作用。
4. 營養補充品不能預防、治療或治癒任何疾病。
5. 個人效果可能因人而異。

如有任何健康疑慮，請尋求專業醫療協助。
`.trim()

// ===== 個人化營養建議系統 =====

/** 使用者個人資料（用於營養建議） */
export interface UserNutritionProfile {
  age: number
  educationYears: number
  miniCogScore?: number
  miniCogAtRisk?: boolean
  cognitiveScores: CognitiveScores
  scoreHistory: ScoreHistory[]
  /** 退化偵測出的下降維度（來自 declineDetectionService），用於更保守的動態建議 */
  declineAreas?: CognitiveDimension[]
}

/** 年齡特定營養建議 */
interface AgeSpecificRecommendation {
  minAge: number
  maxAge: number
  prioritySupplements: SupplementType[]
  reason: string
}

/** 個人化營養建議結果 */
export interface PersonalizedNutritionResult {
  recommendations: NutritionRecommendation[]
  generalAdvice: string[]
  ageBasedAdvice: string[]
  cognitiveBasedAdvice: string[]
  disclaimerAcknowledged: boolean
}

// 年齡特定營養建議配置
const AGE_SPECIFIC_RECOMMENDATIONS: AgeSpecificRecommendation[] = [
  {
    minAge: 50,
    maxAge: 64,
    prioritySupplements: ['omega3', 'vitaminD', 'vitaminB'],
    reason: '50-64歲是預防認知退化的關鍵期'
  },
  {
    minAge: 65,
    maxAge: 74,
    prioritySupplements: ['omega3', 'vitaminB', 'phosphatidylserine', 'coq10'],
    reason: '65歲以上建議加強腦部營養支持'
  },
  {
    minAge: 75,
    maxAge: 120,
    prioritySupplements: ['omega3', 'vitaminB', 'vitaminD', 'lecithin', 'phosphatidylserine'],
    reason: '75歲以上需要更全面的營養補充支持'
  }
]

// Mini-Cog 分數對應的營養建議強度
const MINICOG_SUPPLEMENT_CONFIG: Record<number, {
  additionalSupplements: SupplementType[]
  intensityLevel: 'standard' | 'enhanced' | 'intensive'
}> = {
  5: { additionalSupplements: [], intensityLevel: 'standard' },
  4: { additionalSupplements: ['omega3'], intensityLevel: 'standard' },
  3: { additionalSupplements: ['omega3', 'vitaminB'], intensityLevel: 'enhanced' },
  2: { additionalSupplements: ['omega3', 'vitaminB', 'phosphatidylserine'], intensityLevel: 'enhanced' },
  1: { additionalSupplements: ['omega3', 'vitaminB', 'phosphatidylserine', 'lecithin'], intensityLevel: 'intensive' },
  0: { additionalSupplements: ['omega3', 'vitaminB', 'phosphatidylserine', 'lecithin', 'ginkgo'], intensityLevel: 'intensive' }
}

/**
 * 生成個人化營養建議
 * 
 * @param profile 使用者個人資料
 * @returns 個人化營養建議結果
 */
export function generatePersonalizedRecommendations(
  profile: UserNutritionProfile
): PersonalizedNutritionResult {
  const recommendations: NutritionRecommendation[] = []
  const addedSupplements = new Set<SupplementType>()
  const generalAdvice: string[] = []
  const ageBasedAdvice: string[] = []
  const cognitiveBasedAdvice: string[] = []

  // 1. 基於認知分數的觸發條件檢查
  const triggerBasedRecs = checkNutritionTriggers(
    profile.cognitiveScores,
    profile.scoreHistory
  )
  
  for (const rec of triggerBasedRecs) {
    if (!addedSupplements.has(rec.supplement.type)) {
      recommendations.push(rec)
      addedSupplements.add(rec.supplement.type)
      cognitiveBasedAdvice.push(`根據${getDimensionNameFromRec(rec)}表現，建議考慮補充${rec.supplement.name}`)
    }
  }

  // 2. 基於年齡的建議
  const ageConfig = AGE_SPECIFIC_RECOMMENDATIONS.find(
    config => profile.age >= config.minAge && profile.age <= config.maxAge
  )
  
  if (ageConfig) {
    ageBasedAdvice.push(ageConfig.reason)

    // 保守策略：年齡只提供「方向性提醒」，不直接因年齡就推具體產品，避免新用戶感到被推銷。
    // 具體營養品建議以「認知分數觸發 / Mini-Cog / 退化偵測」為主。
    ageBasedAdvice.push(`可優先從均衡飲食、規律運動、充足睡眠開始，再視需要諮詢專業人員評估營養補充。`)
  }

  // 3. 基於 Mini-Cog 結果的建議
  if (profile.miniCogScore !== undefined) {
    const miniCogConfig = MINICOG_SUPPLEMENT_CONFIG[profile.miniCogScore]
    
    if (miniCogConfig) {
      if (miniCogConfig.intensityLevel === 'intensive') {
        cognitiveBasedAdvice.push('⚠️ 認知篩檢結果建議加強營養支持，請諮詢醫師')
      } else if (miniCogConfig.intensityLevel === 'enhanced') {
        cognitiveBasedAdvice.push('認知篩檢結果顯示可考慮增加營養補充')
      }

      for (const supplementType of miniCogConfig.additionalSupplements) {
        if (!addedSupplements.has(supplementType)) {
          const supplement = getSupplementInfo(supplementType)
          const priority: TriggerPriority = miniCogConfig.intensityLevel === 'intensive' ? 'high' : 
                          miniCogConfig.intensityLevel === 'enhanced' ? 'medium' : 'low'
          
          recommendations.push({
            id: `minicog_${Date.now()}_${supplementType}`,
            triggerId: 'minicog_based',
            supplement,
            reason: `根據 Mini-Cog 評估結果（${profile.miniCogScore}/5 分）建議`,
            dimension: supplement.relatedDimensions[0] || 'cognition',
            priority,
            recommendedAt: new Date().toISOString(),
            viewed: false,
            dismissed: false
          })
          addedSupplements.add(supplementType)
        }
      }
    }

    // 如果有風險，添加特別提醒
    if (profile.miniCogAtRisk) {
      cognitiveBasedAdvice.push('🔔 建議定期進行認知評估，並諮詢專業醫療人員')
    }
  }

  // 3.5 基於退化偵測（declineAreas）的保守補充
  if (profile.declineAreas && profile.declineAreas.length > 0) {
    const uniqueDeclines = Array.from(new Set(profile.declineAreas))
    cognitiveBasedAdvice.push(
      `📉 偵測到近期在 ${uniqueDeclines.map(getDimensionName).join('、')} 可能有下降趨勢，建議持續訓練並留意變化。`
    )

    const boostedPriority: TriggerPriority = profile.miniCogAtRisk || (profile.miniCogScore !== undefined && profile.miniCogScore <= 2)
      ? 'medium'
      : 'low'

    const declineSupplementMap: Partial<Record<CognitiveDimension, SupplementType[]>> = {
      memory: ['phosphatidylserine', 'omega3'],
      attention: ['ginkgo'],
      reaction: ['vitaminB', 'coq10'],
      cognition: ['omega3', 'vitaminD'],
      logic: ['vitaminB'],
      coordination: ['coq10']
    }

    let addedFromDecline = 0
    for (const dim of uniqueDeclines) {
      if (addedFromDecline >= 2) break
      const candidates = declineSupplementMap[dim] ?? []
      for (const supplementType of candidates) {
        if (addedSupplements.has(supplementType)) continue
        const supplement = getSupplementInfo(supplementType)
        recommendations.push({
          id: `decline_${Date.now()}_${dim}_${supplementType}`,
          triggerId: 'decline_based',
          supplement,
          reason: `近期${getDimensionName(dim)}可能有下降趨勢，建議以飲食/生活方式為主並可評估補充`,
          dimension: dim,
          priority: boostedPriority,
          recommendedAt: new Date().toISOString(),
          viewed: false,
          dismissed: false
        })
        addedSupplements.add(supplementType)
        addedFromDecline++
        break
      }
    }
  }

  // 4. 教育程度相關建議
  if (profile.educationYears <= 6) {
    generalAdvice.push('研究顯示教育程度較低者可能需要更積極的認知保健')
    
    if (!addedSupplements.has('omega3')) {
      const omega3 = getSupplementInfo('omega3')
      recommendations.push({
        id: `edu_${Date.now()}_omega3`,
        triggerId: 'education_based',
        supplement: omega3,
        reason: '建議補充支持腦部健康的營養素',
        dimension: 'cognition',
        priority: 'low',
        recommendedAt: new Date().toISOString(),
        viewed: false,
        dismissed: false
      })
    }
  }

  // 5. 通用建議
  generalAdvice.push('均衡飲食是認知健康的基礎')
  generalAdvice.push('建議每週進行 3-5 次中等強度運動')
  generalAdvice.push('保持良好的睡眠品質對認知功能很重要')
  generalAdvice.push('社交互動和持續學習有助於維持認知活力')

  // 依優先級排序建議
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return {
    recommendations,
    generalAdvice,
    ageBasedAdvice,
    cognitiveBasedAdvice,
    disclaimerAcknowledged: false
  }
}

/**
 * 從建議中取得維度名稱
 */
function getDimensionNameFromRec(rec: NutritionRecommendation): string {
  const names: Record<CognitiveDimension, string> = {
    memory: '記憶力',
    attention: '注意力',
    reaction: '反應力',
    logic: '邏輯力',
    cognition: '認知力',
    coordination: '協調力'
  }
  return names[rec.dimension] || rec.dimension
}

/**
 * 取得適合特定年齡的營養品概覽
 */
export function getAgeAppropriateSupplements(age: number): {
  primary: SupplementInfo[]
  secondary: SupplementInfo[]
  reason: string
} {
  const config = AGE_SPECIFIC_RECOMMENDATIONS.find(
    c => age >= c.minAge && age <= c.maxAge
  ) || AGE_SPECIFIC_RECOMMENDATIONS[0]!

  const primary = config.prioritySupplements.slice(0, 3).map(t => getSupplementInfo(t))
  const secondary = config.prioritySupplements.slice(3).map(t => getSupplementInfo(t))

  return {
    primary,
    secondary,
    reason: config.reason
  }
}

/**
 * 根據認知弱項取得針對性營養建議
 */
export function getWeaknessTargetedSupplements(
  weakDimensions: CognitiveDimension[]
): Map<CognitiveDimension, SupplementInfo[]> {
  const result = new Map<CognitiveDimension, SupplementInfo[]>()
  
  for (const dim of weakDimensions) {
    const supplements = getSupplementsByDimension(dim)
    result.set(dim, supplements)
  }
  
  return result
}

/**
 * 生成簡易營養報告文字
 */
export function generateNutritionReportText(
  result: PersonalizedNutritionResult,
  userName: string
): string {
  const lines: string[] = []
  
  lines.push(`${userName} 的個人化營養建議報告`)
  lines.push('=' .repeat(40))
  lines.push(`生成時間: ${new Date().toLocaleString('zh-TW')}`)
  lines.push('')
  
  // 高優先級建議
  const highPriority = result.recommendations.filter(r => r.priority === 'high')
  if (highPriority.length > 0) {
    lines.push('🔴 高優先建議')
    lines.push('-'.repeat(20))
    for (const rec of highPriority) {
      lines.push(`• ${rec.supplement.name}：${rec.reason}`)
    }
    lines.push('')
  }
  
  // 中優先級建議
  const mediumPriority = result.recommendations.filter(r => r.priority === 'medium')
  if (mediumPriority.length > 0) {
    lines.push('🟡 建議考慮')
    lines.push('-'.repeat(20))
    for (const rec of mediumPriority) {
      lines.push(`• ${rec.supplement.name}：${rec.reason}`)
    }
    lines.push('')
  }
  
  // 認知相關建議
  if (result.cognitiveBasedAdvice.length > 0) {
    lines.push('🧠 認知評估相關建議')
    lines.push('-'.repeat(20))
    for (const advice of result.cognitiveBasedAdvice) {
      lines.push(`• ${advice}`)
    }
    lines.push('')
  }
  
  // 年齡相關建議
  if (result.ageBasedAdvice.length > 0) {
    lines.push('📅 年齡相關建議')
    lines.push('-'.repeat(20))
    for (const advice of result.ageBasedAdvice) {
      lines.push(`• ${advice}`)
    }
    lines.push('')
  }
  
  // 通用建議
  lines.push('💡 一般保健建議')
  lines.push('-'.repeat(20))
  for (const advice of result.generalAdvice) {
    lines.push(`• ${advice}`)
  }
  lines.push('')
  
  // 免責聲明
  lines.push('⚠️ 重要提醒')
  lines.push('-'.repeat(20))
  lines.push('以上建議僅供參考，不構成醫療診斷或治療建議。')
  lines.push('請在開始任何營養補充計畫前諮詢專業醫療人員。')
  
  return lines.join('\n')
}

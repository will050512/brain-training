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
  /** 建議劑量範圍 */
  dosageRange: string
  /** 注意事項 */
  precautions: string[]
  /** 可能的交互作用 */
  interactions: string[]
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
}

// ===== 預設觸發條件（Placeholder） =====

export const DEFAULT_TRIGGERS: NutritionTrigger[] = [
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
  {
    id: 'attention_low_ginkgo',
    dimension: 'attention',
    condition: 'below_threshold',
    threshold: 50,
    supplementTypes: ['ginkgo', 'vitaminB'],
    priority: 'low',
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
    supplementTypes: ['omega3', 'lecithin', 'curcumin'],
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

  // 依優先級排序
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
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

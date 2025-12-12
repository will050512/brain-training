/**
 * MSW Mock Handlers
 * 模擬 API 回應，供前端獨立開發使用
 */

import type {
  NutritionRecommendation,
  NutritionRecommendationRequest,
  TrendAnalysisResponse,
  SyncStatus,
} from './apiTypes'

// 模擬延遲
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 營養品推薦模擬資料
const mockNutritionData: NutritionRecommendation[] = [
  {
    id: 'omega3',
    supplementType: 'omega-3',
    name: 'Omega-3 魚油',
    description: '富含 DHA 和 EPA，支持腦部健康',
    dimension: 'memory',
    priority: 'high',
    reason: '記憶力維度表現下降，建議補充 Omega-3 支持神經細胞膜健康',
    scientificBasis: '研究顯示 DHA 是大腦灰質的重要組成部分，有助於維持認知功能',
    dosageRecommendation: '每日 1000-2000mg EPA+DHA',
    warnings: ['服用抗凝血藥物者請諮詢醫師'],
  },
  {
    id: 'vitaminB',
    supplementType: 'vitamin-b-complex',
    name: '維生素 B 群',
    description: '支持神經傳導和能量代謝',
    dimension: 'cognition',
    priority: 'medium',
    reason: '認知處理速度可優化，B 群有助於神經傳導',
    scientificBasis: 'B12、B6、葉酸參與同半胱氨酸代謝，與認知健康相關',
    dosageRecommendation: '依產品標示，建議隨餐服用',
    warnings: [],
  },
  {
    id: 'vitaminD',
    supplementType: 'vitamin-d',
    name: '維生素 D',
    description: '支持免疫和腦部功能',
    dimension: 'attention',
    priority: 'medium',
    reason: '注意力維度有改善空間，維生素 D 與認知功能相關',
    scientificBasis: '維生素 D 受體存在於大腦海馬迴區域，參與神經保護',
    dosageRecommendation: '每日 1000-2000 IU',
    warnings: ['高鈣血症患者請諮詢醫師'],
  },
  {
    id: 'ginkgo',
    supplementType: 'ginkgo-biloba',
    name: '銀杏葉萃取物',
    description: '促進腦部血液循環',
    dimension: 'reaction',
    priority: 'low',
    reason: '反應速度可透過改善腦部循環來提升',
    scientificBasis: '銀杏葉萃取物可改善微血管循環',
    dosageRecommendation: '每日 120-240mg 標準化萃取物',
    warnings: ['服用抗凝血藥物者請諮詢醫師', '手術前 2 週應停用'],
  },
  {
    id: 'phosphatidylserine',
    supplementType: 'phosphatidylserine',
    name: '磷脂絲胺酸 (PS)',
    description: '細胞膜重要組成，支持神經訊號傳遞',
    dimension: 'memory',
    priority: 'medium',
    reason: '有助於維持記憶功能和認知表現',
    scientificBasis: 'PS 是神經細胞膜的重要成分，參與神經訊號傳遞',
    dosageRecommendation: '每日 100-300mg',
    warnings: [],
  },
]

// 模擬處理器集合
export const mockHandlers = {
  /**
   * 取得營養品推薦
   */
  async getNutritionRecommendations(
    request: NutritionRecommendationRequest
  ): Promise<NutritionRecommendation[]> {
    await delay(300 + Math.random() * 200)
    
    const { cognitiveScores, declineAreas = [] } = request
    
    // 根據分數和退化領域篩選推薦
    const recommendations: NutritionRecommendation[] = []
    
    // 分析各維度並給予推薦
    const dimensionScores = {
      memory: cognitiveScores.memory,
      cognition: cognitiveScores.cognition,
      attention: cognitiveScores.attention,
      reaction: cognitiveScores.reaction,
    }
    
    for (const [dimension, score] of Object.entries(dimensionScores)) {
      const isDeclineArea = declineAreas.includes(dimension)
      
      // 分數低於 60 或是退化領域，給予推薦
      if (score < 60 || isDeclineArea) {
        const matched = mockNutritionData.find(n => n.dimension === dimension)
        if (matched && !recommendations.find(r => r.id === matched.id)) {
          recommendations.push({
            ...matched,
            priority: isDeclineArea ? 'high' : (score < 40 ? 'high' : 'medium'),
          })
        }
      }
    }
    
    // 確保至少有一個推薦
    if (recommendations.length === 0) {
      recommendations.push(mockNutritionData[0]!)
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  },

  /**
   * 取得營養品詳細資訊
   */
  async getNutritionDetails(supplementType: string): Promise<NutritionRecommendation | null> {
    await delay(200)
    return mockNutritionData.find(n => n.supplementType === supplementType) || null
  },

  /**
   * 上傳行為日誌
   */
  async uploadBehaviorLogs(logs: unknown[]): Promise<{ uploadedCount: number }> {
    await delay(500 + Math.random() * 300)
    // 模擬成功上傳
    return { uploadedCount: Array.isArray(logs) ? logs.length : 0 }
  },

  /**
   * 取得同步狀態
   */
  async getSyncStatus(_odId: string): Promise<SyncStatus> {
    await delay(100)
    return {
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(), // 1 小時前
      pendingCount: Math.floor(Math.random() * 5),
      syncInProgress: false,
    }
  },

  /**
   * 上傳評估結果
   */
  async uploadAssessment(): Promise<{ assessmentId: string }> {
    await delay(400)
    return { assessmentId: `assessment_${Date.now().toString(36)}` }
  },

  /**
   * 取得趨勢分析
   */
  async getTrendAnalysis(odId: string, period?: { start: string; end: string }): Promise<TrendAnalysisResponse> {
    await delay(600)
    
    const dimensions = ['memory', 'cognition', 'attention', 'reaction', 'logic', 'coordination']
    const trends = dimensions.map(dimension => ({
      dimension,
      trend: (['improving', 'stable', 'declining'] as const)[Math.floor(Math.random() * 3)],
      changePercent: Math.round((Math.random() * 20 - 10) * 10) / 10,
      confidence: 0.7 + Math.random() * 0.25,
    }))
    
    const recommendations: string[] = []
    const decliningDimensions = trends.filter(t => t.trend === 'declining')
    if (decliningDimensions.length > 0) {
      recommendations.push(`建議加強 ${decliningDimensions.map(d => d.dimension).join('、')} 相關訓練`)
    }
    const improvingDimensions = trends.filter(t => t.trend === 'improving')
    if (improvingDimensions.length > 0) {
      recommendations.push(`${improvingDimensions.map(d => d.dimension).join('、')} 表現持續進步，請繼續保持！`)
    }
    
    return {
      odId,
      period: period || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
        end: new Date().toISOString().split('T')[0]!,
      },
      trends,
      recommendations,
    }
  },

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{ status: 'ok' | 'degraded'; timestamp: string }> {
    await delay(50)
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  },
}

// 是否啟用 Mock
let mockEnabled = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'

/**
 * 啟用/停用 Mock
 */
export function setMockEnabled(enabled: boolean): void {
  mockEnabled = enabled
}

/**
 * 檢查 Mock 是否啟用
 */
export function isMockEnabled(): boolean {
  return mockEnabled
}

/**
 * 認知維度類型定義
 */

// 六大認知維度
export type CognitiveDimension = 
  | 'reaction'      // 反應力
  | 'logic'         // 邏輯力
  | 'memory'        // 記憶力
  | 'cognition'     // 認知力
  | 'coordination'  // 協調力
  | 'attention'     // 注意力

// 認知維度資訊
export interface CognitiveDimensionInfo {
  id: CognitiveDimension
  name: string
  nameEn: string
  description: string
  icon: string
  color: string
}

// 認知維度完整定義
export const COGNITIVE_DIMENSIONS: Record<CognitiveDimension, CognitiveDimensionInfo> = {
  reaction: {
    id: 'reaction',
    name: '反應力',
    nameEn: 'Reaction',
    description: '對刺激快速做出正確反應的能力',
    icon: '⚡',
    color: '#ef4444',
  },
  logic: {
    id: 'logic',
    name: '邏輯力',
    nameEn: 'Logic',
    description: '分析和推理問題的能力',
    icon: '🧩',
    color: '#8b5cf6',
  },
  memory: {
    id: 'memory',
    name: '記憶力',
    nameEn: 'Memory',
    description: '儲存和回憶資訊的能力',
    icon: '🧠',
    color: '#3b82f6',
  },
  cognition: {
    id: 'cognition',
    name: '認知力',
    nameEn: 'Cognition',
    description: '理解和處理複雜資訊的能力',
    icon: '💡',
    color: '#22c55e',
  },
  coordination: {
    id: 'coordination',
    name: '協調力',
    nameEn: 'Coordination',
    description: '手眼協調和空間感知能力',
    icon: '🎯',
    color: '#f59e0b',
  },
  attention: {
    id: 'attention',
    name: '注意力',
    nameEn: 'Attention',
    description: '專注和持續注意的能力',
    icon: '👁️',
    color: '#ec4899',
  },
}

// 認知分數結構
export interface CognitiveScores {
  reaction: number
  logic: number
  memory: number
  cognition: number
  coordination: number
  attention: number
}

// 空白認知分數
export const emptyCognitiveScores = (): CognitiveScores => ({
  reaction: 0,
  logic: 0,
  memory: 0,
  cognition: 0,
  coordination: 0,
  attention: 0,
})

// 專業評估指標類型
export type ProfessionalMetric = 
  | 'voca'           // VoCA分數
  | 'mmse'           // MMSE分數
  | 'casi'           // CASI分數
  | 'processingSpeed' // 處理速度
  | 'shortTermMemory' // 短期記憶力
  | 'immediateRecall' // 即時回憶力

// 專業評估指標資訊
export interface ProfessionalMetricInfo {
  id: ProfessionalMetric
  name: string
  fullName: string
  description: string
  maxScore: number
}

// 專業評估指標定義
export const PROFESSIONAL_METRICS: Record<ProfessionalMetric, ProfessionalMetricInfo> = {
  voca: {
    id: 'voca',
    name: 'VoCA',
    fullName: 'Video-based Cognitive Assessment',
    description: '透過遊戲互動收集數據的認知評估',
    maxScore: 100,
  },
  mmse: {
    id: 'mmse',
    name: 'MMSE',
    fullName: 'Mini-Mental State Examination',
    description: '簡易智能狀態測驗',
    maxScore: 30,
  },
  casi: {
    id: 'casi',
    name: 'CASI',
    fullName: 'Cognitive Abilities Screening Instrument',
    description: '認知能力篩檢量表',
    maxScore: 100,
  },
  processingSpeed: {
    id: 'processingSpeed',
    name: '處理速度',
    fullName: 'Processing Speed',
    description: '大腦處理資訊的效率',
    maxScore: 100,
  },
  shortTermMemory: {
    id: 'shortTermMemory',
    name: '短期記憶',
    fullName: 'Short-term Memory',
    description: '暫時儲存少量資訊的能力',
    maxScore: 100,
  },
  immediateRecall: {
    id: 'immediateRecall',
    name: '即時回憶',
    fullName: 'Immediate Recall',
    description: '剛學習資訊的立即再現能力',
    maxScore: 100,
  },
}

// 專業評估分數結構
export interface ProfessionalScores {
  voca: number
  mmse: number
  casi: number
  processingSpeed: number
  shortTermMemory: number
  immediateRecall: number
}

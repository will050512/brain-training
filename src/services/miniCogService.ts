/**
 * Mini-Cog 快速篩檢服務
 * 參考 Alzheimer's Association Mini-Cog™ 標準協議
 * 
 * Mini-Cog 是一個 3 分鐘的快速認知篩檢工具，包含：
 * 1. 三詞記憶測試（0-3 分）
 * 2. 時鐘繪圖測試（0-2 分）
 * 總分 0-5 分，≤2 分表示可能存在認知障礙風險
 */

// ===== 類型定義 =====

/** 支援的語言 */
export type MiniCogLocale = 'zh-TW' | 'zh-CN' | 'en'

/** 詞彙組 */
export interface MiniCogWordSet {
  locale: MiniCogLocale
  words: [string, string, string]
  setIndex: number
}

/** 時鐘繪圖自評結果 */
export interface ClockDrawingSelfAssessment {
  /** 是否畫了完整圓形 */
  hasCompleteCircle: boolean
  /** 數字 1-12 位置是否大致正確 */
  hasCorrectNumbers: boolean
  /** 指針是否指向正確時間 */
  hasCorrectHands: boolean
}

/** 時鐘繪圖測試結果 */
export interface ClockDrawingResult {
  /** 指定繪製的時間（如 "11:10"） */
  targetTime: string
  /** 自評結果 */
  selfAssessment: ClockDrawingSelfAssessment
  /** 時鐘繪圖分數 (0-2) */
  score: number
  /** Canvas 圖片 base64（僅在同意行為追蹤時儲存） */
  imageData?: string
  /** 完成時間（毫秒） */
  completionTime: number
}

/** 詞彙回憶測試結果 */
export interface WordRecallResult {
  /** 使用的詞彙組 */
  wordSet: MiniCogWordSet
  /** 立即複誦成功的詞彙 */
  immediateRecall: string[]
  /** 延遲回憶成功的詞彙 */
  delayedRecall: string[]
  /** 詞彙回憶分數 (0-3) */
  score: number
}

/** Mini-Cog 完整結果 */
export interface MiniCogResult {
  id: string
  odId: string
  /** 詞彙回憶結果 */
  wordRecall: WordRecallResult
  /** 時鐘繪圖結果 */
  clockDrawing: ClockDrawingResult
  /** 總分 (0-5) */
  totalScore: number
  /** 是否有認知障礙風險（總分 ≤2） */
  atRisk: boolean
  /** MMSE 對應說明 */
  mmseCorrelation: string
  /** 完成時間戳 */
  completedAt: string
  /** 評估耗時（秒） */
  duration: number
}

/** Mini-Cog 風險等級 */
export type MiniCogRiskLevel = 'normal' | 'borderline' | 'at-risk'

// ===== 多語言詞彙組 =====

/**
 * 標準詞彙組（參考 Mini-Cog™ 官方版本）
 * 每個語言提供多組詞彙以避免學習效應
 */
export const WORD_SETS: Record<MiniCogLocale, [string, string, string][]> = {
  'zh-TW': [
    ['香蕉', '日出', '椅子'],
    ['村莊', '廚房', '嬰兒'],
    ['河流', '國家', '手指'],
    ['船長', '花園', '圖片'],
    ['女兒', '天空', '山脈'],
    ['故事', '冬天', '蟲子'],
  ],
  'zh-CN': [
    ['香蕉', '日出', '椅子'],
    ['村庄', '厨房', '婴儿'],
    ['河流', '国家', '手指'],
    ['船长', '花园', '图片'],
    ['女儿', '天空', '山脉'],
    ['故事', '冬天', '虫子'],
  ],
  'en': [
    ['banana', 'sunrise', 'chair'],
    ['village', 'kitchen', 'baby'],
    ['river', 'nation', 'finger'],
    ['captain', 'garden', 'picture'],
    ['daughter', 'heaven', 'mountain'],
    ['story', 'winter', 'insect'],
  ],
}

/** 時鐘繪圖指定時間選項 */
export const CLOCK_TIMES = ['11:10', '2:45', '8:20', '10:10', '3:00']

// ===== 語言資訊 =====

export const LOCALE_INFO: Record<MiniCogLocale, { name: string; nativeName: string }> = {
  'zh-TW': { name: 'Traditional Chinese', nativeName: '繁體中文' },
  'zh-CN': { name: 'Simplified Chinese', nativeName: '简体中文' },
  'en': { name: 'English', nativeName: 'English' },
}

// ===== 核心函數 =====

/**
 * 取得隨機詞彙組
 */
export function getRandomWordSet(locale: MiniCogLocale = 'zh-TW'): MiniCogWordSet {
  const sets = WORD_SETS[locale] || WORD_SETS['zh-TW']
  const setIndex = Math.floor(Math.random() * sets.length)
  return {
    locale,
    words: sets[setIndex]!,
    setIndex,
  }
}

/**
 * 取得指定索引的詞彙組
 */
export function getWordSetByIndex(locale: MiniCogLocale, index: number): MiniCogWordSet {
  const sets = WORD_SETS[locale] || WORD_SETS['zh-TW']
  const safeIndex = index % sets.length
  return {
    locale,
    words: sets[safeIndex]!,
    setIndex: safeIndex,
  }
}

/**
 * 取得隨機時鐘時間
 */
export function getRandomClockTime(): string {
  return CLOCK_TIMES[Math.floor(Math.random() * CLOCK_TIMES.length)]!
}

/**
 * 計算詞彙回憶分數
 * @param wordSet 使用的詞彙組
 * @param recalledWords 使用者回憶出的詞彙
 * @returns 分數 (0-3)
 */
export function calculateWordRecallScore(
  wordSet: MiniCogWordSet,
  recalledWords: string[]
): number {
  const normalizedRecalled = recalledWords.map(w => w.trim().toLowerCase())
  const normalizedTarget = wordSet.words.map(w => w.toLowerCase())
  
  let score = 0
  for (const target of normalizedTarget) {
    if (normalizedRecalled.some(recalled => 
      recalled === target || 
      recalled.includes(target) || 
      target.includes(recalled)
    )) {
      score++
    }
  }
  
  return Math.min(score, 3)
}

/**
 * 計算時鐘繪圖分數
 * 評分標準（簡化版）：
 * - 2 分：完整圓形 + 正確數字 + 正確指針
 * - 1 分：部分正確（2/3 項目正確）
 * - 0 分：明顯錯誤（少於 2 項正確）
 */
export function calculateClockDrawingScore(
  selfAssessment: ClockDrawingSelfAssessment
): number {
  const correctItems = [
    selfAssessment.hasCompleteCircle,
    selfAssessment.hasCorrectNumbers,
    selfAssessment.hasCorrectHands,
  ].filter(Boolean).length

  if (correctItems === 3) return 2
  if (correctItems >= 2) return 1
  return 0
}

/**
 * 計算 Mini-Cog 總分並判斷風險
 */
export function calculateMiniCogTotal(
  wordRecallScore: number,
  clockDrawingScore: number
): { totalScore: number; atRisk: boolean; riskLevel: MiniCogRiskLevel } {
  const totalScore = wordRecallScore + clockDrawingScore
  
  let riskLevel: MiniCogRiskLevel
  if (totalScore <= 2) {
    riskLevel = 'at-risk'
  } else if (totalScore === 3) {
    riskLevel = 'borderline'
  } else {
    riskLevel = 'normal'
  }
  
  return {
    totalScore,
    atRisk: totalScore <= 2,
    riskLevel,
  }
}

/**
 * 取得 MMSE 對應說明
 */
export function getMMSECorrelation(totalScore: number): string {
  if (totalScore <= 2) {
    return 'Mini-Cog 總分 ≤2 分通常對應 MMSE ≤24 分，表示可能存在輕度認知障礙風險。建議諮詢專業醫療人員進行完整認知評估。'
  }
  if (totalScore === 3) {
    return 'Mini-Cog 總分 3 分屬於臨界值，建議定期追蹤認知功能變化。'
  }
  return 'Mini-Cog 總分 ≥4 分表示目前認知功能正常，建議持續維持腦力訓練習慣。'
}

/**
 * 取得風險等級描述
 */
export function getRiskLevelDescription(riskLevel: MiniCogRiskLevel): {
  label: string
  description: string
  color: string
  bgColor: string
} {
  switch (riskLevel) {
    case 'at-risk':
      return {
        label: '需關注',
        description: '建議諮詢專業醫療人員',
        color: '#dc2626',
        bgColor: '#fef2f2',
      }
    case 'borderline':
      return {
        label: '臨界值',
        description: '建議定期追蹤',
        color: '#d97706',
        bgColor: '#fffbeb',
      }
    case 'normal':
      return {
        label: '正常',
        description: '持續維持訓練',
        color: '#16a34a',
        bgColor: '#f0fdf4',
      }
  }
}

/**
 * 建立完整 Mini-Cog 結果
 */
export function createMiniCogResult(params: {
  id: string
  odId: string
  wordRecall: WordRecallResult
  clockDrawing: ClockDrawingResult
  duration: number
}): MiniCogResult {
  const { totalScore, atRisk } = calculateMiniCogTotal(
    params.wordRecall.score,
    params.clockDrawing.score
  )
  
  return {
    id: params.id,
    odId: params.odId,
    wordRecall: params.wordRecall,
    clockDrawing: params.clockDrawing,
    totalScore,
    atRisk,
    mmseCorrelation: getMMSECorrelation(totalScore),
    completedAt: new Date().toISOString(),
    duration: params.duration,
  }
}

/**
 * 驗證詞彙輸入（允許部分匹配）
 */
export function validateWordInput(
  input: string,
  targetWord: string,
  locale: MiniCogLocale = 'zh-TW'
): boolean {
  const normalizedInput = input.trim().toLowerCase()
  const normalizedTarget = targetWord.toLowerCase()
  
  // 完全匹配
  if (normalizedInput === normalizedTarget) return true
  
  // 對於中文，允許部分匹配（如「香蕉」輸入「蕉」也算對）
  if (locale.startsWith('zh')) {
    return normalizedTarget.includes(normalizedInput) && normalizedInput.length >= 1
  }
  
  // 對於英文，允許拼寫接近（編輯距離 ≤1）
  if (locale === 'en') {
    return levenshteinDistance(normalizedInput, normalizedTarget) <= 1
  }
  
  return false
}

/**
 * 計算編輯距離（Levenshtein Distance）
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        )
      }
    }
  }
  
  return matrix[b.length]![a.length]!
}

/**
 * 格式化 Mini-Cog 結果摘要
 */
export function formatMiniCogSummary(result: MiniCogResult): string {
  const { wordRecall, clockDrawing, totalScore, atRisk } = result
  
  return `
Mini-Cog 評估結果摘要
====================
詞彙回憶：${wordRecall.score}/3 分
時鐘繪圖：${clockDrawing.score}/2 分
總分：${totalScore}/5 分
狀態：${atRisk ? '⚠️ 需關注' : '✅ 正常'}

${result.mmseCorrelation}
`.trim()
}

/**
 * 匯出 Mini-Cog 結果為 JSON（去除敏感資訊）
 */
export function exportMiniCogResultForResearch(result: MiniCogResult): Record<string, unknown> {
  return {
    totalScore: result.totalScore,
    wordRecallScore: result.wordRecall.score,
    clockDrawingScore: result.clockDrawing.score,
    clockSelfAssessment: result.clockDrawing.selfAssessment,
    atRisk: result.atRisk,
    locale: result.wordRecall.wordSet.locale,
    completedAt: result.completedAt,
    duration: result.duration,
    // 不包含 odId、imageData 等敏感資訊
  }
}

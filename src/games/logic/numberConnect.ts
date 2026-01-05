/**
 * 數字連連看遊戲邏輯模組
 * 訓練：視覺追蹤、注意力、序列認知
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface Position {
  x: number
  y: number
}

export interface NumberNode {
  /** 數字值 */
  value: number
  /** 位置 */
  position: Position
  /** 是否已連接 */
  connected: boolean
  /** 顯示文字（可能是數字或中文） */
  display: string
}

export type NumberFormat = 'arabic' | 'chinese' | 'mixed'

export interface NumberConnectConfig {
  /** 數字數量 */
  count: number
  /** 畫布寬度 */
  canvasWidth: number
  /** 畫布高度 */
  canvasHeight: number
  /** 節點最小間距 */
  minDistance: number
  /** 時間限制（秒） */
  timeLimit: number
  /** 數字格式 */
  format: NumberFormat
}

export interface NumberConnectState {
  /** 所有節點 */
  nodes: NumberNode[]
  /** 當前應該連接的數字 */
  currentTarget: number
  /** 已連接的路徑 */
  connectedPath: Position[]
  /** 錯誤次數 */
  errors: number
  /** 開始時間 */
  startTime: number | null
}

export interface NumberConnectResult {
  /** 最終分數 */
  score: number
  /** 完成時間（秒） */
  completionTime: number
  /** 供各處統一使用的 duration（秒） */
  duration: number
  /** 錯誤次數 */
  errors: number
  /** 是否完成 */
  completed: boolean
  /** 連接數量 */
  connectedCount: number
  /** scoreNormalizer 兼容欄位：progress = 已連接數字數 */
  progress: number
  /** 總數量 */
  totalCount: number
  /** scoreNormalizer 兼容欄位：totalNumbers = 總數字數 */
  totalNumbers: number
}

// ==================== 常數配置 ====================

export const CHINESE_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']

export const DIFFICULTY_CONFIGS: Record<Difficulty, NumberConnectConfig> = {
  easy: {
    count: 10,
    canvasWidth: 400,
    canvasHeight: 400,
    // 以手機/小螢幕可點擊尺寸為優先，避免節點重疊造成誤觸
    minDistance: 65,
    timeLimit: 60,
    format: 'arabic',
  },
  medium: {
    count: 15,
    canvasWidth: 400,
    canvasHeight: 400,
    minDistance: 60,
    timeLimit: 90,
    format: 'arabic',
  },
  hard: {
    count: 20,
    canvasWidth: 400,
    canvasHeight: 400,
    minDistance: 55,
    timeLimit: 120,
    format: 'mixed',
  },
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

// ==================== 工具函數 ====================

/**
 * 數字轉中文
 */
export function numberToChinese(num: number): string {
  return CHINESE_NUMBERS[num - 1] || String(num)
}

/**
 * 取得顯示文字
 */
export function getDisplayText(num: number, format: NumberFormat): string {
  if (format === 'chinese') {
    return numberToChinese(num)
  }
  if (format === 'mixed') {
    return Math.random() > 0.5 ? numberToChinese(num) : String(num)
  }
  return String(num)
}

/**
 * 計算兩點距離
 */
export function getDistance(p1: Position, p2: Position): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 產生隨機位置（確保不重疊）
 */
export function generateRandomPosition(
  existing: Position[],
  config: NumberConnectConfig,
  padding: number = 30
): Position | null {
  const maxAttempts = 100

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = padding + Math.random() * (config.canvasWidth - padding * 2)
    const y = padding + Math.random() * (config.canvasHeight - padding * 2)
    const position = { x, y }

    const isTooClose = existing.some(
      pos => getDistance(pos, position) < config.minDistance
    )

    if (!isTooClose) {
      return position
    }
  }

  return null
}

/**
 * 產生所有節點
 */
export function generateNodes(config: NumberConnectConfig): NumberNode[] {
  // 過去用純隨機 + 嘗試次數上限時，可能產生節點不足（缺號），導致玩家永遠無法完成。
  // 改用「等距格點候選 -> 隨機抽樣」：
  // - 保證能產生完整 1..count
  // - 在常用 config 下保證最小間距
  const padding = 30

  const minStep = Math.max(30, Math.floor(config.minDistance * 0.75))
  let step = Math.max(minStep, config.minDistance)

  const buildCandidates = (s: number): Position[] => {
    const candidates: Position[] = []
    const usableW = Math.max(0, config.canvasWidth - padding * 2)
    const usableH = Math.max(0, config.canvasHeight - padding * 2)
    if (usableW === 0 || usableH === 0) return candidates

    for (let y = padding; y <= padding + usableH; y += s) {
      for (let x = padding; x <= padding + usableW; x += s) {
        candidates.push({ x, y })
      }
    }
    return candidates
  }

  let candidates = buildCandidates(step)
  while (candidates.length < config.count && step > minStep) {
    step = Math.max(minStep, Math.floor(step * 0.9))
    candidates = buildCandidates(step)
  }

  shuffleInPlace(candidates)

  const picked: Position[] = candidates.slice(0, config.count)

  // 萬一畫布/配置異常導致候選不足（理論上不會），最後補齊到 count，避免缺號卡關。
  while (picked.length < config.count) {
    const fallback = generateRandomPosition(picked, { ...config, minDistance: minStep }, 10)
    if (fallback) {
      picked.push(fallback)
      continue
    }

    // 最後退一步：允許重疊也要把號碼補齊（比卡死更好）
    picked.push({
      x: padding + Math.random() * Math.max(1, config.canvasWidth - padding * 2),
      y: padding + Math.random() * Math.max(1, config.canvasHeight - padding * 2)
    })
  }

  return picked.map((position, index) => {
    const value = index + 1
    return {
      value,
      position,
      connected: false,
      display: getDisplayText(value, config.format)
    }
  })
}

/**
 * 建立初始遊戲狀態
 */
export function createGameState(config: NumberConnectConfig): NumberConnectState {
  return {
    nodes: generateNodes(config),
    currentTarget: 1,
    connectedPath: [],
    errors: 0,
    startTime: null,
  }
}

/**
 * 嘗試連接節點
 */
export function tryConnect(
  state: NumberConnectState,
  clickedValue: number
): { success: boolean; newState: NumberConnectState } {
  if (clickedValue !== state.currentTarget) {
    return {
      success: false,
      newState: {
        ...state,
        errors: state.errors + 1,
      },
    }
  }

  const clickedNode = state.nodes.find(n => n.value === clickedValue)
  if (!clickedNode) {
    return { success: false, newState: state }
  }

  const updatedNodes = state.nodes.map(node =>
    node.value === clickedValue ? { ...node, connected: true } : node
  )

  return {
    success: true,
    newState: {
      ...state,
      nodes: updatedNodes,
      currentTarget: state.currentTarget + 1,
      connectedPath: [...state.connectedPath, clickedNode.position],
    },
  }
}

/**
 * 檢查是否完成
 */
export function isCompleted(state: NumberConnectState): boolean {
  return state.nodes.every(node => node.connected)
}

/**
 * 取得提示位置
 */
export function getHintPosition(state: NumberConnectState): Position | null {
  const targetNode = state.nodes.find(n => n.value === state.currentTarget)
  return targetNode?.position || null
}

// ==================== 評分函數 ====================

/**
 * 計算分數
 */
export function calculateScore(
  connectedCount: number,
  totalCount: number,
  errors: number,
  completionTime: number,
  timeLimit: number
): number {
  // 基礎分數：連接進度
  const safeTotal = Math.max(1, totalCount)
  const safeConnected = Math.max(0, Math.min(connectedCount, safeTotal))
  const progressScore = (safeConnected / safeTotal) * 60

  // 時間獎勵
  const timeBonus = Math.max(0, (timeLimit - completionTime) / timeLimit) * 20

  // 錯誤扣分
  const errorPenalty = Math.min(errors * 3, 20)

  // 完成獎勵
  const completionBonus = safeConnected === safeTotal ? 20 : 0

  return Math.round(
    Math.max(0, progressScore + timeBonus - errorPenalty + completionBonus)
  )
}

/**
 * 計算等級
 */
export function calculateGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  state: NumberConnectState,
  completionTime: number,
  config: NumberConnectConfig
): NumberConnectResult {
  const connectedCount = state.nodes.filter(n => n.connected).length
  const completed = isCompleted(state)
  const score = calculateScore(
    connectedCount,
    config.count,
    state.errors,
    completionTime,
    config.timeLimit
  )

  return {
    score,
    completionTime,
    duration: completionTime,
    errors: state.errors,
    completed,
    connectedCount,
    progress: connectedCount,
    totalCount: config.count,
    totalNumbers: config.count,
  }
}

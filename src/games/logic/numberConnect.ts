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
  /** 錯誤次數 */
  errors: number
  /** 是否完成 */
  completed: boolean
  /** 連接數量 */
  connectedCount: number
  /** 總數量 */
  totalCount: number
}

// ==================== 常數配置 ====================

export const CHINESE_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']

export const DIFFICULTY_CONFIGS: Record<Difficulty, NumberConnectConfig> = {
  easy: {
    count: 10,
    canvasWidth: 400,
    canvasHeight: 400,
    minDistance: 60,
    timeLimit: 60,
    format: 'arabic',
  },
  medium: {
    count: 15,
    canvasWidth: 500,
    canvasHeight: 500,
    minDistance: 50,
    timeLimit: 90,
    format: 'arabic',
  },
  hard: {
    count: 20,
    canvasWidth: 600,
    canvasHeight: 600,
    minDistance: 45,
    timeLimit: 120,
    format: 'mixed',
  },
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
  const nodes: NumberNode[] = []
  const positions: Position[] = []

  for (let i = 1; i <= config.count; i++) {
    const position = generateRandomPosition(positions, config)
    if (position) {
      positions.push(position)
      nodes.push({
        value: i,
        position,
        connected: false,
        display: getDisplayText(i, config.format),
      })
    }
  }

  return nodes
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
  const progressScore = (connectedCount / totalCount) * 60

  // 時間獎勵
  const timeBonus = Math.max(0, (timeLimit - completionTime) / timeLimit) * 20

  // 錯誤扣分
  const errorPenalty = Math.min(errors * 3, 20)

  // 完成獎勵
  const completionBonus = connectedCount === totalCount ? 20 : 0

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
    errors: state.errors,
    completed,
    connectedCount,
    totalCount: config.count,
  }
}

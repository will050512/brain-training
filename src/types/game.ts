/**
 * 遊戲類型定義
 */

import type { Component } from 'vue'
import type { CognitiveDimension } from './cognitive'

// 難度等級
export type Difficulty = 'easy' | 'medium' | 'hard'

// 子難度等級（每個主難度內的微調）
export type SubDifficulty = 1 | 2 | 3

// 完整難度設定
export interface FullDifficulty {
  level: Difficulty
  sub: SubDifficulty
}

// 難度資訊
export interface DifficultyInfo {
  id: Difficulty
  name: string
  nameEn: string
  color: string
  bgColor: string
}

// 難度定義
export const DIFFICULTIES: Record<Difficulty, DifficultyInfo> = {
  easy: {
    id: 'easy',
    name: '簡單',
    nameEn: 'Easy',
    color: '#166534',
    bgColor: '#dcfce7',
  },
  medium: {
    id: 'medium',
    name: '中等',
    nameEn: 'Medium',
    color: '#854d0e',
    bgColor: '#fef9c3',
  },
  hard: {
    id: 'hard',
    name: '困難',
    nameEn: 'Hard',
    color: '#991b1b',
    bgColor: '#fee2e2',
  },
}

// 子難度標籤
export const SUB_DIFFICULTY_LABELS: Record<SubDifficulty, string> = {
  1: '初階',
  2: '中階', 
  3: '進階',
}

// 取得完整難度顯示名稱
export function getFullDifficultyLabel(difficulty: Difficulty, subDifficulty: SubDifficulty): string {
  return `${DIFFICULTIES[difficulty].name} - ${SUB_DIFFICULTY_LABELS[subDifficulty]}`
}

// 認知維度權重（物件格式，更易使用）
export type CognitiveWeights = Partial<Record<CognitiveDimension, number>>

// 設定值類型（支援陣列）
export type SettingValue = number | string | boolean | string[]

// 難度配置
export interface DifficultyConfig {
  difficulty: Difficulty
  settings: Record<string, SettingValue>
}

// 遊戲時間模式
export type GameTimeMode = Difficulty | 'mini'

// 遊戲定義（用於 gameRegistry）
export interface GameDefinition {
  id: string
  name: string
  description: string
  instructions: string[]
  icon: string
  category: string
  difficulties: Difficulty[]
  estimatedTime: Record<GameTimeMode, number>  // 各難度預估時間（含迷你模式）
  cognitiveWeights: CognitiveWeights
  defaultSettings: Record<Difficulty, Record<string, SettingValue>>
  // 新增：子難度設定調整係數
  subDifficultyModifiers?: {
    1: Record<string, number>  // 子難度1的調整係數
    2: Record<string, number>  // 子難度2的調整係數（基準）
    3: Record<string, number>  // 子難度3的調整係數
  }
}

// 完整遊戲定義（包含元件）
export interface FullGameDefinition extends GameDefinition {
  nameEn?: string
  thumbnail?: string
  component?: Component | (() => Promise<Component>)
  maxScore?: number  // 預設 100
}

// 遊戲狀態
export type GameState = 'idle' | 'ready' | 'playing' | 'paused' | 'finished'

// 遊戲結果
export interface GameResult {
  gameId: string
  difficulty: Difficulty
  subDifficulty?: SubDifficulty  // 新增：子難度
  score: number           // 0-100
  maxScore: number
  correctCount: number
  totalCount: number
  accuracy: number        // 0-1
  avgReactionTime: number // 毫秒
  duration: number        // 實際遊戲時長（秒）
  timestamp: Date
}

// 遊戲會話記錄
export interface GameSession {
  id: string
  odId: string
  gameId: string
  difficulty: Difficulty
  subDifficulty?: SubDifficulty  // 新增：子難度
  result: GameResult
  cognitiveScores: Record<CognitiveDimension, number>
  createdAt: Date
  startTime?: Date   // 遊戲開始時間
  endTime?: Date     // 遊戲結束時間
}

// 遊戲事件
export interface GameEvent {
  type: 'start' | 'pause' | 'resume' | 'end' | 'action'
  timestamp: number
  data?: Record<string, unknown>
}

// 遊戲回調
export interface GameCallbacks {
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onEnd?: (result: GameResult) => void
  onScoreChange?: (score: number) => void
}

// 遊戲上下文（傳給遊戲元件）
export interface GameContext {
  difficulty: Difficulty
  settings: Record<string, number | string | boolean>
  callbacks: GameCallbacks
}

// 遊戲狀態更新（統一由遊戲元件 emit 給 GamePlayView）
export interface GameStatusUpdate {
  /** 剩餘時間（秒） */
  timeLeft?: number
  /** 總時間（秒） */
  totalTime?: number
  /** 當前分數 */
  score?: number
  /** 正確數 */
  correctCount?: number
  /** 錯誤數 */
  wrongCount?: number
  /** 連擊數 */
  combo?: number
  /** 當前回合 */
  currentRound?: number
  /** 總回合數 */
  totalRounds?: number
  /** 是否顯示計時器（預設 true） */
  showTimer?: boolean
  /** 是否顯示分數（預設 true） */
  showScore?: boolean
  /** 是否顯示正確/錯誤計數 */
  showCounts?: boolean
  /** 是否顯示連擊 */
  showCombo?: boolean
  /** 是否顯示進度 */
  showProgress?: boolean
  /** 自訂狀態文字 */
  statusText?: string
}

// ========== 統一遊戲結果系統 ==========

/** 遊戲等級評定 */
export type GameGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

/** 反應時間基準類型 */
export type ReactionTimeBenchmark = 'instant' | 'quick' | 'normal' | 'extended'

/** 反應時間基準配置 */
export const REACTION_TIME_BENCHMARKS: Record<ReactionTimeBenchmark, { excellent: number; good: number; acceptable: number }> = {
  instant: { excellent: 300, good: 500, acceptable: 800 },      // 打地鼠、猜拳
  quick: { excellent: 1000, good: 2000, acceptable: 3000 },     // Stroop、加減乘除
  normal: { excellent: 3000, good: 5000, acceptable: 8000 },    // 天平、圖形推理
  extended: { excellent: 5000, good: 10000, acceptable: 15000 } // 找不同、翻牌配對
}

/** 等級評定閾值 */
export const GRADE_THRESHOLDS: Record<GameGrade, number> = {
  S: 90,
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  F: 0
}

/** 根據分數取得等級 */
export function getGradeFromScore(score: number): GameGrade {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/** 標準化指標（所有遊戲必須提供） */
export interface StandardizedMetrics {
  /** 完成度 0-1 */
  completion: number
  /** 準確率 0-1 */
  accuracy: number
  /** 速度評分 0-100 */
  speed: number
  /** 效率評分 0-100 */
  efficiency: number
}

/** 追蹤數據（所有遊戲統一收集） */
export interface TrackingData {
  /** 正確數量 */
  correctCount: number
  /** 錯誤數量 */
  wrongCount: number
  /** 漏答數量 */
  missedCount?: number
  /** 最高連擊 */
  maxCombo?: number
  /** 平均反應時間（毫秒） */
  avgReactionTime?: number
  /** 最佳反應時間（毫秒） */
  bestReactionTime?: number
  /** 平均思考時間（毫秒） */
  avgThinkingTime?: number
  /** 總操作次數 */
  totalActions?: number
}

/** 結算畫面顯示統計項目 */
export interface DisplayStat {
  /** 標籤（如「平均反應時間」） */
  label: string
  /** 數值 */
  value: string | number
  /** 單位（如「ms」、「步」） */
  unit?: string
  /** 圖示 */
  icon?: string
  /** 是否為重點項目 */
  highlight?: boolean
  /** 趨勢（與上次比較） */
  trend?: 'up' | 'down' | 'stable'
  /** 趨勢是否為正面（反應時間下降是正面的） */
  trendPositive?: boolean
}

/** 統一遊戲結果（標準化格式） */
export interface UnifiedGameResult {
  // ===== 基本資訊 =====
  /** 遊戲 ID */
  gameId: string
  /** 主難度 */
  difficulty: Difficulty
  /** 子難度 */
  subDifficulty?: SubDifficulty
  /** 時間戳 */
  timestamp: Date
  /** 遊戲時長（秒） */
  duration: number
  
  // ===== 標準化分數 =====
  /** 統一分數 0-100 */
  score: number
  /** 最高分數（固定 100） */
  maxScore: 100
  /** 等級評定 */
  grade: GameGrade
  
  // ===== 標準化指標 =====
  /** 四維標準化指標 */
  metrics: StandardizedMetrics
  
  // ===== 追蹤數據 =====
  /** 統一追蹤數據 */
  tracking: TrackingData
  
  // ===== 遊戲專屬數據 =====
  /** 遊戲特定的額外數據 */
  gameSpecific?: Record<string, unknown>
  
  // ===== 結算畫面配置 =====
  /** 結算畫面顯示的統計項目 */
  displayStats?: DisplayStat[]
}

/** 遊戲結果轉換器介面 */
export interface GameResultConverter<T = unknown> {
  /** 遊戲 ID */
  gameId: string
  /** 反應時間基準類型 */
  reactionBenchmark: ReactionTimeBenchmark
  /** 轉換原始結果為統一格式 */
  convert(rawResult: T, difficulty: Difficulty, subDifficulty?: SubDifficulty, duration?: number): UnifiedGameResult
  /** 產生結算畫面顯示項目 */
  generateDisplayStats(result: UnifiedGameResult): DisplayStat[]
}

/** 遊戲類型分類（用於評分公式選擇） */
export type GameScoreType = 
  | 'reaction'      // 反應型：以反應速度為主（打地鼠、猜拳）
  | 'accuracy'      // 正確率型：以答題正確為主（天平、Stroop、加減乘除）
  | 'completion'    // 完成度型：以完成進度為主（翻牌、迷宮、數字連連看）
  | 'memory'        // 記憶型：以記憶容量為主（瞬間記憶、撲克、手勢記憶）
  | 'precision'     // 精準度型：以操作精準為主（節奏模仿）
  | 'mixed'         // 混合型：多項指標綜合（找不同）

/** 遊戲評分配置 */
export interface GameScoreConfig {
  /** 遊戲類型 */
  type: GameScoreType
  /** 各指標權重（加總應為 100） */
  weights: {
    accuracy?: number      // 準確率權重
    speed?: number         // 速度權重
    completion?: number    // 完成度權重
    efficiency?: number    // 效率權重
    combo?: number         // 連擊權重
  }
  /** 反應時間基準 */
  reactionBenchmark: ReactionTimeBenchmark
  /** 是否有連擊機制 */
  hasCombo: boolean
  /** 是否計算漏答 */
  trackMissed: boolean
}

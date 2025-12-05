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

/**
 * 遊戲核心類型定義
 * 統一所有遊戲的介面規範
 */

import type { Difficulty, SubDifficulty } from '@/types/game'

// ===== 遊戲狀態 =====

/** 遊戲狀態機 */
export type GamePhase = 'ready' | 'playing' | 'paused' | 'result' | 'finished'

/** 遊戲結果 */
export interface GameResult {
  /** 得分 */
  score: number
  /** 滿分 */
  maxScore: number
  /** 正確率 (0-1) */
  accuracy: number
  /** 遊戲時長（秒） */
  duration: number
  /** 正確數量 */
  correctCount: number
  /** 總題數 */
  totalCount: number
  /** 平均反應時間（毫秒） */
  avgReactionTime?: number
  /** 額外詳情 */
  details?: Record<string, unknown>
}

/** 遊戲狀態 */
export interface GameState {
  /** 當前階段 */
  phase: GamePhase
  /** 當前分數 */
  score: number
  /** 剩餘時間（秒） */
  timeLeft: number
  /** 已用時間（秒） */
  timeElapsed: number
  /** 當前回合/題目索引 */
  currentRound: number
  /** 總回合/題目數 */
  totalRounds: number
  /** 正確數 */
  correctCount: number
  /** 錯誤數 */
  wrongCount: number
  /** 連擊數 */
  combo: number
  /** 最高連擊 */
  maxCombo: number
}

// ===== 遊戲 Props =====

/** 遊戲元件通用 Props */
export interface GameProps {
  /** 難度 */
  difficulty: Difficulty
  /** 子難度 (1-3) */
  subDifficulty?: SubDifficulty
  /** 自訂設定 */
  settings?: Record<string, unknown>
}

// ===== 遊戲 Emits =====

/** 遊戲元件通用 Emits */
export interface GameEmits {
  /** 遊戲開始 */
  (e: 'game:start'): void
  /** 遊戲結束 */
  (e: 'game:end', result: GameResult): void
  /** 分數更新 */
  (e: 'score:update', score: number): void
  /** 狀態變更 */
  (e: 'state:change', phase: GamePhase): void
  /** 進度更新 (0-100) */
  (e: 'progress:update', progress: number): void
}

/** 定義 emit 函數類型 */
export type GameEmitFn = {
  (e: 'game:start'): void
  (e: 'game:end', result: GameResult): void
  (e: 'score:update', score: number): void
  (e: 'state:change', phase: GamePhase): void
  (e: 'progress:update', progress: number): void
}

// ===== 遊戲配置 =====

/** 難度配置基礎結構 */
export interface DifficultyConfig {
  /** 時間限制（秒） */
  timeLimit: number
  /** 總回合/題目數 */
  totalRounds: number
  /** 每題基礎分數 */
  baseScore: number
}

/** 遊戲配置映射 */
export type GameDifficultyConfig<T extends DifficultyConfig = DifficultyConfig> = {
  easy: T
  medium: T
  hard: T
}

// ===== 計時器類型 =====

/** 計時器模式 */
export type TimerMode = 'countdown' | 'stopwatch'

/** 計時器選項 */
export interface TimerOptions {
  /** 計時模式 */
  mode: TimerMode
  /** 初始時間（秒） */
  initialTime: number
  /** 警告時間（秒），僅倒數模式 */
  warningTime?: number
  /** 時間到回調 */
  onTimeUp?: () => void
  /** 每秒回調 */
  onTick?: (time: number) => void
}

// ===== 分數計算 =====

/** 分數計算選項 */
export interface ScoreOptions {
  /** 基礎分數 */
  baseScore: number
  /** 時間加成係數 (0-1) */
  timeBonus?: number
  /** 連擊加成係數 */
  comboMultiplier?: number
  /** 最大連擊加成 */
  maxComboBonus?: number
  /** 完美分數加成 */
  perfectBonus?: number
}

// ===== 音效類型 =====

/** 遊戲音效類型 */
export type GameSoundType = 
  | 'correct'      // 正確
  | 'wrong'        // 錯誤
  | 'click'        // 點擊
  | 'start'        // 開始
  | 'end'          // 結束
  | 'countdown'    // 倒數
  | 'warning'      // 警告
  | 'combo'        // 連擊
  | 'perfect'      // 完美
  | 'levelUp'      // 升級
  | 'bonus'        // 獎勵
  | 'tick'         // 滴答聲
  | 'flip'         // 翻轉
  | 'match'        // 配對成功
  | 'mismatch'     // 配對失敗

/** 自訂音效配置 */
export interface CustomSoundConfig {
  /** 音效 ID */
  id: string
  /** 音效名稱 */
  name: string
  /** 頻率（Hz），用於 Web Audio 合成 */
  frequency?: number
  /** 持續時間（毫秒） */
  duration?: number
  /** 音量 (0-1) */
  volume?: number
}

// ===== 回饋類型 =====

/** 回饋狀態 */
export type FeedbackType = 'correct' | 'wrong' | 'timeout' | 'perfect' | 'combo' | null

/** 回饋資訊 */
export interface FeedbackInfo {
  type: FeedbackType
  message?: string
  score?: number
  combo?: number
}

// ===== 工具類型 =====

/** 反應時間記錄 */
export interface ReactionTimeRecord {
  /** 時間戳（毫秒） */
  timestamp: number
  /** 反應時間（毫秒） */
  reactionTime: number
  /** 是否正確 */
  isCorrect: boolean
}

/** 遊戲歷史記錄 */
export interface GameHistory {
  /** 回合索引 */
  round: number
  /** 使用者答案 */
  userAnswer: unknown
  /** 正確答案 */
  correctAnswer: unknown
  /** 是否正確 */
  isCorrect: boolean
  /** 反應時間（毫秒） */
  reactionTime: number
  /** 獲得分數 */
  score: number
}

/**
 * 聲音記憶遊戲邏輯模組
 * 訓練：聽覺記憶、聲音辨識、專注力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface SoundItem {
  /** 聲音 ID */
  id: string
  /** 聲音名稱 */
  name: string
  /** 聲音分類 */
  category: 'animal' | 'instrument' | 'nature' | 'household'
  /** 表情符號 */
  emoji: string
  /** 音檔路徑 */
  audioPath: string
}

export interface AudioMemoryConfig {
  /** 起始序列長度 */
  startLength: number
  /** 最大序列長度 */
  maxLength: number
  /** 聲音間隔（毫秒） */
  interval: number
  /** 可用聲音數量 */
  soundPoolSize: number
  /** 總回合數 */
  totalRounds: number
  /** 每回合時間限制（秒） */
  roundTimeLimit: number
}

export interface AudioMemoryState {
  /** 當前序列 */
  sequence: SoundItem[]
  /** 使用者輸入的序列 */
  userInput: SoundItem[]
  /** 當前回合 */
  currentRound: number
  /** 當前序列長度 */
  currentLength: number
  /** 是否正在播放 */
  isPlaying: boolean
  /** 當前播放索引 */
  playingIndex: number
}

export interface AudioMemoryResult {
  /** 最終分數 */
  score: number
  /** 準確率 */
  accuracy: number
  /** 正確回合數 */
  correctRounds: number
  /** 總回合數 */
  totalRounds: number
  /** 最長連續正確 */
  maxStreak: number
  /** 達到的最大長度 */
  maxLength: number
}

// ==================== 常數配置 ====================

export const SOUND_LIBRARY: SoundItem[] = [
  // 動物
  { id: 'dog', name: '狗叫', category: 'animal', emoji: '🐕', audioPath: '/audio/games/audio-memory/note-do.mp3' },
  { id: 'cat', name: '貓叫', category: 'animal', emoji: '🐱', audioPath: '/audio/games/audio-memory/note-re.mp3' },
  { id: 'bird', name: '鳥叫', category: 'animal', emoji: '🐦', audioPath: '/audio/games/audio-memory/note-mi.mp3' },
  { id: 'cow', name: '牛叫', category: 'animal', emoji: '🐄', audioPath: '/audio/games/audio-memory/note-fa.mp3' },
  { id: 'pig', name: '豬叫', category: 'animal', emoji: '🐷', audioPath: '/audio/games/audio-memory/note-sol.mp3' },
  { id: 'rooster', name: '公雞啼', category: 'animal', emoji: '🐓', audioPath: '/audio/games/audio-memory/note-la.mp3' },

  // 樂器
  { id: 'piano', name: '鋼琴', category: 'instrument', emoji: '🎹', audioPath: '/audio/games/audio-memory/note-si.mp3' },
  { id: 'guitar', name: '吉他', category: 'instrument', emoji: '🎸', audioPath: '/audio/games/audio-memory/note-do2.mp3' },
  { id: 'drum', name: '鼓', category: 'instrument', emoji: '🥁', audioPath: '/audio/games/audio-memory/note-do.mp3' },
  { id: 'violin', name: '小提琴', category: 'instrument', emoji: '🎻', audioPath: '/audio/games/audio-memory/note-re.mp3' },
  { id: 'trumpet', name: '小號', category: 'instrument', emoji: '🎺', audioPath: '/audio/games/audio-memory/note-mi.mp3' },
  { id: 'bell', name: '鈴聲', category: 'instrument', emoji: '🔔', audioPath: '/audio/games/audio-memory/note-fa.mp3' },

  // 自然
  { id: 'rain', name: '雨聲', category: 'nature', emoji: '🌧️', audioPath: '/audio/games/audio-memory/note-sol.mp3' },
  { id: 'thunder', name: '雷聲', category: 'nature', emoji: '⛈️', audioPath: '/audio/games/audio-memory/note-la.mp3' },
  { id: 'wind', name: '風聲', category: 'nature', emoji: '💨', audioPath: '/audio/games/audio-memory/note-si.mp3' },
  { id: 'wave', name: '海浪', category: 'nature', emoji: '🌊', audioPath: '/audio/games/audio-memory/note-do2.mp3' },

  // 生活
  { id: 'doorbell', name: '門鈴', category: 'household', emoji: '🚪', audioPath: '/audio/games/audio-memory/note-do.mp3' },
  { id: 'phone', name: '電話', category: 'household', emoji: '📞', audioPath: '/audio/games/audio-memory/note-re.mp3' },
  { id: 'clock', name: '時鐘', category: 'household', emoji: '⏰', audioPath: '/audio/games/audio-memory/note-mi.mp3' },
  { id: 'whistle', name: '哨子', category: 'household', emoji: '📯', audioPath: '/audio/games/audio-memory/note-fa.mp3' },
]

export const DIFFICULTY_CONFIGS: Record<Difficulty, AudioMemoryConfig> = {
  easy: {
    startLength: 2,
    maxLength: 4,
    interval: 1500,
    soundPoolSize: 6,
    totalRounds: 8,
    roundTimeLimit: 30,
  },
  medium: {
    startLength: 3,
    maxLength: 6,
    interval: 1200,
    soundPoolSize: 10,
    totalRounds: 10,
    roundTimeLimit: 25,
  },
  hard: {
    startLength: 4,
    maxLength: 8,
    interval: 900,
    soundPoolSize: 16,
    totalRounds: 12,
    roundTimeLimit: 20,
  },
}

// ==================== 工具函數 ====================

/**
 * 取得聲音池
 */
export function getSoundPool(size: number): SoundItem[] {
  return SOUND_LIBRARY.slice(0, Math.min(size, SOUND_LIBRARY.length))
}

/**
 * 產生隨機序列
 */
export function generateSequence(length: number, pool: SoundItem[]): SoundItem[] {
  const result: SoundItem[] = []

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length)
    const sound = pool[randomIndex]
    if (sound) {
      result.push(sound)
    }
  }

  return result
}

/**
 * 建立初始遊戲狀態
 */
export function createGameState(config: AudioMemoryConfig): AudioMemoryState {
  const pool = getSoundPool(config.soundPoolSize)

  return {
    sequence: generateSequence(config.startLength, pool),
    userInput: [],
    currentRound: 1,
    currentLength: config.startLength,
    isPlaying: false,
    playingIndex: -1,
  }
}

/**
 * 添加使用者輸入
 */
export function addUserInput(state: AudioMemoryState, sound: SoundItem): AudioMemoryState {
  return {
    ...state,
    userInput: [...state.userInput, sound],
  }
}

/**
 * 檢查輸入是否完成
 */
export function isInputComplete(state: AudioMemoryState): boolean {
  return state.userInput.length >= state.sequence.length
}

/**
 * 驗證答案
 */
export function validateAnswer(state: AudioMemoryState): boolean {
  return state.userInput.every(
    (sound, index) => sound.id === state.sequence[index]?.id
  )
}

/**
 * 計算下一回合長度
 */
export function getNextLength(
  currentLength: number,
  isCorrect: boolean,
  streak: number,
  config: AudioMemoryConfig
): number {
  if (isCorrect && streak >= 2) {
    return Math.min(currentLength + 1, config.maxLength)
  } else if (!isCorrect) {
    return Math.max(currentLength - 1, config.startLength)
  }
  return currentLength
}

/**
 * 建立新回合狀態
 */
export function createNextRound(
  state: AudioMemoryState,
  isCorrect: boolean,
  streak: number,
  config: AudioMemoryConfig
): AudioMemoryState {
  const pool = getSoundPool(config.soundPoolSize)
  const nextLength = getNextLength(state.currentLength, isCorrect, streak, config)

  return {
    sequence: generateSequence(nextLength, pool),
    userInput: [],
    currentRound: state.currentRound + 1,
    currentLength: nextLength,
    isPlaying: false,
    playingIndex: -1,
  }
}

/**
 * 取得當前應播放的聲音
 */
export function getCurrentPlayingSound(state: AudioMemoryState): SoundItem | null {
  if (!state.isPlaying || state.playingIndex < 0) {
    return null
  }
  return state.sequence[state.playingIndex] || null
}

// ==================== 評分函數 ====================

/**
 * 計算回合分數
 */
export function calculateRoundScore(
  sequenceLength: number,
  isCorrect: boolean,
  streak: number
): number {
  if (!isCorrect) return 0

  const baseScore = sequenceLength * 15
  const streakBonus = Math.min(streak - 1, 5) * 10
  return baseScore + Math.max(0, streakBonus)
}

/**
 * 計算等級
 */
export function calculateGrade(accuracy: number): string {
  if (accuracy >= 90) return 'S'
  if (accuracy >= 80) return 'A'
  if (accuracy >= 70) return 'B'
  if (accuracy >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  score: number,
  correctRounds: number,
  totalRounds: number,
  maxStreak: number,
  maxLength: number
): AudioMemoryResult {
  const accuracy = totalRounds > 0
    ? (correctRounds / totalRounds) * 100
    : 0

  return {
    score,
    accuracy: Math.round(accuracy),
    correctRounds,
    totalRounds,
    maxStreak,
    maxLength,
  }
}

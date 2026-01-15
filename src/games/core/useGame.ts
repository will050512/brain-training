/**
 * 統一遊戲 Composable
 * 封裝 useGameState + useGameTimer + useGameAudio + 難度管理
 * 提供遊戲元件所需的所有核心功能
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGameState, type UseGameStateOptions } from './useGameState'
import { useGameTimer, type UseGameTimerOptions } from './useGameTimer'
import { useGameAudio, type UseGameAudioOptions } from './useGameAudio'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { 
  GamePhase, 
  GameResult, 
  GameEmitFn,
  DifficultyConfig,
  GameDifficultyConfig,
  FeedbackType
} from './gameTypes'
import type { 
  GameDifficulty, 
  GameSubDifficulty, 
  GameDifficultySetting 
} from '@/stores/settingsStore'

// ===== 類型定義 =====

export interface UseGameOptions<T extends DifficultyConfig = DifficultyConfig> {
  /** 遊戲 ID */
  gameId: string
  /** 難度配置 */
  difficultyConfigs: GameDifficultyConfig<T>
  /** 預設總回合數（若配置中無 totalRounds） */
  defaultTotalRounds?: number
  /** 預設時間限制（若配置中無 timeLimit） */
  defaultTimeLimit?: number
  /** 計時器模式 */
  timerMode?: 'countdown' | 'stopwatch'
  /** emit 函數 */
  emit?: GameEmitFn
  /** 遊戲專屬音效資料夾 */
  audioFolder?: string
  /** 自動預載音效 */
  preloadAudio?: boolean
  /** 狀態變更回調 */
  onPhaseChange?: (phase: GamePhase) => void
  /** 遊戲結束回調 */
  onGameEnd?: (result: GameResult) => void
}

export interface UseGameReturn<T extends DifficultyConfig = DifficultyConfig> {
  // ===== 難度相關 =====
  /** 當前難度 */
  difficulty: ReturnType<typeof ref<GameDifficulty>>
  /** 當前子難度 */
  subDifficulty: ReturnType<typeof ref<GameSubDifficulty>>
  /** 當前難度配置 */
  currentConfig: ReturnType<typeof computed<T>>
  /** 設置難度 */
  setDifficulty: (difficulty: GameDifficulty, subDifficulty?: GameSubDifficulty) => void
  /** 儲存難度到設定 */
  saveDifficulty: () => void
  /** 載入難度從設定 */
  loadDifficulty: () => void
  
  // ===== 遊戲狀態（來自 useGameState） =====
  state: ReturnType<typeof useGameState>
  
  // ===== 計時器（來自 useGameTimer） =====
  timer: ReturnType<typeof useGameTimer>
  
  // ===== 音效（來自 useGameAudio） =====
  audio: ReturnType<typeof useGameAudio>
  
  // ===== 便捷方法 =====
  /** 開始遊戲（初始化 + 開始計時） */
  startGame: () => void
  /** 暫停遊戲 */
  pauseGame: () => void
  /** 恢復遊戲 */
  resumeGame: () => void
  /** 結束遊戲並計算結果 */
  endGame: () => GameResult
  /** 重新開始遊戲 */
  restartGame: () => void
  /** 記錄答案並播放音效 */
  recordAnswerWithSound: (
    isCorrect: boolean,
    userAnswer: unknown,
    correctAnswer: unknown,
    earnedScore?: number
  ) => { reactionTime: number; combo: number }
  /** 顯示回饋 */
  showFeedback: (type: FeedbackType, message?: string, score?: number) => void
  /** 隱藏回饋 */
  hideFeedback: () => void
}

// ===== 主要 Composable =====

export function useGame<T extends DifficultyConfig = DifficultyConfig>(
  options: UseGameOptions<T>
): UseGameReturn<T> {
  const {
    gameId,
    difficultyConfigs,
    defaultTotalRounds = 10,
    defaultTimeLimit = 60,
    timerMode = 'countdown',
    emit,
    audioFolder,
    preloadAudio = true,
    onPhaseChange,
    onGameEnd,
  } = options

  const settingsStore = useSettingsStore()

  // ===== 難度管理 =====
  
  const difficulty = ref<GameDifficulty>('easy')
  const subDifficulty = ref<GameSubDifficulty>(2)

  /** 當前難度配置（含子難度微調） */
  const currentConfig = computed<T>(() => {
    const base = difficultyConfigs[difficulty.value] as T
    return adjustSettingsForSubDifficulty(
      base,
      subDifficulty.value
    )
  })

  /** 設置難度 */
  function setDifficulty(newDifficulty: GameDifficulty, newSubDifficulty?: GameSubDifficulty): void {
    difficulty.value = newDifficulty
    if (newSubDifficulty !== undefined) {
      subDifficulty.value = newSubDifficulty
    }
  }

  /** 儲存難度到 settingsStore */
  function saveDifficulty(): void {
    settingsStore.setGameDifficulty(gameId, {
      difficulty: difficulty.value,
      subDifficulty: subDifficulty.value,
    })
  }

  /** 從 settingsStore 載入難度 */
  function loadDifficulty(): void {
    const saved = settingsStore.getGameDifficulty(gameId)
    difficulty.value = saved.difficulty
    subDifficulty.value = saved.subDifficulty
  }

  // ===== 遊戲狀態 =====

  const stateOptions: UseGameStateOptions = {
    totalRounds: defaultTotalRounds,
    timeLimit: timerMode === 'countdown' ? defaultTimeLimit : 0,
    emit,
    onPhaseChange,
  }

  const state = useGameState(stateOptions)

  // ===== 計時器 =====

  const timerOptions: UseGameTimerOptions = {
    mode: timerMode,
    initialTime: timerMode === 'countdown' ? defaultTimeLimit : 0,
    warningTime: 10,
    onTimeUp: () => {
      // 時間到自動結束遊戲
      if (state.isPlaying.value) {
        endGame()
      }
    },
    onTick: (time) => {
      state.updateTime(
        timerMode === 'countdown' ? time : undefined,
        timerMode === 'stopwatch' ? time : undefined
      )
    },
    onWarning: () => {
      audio.playWarning()
    },
  }

  const timer = useGameTimer(timerOptions)

  // ===== 音效 =====

  const audioOptions: UseGameAudioOptions = {
    enabled: settingsStore.soundEnabled,
    volume: settingsStore.soundVolume,
    gameFolder: audioFolder,
  }

  const audio = useGameAudio(audioOptions)

  // 監聽設定變更同步音效狀態
  watch(() => settingsStore.soundEnabled, (enabled) => {
    audio.setEnabled(enabled)
  })

  watch(() => settingsStore.soundVolume, (volume) => {
    audio.setVolume(volume)
  })

  // ===== 便捷方法 =====

  /** 開始遊戲 */
  function startGame(): void {
    // 載入並應用當前難度配置
    loadDifficulty()
    
    // 重置計時器
    const config = currentConfig.value
    timer.reset(config.timeLimit || defaultTimeLimit)
    
    // 開始遊戲狀態
    state.startGame()
    
    // 開始計時
    timer.start()
    
    // 播放開始音效
    audio.playStart()
  }

  /** 暫停遊戲 */
  function pauseGame(): void {
    state.pauseGame()
    timer.pause()
  }

  /** 恢復遊戲 */
  function resumeGame(): void {
    state.resumeGame()
    timer.resume()
  }

  /** 結束遊戲 */
  function endGame(): GameResult {
    timer.stop()
    
    const result = state.finishGame()
    
    // 儲存難度（可能已被自適應調整）
    saveDifficulty()
    
    // 播放結束音效
    audio.playEnd()
    
    // 回調
    onGameEnd?.(result)
    
    return result
  }

  /** 重新開始遊戲 */
  function restartGame(): void {
    timer.stop()
    state.resetGame()
    startGame()
  }

  /** 記錄答案並自動播放音效 */
  function recordAnswerWithSound(
    isCorrect: boolean,
    userAnswer: unknown,
    correctAnswer: unknown,
    earnedScore: number = 0
  ): { reactionTime: number; combo: number } {
    const result = state.recordAnswer(isCorrect, userAnswer, correctAnswer, earnedScore)
    
    // 根據結果播放音效
    if (isCorrect) {
      if (result.combo >= 3) {
        audio.playCombo()
      } else {
        audio.playCorrect()
      }
    } else {
      audio.playWrong()
    }
    
    return result
  }

  /** 顯示回饋 */
  function showFeedback(type: FeedbackType, message?: string, score?: number): void {
    state.setFeedback(type, message, score)
  }

  /** 隱藏回饋 */
  function hideFeedback(): void {
    state.clearFeedback()
  }

  // ===== 生命週期 =====

  onMounted(() => {
    // 載入難度
    loadDifficulty()
    
    // 預載音效
    if (preloadAudio) {
      audio.preloadDefaultSounds()
    }
  })

  onUnmounted(() => {
    // 清理資源
    timer.stop()
    audio.cleanup()
  })

  return {
    // 難度相關
    difficulty,
    subDifficulty,
    currentConfig: currentConfig as ReturnType<typeof computed<T>>,
    setDifficulty,
    saveDifficulty,
    loadDifficulty,
    
    // 核心模組
    state,
    timer,
    audio,
    
    // 便捷方法
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    restartGame,
    recordAnswerWithSound,
    showFeedback,
    hideFeedback,
  }
}


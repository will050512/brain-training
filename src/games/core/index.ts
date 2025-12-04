/**
 * 遊戲核心模組統一匯出
 */

// 類型定義
export * from './gameTypes'

// Composables
export { useGameState, type UseGameStateOptions, type UseGameStateReturn } from './useGameState'
export { useGameTimer, useRoundTimer, type UseGameTimerOptions, type UseGameTimerReturn, type UseRoundTimerReturn } from './useGameTimer'
export { useGameScore, type UseGameScoreOptions, type UseGameScoreReturn } from './useGameScore'
export { useGameAudio, getGlobalAudioManager, type UseGameAudioOptions, type UseGameAudioReturn } from './useGameAudio'

// 統一遊戲 Composable
export { useGame, type UseGameOptions, type UseGameReturn } from './useGame'

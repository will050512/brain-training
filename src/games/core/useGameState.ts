/**
 * 遊戲狀態管理 Composable
 * 提供統一的遊戲狀態機管理
 */

import { ref, computed, readonly } from 'vue'
import type { 
  GamePhase, 
  GameState, 
  GameResult, 
  GameEmitFn,
  FeedbackType,
  FeedbackInfo,
  GameHistory
} from './gameTypes'

export interface UseGameStateOptions {
  /** 總回合數 */
  totalRounds: number
  /** 時間限制（秒），0 表示無限制 */
  timeLimit?: number
  /** emit 函數 */
  emit?: GameEmitFn
  /** 狀態變更回調 */
  onPhaseChange?: (phase: GamePhase) => void
}

export function useGameState(options: UseGameStateOptions) {
  const { totalRounds, timeLimit = 0, emit, onPhaseChange } = options

  // ===== 狀態 =====
  const phase = ref<GamePhase>('ready')
  const score = ref(0)
  const timeLeft = ref(timeLimit)
  const timeElapsed = ref(0)
  const currentRound = ref(0)
  const correctCount = ref(0)
  const wrongCount = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const startTime = ref(0)
  const roundStartTime = ref(0)
  const history = ref<GameHistory[]>([])
  
  // 回饋狀態
  const feedback = ref<FeedbackInfo | null>(null)
  const showFeedback = ref(false)

  // ===== 計算屬性 =====
  
  /** 遊戲是否進行中 */
  const isPlaying = computed(() => phase.value === 'playing')
  
  /** 遊戲是否已結束 */
  const isFinished = computed(() => phase.value === 'finished')
  
  /** 遊戲是否暫停 */
  const isPaused = computed(() => phase.value === 'paused')
  
  /** 進度百分比 */
  const progress = computed(() => 
    totalRounds > 0 ? Math.round((currentRound.value / totalRounds) * 100) : 0
  )
  
  /** 正確率 */
  const accuracy = computed(() => {
    const total = correctCount.value + wrongCount.value
    return total > 0 ? correctCount.value / total : 0
  })
  
  /** 當前遊戲狀態快照 */
  const state = computed<GameState>(() => ({
    phase: phase.value,
    score: score.value,
    timeLeft: timeLeft.value,
    timeElapsed: timeElapsed.value,
    currentRound: currentRound.value,
    totalRounds,
    correctCount: correctCount.value,
    wrongCount: wrongCount.value,
    combo: combo.value,
    maxCombo: maxCombo.value,
  }))

  // ===== 方法 =====

  /** 設置遊戲階段 */
  function setPhase(newPhase: GamePhase) {
    const oldPhase = phase.value
    phase.value = newPhase
    
    if (oldPhase !== newPhase) {
      emit?.('state:change', newPhase)
      onPhaseChange?.(newPhase)
    }
  }

  /** 開始遊戲 */
  function startGame() {
    // 重置狀態
    score.value = 0
    timeLeft.value = timeLimit
    timeElapsed.value = 0
    currentRound.value = 0
    correctCount.value = 0
    wrongCount.value = 0
    combo.value = 0
    maxCombo.value = 0
    history.value = []
    startTime.value = Date.now()
    roundStartTime.value = Date.now()
    
    setPhase('playing')
    emit?.('game:start')
  }

  /** 暫停遊戲 */
  function pauseGame() {
    if (phase.value === 'playing') {
      setPhase('paused')
    }
  }

  /** 恢復遊戲 */
  function resumeGame() {
    if (phase.value === 'paused') {
      setPhase('playing')
    }
  }

  /** 結束遊戲（顯示結果） */
  function showResult() {
    setPhase('result')
  }

  /** 完成遊戲（最終狀態） */
  function finishGame() {
    setPhase('finished')
    
    const result: GameResult = {
      score: score.value,
      maxScore: totalRounds * 100, // 預設最大分數
      accuracy: accuracy.value,
      duration: timeElapsed.value || Math.round((Date.now() - startTime.value) / 1000),
      correctCount: correctCount.value,
      totalCount: correctCount.value + wrongCount.value,
      avgReactionTime: calculateAvgReactionTime(),
      details: {
        maxCombo: maxCombo.value,
        history: history.value,
      },
    }
    
    emit?.('game:end', result)
    return result
  }

  /** 進入下一回合 */
  function nextRound() {
    if (currentRound.value < totalRounds) {
      currentRound.value++
      roundStartTime.value = Date.now()
      emit?.('progress:update', progress.value)
    }
  }

  /** 記錄答題結果 */
  function recordAnswer(
    isCorrect: boolean,
    userAnswer: unknown,
    correctAnswer: unknown,
    earnedScore: number = 0
  ) {
    const reactionTime = Date.now() - roundStartTime.value
    
    if (isCorrect) {
      correctCount.value++
      combo.value++
      if (combo.value > maxCombo.value) {
        maxCombo.value = combo.value
      }
    } else {
      wrongCount.value++
      combo.value = 0
    }
    
    score.value += earnedScore
    emit?.('score:update', score.value)
    
    // 記錄歷史
    history.value.push({
      round: currentRound.value,
      userAnswer,
      correctAnswer,
      isCorrect,
      reactionTime,
      score: earnedScore,
    })
    
    return { reactionTime, combo: combo.value }
  }

  /** 設置回饋狀態 */
  function setFeedback(type: FeedbackType, message?: string, extraScore?: number) {
    feedback.value = {
      type,
      message,
      score: extraScore,
      combo: type === 'correct' || type === 'combo' ? combo.value : undefined,
    }
    showFeedback.value = true
  }

  /** 清除回饋狀態 */
  function clearFeedback() {
    showFeedback.value = false
    feedback.value = null
  }

  /** 更新時間 */
  function updateTime(newTimeLeft?: number, newTimeElapsed?: number) {
    if (newTimeLeft !== undefined) {
      timeLeft.value = newTimeLeft
    }
    if (newTimeElapsed !== undefined) {
      timeElapsed.value = newTimeElapsed
    }
  }

  /** 增加分數 */
  function addScore(points: number) {
    score.value += points
    emit?.('score:update', score.value)
  }

  /** 計算平均反應時間 */
  function calculateAvgReactionTime(): number {
    if (history.value.length === 0) return 0
    const total = history.value.reduce((sum, h) => sum + h.reactionTime, 0)
    return Math.round(total / history.value.length)
  }

  /** 獲取當前回合反應時間 */
  function getCurrentReactionTime(): number {
    return Date.now() - roundStartTime.value
  }

  /** 重置遊戲狀態 */
  function resetGame() {
    phase.value = 'ready'
    score.value = 0
    timeLeft.value = timeLimit
    timeElapsed.value = 0
    currentRound.value = 0
    correctCount.value = 0
    wrongCount.value = 0
    combo.value = 0
    maxCombo.value = 0
    history.value = []
    feedback.value = null
    showFeedback.value = false
  }

  return {
    // 狀態（唯讀）
    phase: readonly(phase),
    score: readonly(score),
    timeLeft: readonly(timeLeft),
    timeElapsed: readonly(timeElapsed),
    currentRound: readonly(currentRound),
    totalRounds,
    correctCount: readonly(correctCount),
    wrongCount: readonly(wrongCount),
    combo: readonly(combo),
    maxCombo: readonly(maxCombo),
    history: readonly(history),
    feedback: readonly(feedback),
    showFeedback: readonly(showFeedback),
    
    // 計算屬性
    isPlaying,
    isFinished,
    isPaused,
    progress,
    accuracy,
    state,
    
    // 方法
    setPhase,
    startGame,
    pauseGame,
    resumeGame,
    showResult,
    finishGame,
    nextRound,
    recordAnswer,
    setFeedback,
    clearFeedback,
    updateTime,
    addScore,
    getCurrentReactionTime,
    calculateAvgReactionTime,
    resetGame,
  }
}

export type UseGameStateReturn = ReturnType<typeof useGameState>

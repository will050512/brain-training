/**
 * 遊戲計時器 Composable
 * 支援倒數計時和正計時兩種模式
 */

import { ref, computed, onUnmounted, readonly } from 'vue'
import type { TimerMode, TimerOptions } from './gameTypes'

export interface UseGameTimerOptions {
  /** 計時模式：countdown (倒數) 或 stopwatch (正計時) */
  mode?: TimerMode
  /** 初始時間（秒） */
  initialTime?: number
  /** 警告時間（秒），僅倒數模式有效 */
  warningTime?: number
  /** 時間到回調 */
  onTimeUp?: () => void
  /** 每秒回調 */
  onTick?: (time: number) => void
  /** 警告回調 */
  onWarning?: () => void
  /** 自動開始 */
  autoStart?: boolean
}

export function useGameTimer(options: UseGameTimerOptions = {}) {
  const {
    mode = 'countdown',
    initialTime = 60,
    warningTime = 10,
    onTimeUp,
    onTick,
    onWarning,
    autoStart = false,
  } = options

  // ===== 狀態 =====
  const time = ref(mode === 'countdown' ? initialTime : 0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const hasWarned = ref(false)
  
  let intervalId: ReturnType<typeof setInterval> | null = null

  // ===== 計算屬性 =====
  
  /** 是否處於警告狀態 */
  const isWarning = computed(() => 
    mode === 'countdown' && time.value <= warningTime && time.value > 0
  )
  
  /** 是否時間到 */
  const isTimeUp = computed(() => 
    mode === 'countdown' && time.value <= 0
  )
  
  /** 格式化時間 (MM:SS) */
  const formattedTime = computed(() => {
    const totalSeconds = Math.max(0, Math.floor(time.value))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })
  
  /** 進度百分比 (0-100)，倒數模式為剩餘比例 */
  const progressPercent = computed(() => {
    if (mode === 'countdown') {
      return initialTime > 0 ? (time.value / initialTime) * 100 : 0
    }
    return 0 // 正計時模式不計算進度
  })

  // ===== 方法 =====

  function startInterval() {
    if (intervalId) return

    intervalId = setInterval(() => {
      if (mode === 'countdown') {
        time.value--
        
        // 警告檢測
        if (!hasWarned.value && time.value <= warningTime && time.value > 0) {
          hasWarned.value = true
          onWarning?.()
        }
        
        onTick?.(time.value)
        
        // 時間到
        if (time.value <= 0) {
          stop()
          onTimeUp?.()
        }
      } else {
        time.value++
        onTick?.(time.value)
      }
    }, 1000)
  }

  /** 開始計時 */
  function start() {
    if (isRunning.value && !isPaused.value) return
    
    isRunning.value = true
    isPaused.value = false
    startInterval()
  }

  /** 暫停計時 */
  function pause() {
    if (!isRunning.value || isPaused.value) return
    
    isPaused.value = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /** 恢復計時 */
  function resume() {
    if (!isRunning.value || !isPaused.value) return
    
    isPaused.value = false
    startInterval()
  }

  /** 停止計時 */
  function stop() {
    isRunning.value = false
    isPaused.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /** 重置計時器 */
  function reset(newInitialTime?: number) {
    stop()
    time.value = mode === 'countdown' ? (newInitialTime ?? initialTime) : 0
    hasWarned.value = false
  }

  /** 設置時間 */
  function setTime(newTime: number) {
    time.value = Math.max(0, newTime)
  }

  /** 增加時間 */
  function addTime(seconds: number) {
    time.value = Math.max(0, time.value + seconds)
  }

  /** 獲取已用時間（秒） */
  function getElapsedTime(): number {
    if (mode === 'countdown') {
      return initialTime - time.value
    }
    return time.value
  }

  // 自動開始
  if (autoStart) {
    start()
  }

  // 清理
  onUnmounted(() => {
    stop()
  })

  return {
    // 狀態（唯讀）
    time: readonly(time),
    isRunning: readonly(isRunning),
    isPaused: readonly(isPaused),
    
    // 計算屬性
    isWarning,
    isTimeUp,
    formattedTime,
    progressPercent,
    
    // 方法
    start,
    pause,
    resume,
    stop,
    reset,
    setTime,
    addTime,
    getElapsedTime,
  }
}

export type UseGameTimerReturn = ReturnType<typeof useGameTimer>


/**
 * 回合計時器 Composable
 * 用於單回合/題目的計時
 */
export interface UseRoundTimerOptions {
  /** 每回合時間限制（秒） */
  timePerRound: number
  /** 時間到回調 */
  onRoundTimeUp?: () => void
  /** 每秒回調 */
  onTick?: (time: number) => void
}

export function useRoundTimer(options: UseRoundTimerOptions) {
  const { timePerRound, onRoundTimeUp, onTick } = options
  
  const roundTime = ref(timePerRound)
  const isRunning = ref(false)
  const isPaused = ref(false)
  
  let intervalId: ReturnType<typeof setInterval> | null = null

  const formattedRoundTime = computed(() => {
    const seconds = Math.max(0, Math.ceil(roundTime.value))
    return seconds.toString()
  })

  function startInterval() {
    intervalId = setInterval(() => {
      roundTime.value--
      onTick?.(roundTime.value)
      
      if (roundTime.value <= 0) {
        stopRound()
        onRoundTimeUp?.()
      }
    }, 1000)
  }

  function startRound() {
    stopRound()
    roundTime.value = timePerRound
    isRunning.value = true
    isPaused.value = false
    startInterval()
  }

  function pauseRound() {
    if (!isRunning.value || isPaused.value) return
    isPaused.value = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function resumeRound() {
    if (!isRunning.value || !isPaused.value || roundTime.value <= 0) return
    isPaused.value = false
    if (!intervalId) {
      startInterval()
    }
  }

  function stopRound() {
    isRunning.value = false
    isPaused.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function resetRound() {
    stopRound()
    roundTime.value = timePerRound
  }

  onUnmounted(() => {
    stopRound()
  })

  return {
    roundTime: readonly(roundTime),
    isRunning: readonly(isRunning),
    isPaused: readonly(isPaused),
    formattedRoundTime,
    startRound,
    pauseRound,
    resumeRound,
    stopRound,
    resetRound,
  }
}

export type UseRoundTimerReturn = ReturnType<typeof useRoundTimer>

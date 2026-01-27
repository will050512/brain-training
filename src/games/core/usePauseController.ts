/**
 * Pause-aware timer helpers for game components.
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'

export interface PauseController {
  runOrQueue: (action: () => void) => void
  scheduleTimeout: (action: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  scheduleInterval: (action: () => void, intervalMs: number) => ReturnType<typeof setInterval>
  waitForResume: () => Promise<void>
  pauseAwareDelay: (ms: number) => Promise<void>
  clearTimers: () => void
}

export function usePauseController(isPaused: Ref<boolean>): PauseController {
  const isActive = ref(true)
  const pendingActions: Array<() => void> = []
  const resumeResolvers: Array<() => void> = []
  const timeouts = new Set<ReturnType<typeof setTimeout>>()
  const intervals = new Set<ReturnType<typeof setInterval>>()

  function resolveWaiters(): void {
    const resolvers = resumeResolvers.splice(0)
    resolvers.forEach(resolve => resolve())
  }

  function flushPending(): void {
    if (pendingActions.length === 0) return
    const actions = pendingActions.splice(0)
    actions.forEach(action => action())
  }

  function runOrQueue(action: () => void): void {
    if (!isActive.value) return
    if (isPaused.value) {
      pendingActions.push(action)
      return
    }
    action()
  }

  function scheduleTimeout(action: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      timeouts.delete(timer)
      runOrQueue(action)
    }, delayMs)
    timeouts.add(timer)
    return timer
  }

  function scheduleInterval(action: () => void, intervalMs: number): ReturnType<typeof setInterval> {
    const timer = setInterval(() => {
      if (!isActive.value || isPaused.value) return
      action()
    }, intervalMs)
    intervals.add(timer)
    return timer
  }

  function waitForResume(): Promise<void> {
    if (!isActive.value || !isPaused.value) return Promise.resolve()
    return new Promise(resolve => {
      resumeResolvers.push(resolve)
    })
  }

  async function pauseAwareDelay(ms: number): Promise<void> {
    let remaining = Math.max(0, Math.round(ms))
    while (remaining > 0 && isActive.value) {
      if (isPaused.value) {
        await waitForResume()
        continue
      }

      const chunk = Math.min(remaining, 120)
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          timeouts.delete(timer)
          resolve()
        }, chunk)
        timeouts.add(timer)
      })
      remaining = Math.max(0, remaining - chunk)
    }
  }

  function clearTimers(): void {
    timeouts.forEach(timer => clearTimeout(timer))
    timeouts.clear()
    intervals.forEach(timer => clearInterval(timer))
    intervals.clear()
    pendingActions.length = 0
  }

  watch(isPaused, (paused) => {
    if (!paused) {
      resolveWaiters()
      flushPending()
    }
  })

  onUnmounted(() => {
    isActive.value = false
    clearTimers()
    resolveWaiters()
  })

  return {
    runOrQueue,
    scheduleTimeout,
    scheduleInterval,
    waitForResume,
    pauseAwareDelay,
    clearTimers,
  }
}

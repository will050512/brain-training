const PERF_FLAG_KEY = 'brain-training-perf'

function canUsePerformance(): boolean {
  return typeof performance !== 'undefined' && typeof performance.mark === 'function'
}

export function isPerfEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem(PERF_FLAG_KEY) === '1'
  } catch (error) {
    console.warn('[perf] Failed to read perf flag:', error)
    return false
  }
}

export function perfStart(label: string): void {
  if (!isPerfEnabled() || !canUsePerformance()) return
  performance.mark(`${label}:start`)
}

export function perfEnd(label: string): void {
  if (!isPerfEnabled() || !canUsePerformance()) return
  const startMark = `${label}:start`
  const endMark = `${label}:end`
  performance.mark(endMark)
  try {
    performance.measure(label, startMark, endMark)
    const entries = performance.getEntriesByName(label)
    const latest = entries[entries.length - 1]
    if (latest) {
      console.log(`[perf] ${label}: ${Math.round(latest.duration)}ms`)
    }
  } catch (error) {
    console.warn(`[perf] Failed to measure ${label}:`, error)
  }
}

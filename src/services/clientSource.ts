export type ClientSource = 'app-android' | 'app-ios' | 'pwa' | 'web' | 'unknown'

export function detectClientSource(): ClientSource {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)')?.matches ||
        (navigator as any)?.standalone === true)

    if (isStandalone) return 'pwa'
    if (/Android/i.test(ua)) return 'web'
    if (/iPhone|iPad|iPod/i.test(ua)) return 'web'
    return 'web'
  } catch {
    return 'unknown'
  }
}

const CLIENT_SOURCE_KEY_PREFIX = 'brain-training-client-source:'

export function saveClientSourceForUser(odId: string, source: ClientSource | string): void {
  try {
    localStorage.setItem(`${CLIENT_SOURCE_KEY_PREFIX}${odId}`, String(source))
  } catch {
    // ignore
  }
}

export function loadClientSourceForUser(odId: string): string | undefined {
  try {
    const v = localStorage.getItem(`${CLIENT_SOURCE_KEY_PREFIX}${odId}`)
    return v || undefined
  } catch {
    return undefined
  }
}


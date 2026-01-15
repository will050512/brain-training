import { useUserStore } from '@/stores/userStore'
import type { User } from '@/types'
import { detectClientSource, saveClientSourceForUser } from '@/services/clientSource'

declare global {
  interface Window {
    BrainTrainingBridge?: {
      setExternalProfile: (profile: ExternalUserProfile) => Promise<void>
    }
  }
}

export type ExternalUserProfile = {
  provider: 'firebase'
  uid: string
  idToken?: string
  name: string
  birthday: string
  educationYears?: number
  gender?: User['gender']
  clientSource?: string
}

function storeIdToken(profile: ExternalUserProfile): void {
  if (!profile.idToken) return
  try {
    sessionStorage.setItem('firebaseIdToken', profile.idToken)
    sessionStorage.setItem('firebaseUid', profile.uid)
  } catch {
    // ignore
  }
}

function storeAppEntry(profile: ExternalUserProfile): void {
  try {
    sessionStorage.setItem('brain-training-app-entry', 'true')
    localStorage.setItem('brain-training-app-entry', 'true')
    if (profile.clientSource) {
      sessionStorage.setItem('brain-training-client-source', profile.clientSource)
      localStorage.setItem('brain-training-client-source', profile.clientSource)
    }
  } catch {
    // ignore
  }
}

function storeLastExternalProfile(profile: ExternalUserProfile): void {
  try {
    const payload = JSON.stringify({
      receivedAt: new Date().toISOString(),
      profile,
    })
    localStorage.setItem('brain-training-last-external-profile', payload)
  } catch {
    // ignore
  }
}

function parseProfileFromQuery(): ExternalUserProfile | null {
  // Optional: ?externalProfile=base64url(json)
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('externalProfile')
    if (!raw) return null
    const json = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))))
    const parsed = JSON.parse(json) as ExternalUserProfile
    if (!parsed || parsed.provider !== 'firebase' || !parsed.uid) return null
    return parsed
  } catch {
    return null
  }
}

function normalizeClientSource(profile: ExternalUserProfile): string {
  return profile.clientSource || detectClientSource()
}

function normalizeBirthday(birthday: string): string {
  if (!birthday) return ''
  try {
    const parsed = new Date(birthday)
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString().split('T')[0] ?? birthday
    }
  } catch {
    // ignore
  }
  return birthday.split('T')[0] ?? birthday
}

async function applyExternalProfile(profile: ExternalUserProfile): Promise<void> {
  const userStore = useUserStore()
  storeIdToken(profile)
  storeAppEntry(profile)
  storeLastExternalProfile(profile)

  const clientSource = normalizeClientSource(profile)
  await userStore.loginWithExternalProfile({
    provider: profile.provider,
    uid: profile.uid,
    name: profile.name,
    birthday: normalizeBirthday(profile.birthday),
    educationYears: profile.educationYears,
    gender: profile.gender,
    clientSource,
  })

  const odId = userStore.currentUser?.id
  if (odId) {
    saveClientSourceForUser(odId, clientSource)
  }
}

function isTrustedMessage(event: MessageEvent): boolean {
  // In WebView, origin may be 'null'. We accept:
  // - same-origin (web)
  // - GitHub Pages host (production)
  // - null origin (native WebView)
  // Reject others by default.
  if (event.origin === window.location.origin) return true
  if (event.origin === 'https://will050512.github.io') return true
  if (event.origin === 'null') return true
  return false
}

export function initExternalAuthBridge(): void {
  if (typeof window === 'undefined') return

  // Expose imperative bridge API for Flutter:
  // `window.BrainTrainingBridge.setExternalProfile({ ... })`
  if (!window.BrainTrainingBridge) {
    window.BrainTrainingBridge = {
      setExternalProfile: async (profile: ExternalUserProfile) => {
        await applyExternalProfile(profile)
      },
    }
  }

  // Listen to postMessage channel:
  // window.postMessage({ type: 'brain-training/external-profile', payload: {...} }, '*')
  window.addEventListener('message', async (event: MessageEvent) => {
    try {
      if (!isTrustedMessage(event)) return
      const data = event.data as any
      if (!data || data.type !== 'brain-training/external-profile') return
      const payload = data.payload as ExternalUserProfile
      if (!payload) return
      storeLastExternalProfile(payload)
      await applyExternalProfile(payload)
    } catch (e) {
      console.error('External auth bridge failed', e)
    }
  })

  // Optional query bootstrap
  const qp = parseProfileFromQuery()
  if (qp) {
    applyExternalProfile(qp).catch(e => console.error('External profile query bootstrap failed', e))
  }
}

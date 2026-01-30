import type { User } from '@/types'
import { getDataConsent } from '@/services/db'
import { detectClientSource, loadClientSourceForUser } from '@/services/clientSource'
import { useSettingsStore } from '@/stores/settingsStore'
import { buildSheetAuthMeta, getSheetEndpoint, type SheetAuthMeta } from '@/services/sheetConfig'
import { normalizeTransferCode } from '@/services/userTransferCode'

const SHEET_ENDPOINT = getSheetEndpoint()
const USER_SYNC_KEY_PREFIX = 'sheetSyncedUser:'
const USER_SYNC_STATUS_KEY_PREFIX = 'sheetSyncStatusUser:'

type UserSyncStatus = {
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
}

const EMPTY_STATUS: UserSyncStatus = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
}

type UserSheetPayload = {
  action: 'upsertUsers'
  meta?: SheetAuthMeta
  userId: string
  name: string
  birthday: string
  educationYears: number
  gender: User['gender']
  transferCode?: string
  transferCodeUpdatedAt?: string
  clientSource?: string
  authProvider?: User['authProvider']
  createdAt: string
  lastActiveAt: string
  updatedAt: string
  profileVersion?: number
}

export function loadUserSyncStatus(odId: string): UserSyncStatus {
  try {
    const raw = localStorage.getItem(`${USER_SYNC_STATUS_KEY_PREFIX}${odId}`)
    if (!raw) return { ...EMPTY_STATUS }
    const parsed = JSON.parse(raw) as Partial<UserSyncStatus>
    return {
      lastAttemptAt: parsed.lastAttemptAt ?? null,
      lastSuccessAt: parsed.lastSuccessAt ?? null,
      lastErrorAt: parsed.lastErrorAt ?? null,
      lastErrorMessage: parsed.lastErrorMessage ?? null,
    }
  } catch {
    return { ...EMPTY_STATUS }
  }
}

function saveUserSyncStatus(odId: string, status: UserSyncStatus): void {
  try {
    localStorage.setItem(`${USER_SYNC_STATUS_KEY_PREFIX}${odId}`, JSON.stringify(status))
  } catch {
    // ignore
  }
}

function updateUserSyncStatus(odId: string, patch: Partial<UserSyncStatus>): void {
  const current = loadUserSyncStatus(odId)
  saveUserSyncStatus(odId, { ...current, ...patch })
}

function isBrowserOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  } catch {
    return true
  }
}

async function isAllowed(odId: string): Promise<boolean> {
  try {
    const consent = await getDataConsent(odId)
    if (!consent) return true
    return !!(consent.essentialConsent || consent.analyticsConsent)
  } catch {
    return true
  }
}

function loadUserSyncStamp(odId: string): string | null {
  try {
    return localStorage.getItem(`${USER_SYNC_KEY_PREFIX}${odId}`)
  } catch {
    return null
  }
}

function saveUserSyncStamp(odId: string, updatedAt: string): void {
  try {
    localStorage.setItem(`${USER_SYNC_KEY_PREFIX}${odId}`, updatedAt)
  } catch {
    // ignore
  }
}

function mapUser(user: User): UserSheetPayload {
  const updated = user.updatedAt ? new Date(user.updatedAt) : new Date()
  const created = user.createdAt ? new Date(user.createdAt) : updated
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : updated
  return {
    action: 'upsertUsers',
    userId: user.id,
    name: user.name,
    birthday: user.birthday,
    educationYears: user.educationYears ?? 0,
    gender: user.gender ?? 'unknown',
    transferCode: normalizeTransferCode(user.transferCode || ''),
    transferCodeUpdatedAt: user.transferCodeUpdatedAt ? new Date(user.transferCodeUpdatedAt).toISOString() : '',
    authProvider: user.authProvider ?? 'local',
    clientSource: user.clientSource || loadClientSourceForUser(user.id) || detectClientSource(),
    createdAt: created.toISOString(),
    lastActiveAt: lastActive.toISOString(),
    updatedAt: updated.toISOString(),
    profileVersion: user.profileVersion ?? 1,
  }
}

async function postToSheet(payload: UserSheetPayload): Promise<boolean> {
  try {
    try {
      if (!SHEET_ENDPOINT) return false
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('syncing')
    } catch {
      // ignore ui status update
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    const payloadWithMeta = payload.meta ? payload : { ...payload, meta: buildSheetAuthMeta() }
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payloadWithMeta),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('success')
    } catch {
      // ignore ui status update
    }
    return true
  } catch (error) {
    console.error('Failed to sync user profile', error)
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('error', error instanceof Error ? error.message : 'sync failed')
    } catch {
      // ignore ui status update
    }
    return false
  }
}

/**
 * 同步使用者基本資料到 Google Sheet（上傳/更新）
 * - 受 essentialConsent / analyticsConsent 控制
 * - 透過 updatedAt 做去重，避免重複寫入
 */
export async function syncUserProfileToSheet(user: User | null | undefined): Promise<void> {
  if (!user) return
  if (!SHEET_ENDPOINT) return
  if (!isBrowserOnline()) return
  if (!(await isAllowed(user.id))) return

  const updatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString()
  const lastUploaded = loadUserSyncStamp(user.id)
  if (lastUploaded && lastUploaded === updatedAt) return

  updateUserSyncStatus(user.id, { lastAttemptAt: new Date().toISOString() })
  const payload = mapUser(user)
  const ok = await postToSheet(payload)
  if (ok) {
    saveUserSyncStamp(user.id, updatedAt)
    updateUserSyncStatus(user.id, {
      lastSuccessAt: new Date().toISOString(),
      lastErrorAt: null,
      lastErrorMessage: null,
    })
  } else {
    updateUserSyncStatus(user.id, {
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: 'user profile sync failed',
    })
  }
}

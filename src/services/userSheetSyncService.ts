import type { User } from '@/types'
import { getDataConsent } from '@/services/db'
import { detectClientSource, loadClientSourceForUser } from '@/services/clientSource'

const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCLuyPiJL3Loqe6HHouu5pA3rmXns97fsIhC0SqNoFeI8mcKbfFYkn3O8m-sZa0oUO/exec'
const USER_SYNC_KEY_PREFIX = 'sheetSyncedUser:'

type UserSheetPayload = {
  action: 'upsertUsers'
  userId: string
  name: string
  birthday: string
  educationYears: number
  gender: User['gender']
  clientSource?: string
  authProvider?: User['authProvider']
  createdAt: string
  lastActiveAt: string
  updatedAt: string
  profileVersion?: number
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
    return !!consent?.analyticsConsent
  } catch {
    return false
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
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    })
    return true
  } catch (error) {
    console.error('Failed to sync user profile', error)
    return false
  }
}

/**
 * 同步使用者基本資料到 Google Sheet（上傳/更新）
 * - 受 analyticsConsent 控制
 * - 透過 updatedAt 做去重，避免重複寫入
 */
export async function syncUserProfileToSheet(user: User | null | undefined): Promise<void> {
  if (!user) return
  if (!isBrowserOnline()) return
  if (!(await isAllowed(user.id))) return

  const updatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString()
  const lastUploaded = loadUserSyncStamp(user.id)
  if (lastUploaded && lastUploaded === updatedAt) return

  const payload = mapUser(user)
  const ok = await postToSheet(payload)
  if (ok) {
    saveUserSyncStamp(user.id, updatedAt)
  }
}

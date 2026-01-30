const DELTA_FAILURE_THRESHOLD = 3
const DELTA_FAILURE_KEY_PREFIX = 'sheetDeltaFailCount:'
const DELTA_VERSION_KEY_PREFIX = 'sheetDeltaVersion:'

export type SyncVersionSnapshot = {
  appVersion: string
  sheetSchemaVersion: number
  sheetScoringVersion: number
  dataSchemaVersion: number
}

function getFailureKey(odId: string): string {
  return `${DELTA_FAILURE_KEY_PREFIX}${odId}`
}

function getVersionKey(odId: string): string {
  return `${DELTA_VERSION_KEY_PREFIX}${odId}`
}

export function loadDeltaFailureCount(odId: string): number {
  try {
    return Number(localStorage.getItem(getFailureKey(odId)) || 0)
  } catch {
    return 0
  }
}

export function incrementDeltaFailureCount(odId: string): number {
  try {
    const next = loadDeltaFailureCount(odId) + 1
    localStorage.setItem(getFailureKey(odId), String(next))
    return next
  } catch {
    return 0
  }
}

export function resetDeltaFailureCount(odId: string): void {
  try {
    localStorage.setItem(getFailureKey(odId), '0')
  } catch {
    // ignore
  }
}

export function shouldFallbackToFullRestore(odId: string): boolean {
  return loadDeltaFailureCount(odId) >= DELTA_FAILURE_THRESHOLD
}

function safeParseVersion(value: unknown): SyncVersionSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<SyncVersionSnapshot>
  if (
    typeof raw.appVersion !== 'string'
    || typeof raw.sheetSchemaVersion !== 'number'
    || typeof raw.sheetScoringVersion !== 'number'
    || typeof raw.dataSchemaVersion !== 'number'
  ) {
    return null
  }
  return {
    appVersion: raw.appVersion,
    sheetSchemaVersion: raw.sheetSchemaVersion,
    sheetScoringVersion: raw.sheetScoringVersion,
    dataSchemaVersion: raw.dataSchemaVersion,
  }
}

export function loadStoredSyncVersions(odId: string): SyncVersionSnapshot | null {
  try {
    const raw = localStorage.getItem(getVersionKey(odId))
    if (!raw) return null
    return safeParseVersion(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveStoredSyncVersions(odId: string, snapshot: SyncVersionSnapshot): void {
  try {
    localStorage.setItem(getVersionKey(odId), JSON.stringify(snapshot))
  } catch {
    // ignore
  }
}

export function hasVersionMismatch(odId: string, current: SyncVersionSnapshot): boolean {
  const stored = loadStoredSyncVersions(odId)
  if (!stored) return true
  return (
    stored.appVersion !== current.appVersion
    || stored.sheetSchemaVersion !== current.sheetSchemaVersion
    || stored.sheetScoringVersion !== current.sheetScoringVersion
    || stored.dataSchemaVersion !== current.dataSchemaVersion
  )
}

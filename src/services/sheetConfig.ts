const DEFAULT_SHEET_ENDPOINT = String(import.meta.env.VITE_SHEET_ENDPOINT || '').trim()
const DEFAULT_SHEET_SYNC_TOKEN = String(import.meta.env.VITE_SHEET_SYNC_TOKEN || '').trim()
const CLIENT_ID_STORAGE_KEY = 'sheetSyncClientId'

export type SheetAuthMeta = {
  clientId: string
  token?: string
  sentAt: string
}

function createClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getSheetEndpoint(): string {
  return DEFAULT_SHEET_ENDPOINT
}

export function getSheetSyncToken(): string {
  return DEFAULT_SHEET_SYNC_TOKEN
}

export function getSheetSyncClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) return existing
    const created = createClientId()
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, created)
    return created
  } catch {
    return createClientId()
  }
}

export function buildSheetAuthMeta(): SheetAuthMeta {
  const token = getSheetSyncToken()
  const meta: SheetAuthMeta = {
    clientId: getSheetSyncClientId(),
    sentAt: new Date().toISOString(),
  }
  if (token) meta.token = token
  return meta
}

export function appendSheetAuthParams(url: string): string {
  const token = getSheetSyncToken()
  const clientId = getSheetSyncClientId()
  if (!token && !clientId) return url
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  if (clientId) params.set('clientId', clientId)
  const serialized = params.toString()
  if (!serialized) return url
  return `${url}${url.includes('?') ? '&' : '?'}${serialized}`
}

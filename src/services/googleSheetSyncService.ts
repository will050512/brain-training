import type { GameGrade, GameSession, GameResult, StandardizedMetrics, TrackingData } from '@/types/game'
import { getGradeFromScore } from '@/types/game'
import { getDataConsent, getUserGameSessions } from '@/services/db'
import { detectClientSource, loadClientSourceForUser } from '@/services/clientSource'
import { useSettingsStore } from '@/stores/settingsStore'
import { buildSheetAuthMeta, getSheetEndpoint, type SheetAuthMeta } from '@/services/sheetConfig'

// 已部署的 Apps Script Web App
const SHEET_ENDPOINT = getSheetEndpoint()
const BACKFILL_THROTTLE_MS = 24 * 60 * 60 * 1000
const BACKFILL_KEY_PREFIX = 'sheetBackfillAt:'
const SYNCED_IDS_KEY_PREFIX = 'sheetSyncedSessionIds:'
const SESSION_HASH_KEY_PREFIX = 'sheetSessionHash:'
const MAX_SYNCED_IDS = 5000
const SHEET_SYNC_PROTOCOL_VERSION = 3
const SHEET_SCHEMA_VERSION = 1
const SHEET_SCORING_VERSION = 2
const SYNC_PROTOCOL_KEY_PREFIX = 'sheetSyncProtocol:'
const SYNC_STATUS_KEY_PREFIX = 'sheetSyncStatusSession:'

type SheetSyncStatus = {
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
}

const EMPTY_STATUS: SheetSyncStatus = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
}

type SheetTracking = TrackingData & {
  avgReactionTimeMs?: number
  avgThinkingTimeMs?: number
}

type SheetPayload = {
  action?: 'upsertGameResults'
  meta?: SheetAuthMeta
  protocolVersion?: number
  schemaVersion?: number
  scoringVersion?: number
  dataQuality?: 'ok' | 'warning'
  dataIssues?: string[]
  userId: string
  sessionId: string
  gameId: string
  difficulty: string
  subDifficulty?: number
  timestamp: string
  durationSec: number
  score: number
  grade?: string
  metrics: StandardizedMetrics
  tracking: SheetTracking
  bestScore?: number
  gameSpecific?: Record<string, unknown>
  displayStats?: unknown[]
  clientSource?: string
  authProvider?: string
}

export function loadSessionSyncStatus(odId: string): SheetSyncStatus {
  try {
    const raw = localStorage.getItem(`${SYNC_STATUS_KEY_PREFIX}${odId}`)
    if (!raw) return { ...EMPTY_STATUS }
    const parsed = JSON.parse(raw) as Partial<SheetSyncStatus>
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

function saveSessionSyncStatus(odId: string, status: SheetSyncStatus): void {
  try {
    localStorage.setItem(`${SYNC_STATUS_KEY_PREFIX}${odId}`, JSON.stringify(status))
  } catch {
    // ignore
  }
}

function updateSessionSyncStatus(odId: string, patch: Partial<SheetSyncStatus>): void {
  const current = loadSessionSyncStatus(odId)
  saveSessionSyncStatus(odId, { ...current, ...patch })
}

function clampScore0to100(value: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function toISOStringSafe(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

function isBrowserOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  } catch {
    return true
  }
}

async function isSheetSyncAllowed(odId: string): Promise<boolean> {
  try {
    const consent = await getDataConsent(odId)
    if (!consent) return true
    return !!(consent.essentialConsent || consent.analyticsConsent)
  } catch {
    return true
  }
}

function loadSyncedIds(odId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SYNCED_IDS_KEY_PREFIX}${odId}`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter(v => typeof v === 'string'))
  } catch {
    return new Set()
  }
}

function saveSyncedIds(odId: string, ids: Set<string>): void {
  try {
    const arr = Array.from(ids)
    const limited = arr.length > MAX_SYNCED_IDS ? arr.slice(arr.length - MAX_SYNCED_IDS) : arr
    localStorage.setItem(`${SYNCED_IDS_KEY_PREFIX}${odId}`, JSON.stringify(limited))
  } catch {
    // ignore
  }
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  const serialize = (val: unknown): unknown => {
    if (val === null || typeof val !== 'object') return val
    if (seen.has(val as object)) return null
    seen.add(val as object)
    if (Array.isArray(val)) {
      return val.map(item => serialize(item))
    }
    const obj = val as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      out[key] = serialize(obj[key])
    }
    return out
  }
  try {
    return JSON.stringify(serialize(value))
  } catch {
    return ''
  }
}

function buildSessionHashKey(odId: string, sessionId: string): string {
  return `${SESSION_HASH_KEY_PREFIX}${odId}:${sessionId}`
}

function loadSessionHash(odId: string, sessionId: string): string | null {
  try {
    return localStorage.getItem(buildSessionHashKey(odId, sessionId))
  } catch {
    return null
  }
}

function saveSessionHash(odId: string, sessionId: string, hash: string): void {
  try {
    localStorage.setItem(buildSessionHashKey(odId, sessionId), hash)
  } catch {
    // ignore
  }
}

function ensureSyncProtocolVersion(odId: string): void {
  // 當同步協議/Apps Script 升級時，避免沿用舊的「已同步 sessionId」而導致資料無法被修正（例如早期上傳造成 score>100 或空 gameId）。
  try {
    const key = `${SYNC_PROTOCOL_KEY_PREFIX}${odId}`
    const current = Number(localStorage.getItem(key) || 0)
    if (current === SHEET_SYNC_PROTOCOL_VERSION) return
    localStorage.setItem(key, String(SHEET_SYNC_PROTOCOL_VERSION))
    localStorage.removeItem(`${SYNCED_IDS_KEY_PREFIX}${odId}`)
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i)
      if (k && k.startsWith(SESSION_HASH_KEY_PREFIX)) {
        localStorage.removeItem(k)
      }
    }
    localStorage.removeItem(`${BACKFILL_KEY_PREFIX}${odId}`)
  } catch {
    // ignore
  }
}

function markSessionSynced(odId: string, sessionId: string): void {
  if (!sessionId) return
  const ids = loadSyncedIds(odId)
  ids.add(sessionId)
  saveSyncedIds(odId, ids)
}

function isSessionSynced(odId: string, sessionId: string): boolean {
  if (!sessionId) return false
  return loadSyncedIds(odId).has(sessionId)
}

function ensureTracking(result: GameResult): TrackingData {
  const base: TrackingData = result.tracking ?? {
    correctCount: result.correctCount || 0,
    wrongCount: Math.max(0, (result.totalCount || 0) - (result.correctCount || 0)),
  }
  const correctCount = Number.isFinite(base.correctCount) ? base.correctCount : result.correctCount || 0
  const wrongCount = Number.isFinite(base.wrongCount)
    ? base.wrongCount
    : Math.max(0, (result.totalCount || 0) - correctCount)
  const totalActions = Number.isFinite(base.totalActions)
    ? base.totalActions
    : (Number.isFinite(result.totalCount)
        ? result.totalCount
        : correctCount + wrongCount + (base.missedCount || 0))
  const safeTotalActions = totalActions ?? 0
  const missedCount = Number.isFinite(base.missedCount)
    ? base.missedCount
    : Math.max(0, safeTotalActions - correctCount - wrongCount)

  return {
    correctCount,
    wrongCount,
    missedCount,
    maxCombo: Number.isFinite(base.maxCombo) ? base.maxCombo : 0,
    avgReactionTime: Number.isFinite(base.avgReactionTime) ? base.avgReactionTime : (result.avgReactionTime || 0),
    avgThinkingTime: Number.isFinite(base.avgThinkingTime) ? base.avgThinkingTime : undefined,
    totalActions: safeTotalActions,
  }
}

function ensureMetrics(result: GameResult, tracking: TrackingData): StandardizedMetrics {
  const base: StandardizedMetrics = result.metrics ?? {
    completion: 0,
    accuracy: 0,
    speed: 0,
    efficiency: 0,
  }
  const totalCount = Number.isFinite(result.totalCount)
    ? result.totalCount
    : tracking.totalActions || (tracking.correctCount + tracking.wrongCount + (tracking.missedCount || 0))
  const derivedAccuracy = totalCount > 0 ? tracking.correctCount / totalCount : 0
  return {
    completion: Number.isFinite(base.completion) ? base.completion : (totalCount > 0 ? tracking.correctCount / totalCount : 0),
    accuracy: Number.isFinite(base.accuracy) ? base.accuracy : derivedAccuracy,
    speed: Number.isFinite(base.speed) ? base.speed : 50,
    efficiency: Number.isFinite(base.efficiency) ? base.efficiency : 50,
  }
}

function ensureGrade(result: GameResult): GameGrade {
  return result.grade ?? getGradeFromScore(clampScore0to100(result.score))
}

function collectDataIssues(session: GameSession, metrics: StandardizedMetrics): string[] {
  const issues: string[] = []
  if (!session.id) issues.push('missing_session_id')
  if (!session.odId) issues.push('missing_user_id')
  if (!session.gameId) issues.push('missing_game_id')
  const score = Number(session.result?.score)
  if (!Number.isFinite(score)) issues.push('invalid_score')
  if (Number.isFinite(score) && (score < 0 || score > 100)) issues.push('score_out_of_range')
  if (!Number.isFinite(metrics.accuracy)) issues.push('invalid_accuracy')
  if (Number.isFinite(metrics.accuracy) && (metrics.accuracy < 0 || metrics.accuracy > 1)) issues.push('accuracy_out_of_range')
  if (!Number.isFinite(metrics.completion)) issues.push('invalid_completion')
  if (Number.isFinite(metrics.completion) && (metrics.completion < 0 || metrics.completion > 1)) issues.push('completion_out_of_range')
  if (!Number.isFinite(metrics.speed)) issues.push('invalid_speed')
  if (Number.isFinite(metrics.speed) && (metrics.speed < 0 || metrics.speed > 100)) issues.push('speed_out_of_range')
  if (!Number.isFinite(metrics.efficiency)) issues.push('invalid_efficiency')
  if (Number.isFinite(metrics.efficiency) && (metrics.efficiency < 0 || metrics.efficiency > 100)) issues.push('efficiency_out_of_range')
  return issues
}

function mapSessionToPayload(session: GameSession, bestScore?: number): SheetPayload {
  const { result } = session
  const tracking = ensureTracking(result)
  const metrics = ensureMetrics(result, tracking)
  const score = clampScore0to100(result.score)
  const dataIssues = collectDataIssues(session, metrics)

  const inferredClientSource =
    (result.gameSpecific as any)?.clientSource ||
    loadClientSourceForUser(session.odId) ||
    detectClientSource()
  const inferredAuthProvider = (result.gameSpecific as any)?.authProvider || 'local'
  const baseGameSpecific = (result.gameSpecific && typeof result.gameSpecific === 'object')
    ? result.gameSpecific
    : {}
  const gameSpecific = {
    ...baseGameSpecific,
    mode: baseGameSpecific.mode ?? result.mode ?? 'free',
  }

  return {
    action: 'upsertGameResults',
    protocolVersion: SHEET_SYNC_PROTOCOL_VERSION,
    schemaVersion: SHEET_SCHEMA_VERSION,
    scoringVersion: SHEET_SCORING_VERSION,
    dataQuality: dataIssues.length > 0 ? 'warning' : 'ok',
    dataIssues,
    userId: session.odId,
    sessionId: session.id,
    // 舊資料有機會 result.gameId 為空；以 session.gameId 作為保底，避免 Sheet 出現空 gameId
    gameId: result.gameId || session.gameId,
    difficulty: result.difficulty,
    subDifficulty: result.subDifficulty,
    timestamp: toISOStringSafe(result.timestamp),
    durationSec: Number.isFinite(Number(result.duration)) ? Number(result.duration) : 0,
    score,
    grade: ensureGrade({ ...result, score }),
    metrics,
    tracking: {
      ...tracking,
      avgReactionTimeMs: tracking.avgReactionTime,
      avgThinkingTimeMs: tracking.avgThinkingTime,
    },
    bestScore,
    gameSpecific,
    displayStats: result.displayStats,
    clientSource: inferredClientSource,
    authProvider: inferredAuthProvider,
  }
}

function shouldSyncSession(odId: string, sessionId: string, payload: SheetPayload): boolean {
  if (!sessionId) return false
  const hash = stableStringify(payload)
  if (!hash) return true
  const previous = loadSessionHash(odId, sessionId)
  return previous !== hash
}

async function postToSheet(
  payload: SheetPayload | { action: 'upsertGameResults'; protocolVersion?: number; items: SheetPayload[]; meta?: SheetAuthMeta }
): Promise<boolean> {
  try {
    if (!SHEET_ENDPOINT) return false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    const payloadWithMeta = payload.meta ? payload : { ...payload, meta: buildSheetAuthMeta() }
    // Apps Script Web App 通常無法自訂 CORS header，若用 application/json 會觸發 preflight 而導致瀏覽器直接擋下。
    // 因此使用 no-cors + 不指定 Content-Type，讓請求能送達（回應為 opaque，無法讀取內容）。
    const res = await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payloadWithMeta),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    // no-cors 會回 opaque response，無法檢查 status；只要 fetch 沒丟錯就視為已送達。
    if ((res as any)?.type === 'opaque') return true

    return true
  } catch (error) {
    console.error('Failed to sync to Google Sheet', error)
    return false
  }
}

/**
 * 單筆遊戲結果即時同步（完成遊戲時呼叫）
 */
export async function syncSessionToSheet(session: GameSession, bestScore?: number): Promise<void> {
  if (!SHEET_ENDPOINT) return
  if (!isBrowserOnline()) return
  ensureSyncProtocolVersion(session.odId)
  if (!(await isSheetSyncAllowed(session.odId))) return
  try {
    const settingsStore = useSettingsStore()
    settingsStore.setSyncUiStatus('syncing')
  } catch {
    // ignore ui status update
  }
  updateSessionSyncStatus(session.odId, { lastAttemptAt: new Date().toISOString() })
  const payload = mapSessionToPayload(session, bestScore)
  if (!shouldSyncSession(session.odId, session.id, payload)) return
  const ok = await postToSheet(payload)
  if (ok) {
    markSessionSynced(session.odId, session.id)
    const hash = stableStringify(payload)
    if (hash) saveSessionHash(session.odId, session.id, hash)
    updateSessionSyncStatus(session.odId, {
      lastSuccessAt: new Date().toISOString(),
      lastErrorAt: null,
      lastErrorMessage: null,
    })
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('success')
    } catch {
      // ignore ui status update
    }
  } else {
    updateSessionSyncStatus(session.odId, {
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: 'session sync failed',
    })
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('error', 'session sync failed')
    } catch {
      // ignore ui status update
    }
  }
}

/**
 * 舊用戶回填：把本機 IndexedDB 中所有會話同步到 Sheet
 */
export async function backfillUserSessionsToSheet(odId: string): Promise<void> {
  try {
    if (!SHEET_ENDPOINT) return
    if (!isBrowserOnline()) return
    ensureSyncProtocolVersion(odId)
    if (!(await isSheetSyncAllowed(odId))) return
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('syncing')
    } catch {
      // ignore ui status update
    }

    // 節流：避免每次啟動都回填（避免重複寫入/浪費流量）
    try {
      const key = `${BACKFILL_KEY_PREFIX}${odId}`
      const last = Number(localStorage.getItem(key) || 0)
      if (last > 0 && Date.now() - last < BACKFILL_THROTTLE_MS) return
      localStorage.setItem(key, String(Date.now()))
    } catch {
      // localStorage 不可用時忽略節流
    }

    const sessions = await getUserGameSessions(odId)
    const items = sessions
      .map(session => mapSessionToPayload(session))
      .filter(item => shouldSyncSession(odId, item.sessionId, item))

    // 優先批次回填（需 Apps Script 支援 { items: [...] }）
    const batchSize = 50
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      updateSessionSyncStatus(odId, { lastAttemptAt: new Date().toISOString() })
      const ok = await postToSheet({
        action: 'upsertGameResults',
        protocolVersion: SHEET_SYNC_PROTOCOL_VERSION,
        items: batch,
        meta: buildSheetAuthMeta(),
      })
      if (ok) {
        for (const item of batch) {
          markSessionSynced(odId, item.sessionId)
          const hash = stableStringify(item)
          if (hash) saveSessionHash(odId, item.sessionId, hash)
        }
        updateSessionSyncStatus(odId, {
          lastSuccessAt: new Date().toISOString(),
          lastErrorAt: null,
          lastErrorMessage: null,
        })
        try {
          const settingsStore = useSettingsStore()
          settingsStore.setSyncUiStatus('success')
        } catch {
          // ignore ui status update
        }
      } else {
        updateSessionSyncStatus(odId, {
          lastErrorAt: new Date().toISOString(),
          lastErrorMessage: 'backfill sync failed',
        })
        try {
          const settingsStore = useSettingsStore()
          settingsStore.setSyncUiStatus('error', 'backfill sync failed')
        } catch {
          // ignore ui status update
        }
        break
      }
    }
  } catch (error) {
    console.error('Backfill to Google Sheet failed', error)
    updateSessionSyncStatus(odId, {
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: 'backfill sync error',
    })
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('error', 'backfill sync error')
    } catch {
      // ignore ui status update
    }
  }
}

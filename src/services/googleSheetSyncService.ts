import type { GameGrade, GameSession, GameResult, StandardizedMetrics, TrackingData } from '@/types/game'
import { getGradeFromScore } from '@/types/game'
import { getDataConsent, getUserGameSessions } from '@/services/db'
import { detectClientSource, loadClientSourceForUser } from '@/services/clientSource'

// 已部署的 Apps Script Web App
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCLuyPiJL3Loqe6HHouu5pA3rmXns97fsIhC0SqNoFeI8mcKbfFYkn3O8m-sZa0oUO/exec'
const BACKFILL_THROTTLE_MS = 24 * 60 * 60 * 1000
const BACKFILL_KEY_PREFIX = 'sheetBackfillAt:'
const SYNCED_IDS_KEY_PREFIX = 'sheetSyncedSessionIds:'
const MAX_SYNCED_IDS = 5000
const SHEET_SYNC_PROTOCOL_VERSION = 2
const SYNC_PROTOCOL_KEY_PREFIX = 'sheetSyncProtocol:'

type SheetTracking = TrackingData & {
  avgReactionTimeMs?: number
  avgThinkingTimeMs?: number
}

type SheetPayload = {
  action?: 'upsertGameResults'
  protocolVersion?: number
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
  // 以「分析數據收集同意」作為遠端同步的開關，避免未同意就上傳造成信任問題。
  try {
    const consent = await getDataConsent(odId)
    return !!consent?.analyticsConsent
  } catch {
    return false
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

function ensureSyncProtocolVersion(odId: string): void {
  // 當同步協議/Apps Script 升級時，避免沿用舊的「已同步 sessionId」而導致資料無法被修正（例如早期上傳造成 score>100 或空 gameId）。
  try {
    const key = `${SYNC_PROTOCOL_KEY_PREFIX}${odId}`
    const current = Number(localStorage.getItem(key) || 0)
    if (current === SHEET_SYNC_PROTOCOL_VERSION) return
    localStorage.setItem(key, String(SHEET_SYNC_PROTOCOL_VERSION))
    localStorage.removeItem(`${SYNCED_IDS_KEY_PREFIX}${odId}`)
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

function ensureMetrics(result: GameResult): StandardizedMetrics {
  return result.metrics ?? {
    completion: result.totalCount > 0 ? result.correctCount / result.totalCount : 0,
    accuracy: result.accuracy,
    speed: 50,
    efficiency: 50,
  }
}

function ensureTracking(result: GameResult): TrackingData {
  return result.tracking ?? {
    correctCount: result.correctCount,
    wrongCount: Math.max(0, result.totalCount - result.correctCount),
    avgReactionTime: result.avgReactionTime,
  }
}

function ensureGrade(result: GameResult): GameGrade {
  return result.grade ?? getGradeFromScore(clampScore0to100(result.score))
}

function mapSessionToPayload(session: GameSession, bestScore?: number): SheetPayload {
  const { result } = session
  const metrics = ensureMetrics(result)
  const tracking = ensureTracking(result)
  const score = clampScore0to100(result.score)

  const inferredClientSource =
    (result.gameSpecific as any)?.clientSource ||
    loadClientSourceForUser(session.odId) ||
    detectClientSource()
  const inferredAuthProvider = (result.gameSpecific as any)?.authProvider || 'local'

  return {
    action: 'upsertGameResults',
    protocolVersion: SHEET_SYNC_PROTOCOL_VERSION,
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
    gameSpecific: result.gameSpecific,
    displayStats: result.displayStats,
    clientSource: inferredClientSource,
    authProvider: inferredAuthProvider,
  }
}

async function postToSheet(payload: SheetPayload | { action: 'upsertGameResults'; protocolVersion?: number; items: SheetPayload[] }): Promise<boolean> {
  try {
    // Apps Script Web App 通常無法自訂 CORS header，若用 application/json 會觸發 preflight 而導致瀏覽器直接擋下。
    // 因此使用 no-cors + 不指定 Content-Type，讓請求能送達（回應為 opaque，無法讀取內容）。
    const res = await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    })

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
  if (!isBrowserOnline()) return
  ensureSyncProtocolVersion(session.odId)
  if (!(await isSheetSyncAllowed(session.odId))) return
  if (isSessionSynced(session.odId, session.id)) return
  const payload = mapSessionToPayload(session, bestScore)
  const ok = await postToSheet(payload)
  if (ok) {
    markSessionSynced(session.odId, session.id)
  }
}

/**
 * 舊用戶回填：把本機 IndexedDB 中所有會話同步到 Sheet
 */
export async function backfillUserSessionsToSheet(odId: string): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    ensureSyncProtocolVersion(odId)
    if (!(await isSheetSyncAllowed(odId))) return

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
      .filter(s => !isSessionSynced(odId, s.id))
      .map(session => mapSessionToPayload(session))

    // 優先批次回填（需 Apps Script 支援 { items: [...] }）
    const batchSize = 50
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const ok = await postToSheet({ action: 'upsertGameResults', protocolVersion: SHEET_SYNC_PROTOCOL_VERSION, items: batch })
      if (ok) for (const item of batch) markSessionSynced(odId, item.sessionId)
    }
  } catch (error) {
    console.error('Backfill to Google Sheet failed', error)
  }
}

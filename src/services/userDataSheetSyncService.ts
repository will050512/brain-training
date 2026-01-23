import type { User, UserSettings, UserStats, DataConsentOptions } from '@/types'
import type { MiniCogResult } from '@/services/miniCogService'
import {
  getUser,
  getUserSettings,
  getUserStats,
  getDataConsent,
  getUserMiniCogResults,
  getUserDailyTrainingSessions,
  getUserBaselineAssessments,
  getUserDeclineAlerts,
  getUserNutritionRecommendations,
  getUnsyncedBehaviorLogs,
  markBehaviorLogsSynced,
  type DailyTrainingSession,
  type BaselineAssessment,
  type DeclineAlert,
  type BehaviorLog,
  type NutritionRecommendationRecord,
} from '@/services/db'
import { detectClientSource, loadClientSourceForUser } from '@/services/clientSource'
import { useSettingsStore } from '@/stores/settingsStore'
import { getSheetEndpoint } from '@/services/sheetConfig'

const SHEET_ENDPOINT = getSheetEndpoint()
const FULL_SYNC_KEY_PREFIX = 'sheetFullSyncAt:'
const FULL_SYNC_ITEM_KEY_PREFIX = 'sheetFullSyncItem:'
const FULL_SYNC_THROTTLE_MS = 24 * 60 * 60 * 1000
const SCHEMA_VERSION = 1

type SheetAction =
  | 'upsertUsers'
  | 'upsertUserSettings'
  | 'upsertUserStats'
  | 'upsertDataConsent'
  | 'upsertMiniCogResults'
  | 'upsertDailyTrainingSessions'
  | 'upsertBaselineAssessments'
  | 'upsertDeclineAlerts'
  | 'upsertNutritionRecommendations'
  | 'upsertBehaviorLogs'

function isBrowserOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  } catch {
    return true
  }
}

function isBehaviorTrackingEnabled(): boolean {
  try {
    const settingsStore = useSettingsStore()
    return settingsStore.enableBehaviorTracking
  } catch {
    return true
  }
}

function isBasicSyncAllowed(consent?: DataConsentOptions): boolean {
  if (!consent) return true
  return !!(consent.essentialConsent || consent.analyticsConsent)
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
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

function buildItemSyncKey(action: SheetAction, id: string): string {
  return `${FULL_SYNC_ITEM_KEY_PREFIX}${action}:${id}`
}

function loadItemSyncHash(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function saveItemSyncHash(key: string, hash: string): void {
  try {
    localStorage.setItem(key, hash)
  } catch {
    // ignore
  }
}

function filterSyncItems<T>(
  action: SheetAction,
  items: T[],
  getId: (item: T) => string,
  getHashSource?: (item: T) => unknown
): Array<{ id: string; hash: string; item: T }> {
  const result: Array<{ id: string; hash: string; item: T }> = []
  for (const item of items) {
    const id = getId(item)
    if (!id) continue
    const hash = stableStringify(getHashSource ? getHashSource(item) : item)
    if (!hash) {
      result.push({ id, hash: String(Date.now()), item })
      continue
    }
    const key = buildItemSyncKey(action, id)
    const prev = loadItemSyncHash(key)
    if (prev && prev === hash) continue
    result.push({ id, hash, item })
  }
  return result
}

function buildUserPayload(user: User) {
  const updated = user.updatedAt ? new Date(user.updatedAt) : new Date()
  const created = user.createdAt ? new Date(user.createdAt) : updated
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : updated
  return {
    action: 'upsertUsers' as const,
    userId: user.id,
    name: user.name,
    birthday: user.birthday,
    educationYears: user.educationYears ?? 0,
    gender: user.gender ?? 'unknown',
    transferCode: user.transferCode ?? '',
    transferCodeUpdatedAt: user.transferCodeUpdatedAt ? toIso(user.transferCodeUpdatedAt) : '',
    authProvider: user.authProvider ?? 'local',
    clientSource: user.clientSource || loadClientSourceForUser(user.id) || detectClientSource(),
    createdAt: created.toISOString(),
    lastActiveAt: lastActive.toISOString(),
    updatedAt: updated.toISOString(),
    profileVersion: user.profileVersion ?? 1,
  }
}

function buildUserSettingsPayload(settings: UserSettings) {
  return {
    action: 'upsertUserSettings' as const,
    odId: settings.odId,
    soundEnabled: settings.soundEnabled,
    musicEnabled: settings.musicEnabled,
    soundVolume: settings.soundVolume,
    musicVolume: settings.musicVolume,
    hasSeenWelcome: settings.hasSeenWelcome,
    updatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildUserStatsPayload(stats: UserStats) {
  return {
    action: 'upsertUserStats' as const,
    odId: stats.odId,
    totalGamesPlayed: stats.totalGamesPlayed,
    totalPlayTime: stats.totalPlayTime,
    averageScore: stats.averageScore,
    bestScores: stats.bestScores,
    gamePlayCounts: stats.gamePlayCounts ?? {},
    favoriteGameId: stats.favoriteGameId ?? '',
    lastPlayedAt: stats.lastPlayedAt ? toIso(stats.lastPlayedAt) : '',
    streak: stats.streak,
    updatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildDataConsentPayload(consent: DataConsentOptions) {
  return {
    action: 'upsertDataConsent' as const,
    odId: consent.odId,
    essentialConsent: consent.essentialConsent,
    analyticsConsent: consent.analyticsConsent,
    behaviorTrackingConsent: consent.behaviorTrackingConsent,
    detailedBehaviorConsent: consent.detailedBehaviorConsent,
    medicalSharingConsent: consent.medicalSharingConsent,
    consentTimestamp: consent.consentTimestamp,
    consentVersion: consent.consentVersion,
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildMiniCogPayload(result: MiniCogResult, allowClockImage: boolean) {
  const selfAssessment = result.clockDrawing.selfAssessment
  const clockSelfAssessmentScore = [
    selfAssessment.hasCompleteCircle,
    selfAssessment.hasCorrectNumbers,
    selfAssessment.hasCorrectHands,
  ].filter(Boolean).length

  return {
    action: 'upsertMiniCogResults' as const,
    id: result.id,
    odId: result.odId,
    totalScore: result.totalScore,
    wordRecallScore: result.wordRecall.score,
    clockDrawingScore: result.clockDrawing.score,
    clockSelfAssessmentScore,
    atRisk: result.atRisk,
    duration: result.duration,
    completedAt: result.completedAt,
    wordSetLocale: result.wordRecall.wordSet.locale,
    wordsUsed: result.wordRecall.wordSet.words,
    clockImageData: allowClockImage ? (result.clockDrawing.imageData || '') : '',
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildDailyTrainingSessionPayload(session: DailyTrainingSession) {
  return {
    id: session.id,
    odId: session.odId,
    date: session.date,
    plannedGames: session.plannedGames,
    completedGames: session.completedGames,
    interrupted: session.interrupted,
    startedAt: session.startedAt,
    completedAt: session.completedAt || '',
    totalDuration: session.totalDuration,
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildBaselineAssessmentPayload(assessment: BaselineAssessment) {
  return {
    id: assessment.id,
    odId: assessment.odId,
    assessedAt: assessment.assessedAt,
    cognitiveScores: assessment.cognitiveScores,
    suggestedDifficulties: assessment.suggestedDifficulties,
    overallLevel: assessment.overallLevel,
    gamesPlayed: assessment.gamesPlayed,
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildDeclineAlertPayload(alert: DeclineAlert) {
  return {
    id: alert.id,
    odId: alert.odId,
    dimension: alert.dimension,
    alertType: alert.alertType,
    previousScore: alert.previousScore,
    currentScore: alert.currentScore,
    changePercent: alert.changePercent,
    detectedAt: alert.detectedAt,
    acknowledged: alert.acknowledged,
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildNutritionRecommendationPayload(rec: NutritionRecommendationRecord) {
  return {
    id: rec.id,
    odId: rec.odId,
    triggerId: rec.triggerId,
    supplementType: rec.supplementType,
    dimension: rec.dimension,
    priority: rec.priority,
    reason: rec.reason,
    recommendedAt: rec.recommendedAt,
    viewed: rec.viewed,
    dismissed: rec.dismissed,
    schemaVersion: SCHEMA_VERSION,
  }
}

function buildBehaviorLogPayload(log: BehaviorLog) {
  return {
    id: log.id,
    odId: log.odId,
    gameId: log.gameId,
    sessionId: log.sessionId,
    timestamp: log.timestamp,
    eventType: log.eventType,
    data: log.data,
    synced: log.synced,
    schemaVersion: SCHEMA_VERSION,
  }
}

async function postToSheet(payload: { action: SheetAction; items: unknown[] }): Promise<boolean> {
  try {
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('syncing')
    } catch {
      // ignore ui status update
    }
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    })
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('success')
    } catch {
      // ignore ui status update
    }
    return true
  } catch (error) {
    console.error('Failed to sync to Google Sheet', error)
    try {
      const settingsStore = useSettingsStore()
      settingsStore.setSyncUiStatus('error', error instanceof Error ? error.message : 'sync failed')
    } catch {
      // ignore ui status update
    }
    return false
  }
}

async function postInBatchesWithCache<T>(
  action: SheetAction,
  items: Array<{ id: string; hash: string; item: T }>,
  batchSize = 50
): Promise<boolean> {
  if (items.length === 0) return true
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const ok = await postToSheet({ action, items: batch.map(entry => entry.item) })
    if (!ok) return false
    for (const entry of batch) {
      saveItemSyncHash(buildItemSyncKey(action, entry.id), entry.hash)
    }
  }
  return true
}

async function postInBatchesNoCache(action: SheetAction, items: unknown[], batchSize = 100): Promise<boolean> {
  if (items.length === 0) return true
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const ok = await postToSheet({ action, items: batch })
    if (!ok) return false
  }
  return true
}

function shouldThrottleFullSync(odId: string): boolean {
  try {
    const key = `${FULL_SYNC_KEY_PREFIX}${odId}`
    const last = Number(localStorage.getItem(key) || 0)
    if (last > 0 && Date.now() - last < FULL_SYNC_THROTTLE_MS) return true
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // ignore throttling issues
  }
  return false
}

export async function syncMiniCogResultToSheet(result: MiniCogResult): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(result.odId)
    if (!isBasicSyncAllowed(consent)) return
    const allowClockImage = !!consent?.behaviorTrackingConsent
    const items = filterSyncItems(
      'upsertMiniCogResults',
      [buildMiniCogPayload(result, allowClockImage)],
      item => item.id
    )
    await postInBatchesWithCache('upsertMiniCogResults', items, 1)
  } catch (error) {
    console.error('Mini-Cog sheet sync failed', error)
  }
}

export async function syncUserSettingsToSheet(settings: UserSettings): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(settings.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertUserSettings',
      [buildUserSettingsPayload(settings)],
      item => item.odId,
      item => ({ ...item, updatedAt: '' })
    )
    await postInBatchesWithCache('upsertUserSettings', items, 1)
  } catch (error) {
    console.error('User settings sheet sync failed', error)
  }
}

export async function syncUserStatsToSheet(stats: UserStats): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(stats.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertUserStats',
      [buildUserStatsPayload(stats)],
      item => item.odId,
      item => ({ ...item, updatedAt: '' })
    )
    await postInBatchesWithCache('upsertUserStats', items, 1)
  } catch (error) {
    console.error('User stats sheet sync failed', error)
  }
}

export async function syncDailyTrainingSessionToSheet(session: DailyTrainingSession): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(session.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertDailyTrainingSessions',
      [buildDailyTrainingSessionPayload(session)],
      item => item.id
    )
    await postInBatchesWithCache('upsertDailyTrainingSessions', items, 1)
  } catch (error) {
    console.error('Daily training sheet sync failed', error)
  }
}

export async function syncBaselineAssessmentToSheet(assessment: BaselineAssessment): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(assessment.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertBaselineAssessments',
      [buildBaselineAssessmentPayload(assessment)],
      item => item.id
    )
    await postInBatchesWithCache('upsertBaselineAssessments', items, 1)
  } catch (error) {
    console.error('Baseline assessment sheet sync failed', error)
  }
}

export async function syncDeclineAlertToSheet(alert: DeclineAlert): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(alert.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertDeclineAlerts',
      [buildDeclineAlertPayload(alert)],
      item => item.id
    )
    await postInBatchesWithCache('upsertDeclineAlerts', items, 1)
  } catch (error) {
    console.error('Decline alert sheet sync failed', error)
  }
}

export async function syncNutritionRecommendationToSheet(rec: NutritionRecommendationRecord): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    const consent = await getDataConsent(rec.odId)
    if (!isBasicSyncAllowed(consent)) return
    const items = filterSyncItems(
      'upsertNutritionRecommendations',
      [buildNutritionRecommendationPayload(rec)],
      item => item.id
    )
    await postInBatchesWithCache('upsertNutritionRecommendations', items, 1)
  } catch (error) {
    console.error('Nutrition recommendation sheet sync failed', error)
  }
}

export async function syncBehaviorLogsToSheet(logs: BehaviorLog[]): Promise<void> {
  try {
    if (!isBehaviorTrackingEnabled()) {
      console.info('[Sync] Skipped: behavior tracking disabled.')
      return
    }
    if (!isBrowserOnline()) return
    if (logs.length === 0) return
    const odId = logs[0]?.odId
    if (!odId) return
    const consent = await getDataConsent(odId)
    if (!consent) return
    if (!consent.behaviorTrackingConsent || !consent.detailedBehaviorConsent) return
    const payloads = logs
      .filter(log => log.odId === odId && !log.synced)
      .map(buildBehaviorLogPayload)
    const items = filterSyncItems('upsertBehaviorLogs', payloads, item => item.id)
    if (items.length === 0) return
    const ok = await postInBatchesWithCache('upsertBehaviorLogs', items, 100)
    if (ok) {
      await markBehaviorLogsSynced(items.map(item => item.id))
    }
  } catch (error) {
    console.error('Behavior logs sheet sync failed', error)
  }
}

export async function backfillAllUserDataToSheet(
  odId: string,
  options?: { force?: boolean }
): Promise<void> {
  try {
    if (!isBrowserOnline()) return
    if (!options?.force && shouldThrottleFullSync(odId)) return

    const consent = await getDataConsent(odId)
    if (consent) {
      const items = filterSyncItems(
        'upsertDataConsent',
        [buildDataConsentPayload(consent)],
        item => item.odId
      )
      await postInBatchesWithCache('upsertDataConsent', items, 1)
    }

    if (!isBasicSyncAllowed(consent)) return

    const user = await getUser(odId)
    if (user) {
      const items = filterSyncItems(
        'upsertUsers',
        [buildUserPayload(user)],
        item => item.userId
      )
      await postInBatchesWithCache('upsertUsers', items, 1)
    }

    const settings = await getUserSettings(odId)
    if (settings) {
    const items = filterSyncItems(
      'upsertUserSettings',
      [buildUserSettingsPayload(settings)],
      item => item.odId,
      item => ({ ...item, updatedAt: '' })
    )
      await postInBatchesWithCache('upsertUserSettings', items, 1)
    }

    const stats = await getUserStats(odId)
    if (stats) {
    const items = filterSyncItems(
      'upsertUserStats',
      [buildUserStatsPayload(stats)],
      item => item.odId,
      item => ({ ...item, updatedAt: '' })
    )
      await postInBatchesWithCache('upsertUserStats', items, 1)
    }

    const miniCogResults = await getUserMiniCogResults(odId)
    if (miniCogResults.length > 0) {
      const allowClockImage = !!consent?.behaviorTrackingConsent
      const items = filterSyncItems(
        'upsertMiniCogResults',
        miniCogResults.map(result => buildMiniCogPayload(result, allowClockImage)),
        item => item.id
      )
      await postInBatchesWithCache('upsertMiniCogResults', items)
    }

    const dailyTrainingSessions = await getUserDailyTrainingSessions(odId)
    if (dailyTrainingSessions.length > 0) {
      const items = filterSyncItems(
        'upsertDailyTrainingSessions',
        dailyTrainingSessions.map(session => ({
          id: session.id,
          odId: session.odId,
          date: session.date,
          plannedGames: session.plannedGames,
          completedGames: session.completedGames,
          interrupted: session.interrupted,
          startedAt: session.startedAt,
          completedAt: session.completedAt || '',
          totalDuration: session.totalDuration,
          schemaVersion: SCHEMA_VERSION,
        })),
        item => item.id
      )
      await postInBatchesWithCache('upsertDailyTrainingSessions', items)
    }

    const baselineAssessments = await getUserBaselineAssessments(odId)
    if (baselineAssessments.length > 0) {
      const items = filterSyncItems(
        'upsertBaselineAssessments',
        baselineAssessments.map(assessment => ({
          id: assessment.id,
          odId: assessment.odId,
          assessedAt: assessment.assessedAt,
          cognitiveScores: assessment.cognitiveScores,
          suggestedDifficulties: assessment.suggestedDifficulties,
          overallLevel: assessment.overallLevel,
          gamesPlayed: assessment.gamesPlayed,
          schemaVersion: SCHEMA_VERSION,
        })),
        item => item.id
      )
      await postInBatchesWithCache('upsertBaselineAssessments', items)
    }

    const declineAlerts = await getUserDeclineAlerts(odId)
    if (declineAlerts.length > 0) {
      const items = filterSyncItems(
        'upsertDeclineAlerts',
        declineAlerts.map(alert => ({
          id: alert.id,
          odId: alert.odId,
          dimension: alert.dimension,
          alertType: alert.alertType,
          previousScore: alert.previousScore,
          currentScore: alert.currentScore,
          changePercent: alert.changePercent,
          detectedAt: alert.detectedAt,
          acknowledged: alert.acknowledged,
          schemaVersion: SCHEMA_VERSION,
        })),
        item => item.id
      )
      await postInBatchesWithCache('upsertDeclineAlerts', items)
    }

    const nutritionRecommendations = await getUserNutritionRecommendations(odId)
    if (nutritionRecommendations.length > 0) {
      const items = filterSyncItems(
        'upsertNutritionRecommendations',
        nutritionRecommendations.map(rec => ({
          id: rec.id,
          odId: rec.odId,
          triggerId: rec.triggerId,
          supplementType: rec.supplementType,
          dimension: rec.dimension,
          priority: rec.priority,
          reason: rec.reason,
          recommendedAt: rec.recommendedAt,
          viewed: rec.viewed,
          dismissed: rec.dismissed,
          schemaVersion: SCHEMA_VERSION,
        })),
        item => item.id
      )
      await postInBatchesWithCache('upsertNutritionRecommendations', items)
    }

    if (consent?.behaviorTrackingConsent && consent?.detailedBehaviorConsent) {
      const behaviorLogs = await getUnsyncedBehaviorLogs()
      if (behaviorLogs.length > 0) {
        const items = behaviorLogs
          .filter(log => log.odId === odId)
          .map(log => ({
            id: log.id,
            odId: log.odId,
            gameId: log.gameId,
            sessionId: log.sessionId,
            timestamp: log.timestamp,
            eventType: log.eventType,
            data: log.data,
            synced: log.synced,
            schemaVersion: SCHEMA_VERSION,
          }))
        if (items.length > 0) {
          const ok = await postInBatchesNoCache('upsertBehaviorLogs', items)
          if (ok) {
            await markBehaviorLogsSynced(items.map(item => item.id))
          }
        }
      }
    }
  } catch (error) {
    console.error('Full user data sheet sync failed', error)
  }
}

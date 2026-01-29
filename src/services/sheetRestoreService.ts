import type { User, UserSettings, UserStats, DataConsentOptions } from '@/types'
import type { GameResult, GameSession, Difficulty, SubDifficulty, StandardizedMetrics, TrackingData } from '@/types/game'
import type { MiniCogResult } from '@/services/miniCogService'
import { getMMSECorrelation } from '@/services/miniCogService'
import type {
  DailyTrainingSession,
  BaselineAssessment,
  DeclineAlert,
  BehaviorLog,
  NutritionRecommendationRecord,
} from '@/services/db'
import {
  getUser,
  saveUser,
  saveUserSettings,
  saveUserStats,
  saveDataConsent,
  saveGameSessions,
  saveMiniCogResults,
  saveDailyTrainingSessions,
  saveBaselineAssessments,
  saveDeclineAlerts,
  saveBehaviorLogs,
  saveNutritionRecommendations,
} from '@/services/db'
import { calculateCognitiveScoresFromResult } from '@/services/scoreCalculator'
import { getGradeFromScore } from '@/types/game'
import { appendSheetAuthParams, getSheetEndpoint } from '@/services/sheetConfig'
import { normalizeBirthdayInput } from '@/utils/birthday'

const SHEET_ENDPOINT = getSheetEndpoint()
const RESTORE_THROTTLE_MS = 5 * 60 * 1000
const RESTORE_KEY_PREFIX = 'sheetRestoreAt:'
const DELTA_STAMP_KEY_PREFIX = 'sheetDeltaAt:'

const DEFAULT_SNAPSHOT_LIMITS = {
  gameResults: 20,
  dailyTrainingSessions: 3,
  miniCogResults: 2,
  baselineAssessments: 1,
  declineAlerts: 3,
  nutritionRecommendations: 5,
}

type RestoreOptions = {
  force?: boolean
}

type SnapshotOptions = RestoreOptions & {
  gameResults?: number
  dailyTrainingSessions?: number
  miniCogResults?: number
  baselineAssessments?: number
  declineAlerts?: number
  nutritionRecommendations?: number
}

type DeltaOptions = RestoreOptions & {
  fallbackToFull?: boolean
}

type RestoreSummary = {
  users: number
  userSettings: number
  userStats: number
  dataConsent: number
  gameSessions: number
  miniCogResults: number
  dailyTrainingSessions: number
  baselineAssessments: number
  declineAlerts: number
  nutritionRecommendations: number
  behaviorLogs: number
}

function isBrowserOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  } catch {
    return true
  }
}

function shouldThrottleRestore(odId: string): boolean {
  try {
    const key = `${RESTORE_KEY_PREFIX}${odId}`
    const last = Number(localStorage.getItem(key) || 0)
    if (last > 0 && Date.now() - last < RESTORE_THROTTLE_MS) return true
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // ignore throttling issues
  }
  return false
}

function loadDeltaStamp(odId: string): string | null {
  try {
    return localStorage.getItem(`${DELTA_STAMP_KEY_PREFIX}${odId}`)
  } catch {
    return null
  }
}

function saveDeltaStamp(odId: string, stamp: string): void {
  try {
    localStorage.setItem(`${DELTA_STAMP_KEY_PREFIX}${odId}`, stamp)
  } catch {
    // ignore
  }
}

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  return typeof value === 'string' ? value : String(value)
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
  }
  if (typeof value === 'number') return value !== 0
  return fallback
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value
  const d = new Date(value as string)
  if (!Number.isNaN(d.getTime())) return d
  return new Date()
}

function hasKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

function parseJsonNumberMap(value: unknown): Record<string, number> {
  const raw = parseJsonObject(value)
  const output: Record<string, number> = {}
  for (const key of Object.keys(raw)) {
    const n = Number(raw[key])
    if (Number.isFinite(n)) output[key] = n
  }
  return output
}

function parseJsonArray(value: unknown): unknown[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseDifficulty(value: unknown): Difficulty {
  const raw = asString(value, 'easy')
  if (raw === 'medium' || raw === 'hard') return raw
  return 'easy'
}

function parseSubDifficulty(value: unknown): SubDifficulty | undefined {
  const n = Math.round(asNumber(value, 0))
  if (n === 1 || n === 2 || n === 3) return n
  return undefined
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    if (!SHEET_ENDPOINT) return null
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchUserProfile(odId: string): Promise<Record<string, unknown> | null> {
  const url = appendSheetAuthParams(
    `${SHEET_ENDPOINT}?action=getUser&userId=${encodeURIComponent(odId)}`
  )
  const payload = await fetchJson(url)
  if (!payload?.ok || !payload.user) return null
  return payload.user as Record<string, unknown>
}

// 新增：透過轉移碼獲取使用者資料
export async function getUserByTransferCode(code: string): Promise<User | null> {
  if (!code || code.length !== 6) return null
  const url = appendSheetAuthParams(
    `${SHEET_ENDPOINT}?action=getUserByTransferCode&code=${encodeURIComponent(code)}`
  )
  const payload = await fetchJson(url)
  if (!payload?.ok || !payload.user) return null
  return mapUserProfile(payload.user)
}

async function fetchSingleItem(action: 'getUserSettings' | 'getUserStats' | 'getDataConsent', odId: string): Promise<Record<string, unknown> | null> {
  const url = appendSheetAuthParams(
    `${SHEET_ENDPOINT}?action=${action}&userId=${encodeURIComponent(odId)}`
  )
  const payload = await fetchJson(url)
  if (!payload?.ok || !payload.item) return null
  return payload.item as Record<string, unknown>
}

async function fetchPagedList(urlBuilder: (cursor: number) => string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let cursor: number | null = 2
  let guard = 0
  while (cursor && guard < 200) {
    const payload = await fetchJson(urlBuilder(cursor))
    if (!payload?.ok) break
    const batch = Array.isArray(payload.items) ? payload.items : []
    items.push(...(batch as Record<string, unknown>[]))
    cursor = payload.nextCursor ?? null
    guard++
  }
  return items
}

async function fetchGameResults(odId: string): Promise<Record<string, unknown>[]> {
  return fetchPagedList(cursor => (
    appendSheetAuthParams(
      `${SHEET_ENDPOINT}?action=listGameResults&userId=${encodeURIComponent(odId)}&limit=500&cursor=${cursor}`
    )
  ))
}

async function fetchUserSnapshot(odId: string, options?: SnapshotOptions): Promise<Record<string, unknown> | null> {
  const gameResults = options?.gameResults ?? DEFAULT_SNAPSHOT_LIMITS.gameResults
  const dailyTrainingSessions = options?.dailyTrainingSessions ?? DEFAULT_SNAPSHOT_LIMITS.dailyTrainingSessions
  const miniCogResults = options?.miniCogResults ?? DEFAULT_SNAPSHOT_LIMITS.miniCogResults
  const baselineAssessments = options?.baselineAssessments ?? DEFAULT_SNAPSHOT_LIMITS.baselineAssessments
  const declineAlerts = options?.declineAlerts ?? DEFAULT_SNAPSHOT_LIMITS.declineAlerts
  const nutritionRecommendations = options?.nutritionRecommendations ?? DEFAULT_SNAPSHOT_LIMITS.nutritionRecommendations

  const url = appendSheetAuthParams(
    `${SHEET_ENDPOINT}?action=getUserSnapshot&userId=${encodeURIComponent(odId)}` +
    `&limitGameResults=${gameResults}` +
    `&limitDailyTraining=${dailyTrainingSessions}` +
    `&limitMiniCog=${miniCogResults}` +
    `&limitBaseline=${baselineAssessments}` +
    `&limitDeclineAlerts=${declineAlerts}` +
    `&limitNutrition=${nutritionRecommendations}`
  )
  const payload = await fetchJson(url)
  if (!payload?.ok) return null
  return payload as Record<string, unknown>
}

async function fetchUserDelta(odId: string, since: string): Promise<Record<string, unknown> | null> {
  const url = appendSheetAuthParams(
    `${SHEET_ENDPOINT}?action=getUserDelta&userId=${encodeURIComponent(odId)}&since=${encodeURIComponent(since)}`
  )
  const payload = await fetchJson(url)
  if (!payload?.ok) return null
  return payload as Record<string, unknown>
}

async function fetchListByUser(type: string, odId: string): Promise<Record<string, unknown>[]> {
  return fetchPagedList(cursor => (
    appendSheetAuthParams(
      `${SHEET_ENDPOINT}?action=listByUser&type=${encodeURIComponent(type)}&userId=${encodeURIComponent(odId)}&limit=500&cursor=${cursor}`
    )
  ))
}

function mapUserProfile(raw: Record<string, unknown>): User {
  return {
    id: asString(raw.userId),
    name: asString(raw.name),
    birthday: normalizeBirthdayInput(asString(raw.birthday)),
    educationYears: asNumber(raw.educationYears, 0),
    gender: (asString(raw.gender) as User['gender']) || 'unknown',
    transferCode: asString(raw.transferCode || ''),
    transferCodeUpdatedAt: raw.transferCodeUpdatedAt ? asDate(raw.transferCodeUpdatedAt) : undefined,
    clientSource: raw.clientSource ? asString(raw.clientSource) : undefined,
    authProvider: raw.authProvider === 'firebase' ? 'firebase' : 'local',
    createdAt: asDate(raw.createdAt),
    lastActiveAt: asDate(raw.lastActiveAt),
    updatedAt: raw.updatedAt ? asDate(raw.updatedAt) : undefined,
    profileVersion: asNumber(raw.profileVersion, 1),
  }
}

function mapUserSettings(raw: Record<string, unknown>, odId: string): UserSettings {
  return {
    odId,
    soundEnabled: asBoolean(raw.soundEnabled, false),
    musicEnabled: asBoolean(raw.musicEnabled, false),
    soundVolume: asNumber(raw.soundVolume, 0),
    musicVolume: asNumber(raw.musicVolume, 0),
    hasSeenWelcome: asBoolean(raw.hasSeenWelcome, false),
  }
}

function mapUserStats(raw: Record<string, unknown>, odId: string): UserStats {
  return {
    odId,
    totalGamesPlayed: asNumber(raw.totalGamesPlayed, 0),
    totalPlayTime: asNumber(raw.totalPlayTime, 0),
    averageScore: asNumber(raw.averageScore, 0),
    bestScores: parseJsonNumberMap(raw.bestScores),
    gamePlayCounts: parseJsonNumberMap(raw.gamePlayCounts),
    favoriteGameId: asString(raw.favoriteGameId, '') || null,
    lastPlayedAt: raw.lastPlayedAt ? asDate(raw.lastPlayedAt) : null,
    streak: asNumber(raw.streak, 0),
  }
}

function mapDataConsent(raw: Record<string, unknown>, odId: string): DataConsentOptions {
  return {
    odId,
    essentialConsent: asBoolean(raw.essentialConsent, true),
    analyticsConsent: asBoolean(raw.analyticsConsent, false),
    behaviorTrackingConsent: asBoolean(raw.behaviorTrackingConsent, false),
    detailedBehaviorConsent: asBoolean(raw.detailedBehaviorConsent, false),
    medicalSharingConsent: asBoolean(raw.medicalSharingConsent, false),
    consentTimestamp: asString(raw.consentTimestamp, ''),
    consentVersion: asString(raw.consentVersion, ''),
  }
}

function mapGameResult(raw: Record<string, unknown>): GameSession | null {
  const odId = asString(raw.userId)
  const sessionId = asString(raw.sessionId)
  const gameId = asString(raw.gameId)
  if (!odId || !sessionId || !gameId) return null

  const difficulty = parseDifficulty(raw.difficulty)
  const subDifficulty = parseSubDifficulty(raw.subDifficulty)
  const metricsCompletionRaw = hasKey(raw, 'metrics.completion') ? raw['metrics.completion'] : raw.completion
  const metricsAccuracyRaw = hasKey(raw, 'metrics.accuracy') ? raw['metrics.accuracy'] : raw.accuracy
  const metricsSpeedRaw = hasKey(raw, 'metrics.speed') ? raw['metrics.speed'] : raw.speed
  const metricsEfficiencyRaw = hasKey(raw, 'metrics.efficiency') ? raw['metrics.efficiency'] : raw.efficiency

  const metrics: StandardizedMetrics = {
    completion: asNumber(metricsCompletionRaw, 0),
    accuracy: asNumber(metricsAccuracyRaw, 0),
    speed: asNumber(metricsSpeedRaw, 0),
    efficiency: asNumber(metricsEfficiencyRaw, 0),
  }

  const trackingCorrect = asNumber(raw['tracking.correctCount'] ?? raw.correctCount, 0)
  const trackingWrong = asNumber(raw['tracking.wrongCount'] ?? raw.wrongCount, 0)
  const trackingMissed = asNumber(raw['tracking.missedCount'] ?? raw.missedCount, 0)
  const trackingMaxCombo = asNumber(raw['tracking.maxCombo'] ?? raw.maxCombo, 0)
  const trackingAvgReaction = asNumber(
    raw['tracking.avgReactionTimeMs'] ?? raw['tracking.avgReactionTime'] ?? raw.avgReactionTime,
    0
  )
  const trackingAvgThinking = asNumber(
    raw['tracking.avgThinkingTimeMs'] ?? raw['tracking.avgThinkingTime'] ?? raw.avgThinkingTime,
    0
  )
  const trackingTotalActions = asNumber(raw['tracking.totalActions'] ?? raw.totalActions, 0)
  const totalCount = trackingTotalActions > 0
    ? trackingTotalActions
    : Math.max(trackingCorrect + trackingWrong + trackingMissed, trackingCorrect + trackingWrong)

  const accuracy = Number.isFinite(metrics.accuracy) && metrics.accuracy >= 0
    ? metrics.accuracy
    : (totalCount > 0 ? trackingCorrect / totalCount : 0)

  const score = Math.max(0, Math.min(100, Math.round(asNumber(raw.score, 0))))
  const gradeRaw = asString(raw.grade, '')
  const grade = gradeRaw ? gradeRaw : getGradeFromScore(score)

  const tracking: TrackingData = {
    correctCount: trackingCorrect,
    wrongCount: trackingWrong,
    missedCount: trackingMissed,
    maxCombo: trackingMaxCombo,
    avgReactionTime: trackingAvgReaction,
    avgThinkingTime: trackingAvgThinking,
    totalActions: trackingTotalActions,
  }

  const gameSpecific = parseJsonObject(raw.gameSpecific)
  const modeFromSpecific = gameSpecific.mode === 'daily' || gameSpecific.mode === 'free'
    ? gameSpecific.mode
    : undefined

  const result: GameResult = {
    gameId,
    difficulty,
    subDifficulty,
    score,
    maxScore: 100,
    correctCount: trackingCorrect,
    totalCount,
    accuracy,
    avgReactionTime: trackingAvgReaction,
    duration: asNumber(raw.durationSec, 0),
    timestamp: asDate(raw.timestamp),
    mode: modeFromSpecific ?? 'free',
    grade: grade as GameResult['grade'],
    metrics,
    tracking,
    gameSpecific,
    displayStats: parseJsonArray(raw.displayStats) as GameResult['displayStats'],
  }

  const cognitiveScores = calculateCognitiveScoresFromResult(gameId, result)

  return {
    id: sessionId,
    odId,
    gameId,
    difficulty,
    subDifficulty,
    result,
    cognitiveScores,
    createdAt: result.timestamp,
  }
}

function mapMiniCogResult(raw: Record<string, unknown>, odId: string): MiniCogResult | null {
  const id = asString(raw.id)
  if (!id) return null
  const clockSelfScore = Math.round(asNumber(raw.clockSelfAssessmentScore, 0))
  const wordLocale = asString(raw.wordSetLocale) as MiniCogResult['wordRecall']['wordSet']['locale']
  const wordList = parseJsonArray(raw.wordsUsed) as string[]
  const clockImage = asString(raw.clockImageData)
  const duration = asNumber(raw.duration, 0)
  const wordRecallScore = asNumber(raw.wordRecallScore, 0)
  const clockDrawingScore = asNumber(raw.clockDrawingScore, 0)
  const totalScore = asNumber(raw.totalScore, 0)
  return {
    id,
    odId,
    totalScore,
    atRisk: asBoolean(raw.atRisk, false),
    duration,
    completedAt: asString(raw.completedAt),
    wordRecall: {
      score: wordRecallScore,
      wordSet: {
        locale: wordLocale || 'zh-TW',
        words: (wordList.length >= 3 ? wordList.slice(0, 3) : ['', '', '']) as [string, string, string],
        setIndex: 0,
      },
      immediateRecall: [],
      delayedRecall: [],
    },
    clockDrawing: {
      score: clockDrawingScore,
      imageData: clockImage || undefined,
      selfAssessment: {
        hasCompleteCircle: clockSelfScore >= 1,
        hasCorrectNumbers: clockSelfScore >= 2,
        hasCorrectHands: clockSelfScore >= 3,
      },
      targetTime: '00:00',
      completionTime: duration * 1000,
    },
    mmseCorrelation: getMMSECorrelation(totalScore),
  } as MiniCogResult
}

function mapDailyTrainingSession(raw: Record<string, unknown>, odId: string): DailyTrainingSession | null {
  const id = asString(raw.id)
  if (!id) return null
  return {
    id,
    odId,
    date: asString(raw.date),
    plannedGames: parseJsonArray(raw.plannedGames) as DailyTrainingSession['plannedGames'],
    completedGames: parseJsonArray(raw.completedGames) as string[],
    interrupted: asBoolean(raw.interrupted, false),
    startedAt: asString(raw.startedAt),
    completedAt: raw.completedAt ? asString(raw.completedAt) : undefined,
    totalDuration: asNumber(raw.totalDuration, 0),
  }
}

function mapBaselineAssessment(raw: Record<string, unknown>, odId: string): BaselineAssessment | null {
  const id = asString(raw.id)
  if (!id) return null
  return {
    id,
    odId,
    assessedAt: asString(raw.assessedAt),
    cognitiveScores: parseJsonObject(raw.cognitiveScores) as BaselineAssessment['cognitiveScores'],
    suggestedDifficulties: parseJsonObject(raw.suggestedDifficulties) as BaselineAssessment['suggestedDifficulties'],
    overallLevel: asString(raw.overallLevel) as BaselineAssessment['overallLevel'],
    gamesPlayed: parseJsonArray(raw.gamesPlayed) as BaselineAssessment['gamesPlayed'],
  }
}

function mapDeclineAlert(raw: Record<string, unknown>, odId: string): DeclineAlert | null {
  const id = asString(raw.id)
  if (!id) return null
  return {
    id,
    odId,
    dimension: asString(raw.dimension),
    alertType: asString(raw.alertType) as DeclineAlert['alertType'],
    previousScore: asNumber(raw.previousScore, 0),
    currentScore: asNumber(raw.currentScore, 0),
    changePercent: asNumber(raw.changePercent, 0),
    detectedAt: asString(raw.detectedAt),
    acknowledged: asBoolean(raw.acknowledged, false),
  }
}

function mapNutritionRecommendation(raw: Record<string, unknown>, odId: string): NutritionRecommendationRecord | null {
  const id = asString(raw.id)
  if (!id) return null
  return {
    id,
    odId,
    triggerId: asString(raw.triggerId),
    supplementType: asString(raw.supplementType),
    dimension: asString(raw.dimension),
    priority: asString(raw.priority) as NutritionRecommendationRecord['priority'],
    reason: asString(raw.reason),
    recommendedAt: asString(raw.recommendedAt),
    viewed: asBoolean(raw.viewed, false),
    dismissed: asBoolean(raw.dismissed, false),
  }
}

function mapBehaviorLog(raw: Record<string, unknown>, odId: string): BehaviorLog | null {
  const id = asString(raw.id)
  if (!id) return null
  return {
    id,
    odId,
    gameId: asString(raw.gameId),
    sessionId: asString(raw.sessionId),
    timestamp: asString(raw.timestamp),
    eventType: asString(raw.eventType) as BehaviorLog['eventType'],
    data: parseJsonObject(raw.data),
    synced: true,
  }
}

export async function restoreAllUserDataFromSheet(
  odId: string,
  options?: RestoreOptions
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    users: 0,
    userSettings: 0,
    userStats: 0,
    dataConsent: 0,
    gameSessions: 0,
    miniCogResults: 0,
    dailyTrainingSessions: 0,
    baselineAssessments: 0,
    declineAlerts: 0,
    nutritionRecommendations: 0,
    behaviorLogs: 0,
  }

  if (!odId) return summary
  if (!SHEET_ENDPOINT) return summary
  if (!isBrowserOnline()) return summary
  if (!options?.force && shouldThrottleRestore(odId)) return summary

  const [userRaw, settingsRaw, statsRaw, consentRaw] = await Promise.all([
    fetchUserProfile(odId),
    fetchSingleItem('getUserSettings', odId),
    fetchSingleItem('getUserStats', odId),
    fetchSingleItem('getDataConsent', odId),
  ])

  if (userRaw) {
    const incoming = mapUserProfile(userRaw)
    const existing = await getUser(odId)
    if (!existing) {
      await saveUser(incoming)
      summary.users += 1
    } else {
      const incomingUpdated = incoming.updatedAt ? incoming.updatedAt.getTime() : 0
      const existingUpdated = existing.updatedAt ? existing.updatedAt.getTime() : 0
      if (incomingUpdated >= existingUpdated) {
        await saveUser(incoming)
        summary.users += 1
      }
    }
  }

  if (settingsRaw) {
    await saveUserSettings(mapUserSettings(settingsRaw, odId))
    summary.userSettings += 1
  }

  if (statsRaw) {
    await saveUserStats(mapUserStats(statsRaw, odId))
    summary.userStats += 1
  }

  if (consentRaw) {
    await saveDataConsent(mapDataConsent(consentRaw, odId))
    summary.dataConsent += 1
  }

  const gameResults = await fetchGameResults(odId)
  const sessionsToSave = new Map<string, GameSession>()
  for (const raw of gameResults) {
    const mapped = mapGameResult(raw)
    if (!mapped) continue
    sessionsToSave.set(mapped.id, mapped)
  }
  if (sessionsToSave.size > 0) {
    await saveGameSessions(Array.from(sessionsToSave.values()))
    summary.gameSessions += sessionsToSave.size
  }

  const miniCogResults = await fetchListByUser('miniCogResults', odId)
  const mappedMiniCog: MiniCogResult[] = []
  for (const raw of miniCogResults) {
    const mapped = mapMiniCogResult(raw, odId)
    if (!mapped) continue
    mappedMiniCog.push(mapped)
  }
  if (mappedMiniCog.length > 0) {
    await saveMiniCogResults(mappedMiniCog)
    summary.miniCogResults += mappedMiniCog.length
  }

  const dailyTrainingSessions = await fetchListByUser('dailyTrainingSessions', odId)
  const mappedDaily: DailyTrainingSession[] = []
  for (const raw of dailyTrainingSessions) {
    const mapped = mapDailyTrainingSession(raw, odId)
    if (!mapped) continue
    mappedDaily.push(mapped)
  }
  if (mappedDaily.length > 0) {
    await saveDailyTrainingSessions(mappedDaily)
    summary.dailyTrainingSessions += mappedDaily.length
  }

  const baselineAssessments = await fetchListByUser('baselineAssessments', odId)
  const mappedBaselines: BaselineAssessment[] = []
  for (const raw of baselineAssessments) {
    const mapped = mapBaselineAssessment(raw, odId)
    if (!mapped) continue
    mappedBaselines.push(mapped)
  }
  if (mappedBaselines.length > 0) {
    await saveBaselineAssessments(mappedBaselines)
    summary.baselineAssessments += mappedBaselines.length
  }

  const declineAlerts = await fetchListByUser('declineAlerts', odId)
  const mappedAlerts: DeclineAlert[] = []
  for (const raw of declineAlerts) {
    const mapped = mapDeclineAlert(raw, odId)
    if (!mapped) continue
    mappedAlerts.push(mapped)
  }
  if (mappedAlerts.length > 0) {
    await saveDeclineAlerts(mappedAlerts)
    summary.declineAlerts += mappedAlerts.length
  }

  const nutritionRecommendations = await fetchListByUser('nutritionRecommendations', odId)
  const mappedRecommendations: NutritionRecommendationRecord[] = []
  for (const raw of nutritionRecommendations) {
    const mapped = mapNutritionRecommendation(raw, odId)
    if (!mapped) continue
    mappedRecommendations.push(mapped)
  }
  if (mappedRecommendations.length > 0) {
    await saveNutritionRecommendations(mappedRecommendations)
    summary.nutritionRecommendations += mappedRecommendations.length
  }

  const behaviorLogs = await fetchListByUser('behaviorLogs', odId)
  const mappedLogs: BehaviorLog[] = []
  for (const raw of behaviorLogs) {
    const mapped = mapBehaviorLog(raw, odId)
    if (mapped) mappedLogs.push(mapped)
  }
  if (mappedLogs.length > 0) {
    await saveBehaviorLogs(mappedLogs)
    summary.behaviorLogs += mappedLogs.length
  }

  saveDeltaStamp(odId, new Date().toISOString())
  return summary
}

export async function restoreUserSnapshotFromSheet(
  odId: string,
  options?: SnapshotOptions
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    users: 0,
    userSettings: 0,
    userStats: 0,
    dataConsent: 0,
    gameSessions: 0,
    miniCogResults: 0,
    dailyTrainingSessions: 0,
    baselineAssessments: 0,
    declineAlerts: 0,
    nutritionRecommendations: 0,
    behaviorLogs: 0,
  }

  if (!odId) return summary
  if (!SHEET_ENDPOINT) return summary
  if (!isBrowserOnline()) return summary

  const payload = await fetchUserSnapshot(odId, options)
  if (!payload) return summary

  const snapshotAt = asString(payload.snapshotAt || payload.serverTime, new Date().toISOString())

  const userRaw = payload.user as Record<string, unknown> | undefined
  if (userRaw) {
    const incoming = mapUserProfile(userRaw)
    const existing = await getUser(odId)
    if (!existing) {
      await saveUser(incoming)
      summary.users += 1
    } else {
      const incomingUpdated = incoming.updatedAt ? incoming.updatedAt.getTime() : 0
      const existingUpdated = existing.updatedAt ? existing.updatedAt.getTime() : 0
      if (incomingUpdated >= existingUpdated) {
        await saveUser(incoming)
        summary.users += 1
      }
    }
  }

  const settingsRaw = payload.settings as Record<string, unknown> | undefined
  if (settingsRaw) {
    await saveUserSettings(mapUserSettings(settingsRaw, odId))
    summary.userSettings += 1
  }

  const statsRaw = payload.stats as Record<string, unknown> | undefined
  if (statsRaw) {
    await saveUserStats(mapUserStats(statsRaw, odId))
    summary.userStats += 1
  }

  const consentRaw = payload.consent as Record<string, unknown> | undefined
  if (consentRaw) {
    await saveDataConsent(mapDataConsent(consentRaw, odId))
    summary.dataConsent += 1
  }

  const rawGameResults = Array.isArray(payload.recentGameResults)
    ? (payload.recentGameResults as Record<string, unknown>[])
    : []
  if (rawGameResults.length > 0) {
    const sessionsToSave = new Map<string, GameSession>()
    for (const raw of rawGameResults) {
      if (asString(raw.userId) !== odId) continue
      const mapped = mapGameResult(raw)
      if (!mapped) continue
      sessionsToSave.set(mapped.id, mapped)
    }
    if (sessionsToSave.size > 0) {
      await saveGameSessions(Array.from(sessionsToSave.values()))
      summary.gameSessions += sessionsToSave.size
    }
  }

  const rawMiniCog = Array.isArray(payload.miniCogResults)
    ? (payload.miniCogResults as Record<string, unknown>[])
    : []
  if (rawMiniCog.length > 0) {
    const mappedMiniCog: MiniCogResult[] = []
    for (const raw of rawMiniCog) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapMiniCogResult(raw, odId)
      if (mapped) mappedMiniCog.push(mapped)
    }
    if (mappedMiniCog.length > 0) {
      await saveMiniCogResults(mappedMiniCog)
      summary.miniCogResults += mappedMiniCog.length
    }
  }

  const rawDaily = Array.isArray(payload.dailyTrainingSessions)
    ? (payload.dailyTrainingSessions as Record<string, unknown>[])
    : []
  if (rawDaily.length > 0) {
    const mappedDaily: DailyTrainingSession[] = []
    for (const raw of rawDaily) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapDailyTrainingSession(raw, odId)
      if (mapped) mappedDaily.push(mapped)
    }
    if (mappedDaily.length > 0) {
      await saveDailyTrainingSessions(mappedDaily)
      summary.dailyTrainingSessions += mappedDaily.length
    }
  }

  const rawBaselines = Array.isArray(payload.baselineAssessments)
    ? (payload.baselineAssessments as Record<string, unknown>[])
    : []
  if (rawBaselines.length > 0) {
    const mappedBaselines: BaselineAssessment[] = []
    for (const raw of rawBaselines) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapBaselineAssessment(raw, odId)
      if (mapped) mappedBaselines.push(mapped)
    }
    if (mappedBaselines.length > 0) {
      await saveBaselineAssessments(mappedBaselines)
      summary.baselineAssessments += mappedBaselines.length
    }
  }

  const rawAlerts = Array.isArray(payload.declineAlerts)
    ? (payload.declineAlerts as Record<string, unknown>[])
    : []
  if (rawAlerts.length > 0) {
    const mappedAlerts: DeclineAlert[] = []
    for (const raw of rawAlerts) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapDeclineAlert(raw, odId)
      if (mapped) mappedAlerts.push(mapped)
    }
    if (mappedAlerts.length > 0) {
      await saveDeclineAlerts(mappedAlerts)
      summary.declineAlerts += mappedAlerts.length
    }
  }

  const rawNutrition = Array.isArray(payload.nutritionRecommendations)
    ? (payload.nutritionRecommendations as Record<string, unknown>[])
    : []
  if (rawNutrition.length > 0) {
    const mappedNutrition: NutritionRecommendationRecord[] = []
    for (const raw of rawNutrition) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapNutritionRecommendation(raw, odId)
      if (mapped) mappedNutrition.push(mapped)
    }
    if (mappedNutrition.length > 0) {
      await saveNutritionRecommendations(mappedNutrition)
      summary.nutritionRecommendations += mappedNutrition.length
    }
  }

  saveDeltaStamp(odId, snapshotAt)
  return summary
}

export async function restoreUserDeltaFromSheet(
  odId: string,
  options?: DeltaOptions
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    users: 0,
    userSettings: 0,
    userStats: 0,
    dataConsent: 0,
    gameSessions: 0,
    miniCogResults: 0,
    dailyTrainingSessions: 0,
    baselineAssessments: 0,
    declineAlerts: 0,
    nutritionRecommendations: 0,
    behaviorLogs: 0,
  }

  if (!odId) return summary
  if (!SHEET_ENDPOINT) return summary
  if (!isBrowserOnline()) return summary

  const since = loadDeltaStamp(odId)
  if (!since) {
    if (options?.fallbackToFull === false) return summary
    return restoreAllUserDataFromSheet(odId, { force: true })
  }

  const payload = await fetchUserDelta(odId, since)
  if (!payload) return summary

  const serverTime = asString(payload.serverTime, new Date().toISOString())

  const userRaw = payload.user as Record<string, unknown> | undefined
  if (userRaw) {
    const incoming = mapUserProfile(userRaw)
    const existing = await getUser(odId)
    if (!existing) {
      await saveUser(incoming)
      summary.users += 1
    } else {
      const incomingUpdated = incoming.updatedAt ? incoming.updatedAt.getTime() : 0
      const existingUpdated = existing.updatedAt ? existing.updatedAt.getTime() : 0
      if (incomingUpdated >= existingUpdated) {
        await saveUser(incoming)
        summary.users += 1
      }
    }
  }

  const settingsRaw = payload.settings as Record<string, unknown> | undefined
  if (settingsRaw) {
    await saveUserSettings(mapUserSettings(settingsRaw, odId))
    summary.userSettings += 1
  }

  const statsRaw = payload.stats as Record<string, unknown> | undefined
  if (statsRaw) {
    await saveUserStats(mapUserStats(statsRaw, odId))
    summary.userStats += 1
  }

  const consentRaw = payload.consent as Record<string, unknown> | undefined
  if (consentRaw) {
    await saveDataConsent(mapDataConsent(consentRaw, odId))
    summary.dataConsent += 1
  }

  const rawGameResults = Array.isArray(payload.gameResults)
    ? (payload.gameResults as Record<string, unknown>[])
    : []
  if (rawGameResults.length > 0) {
    const sessionsToSave = new Map<string, GameSession>()
    for (const raw of rawGameResults) {
      if (asString(raw.userId) !== odId) continue
      const mapped = mapGameResult(raw)
      if (!mapped) continue
      sessionsToSave.set(mapped.id, mapped)
    }
    if (sessionsToSave.size > 0) {
      await saveGameSessions(Array.from(sessionsToSave.values()))
      summary.gameSessions += sessionsToSave.size
    }
  }

  const rawMiniCog = Array.isArray(payload.miniCogResults)
    ? (payload.miniCogResults as Record<string, unknown>[])
    : []
  if (rawMiniCog.length > 0) {
    const mappedMiniCog: MiniCogResult[] = []
    for (const raw of rawMiniCog) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapMiniCogResult(raw, odId)
      if (mapped) mappedMiniCog.push(mapped)
    }
    if (mappedMiniCog.length > 0) {
      await saveMiniCogResults(mappedMiniCog)
      summary.miniCogResults += mappedMiniCog.length
    }
  }

  const rawDaily = Array.isArray(payload.dailyTrainingSessions)
    ? (payload.dailyTrainingSessions as Record<string, unknown>[])
    : []
  if (rawDaily.length > 0) {
    const mappedDaily: DailyTrainingSession[] = []
    for (const raw of rawDaily) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapDailyTrainingSession(raw, odId)
      if (mapped) mappedDaily.push(mapped)
    }
    if (mappedDaily.length > 0) {
      await saveDailyTrainingSessions(mappedDaily)
      summary.dailyTrainingSessions += mappedDaily.length
    }
  }

  const rawBaselines = Array.isArray(payload.baselineAssessments)
    ? (payload.baselineAssessments as Record<string, unknown>[])
    : []
  if (rawBaselines.length > 0) {
    const mappedBaselines: BaselineAssessment[] = []
    for (const raw of rawBaselines) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapBaselineAssessment(raw, odId)
      if (mapped) mappedBaselines.push(mapped)
    }
    if (mappedBaselines.length > 0) {
      await saveBaselineAssessments(mappedBaselines)
      summary.baselineAssessments += mappedBaselines.length
    }
  }

  const rawAlerts = Array.isArray(payload.declineAlerts)
    ? (payload.declineAlerts as Record<string, unknown>[])
    : []
  if (rawAlerts.length > 0) {
    const mappedAlerts: DeclineAlert[] = []
    for (const raw of rawAlerts) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapDeclineAlert(raw, odId)
      if (mapped) mappedAlerts.push(mapped)
    }
    if (mappedAlerts.length > 0) {
      await saveDeclineAlerts(mappedAlerts)
      summary.declineAlerts += mappedAlerts.length
    }
  }

  const rawNutrition = Array.isArray(payload.nutritionRecommendations)
    ? (payload.nutritionRecommendations as Record<string, unknown>[])
    : []
  if (rawNutrition.length > 0) {
    const mappedNutrition: NutritionRecommendationRecord[] = []
    for (const raw of rawNutrition) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapNutritionRecommendation(raw, odId)
      if (mapped) mappedNutrition.push(mapped)
    }
    if (mappedNutrition.length > 0) {
      await saveNutritionRecommendations(mappedNutrition)
      summary.nutritionRecommendations += mappedNutrition.length
    }
  }

  const rawBehaviorLogs = Array.isArray(payload.behaviorLogs)
    ? (payload.behaviorLogs as Record<string, unknown>[])
    : []
  if (rawBehaviorLogs.length > 0) {
    const mappedLogs: BehaviorLog[] = []
    for (const raw of rawBehaviorLogs) {
      if (asString(raw.odId) !== odId) continue
      const mapped = mapBehaviorLog(raw, odId)
      if (mapped) mappedLogs.push(mapped)
    }
    if (mappedLogs.length > 0) {
      await saveBehaviorLogs(mappedLogs)
      summary.behaviorLogs += mappedLogs.length
    }
  }

  saveDeltaStamp(odId, serverTime)
  return summary
}

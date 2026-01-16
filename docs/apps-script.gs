/**
 * Brain Training → Google Sheet Sync (Apps Script / JavaScript)
 *
 * Fix: Apps Script 不支援 TypeScript 語法（例如 `as const`、型別註解 `: unknown`、`Record<...>`），
 * 請使用本檔（純 JS）避免 `SyntaxError: Unexpected identifier 'as'`。
 *
 * Features:
 * - Supports single + batch POST: { action, items: [...] }
 * - Upsert (dedupe) by sessionId (GameResults) and userId (Users)
 * - Server-side grade fallback (if not provided)
 * - JSON fields stored as strings: gameSpecific default {}, displayStats default []
 * - LockService to avoid concurrent writes
 * - Optional JSONP GET endpoints via doGet (browser-friendly)
 *
 * Deploy:
 * - Apps Script → Deploy → New deployment → Web app
 * - Execute as: Me
 * - Who has access: Anyone (or Anyone with the link)
 */

var CONFIG = {
  SHEETS: {
    GAME_RESULTS: 'GameResults',
    USERS: 'Users',
    USER_SETTINGS: 'UserSettings',
    USER_STATS: 'UserStats',
    DATA_CONSENT: 'DataConsent',
    MINI_COG_RESULTS: 'MiniCogResults',
    DAILY_TRAINING_SESSIONS: 'DailyTrainingSessions',
    BASELINE_ASSESSMENTS: 'BaselineAssessments',
    DECLINE_ALERTS: 'DeclineAlerts',
    NUTRITION_RECOMMENDATIONS: 'NutritionRecommendations',
    BEHAVIOR_LOGS: 'BehaviorLogs',
  },
  HEADERS: {
    GAME_RESULTS: [
      'userId',
      'sessionId',
      'gameId',
      'difficulty',
      'subDifficulty',
      'timestamp',
      'durationSec',
      'score',
      'grade',
      'metrics.completion',
      'metrics.accuracy',
      'metrics.speed',
      'metrics.efficiency',
      'tracking.correctCount',
      'tracking.wrongCount',
      'tracking.missedCount',
      'tracking.maxCombo',
      'tracking.avgReactionTimeMs',
      'tracking.avgThinkingTimeMs',
      'tracking.totalActions',
      'bestScore',
      'gameSpecific',
      'displayStats',
      'protocolVersion',
      'schemaVersion',
      'scoringVersion',
      'dataQuality',
      'dataIssues',
      'clientSource',
      'authProvider',
    ],
    USERS: [
      'userId',
      'name',
      'birthday',
      'educationYears',
      'gender',
      'clientSource',
      'authProvider',
      'createdAt',
      'lastActiveAt',
      'updatedAt',
      'profileVersion',
    ],
    USER_SETTINGS: [
      'odId',
      'soundEnabled',
      'musicEnabled',
      'soundVolume',
      'musicVolume',
      'hasSeenWelcome',
      'updatedAt',
      'schemaVersion',
    ],
    USER_STATS: [
      'odId',
      'totalGamesPlayed',
      'totalPlayTime',
      'averageScore',
      'bestScores',
      'lastPlayedAt',
      'streak',
      'updatedAt',
      'schemaVersion',
    ],
    DATA_CONSENT: [
      'odId',
      'essentialConsent',
      'analyticsConsent',
      'behaviorTrackingConsent',
      'detailedBehaviorConsent',
      'medicalSharingConsent',
      'consentTimestamp',
      'consentVersion',
      'schemaVersion',
    ],
    MINI_COG_RESULTS: [
      'id',
      'odId',
      'totalScore',
      'wordRecallScore',
      'clockDrawingScore',
      'clockSelfAssessmentScore',
      'atRisk',
      'duration',
      'completedAt',
      'wordSetLocale',
      'wordsUsed',
      'clockImageData',
      'schemaVersion',
    ],
    DAILY_TRAINING_SESSIONS: [
      'id',
      'odId',
      'date',
      'plannedGames',
      'completedGames',
      'interrupted',
      'startedAt',
      'completedAt',
      'totalDuration',
      'schemaVersion',
    ],
    BASELINE_ASSESSMENTS: [
      'id',
      'odId',
      'assessedAt',
      'cognitiveScores',
      'suggestedDifficulties',
      'overallLevel',
      'gamesPlayed',
      'schemaVersion',
    ],
    DECLINE_ALERTS: [
      'id',
      'odId',
      'dimension',
      'alertType',
      'previousScore',
      'currentScore',
      'changePercent',
      'detectedAt',
      'acknowledged',
      'schemaVersion',
    ],
    NUTRITION_RECOMMENDATIONS: [
      'id',
      'odId',
      'triggerId',
      'supplementType',
      'dimension',
      'priority',
      'reason',
      'recommendedAt',
      'viewed',
      'dismissed',
      'schemaVersion',
    ],
    BEHAVIOR_LOGS: [
      'id',
      'odId',
      'gameId',
      'sessionId',
      'timestamp',
      'eventType',
      'data',
      'synced',
      'schemaVersion',
    ],
  },
  DEFAULT_LIMIT: 500,
  LOCK_TIMEOUT_MS: 30000,
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function jsonpOutput_(callback, obj) {
  var payload = callback + '(' + JSON.stringify(obj) + ')'
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JAVASCRIPT)
}

function asNumber_(v, fallback) {
  var n = Number(v)
  return isFinite(n) ? n : fallback
}

function asString_(v, fallback) {
  if (fallback === undefined) fallback = ''
  return typeof v === 'string' ? v : (v == null ? fallback : String(v))
}

function asBoolean_(v, fallback) {
  if (v === true || v === false) return v
  if (typeof v === 'string') {
    var lower = v.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
  }
  if (typeof v === 'number') return v !== 0
  return fallback === undefined ? false : fallback
}

function asISO_(v) {
  try {
    if (!v) return new Date().toISOString()
    var d = v instanceof Date ? v : new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch (e) {}
  return new Date().toISOString()
}

function clampScore0to100_(value) {
  var n = Number(value)
  if (!isFinite(n)) return 0
  n = Math.round(n)
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function gradeFromScore_(score) {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function safeJsonStringifyObject_(value) {
  try {
    return JSON.stringify(value || {})
  } catch (e) {
    return '{}'
  }
}

function safeJsonStringifyArray_(value) {
  try {
    return JSON.stringify(Array.isArray(value) ? value : [])
  } catch (e) {
    return '[]'
  }
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3')
  }
  return sheet
}

function ensureHeaders_(sheet, headers) {
  var lastCol = sheet.getLastColumn()
  var width = Math.max(headers.length, lastCol || 0, 1)
  var firstRow = sheet.getRange(1, 1, 1, width).getValues()[0] || []
  var normalized = firstRow.map(function (v) { return String(v || '').trim() }).slice(0, headers.length)
  var matches = headers.every(function (h, i) { return normalized[i] === h })
  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3')
  }
}

function buildKeyRowMapFromCol_(sheet, col, includeHeader) {
  var lastRow = sheet.getLastRow()
  var startRow = includeHeader ? 1 : 2
  var numRows = Math.max(0, lastRow - startRow + 1)
  var map = {}

  if (numRows <= 0) return map
  var values = sheet.getRange(startRow, col, numRows, 1).getValues()
  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || '').trim()
    if (!key) continue
    map[key] = startRow + i
  }
  return map
}

function validateGameResult_(item) {
  if (!item) return 'empty item'
  if (!item.userId) return 'missing userId'
  if (!item.sessionId) return 'missing sessionId'
  if (!item.gameId) return 'missing gameId'
  return null
}

function flattenGameResultRow_(item) {
  var metrics = item.metrics || {}
  var tracking = item.tracking || {}

  var score = clampScore0to100_(item.score)
  var grade = asString_(item.grade, '').trim() || gradeFromScore_(score)
  var gameSpecific = safeJsonStringifyObject_(item.gameSpecific || {})
  var displayStats = safeJsonStringifyArray_(item.displayStats)
  var dataIssues = safeJsonStringifyArray_(item.dataIssues)

  var inferredClientSource = asString_(item.clientSource, '')
  if (!inferredClientSource) {
    try {
      var gs = item.gameSpecific || {}
      inferredClientSource = asString_(gs.clientSource, '')
    } catch (e) {}
  }

  return [
    asString_(item.userId),
    asString_(item.sessionId),
    asString_(item.gameId),
    asString_(item.difficulty, 'easy'),
    asNumber_(item.subDifficulty, 1),
    asISO_(item.timestamp),
    asNumber_(item.durationSec, 0),
    score,
    grade,

    metrics.completion != null ? metrics.completion : '',
    metrics.accuracy != null ? metrics.accuracy : '',
    metrics.speed != null ? metrics.speed : '',
    metrics.efficiency != null ? metrics.efficiency : '',

    tracking.correctCount != null ? tracking.correctCount : 0,
    tracking.wrongCount != null ? tracking.wrongCount : 0,
    tracking.missedCount != null ? tracking.missedCount : 0,
    tracking.maxCombo != null ? tracking.maxCombo : 0,
    tracking.avgReactionTimeMs != null ? tracking.avgReactionTimeMs : 0,
    tracking.avgThinkingTimeMs != null ? tracking.avgThinkingTimeMs : 0,
    tracking.totalActions != null ? tracking.totalActions : 0,

    item.bestScore != null ? item.bestScore : '',
    gameSpecific,
    displayStats,
    item.protocolVersion != null ? item.protocolVersion : '',
    item.schemaVersion != null ? item.schemaVersion : '',
    item.scoringVersion != null ? item.scoringVersion : '',
    asString_(item.dataQuality, ''),
    dataIssues,
    inferredClientSource,
    asString_(item.authProvider, ''),
  ]
}

function upsertGameResults_(items) {
  var headers = CONFIG.HEADERS.GAME_RESULTS.slice()
  var sheet = getOrCreateSheet_(CONFIG.SHEETS.GAME_RESULTS, headers)
  ensureHeaders_(sheet, headers)

  var sessionIdCol = headers.indexOf('sessionId') + 1
  var rowBySessionId = buildKeyRowMapFromCol_(sheet, sessionIdCol, false)

  var appends = []
  var updates = []
  var results = []

  var baseAppendRow = sheet.getLastRow() + 1
  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    var err = validateGameResult_(item)
    if (err) {
      results.push({ ok: false, sessionId: (item && item.sessionId) || '', error: err })
      continue
    }

    var sessionId = String(item.sessionId).trim()
    var rowValues = flattenGameResultRow_(item)

    var existingRow = rowBySessionId[sessionId]
    if (existingRow && existingRow >= 2) {
      updates.push({ row: existingRow, values: rowValues })
      results.push({ ok: true, sessionId: sessionId, op: 'update', row: existingRow })
    } else {
      // reserve row number inside this batch (avoid duplicate append)
      var reservedRow = baseAppendRow + appends.length
      rowBySessionId[sessionId] = reservedRow
      appends.push(rowValues)
      results.push({ ok: true, sessionId: sessionId, op: 'append', row: reservedRow })
    }
  }

  // updates: group contiguous ranges
  updates.sort(function (a, b) { return a.row - b.row })
  var k = 0
  while (k < updates.length) {
    var startRow = updates[k].row
    var endRow = startRow
    var values = [updates[k].values]
    k++
    while (k < updates.length && updates[k].row === endRow + 1) {
      endRow = updates[k].row
      values.push(updates[k].values)
      k++
    }
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values)
  }

  if (appends.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends)
  }

  return { ok: true, sheet: CONFIG.SHEETS.GAME_RESULTS, updated: updates.length, appended: appends.length, results: results }
}

function validateUser_(item) {
  if (!item) return 'empty item'
  if (!item.userId) return 'missing userId'
  if (!item.name) return 'missing name'
  if (!item.birthday) return 'missing birthday'
  return null
}

function upsertByKey_(sheetName, headers, keyField, items, validateFn, flattenFn) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  ensureHeaders_(sheet, headers)

  var keyCol = headers.indexOf(keyField) + 1
  var rowByKey = buildKeyRowMapFromCol_(sheet, keyCol, false)

  var appends = []
  var updates = []
  var results = []

  var baseAppendRow = sheet.getLastRow() + 1
  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    var err = validateFn ? validateFn(item) : null
    if (err) {
      results.push({ ok: false, key: (item && item[keyField]) || '', error: err })
      continue
    }

    var key = String(item[keyField] || '').trim()
    if (!key) {
      results.push({ ok: false, key: '', error: 'missing key' })
      continue
    }

    var rowValues = flattenFn(item)
    var existingRow = rowByKey[key]
    if (existingRow && existingRow >= 2) {
      updates.push({ row: existingRow, values: rowValues })
      results.push({ ok: true, key: key, op: 'update', row: existingRow })
    } else {
      var reservedRow = baseAppendRow + appends.length
      rowByKey[key] = reservedRow
      appends.push(rowValues)
      results.push({ ok: true, key: key, op: 'append', row: reservedRow })
    }
  }

  updates.sort(function (a, b) { return a.row - b.row })
  var k = 0
  while (k < updates.length) {
    var startRow = updates[k].row
    var endRow = startRow
    var values = [updates[k].values]
    k++
    while (k < updates.length && updates[k].row === endRow + 1) {
      endRow = updates[k].row
      values.push(updates[k].values)
      k++
    }
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values)
  }

  if (appends.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends)
  }

  return { ok: true, sheet: sheetName, updated: updates.length, appended: appends.length, results: results }
}

function flattenUserRow_(item) {
  return [
    asString_(item.userId),
    asString_(item.name),
    asString_(item.birthday),
    asNumber_(item.educationYears, ''),
    asString_(item.gender, 'unknown'),
    asString_(item.clientSource, ''),
    asString_(item.authProvider, ''),
    asISO_(item.createdAt),
    asISO_(item.lastActiveAt),
    asISO_(item.updatedAt),
    asNumber_(item.profileVersion, 1),
  ]
}

function upsertUsers_(items) {
  var headers = CONFIG.HEADERS.USERS.slice()
  return upsertByKey_(CONFIG.SHEETS.USERS, headers, 'userId', items, validateUser_, flattenUserRow_)
}

function validateUserSettings_(item) {
  if (!item) return 'empty item'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenUserSettingsRow_(item) {
  return [
    asString_(item.odId),
    asBoolean_(item.soundEnabled, false),
    asBoolean_(item.musicEnabled, false),
    asNumber_(item.soundVolume, 0),
    asNumber_(item.musicVolume, 0),
    asBoolean_(item.hasSeenWelcome, false),
    asISO_(item.updatedAt),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateUserStats_(item) {
  if (!item) return 'empty item'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenUserStatsRow_(item) {
  return [
    asString_(item.odId),
    asNumber_(item.totalGamesPlayed, 0),
    asNumber_(item.totalPlayTime, 0),
    asNumber_(item.averageScore, 0),
    safeJsonStringifyObject_(item.bestScores),
    item.lastPlayedAt ? asISO_(item.lastPlayedAt) : '',
    asNumber_(item.streak, 0),
    asISO_(item.updatedAt),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateDataConsent_(item) {
  if (!item) return 'empty item'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenDataConsentRow_(item) {
  return [
    asString_(item.odId),
    asBoolean_(item.essentialConsent, false),
    asBoolean_(item.analyticsConsent, false),
    asBoolean_(item.behaviorTrackingConsent, false),
    asBoolean_(item.detailedBehaviorConsent, false),
    asBoolean_(item.medicalSharingConsent, false),
    asISO_(item.consentTimestamp),
    asString_(item.consentVersion, ''),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateMiniCogResult_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenMiniCogResultRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asNumber_(item.totalScore, 0),
    asNumber_(item.wordRecallScore, 0),
    asNumber_(item.clockDrawingScore, 0),
    asNumber_(item.clockSelfAssessmentScore, 0),
    asBoolean_(item.atRisk, false),
    asNumber_(item.duration, 0),
    asISO_(item.completedAt),
    asString_(item.wordSetLocale, ''),
    safeJsonStringifyArray_(item.wordsUsed),
    asString_(item.clockImageData, ''),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateDailyTrainingSession_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenDailyTrainingSessionRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asString_(item.date, ''),
    safeJsonStringifyArray_(item.plannedGames),
    safeJsonStringifyArray_(item.completedGames),
    asBoolean_(item.interrupted, false),
    asISO_(item.startedAt),
    item.completedAt ? asISO_(item.completedAt) : '',
    asNumber_(item.totalDuration, 0),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateBaselineAssessment_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenBaselineAssessmentRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asISO_(item.assessedAt),
    safeJsonStringifyObject_(item.cognitiveScores),
    safeJsonStringifyObject_(item.suggestedDifficulties),
    asString_(item.overallLevel, ''),
    safeJsonStringifyArray_(item.gamesPlayed),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateDeclineAlert_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenDeclineAlertRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asString_(item.dimension, ''),
    asString_(item.alertType, ''),
    asNumber_(item.previousScore, 0),
    asNumber_(item.currentScore, 0),
    asNumber_(item.changePercent, 0),
    asISO_(item.detectedAt),
    asBoolean_(item.acknowledged, false),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateNutritionRecommendation_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenNutritionRecommendationRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asString_(item.triggerId, ''),
    asString_(item.supplementType, ''),
    asString_(item.dimension, ''),
    asString_(item.priority, ''),
    asString_(item.reason, ''),
    asISO_(item.recommendedAt),
    asBoolean_(item.viewed, false),
    asBoolean_(item.dismissed, false),
    asNumber_(item.schemaVersion, ''),
  ]
}

function validateBehaviorLog_(item) {
  if (!item) return 'empty item'
  if (!item.id) return 'missing id'
  if (!item.odId) return 'missing odId'
  return null
}

function flattenBehaviorLogRow_(item) {
  return [
    asString_(item.id),
    asString_(item.odId),
    asString_(item.gameId, ''),
    asString_(item.sessionId, ''),
    asISO_(item.timestamp),
    asString_(item.eventType, ''),
    safeJsonStringifyObject_(item.data),
    asBoolean_(item.synced, false),
    asNumber_(item.schemaVersion, ''),
  ]
}

/**
 * POST API
 * - { action:'upsertGameResults', items:[...] } or single object
 * - { action:'upsertUsers', items:[...] } or single object
 * - { action:'upsertUserSettings', items:[...] }
 * - { action:'upsertUserStats', items:[...] }
 * - { action:'upsertDataConsent', items:[...] }
 * - { action:'upsertMiniCogResults', items:[...] }
 * - { action:'upsertDailyTrainingSessions', items:[...] }
 * - { action:'upsertBaselineAssessments', items:[...] }
 * - { action:'upsertDeclineAlerts', items:[...] }
 * - { action:'upsertNutritionRecommendations', items:[...] }
 * - { action:'upsertBehaviorLogs', items:[...] }
 * Backward-compatible: missing action => upsertGameResults
 */
function doPost(e) {
  var lock = LockService.getScriptLock()
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS)

    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput_({ ok: false, error: 'No post data received' })
    }

    var data
    try {
      data = JSON.parse(e.postData.contents)
    } catch (err) {
      return jsonOutput_({ ok: false, error: 'Invalid JSON: ' + String(err) })
    }

    var action = (data && data.action) || 'upsertGameResults'
    if (action === 'upsertUsers') {
      var itemsU = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign({ action: action }, upsertUsers_(itemsU)))
    }
    if (action === 'upsertUserSettings') {
      var itemsS = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.USER_SETTINGS, CONFIG.HEADERS.USER_SETTINGS.slice(), 'odId', itemsS, validateUserSettings_, flattenUserSettingsRow_)
      ))
    }
    if (action === 'upsertUserStats') {
      var itemsSt = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.USER_STATS, CONFIG.HEADERS.USER_STATS.slice(), 'odId', itemsSt, validateUserStats_, flattenUserStatsRow_)
      ))
    }
    if (action === 'upsertDataConsent') {
      var itemsC = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.DATA_CONSENT, CONFIG.HEADERS.DATA_CONSENT.slice(), 'odId', itemsC, validateDataConsent_, flattenDataConsentRow_)
      ))
    }
    if (action === 'upsertMiniCogResults') {
      var itemsM = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.MINI_COG_RESULTS, CONFIG.HEADERS.MINI_COG_RESULTS.slice(), 'id', itemsM, validateMiniCogResult_, flattenMiniCogResultRow_)
      ))
    }
    if (action === 'upsertDailyTrainingSessions') {
      var itemsD = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.DAILY_TRAINING_SESSIONS, CONFIG.HEADERS.DAILY_TRAINING_SESSIONS.slice(), 'id', itemsD, validateDailyTrainingSession_, flattenDailyTrainingSessionRow_)
      ))
    }
    if (action === 'upsertBaselineAssessments') {
      var itemsB = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.BASELINE_ASSESSMENTS, CONFIG.HEADERS.BASELINE_ASSESSMENTS.slice(), 'id', itemsB, validateBaselineAssessment_, flattenBaselineAssessmentRow_)
      ))
    }
    if (action === 'upsertDeclineAlerts') {
      var itemsA = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.DECLINE_ALERTS, CONFIG.HEADERS.DECLINE_ALERTS.slice(), 'id', itemsA, validateDeclineAlert_, flattenDeclineAlertRow_)
      ))
    }
    if (action === 'upsertNutritionRecommendations') {
      var itemsN = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS, CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS.slice(), 'id', itemsN, validateNutritionRecommendation_, flattenNutritionRecommendationRow_)
      ))
    }
    if (action === 'upsertBehaviorLogs') {
      var itemsL = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action },
        upsertByKey_(CONFIG.SHEETS.BEHAVIOR_LOGS, CONFIG.HEADERS.BEHAVIOR_LOGS.slice(), 'id', itemsL, validateBehaviorLog_, flattenBehaviorLogRow_)
      ))
    }
    if (action === 'upsertGameResults') {
      var itemsG = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign({ action: action }, upsertGameResults_(itemsG)))
    }

    return jsonOutput_({ ok: false, error: 'Unknown action: ' + action })
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error && error.stack ? error.stack : error) })
  } finally {
    try { lock.releaseLock() } catch (e) {}
  }
}

/**
 * GET API (optional; JSONP via ?callback=cb)
 * - action=ping
 * - action=getUser&userId=...
 * - action=listGameResults&userId=...&since=ISO&limit=500&cursor=ROW_NUMBER
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {}
    var action = params.action || 'ping'
    var callback = params.callback || ''

    if (action === 'ping') {
      var outPing = { ok: true, action: action, serverTime: new Date().toISOString() }
      return callback ? jsonpOutput_(callback, outPing) : jsonOutput_(outPing)
    }

    if (action === 'getUser') {
      var userId = params.userId || ''
      if (!userId) {
        var outErr = { ok: false, action: action, error: 'missing userId' }
        return callback ? jsonpOutput_(callback, outErr) : jsonOutput_(outErr)
      }

      var headersU = CONFIG.HEADERS.USERS.slice()
      var sheetU = getOrCreateSheet_(CONFIG.SHEETS.USERS, headersU)
      ensureHeaders_(sheetU, headersU)

      var userIdCol = headersU.indexOf('userId') + 1
      var rowByUserId = buildKeyRowMapFromCol_(sheetU, userIdCol, false)
      var row = rowByUserId[userId]

      if (!row || row < 2) {
        var outNull = { ok: true, action: action, user: null }
        return callback ? jsonpOutput_(callback, outNull) : jsonOutput_(outNull)
      }

      var values = sheetU.getRange(row, 1, 1, headersU.length).getValues()[0]
      var user = {}
      for (var i = 0; i < headersU.length; i++) user[headersU[i]] = values[i]
      var outUser = { ok: true, action: action, user: user }
      return callback ? jsonpOutput_(callback, outUser) : jsonOutput_(outUser)
    }

    if (action === 'getUserSettings' || action === 'getUserStats' || action === 'getDataConsent') {
      var odId = params.userId || params.odId || ''
      if (!odId) {
        var outErr0 = { ok: false, action: action, error: 'missing odId' }
        return callback ? jsonpOutput_(callback, outErr0) : jsonOutput_(outErr0)
      }
      var sheetName = action === 'getUserSettings'
        ? CONFIG.SHEETS.USER_SETTINGS
        : (action === 'getUserStats' ? CONFIG.SHEETS.USER_STATS : CONFIG.SHEETS.DATA_CONSENT)
      var headers0 = action === 'getUserSettings'
        ? CONFIG.HEADERS.USER_SETTINGS.slice()
        : (action === 'getUserStats' ? CONFIG.HEADERS.USER_STATS.slice() : CONFIG.HEADERS.DATA_CONSENT.slice())
      var sheet0 = getOrCreateSheet_(sheetName, headers0)
      ensureHeaders_(sheet0, headers0)
      var keyCol = headers0.indexOf('odId') + 1
      var rowByKey = buildKeyRowMapFromCol_(sheet0, keyCol, false)
      var row0 = rowByKey[odId]
      if (!row0 || row0 < 2) {
        var outNull0 = { ok: true, action: action, item: null }
        return callback ? jsonpOutput_(callback, outNull0) : jsonOutput_(outNull0)
      }
      var values0 = sheet0.getRange(row0, 1, 1, headers0.length).getValues()[0]
      var item0 = {}
      for (var j = 0; j < headers0.length; j++) item0[headers0[j]] = values0[j]
      var outItem0 = { ok: true, action: action, item: item0 }
      return callback ? jsonpOutput_(callback, outItem0) : jsonOutput_(outItem0)
    }

    if (action === 'listGameResults') {
      var userId2 = params.userId || ''
      if (!userId2) {
        var outErr2 = { ok: false, action: action, error: 'missing userId' }
        return callback ? jsonpOutput_(callback, outErr2) : jsonOutput_(outErr2)
      }

      var since = params.since || ''
      var limit = Math.max(1, Math.min(CONFIG.DEFAULT_LIMIT, Number(params.limit || CONFIG.DEFAULT_LIMIT)))
      var cursor = Math.max(2, Number(params.cursor || 2))

      var headersG = CONFIG.HEADERS.GAME_RESULTS.slice()
      var sheetG = getOrCreateSheet_(CONFIG.SHEETS.GAME_RESULTS, headersG)
      ensureHeaders_(sheetG, headersG)

      var lastRow = sheetG.getLastRow()
      if (lastRow < 2 || cursor > lastRow) {
        var outEmpty = { ok: true, action: action, items: [], nextCursor: null }
        return callback ? jsonpOutput_(callback, outEmpty) : jsonOutput_(outEmpty)
      }

      var endRow = Math.min(lastRow, cursor + limit - 1)
      var rows = sheetG.getRange(cursor, 1, endRow - cursor + 1, headersG.length).getValues()

      var userIdIdx = headersG.indexOf('userId')
      var tsIdx = headersG.indexOf('timestamp')
      var items = []

      for (var r = 0; r < rows.length; r++) {
        var rowVals = rows[r]
        if (asString_(rowVals[userIdIdx]) !== userId2) continue
        var ts = asString_(rowVals[tsIdx])
        if (since && ts && ts < since) continue

        var item = {}
        for (var c = 0; c < headersG.length; c++) item[headersG[c]] = rowVals[c]
        items.push(item)
      }

      var nextCursor = endRow < lastRow ? (endRow + 1) : null
      var outList = { ok: true, action: action, items: items, nextCursor: nextCursor }
      return callback ? jsonpOutput_(callback, outList) : jsonOutput_(outList)
    }

    if (action === 'listByUser') {
      var type = params.type || ''
      var userId3 = params.userId || params.odId || ''
      if (!type) {
        var outErr3 = { ok: false, action: action, error: 'missing type' }
        return callback ? jsonpOutput_(callback, outErr3) : jsonOutput_(outErr3)
      }
      if (!userId3) {
        var outErr4 = { ok: false, action: action, error: 'missing userId' }
        return callback ? jsonpOutput_(callback, outErr4) : jsonOutput_(outErr4)
      }

      var listConfigMap = {
        miniCogResults: { sheet: CONFIG.SHEETS.MINI_COG_RESULTS, headers: CONFIG.HEADERS.MINI_COG_RESULTS, key: 'odId' },
        dailyTrainingSessions: { sheet: CONFIG.SHEETS.DAILY_TRAINING_SESSIONS, headers: CONFIG.HEADERS.DAILY_TRAINING_SESSIONS, key: 'odId' },
        baselineAssessments: { sheet: CONFIG.SHEETS.BASELINE_ASSESSMENTS, headers: CONFIG.HEADERS.BASELINE_ASSESSMENTS, key: 'odId' },
        declineAlerts: { sheet: CONFIG.SHEETS.DECLINE_ALERTS, headers: CONFIG.HEADERS.DECLINE_ALERTS, key: 'odId' },
        nutritionRecommendations: { sheet: CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS, headers: CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS, key: 'odId' },
        behaviorLogs: { sheet: CONFIG.SHEETS.BEHAVIOR_LOGS, headers: CONFIG.HEADERS.BEHAVIOR_LOGS, key: 'odId' },
      }
      var config = listConfigMap[type]
      if (!config) {
        var outErr5 = { ok: false, action: action, error: 'unsupported type' }
        return callback ? jsonpOutput_(callback, outErr5) : jsonOutput_(outErr5)
      }

      var since2 = params.since || ''
      var limit2 = Math.max(1, Math.min(CONFIG.DEFAULT_LIMIT, Number(params.limit || CONFIG.DEFAULT_LIMIT)))
      var cursor2 = Math.max(2, Number(params.cursor || 2))

      var headers2 = config.headers.slice()
      var sheet2 = getOrCreateSheet_(config.sheet, headers2)
      ensureHeaders_(sheet2, headers2)

      var lastRow2 = sheet2.getLastRow()
      if (lastRow2 < 2 || cursor2 > lastRow2) {
        var outEmpty2 = { ok: true, action: action, items: [], nextCursor: null }
        return callback ? jsonpOutput_(callback, outEmpty2) : jsonOutput_(outEmpty2)
      }

      var endRow2 = Math.min(lastRow2, cursor2 + limit2 - 1)
      var rows2 = sheet2.getRange(cursor2, 1, endRow2 - cursor2 + 1, headers2.length).getValues()

      var userIdIdx2 = headers2.indexOf(config.key)
      var tsIdx2 = headers2.indexOf('completedAt')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('timestamp')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('assessedAt')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('detectedAt')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('recommendedAt')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('startedAt')

      var items2 = []
      for (var r2 = 0; r2 < rows2.length; r2++) {
        var rowVals2 = rows2[r2]
        if (asString_(rowVals2[userIdIdx2]) !== userId3) continue
        var ts2 = tsIdx2 >= 0 ? asString_(rowVals2[tsIdx2]) : ''
        if (since2 && ts2 && ts2 < since2) continue
        var item2 = {}
        for (var c2 = 0; c2 < headers2.length; c2++) item2[headers2[c2]] = rowVals2[c2]
        items2.push(item2)
      }

      var nextCursor2 = endRow2 < lastRow2 ? (endRow2 + 1) : null
      var outList2 = { ok: true, action: action, items: items2, nextCursor: nextCursor2 }
      return callback ? jsonpOutput_(callback, outList2) : jsonOutput_(outList2)
    }

    var outUnknown = { ok: false, error: 'Unknown action: ' + action }
    return callback ? jsonpOutput_(callback, outUnknown) : jsonOutput_(outUnknown)
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error) })
  }
}

function setupSheets() {
  getOrCreateSheet_(CONFIG.SHEETS.GAME_RESULTS, CONFIG.HEADERS.GAME_RESULTS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.USERS, CONFIG.HEADERS.USERS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.USER_SETTINGS, CONFIG.HEADERS.USER_SETTINGS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.USER_STATS, CONFIG.HEADERS.USER_STATS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.DATA_CONSENT, CONFIG.HEADERS.DATA_CONSENT.slice())
  getOrCreateSheet_(CONFIG.SHEETS.MINI_COG_RESULTS, CONFIG.HEADERS.MINI_COG_RESULTS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.DAILY_TRAINING_SESSIONS, CONFIG.HEADERS.DAILY_TRAINING_SESSIONS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.BASELINE_ASSESSMENTS, CONFIG.HEADERS.BASELINE_ASSESSMENTS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.DECLINE_ALERTS, CONFIG.HEADERS.DECLINE_ALERTS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS, CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.BEHAVIOR_LOGS, CONFIG.HEADERS.BEHAVIOR_LOGS.slice())
  Logger.log('Sheets initialized.')
}

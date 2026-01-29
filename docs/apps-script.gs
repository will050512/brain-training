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
 * - Optional auth token + clientId based rate limit
 * - Optional JSONP GET endpoints via doGet (browser-friendly)
 *
 * Deploy:
 * - Apps Script → Deploy → New deployment → Web app
 * - Execute as: Me
 * - Who has access: Anyone (or Anyone with the link)
 *
 * Setup:
 * - Fill in CONFIG.SPREADSHEET_ID with your Sheet ID (required for this version)
 * - (Optional) Set Script Properties `SYNC_TOKEN` and keep CONFIG.SYNC_TOKEN empty
 */

var CONFIG = {
  SPREADSHEET_ID: '16UoYf-u7Gj0waariezCJAO8Q-PZ3e2L17f-_P_3RC8Y',
  ENABLE_CORS: true,
  SYNC_TOKEN: '',
  REQUIRE_CLIENT_ID: true,
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
      'transferCode',
      'transferCodeUpdatedAt',
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
      'gamePlayCounts',
      'favoriteGameId',
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
  MAX_ITEMS_PER_REQUEST: 200,
  MAX_PAYLOAD_BYTES: 250000,
  RATE_LIMIT_WINDOW_SEC: 60,
  RATE_LIMIT_MAX_REQUESTS: 30,
  RATE_LIMIT_MAX_ITEMS: 500,
  LOCK_TIMEOUT_MS: 30000,
}

function jsonOutput_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
  if (CONFIG.ENABLE_CORS && typeof out.setHeader === 'function') {
    return out
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  return out
}

function jsonpOutput_(callback, obj) {
  var payload = callback + '(' + JSON.stringify(obj) + ')'
  var out = ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JAVASCRIPT)
  if (CONFIG.ENABLE_CORS && typeof out.setHeader === 'function') {
    return out
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  return out
}

function doOptions(e) {
  var out = ContentService.createTextOutput('')
  if (CONFIG.ENABLE_CORS && typeof out.setHeader === 'function') {
    return out
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .setHeader('Access-Control-Max-Age', '3600')
  }
  return out.setMimeType(ContentService.MimeType.TEXT)
}

function asNumber_(v, fallback) {
  var n = Number(v)
  return isFinite(n) ? n : fallback
}

function clampNumber_(v, min, max, fallback) {
  var n = Number(v)
  if (!isFinite(n)) return fallback
  if (min != null && n < min) n = min
  if (max != null && n > max) n = max
  return n
}

function asString_(v, fallback) {
  if (fallback === undefined) fallback = ''
  return typeof v === 'string' ? v : (v == null ? fallback : String(v))
}

function getScriptProperty_(key) {
  try {
    var props = PropertiesService.getScriptProperties()
    return asString_(props.getProperty(key), '')
  } catch (e) {
    return ''
  }
}

function getSyncToken_() {
  var token = getScriptProperty_('SYNC_TOKEN')
  if (token) return token
  return asString_(CONFIG.SYNC_TOKEN, '')
}

function extractAuthMeta_(data, params) {
  var meta = (data && data.meta) ? data.meta : {}
  var clientId = asString_(meta.clientId || (params && params.clientId), '').trim()
  var token = asString_(meta.token || (params && params.token), '').trim()
  return { clientId: clientId, token: token }
}

function isValidClientId_(clientId) {
  return /^[A-Za-z0-9_-]{6,64}$/.test(clientId)
}

function enforceAuth_(meta) {
  var requiredToken = getSyncToken_()
  if (requiredToken && meta.token !== requiredToken) return 'invalid token'
  if (CONFIG.REQUIRE_CLIENT_ID && !isValidClientId_(meta.clientId)) return 'missing clientId'
  return ''
}

function getItemCount_(data) {
  if (!data) return 0
  if (Array.isArray(data.items)) return data.items.length
  return 1
}

function checkRateLimit_(clientId, itemCount) {
  if (!clientId) return ''
  try {
    var cache = CacheService.getScriptCache()
    var key = 'rate:' + clientId
    var raw = cache.get(key)
    var current = raw ? JSON.parse(raw) : { count: 0, items: 0 }
    var maxReq = CONFIG.RATE_LIMIT_MAX_REQUESTS || 30
    var maxItems = CONFIG.RATE_LIMIT_MAX_ITEMS || 500
    if (current.count >= maxReq || (current.items + itemCount) > maxItems) {
      return 'rate limit exceeded'
    }
    current.count += 1
    current.items += itemCount
    cache.put(key, JSON.stringify(current), CONFIG.RATE_LIMIT_WINDOW_SEC || 60)
  } catch (e) {
    // ignore rate limit failures
  }
  return ''
}

function normalizeTransferCode_(value) {
  return asString_(value, '').replace(/[\s-]/g, '').toUpperCase()
}

function isValidTransferCode_(value) {
  var normalized = normalizeTransferCode_(value)
  if (normalized.length !== 6) return false
  return /^[A-HJ-NP-Z2-9]{6}$/.test(normalized)
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

function getSpreadsheet_() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('Missing CONFIG.SPREADSHEET_ID')
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
}

function getOrCreateSheet_(name, headers) {
  var ss = getSpreadsheet_()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3')
  }
  return sheet
}

function findHeaderIndex_(headers, key) {
  var target = String(key || '').toLowerCase().replace(/[\s_-]/g, '')
  if (!target) return -1
  for (var i = 0; i < headers.length; i++) {
    var normalized = String(headers[i] || '').trim().toLowerCase().replace(/[\s_-]/g, '')
    if (normalized === target) return i
  }
  return -1
}

function resolveHeaderIndex_(headerRow, fallbackHeaders, key) {
  var idx = findHeaderIndex_(headerRow, key)
  if (idx >= 0) return idx
  if (fallbackHeaders && fallbackHeaders.length) {
    return fallbackHeaders.indexOf(key)
  }
  return -1
}

function resolveTimestampIndex_(headerRow, fallbackHeaders, candidates) {
  var list = Array.isArray(candidates) ? candidates : []
  for (var i = 0; i < list.length; i++) {
    var idx = resolveHeaderIndex_(headerRow, fallbackHeaders, list[i])
    if (idx >= 0) return idx
  }
  return -1
}

function rowToObject_(headerRow, fallbackHeaders, rowValues) {
  var keys = (headerRow && headerRow.length > 0) ? headerRow : fallbackHeaders
  var obj = {}
  if (!keys || !keys.length) return obj
  for (var i = 0; i < keys.length; i++) {
    var key = String(keys[i] || '').trim()
    if (!key) continue
    obj[key] = rowValues[i]
  }
  return obj
}

function parseLimit_(value, fallback, min, max) {
  var n = Number(value)
  if (!isFinite(n)) n = fallback
  if (min != null && n < min) n = min
  if (max != null && n > max) n = max
  return Math.round(n)
}

function toTimeMs_(value) {
  if (!value) return 0
  var d = value instanceof Date ? value : new Date(value)
  var t = d.getTime()
  return isNaN(t) ? 0 : t
}

function isUpdatedSince_(value, since) {
  if (!since) return true
  var sinceMs = toTimeMs_(since)
  if (!sinceMs) return true
  var valueMs = toTimeMs_(value)
  if (!valueMs) return true
  return valueMs >= sinceMs
}

function getSingleByKey_(sheetName, headers, keyField, keyValue) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  ensureHeaders_(sheet, headers)
  var rowWidth = Math.max(headers.length, sheet.getLastColumn(), 1)
  var headerRow = sheet.getRange(1, 1, 1, rowWidth).getValues()[0] || []
  var keyIdx = resolveHeaderIndex_(headerRow, headers, keyField)
  if (keyIdx < 0) return null
  var rowByKey = buildKeyRowMapFromCol_(sheet, keyIdx + 1, false)
  var row = rowByKey[String(keyValue || '').trim()]
  if (!row || row < 2) return null
  var values = sheet.getRange(row, 1, 1, rowWidth).getValues()[0]
  return rowToObject_(headerRow, headers, values)
}

function collectRecentRowsByUser_(sheetName, headers, keyField, keyValue, limit) {
  var maxItems = parseLimit_(limit, 0, 0, 200)
  if (maxItems <= 0) return []
  var sheet = getOrCreateSheet_(sheetName, headers)
  ensureHeaders_(sheet, headers)
  var rowWidth = Math.max(headers.length, sheet.getLastColumn(), 1)
  var headerRow = sheet.getRange(1, 1, 1, rowWidth).getValues()[0] || []
  var keyIdx = resolveHeaderIndex_(headerRow, headers, keyField)
  if (keyIdx < 0) return []
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return []

  var items = []
  var cursor = lastRow
  var chunkSize = 200
  while (cursor >= 2 && items.length < maxItems) {
    var startRow = Math.max(2, cursor - chunkSize + 1)
    var numRows = cursor - startRow + 1
    var rows = sheet.getRange(startRow, 1, numRows, rowWidth).getValues()
    for (var i = rows.length - 1; i >= 0; i--) {
      var rowVals = rows[i]
      if (asString_(rowVals[keyIdx]) !== String(keyValue)) continue
      items.push(rowToObject_(headerRow, headers, rowVals))
      if (items.length >= maxItems) break
    }
    cursor = startRow - 1
  }
  return items
}

function collectRowsByUserSince_(sheetName, headers, keyField, keyValue, since, tsCandidates) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  ensureHeaders_(sheet, headers)
  var rowWidth = Math.max(headers.length, sheet.getLastColumn(), 1)
  var headerRow = sheet.getRange(1, 1, 1, rowWidth).getValues()[0] || []
  var keyIdx = resolveHeaderIndex_(headerRow, headers, keyField)
  if (keyIdx < 0) return []
  var tsIdx = resolveTimestampIndex_(headerRow, headers, tsCandidates || [])
  var sinceMs = since ? toTimeMs_(since) : 0
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return []
  var rows = sheet.getRange(2, 1, lastRow - 1, rowWidth).getValues()
  var items = []
  for (var i = 0; i < rows.length; i++) {
    var rowVals = rows[i]
    if (asString_(rowVals[keyIdx]) !== String(keyValue)) continue
    if (sinceMs && tsIdx >= 0) {
      var tsMs = toTimeMs_(rowVals[tsIdx])
      if (tsMs && tsMs < sinceMs) continue
    }
    items.push(rowToObject_(headerRow, headers, rowVals))
  }
  return items
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
    clampNumber_(item.subDifficulty, 1, 3, 1),
    asISO_(item.timestamp),
    clampNumber_(item.durationSec, 0, null, 0),
    score,
    grade,

    metrics.completion != null ? clampNumber_(metrics.completion, 0, 1, '') : '',
    metrics.accuracy != null ? clampNumber_(metrics.accuracy, 0, 1, '') : '',
    metrics.speed != null ? clampNumber_(metrics.speed, 0, 100, '') : '',
    metrics.efficiency != null ? clampNumber_(metrics.efficiency, 0, 100, '') : '',

    tracking.correctCount != null ? clampNumber_(tracking.correctCount, 0, null, 0) : 0,
    tracking.wrongCount != null ? clampNumber_(tracking.wrongCount, 0, null, 0) : 0,
    tracking.missedCount != null ? clampNumber_(tracking.missedCount, 0, null, 0) : 0,
    tracking.maxCombo != null ? clampNumber_(tracking.maxCombo, 0, null, 0) : 0,
    tracking.avgReactionTimeMs != null ? clampNumber_(tracking.avgReactionTimeMs, 0, null, 0) : 0,
    tracking.avgThinkingTimeMs != null ? clampNumber_(tracking.avgThinkingTimeMs, 0, null, 0) : 0,
    tracking.totalActions != null ? clampNumber_(tracking.totalActions, 0, null, 0) : 0,

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
    clampNumber_(item.educationYears, 0, 30, ''),
    asString_(item.gender, 'unknown'),
    normalizeTransferCode_(item.transferCode),
    item.transferCodeUpdatedAt ? asISO_(item.transferCodeUpdatedAt) : '',
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
    clampNumber_(item.soundVolume, 0, 1, 0),
    clampNumber_(item.musicVolume, 0, 1, 0),
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
    clampNumber_(item.totalGamesPlayed, 0, null, 0),
    clampNumber_(item.totalPlayTime, 0, null, 0),
    clampNumber_(item.averageScore, 0, 100, 0),
    safeJsonStringifyObject_(item.bestScores),
    safeJsonStringifyObject_(item.gamePlayCounts),
    asString_(item.favoriteGameId, ''),
    item.lastPlayedAt ? asISO_(item.lastPlayedAt) : '',
    clampNumber_(item.streak, 0, null, 0),
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
    clampNumber_(item.totalScore, 0, 5, 0),
    clampNumber_(item.wordRecallScore, 0, 3, 0),
    clampNumber_(item.clockDrawingScore, 0, 3, 0),
    clampNumber_(item.clockSelfAssessmentScore, 0, 3, 0),
    asBoolean_(item.atRisk, false),
    clampNumber_(item.duration, 0, null, 0),
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
    clampNumber_(item.totalDuration, 0, null, 0),
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
    var requestId = Utilities.getUuid()
    var serverTime = new Date().toISOString()

    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput_({ ok: false, error: 'No post data received', requestId: requestId, serverTime: serverTime })
    }

    if (CONFIG.MAX_PAYLOAD_BYTES && e.postData.contents.length > CONFIG.MAX_PAYLOAD_BYTES) {
      return jsonOutput_({ ok: false, error: 'Payload too large', requestId: requestId, serverTime: serverTime })
    }

    var data
    try {
      data = JSON.parse(e.postData.contents)
    } catch (err) {
      return jsonOutput_({ ok: false, error: 'Invalid JSON: ' + String(err), requestId: requestId, serverTime: serverTime })
    }

    var meta = extractAuthMeta_(data, e.parameter || {})
    var authError = enforceAuth_(meta)
    if (authError) {
      return jsonOutput_({ ok: false, error: authError, requestId: requestId, serverTime: serverTime })
    }

    var itemCount = getItemCount_(data)
    if (CONFIG.MAX_ITEMS_PER_REQUEST && itemCount > CONFIG.MAX_ITEMS_PER_REQUEST) {
      return jsonOutput_({ ok: false, error: 'Too many items', requestId: requestId, serverTime: serverTime })
    }

    var rateError = checkRateLimit_(meta.clientId, itemCount)
    if (rateError) {
      return jsonOutput_({ ok: false, error: rateError, requestId: requestId, serverTime: serverTime })
    }

    var action = (data && data.action) || 'upsertGameResults'
    if (action === 'upsertUsers') {
      var itemsU = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign({ action: action, requestId: requestId, serverTime: serverTime }, upsertUsers_(itemsU)))
    }
    if (action === 'upsertUserSettings') {
      var itemsS = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.USER_SETTINGS, CONFIG.HEADERS.USER_SETTINGS.slice(), 'odId', itemsS, validateUserSettings_, flattenUserSettingsRow_)
      ))
    }
    if (action === 'upsertUserStats') {
      var itemsSt = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.USER_STATS, CONFIG.HEADERS.USER_STATS.slice(), 'odId', itemsSt, validateUserStats_, flattenUserStatsRow_)
      ))
    }
    if (action === 'upsertDataConsent') {
      var itemsC = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.DATA_CONSENT, CONFIG.HEADERS.DATA_CONSENT.slice(), 'odId', itemsC, validateDataConsent_, flattenDataConsentRow_)
      ))
    }
    if (action === 'upsertMiniCogResults') {
      var itemsM = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.MINI_COG_RESULTS, CONFIG.HEADERS.MINI_COG_RESULTS.slice(), 'id', itemsM, validateMiniCogResult_, flattenMiniCogResultRow_)
      ))
    }
    if (action === 'upsertDailyTrainingSessions') {
      var itemsD = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.DAILY_TRAINING_SESSIONS, CONFIG.HEADERS.DAILY_TRAINING_SESSIONS.slice(), 'id', itemsD, validateDailyTrainingSession_, flattenDailyTrainingSessionRow_)
      ))
    }
    if (action === 'upsertBaselineAssessments') {
      var itemsB = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.BASELINE_ASSESSMENTS, CONFIG.HEADERS.BASELINE_ASSESSMENTS.slice(), 'id', itemsB, validateBaselineAssessment_, flattenBaselineAssessmentRow_)
      ))
    }
    if (action === 'upsertDeclineAlerts') {
      var itemsA = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.DECLINE_ALERTS, CONFIG.HEADERS.DECLINE_ALERTS.slice(), 'id', itemsA, validateDeclineAlert_, flattenDeclineAlertRow_)
      ))
    }
    if (action === 'upsertNutritionRecommendations') {
      var itemsN = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS, CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS.slice(), 'id', itemsN, validateNutritionRecommendation_, flattenNutritionRecommendationRow_)
      ))
    }
    if (action === 'upsertBehaviorLogs') {
      var itemsL = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign(
        { action: action, requestId: requestId, serverTime: serverTime },
        upsertByKey_(CONFIG.SHEETS.BEHAVIOR_LOGS, CONFIG.HEADERS.BEHAVIOR_LOGS.slice(), 'id', itemsL, validateBehaviorLog_, flattenBehaviorLogRow_)
      ))
    }
    if (action === 'upsertGameResults') {
      var itemsG = Array.isArray(data.items) ? data.items : [data]
      return jsonOutput_(Object.assign({ action: action, requestId: requestId, serverTime: serverTime }, upsertGameResults_(itemsG)))
    }

    return jsonOutput_({ ok: false, error: 'Unknown action: ' + action, requestId: requestId, serverTime: serverTime })
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

    if (action !== 'ping') {
      var meta = extractAuthMeta_(null, params)
      var authError = enforceAuth_(meta)
      if (authError) {
        var outAuth = { ok: false, action: action, error: authError }
        return callback ? jsonpOutput_(callback, outAuth) : jsonOutput_(outAuth)
      }
      var rateError = checkRateLimit_(meta.clientId, 1)
      if (rateError) {
        var outRate = { ok: false, action: action, error: rateError }
        return callback ? jsonpOutput_(callback, outRate) : jsonOutput_(outRate)
      }
    }

    if (action === 'ping') {
      var outPing = { ok: true, action: action, serverTime: new Date().toISOString() }
      return callback ? jsonpOutput_(callback, outPing) : jsonOutput_(outPing)
    }

    if (action === 'getUserByTransferCode') {
      var code = normalizeTransferCode_(params.code || '')
      if (!code) {
        var outErrCode = { ok: false, action: action, error: 'missing code' }
        return callback ? jsonpOutput_(callback, outErrCode) : jsonOutput_(outErrCode)
      }

      var headersU0 = CONFIG.HEADERS.USERS.slice()
      var sheetU0 = getOrCreateSheet_(CONFIG.SHEETS.USERS, headersU0)
      ensureHeaders_(sheetU0, headersU0)

      var headerRow = sheetU0.getRange(1, 1, 1, Math.max(1, sheetU0.getLastColumn())).getValues()[0] || []
      var codeIdx = findHeaderIndex_(headerRow, 'transferCode')
      if (codeIdx < 0) codeIdx = headersU0.indexOf('transferCode')
      var updatedIdx = findHeaderIndex_(headerRow, 'updatedAt')
      if (updatedIdx < 0) updatedIdx = headersU0.indexOf('updatedAt')

      var lastRow0 = sheetU0.getLastRow()
      if (lastRow0 < 2) {
        var outEmpty0 = { ok: true, action: action, user: null }
        return callback ? jsonpOutput_(callback, outEmpty0) : jsonOutput_(outEmpty0)
      }

      var rowWidth = Math.max(headersU0.length, sheetU0.getLastColumn(), 1)
      var rows0 = sheetU0.getRange(2, 1, lastRow0 - 1, rowWidth).getValues()
      var bestRow = null
      var bestUpdated = 0
      for (var r0 = 0; r0 < rows0.length; r0++) {
        var rowVals0 = rows0[r0]
        var match = false
        if (codeIdx >= 0) {
          var rowCode = normalizeTransferCode_(rowVals0[codeIdx])
          match = rowCode && rowCode === code
        } else {
          for (var c0 = 0; c0 < rowVals0.length; c0++) {
            var candidate = normalizeTransferCode_(rowVals0[c0])
            if (candidate && candidate === code && isValidTransferCode_(candidate)) {
              match = true
              break
            }
          }
        }
        if (!match) continue
        var updatedAtVal = updatedIdx >= 0 ? String(rowVals0[updatedIdx] || '') : ''
        var updatedTime = updatedAtVal ? new Date(updatedAtVal).getTime() : 0
        if (!bestRow || updatedTime >= bestUpdated) {
          bestRow = rowVals0
          bestUpdated = updatedTime
        }
      }

      if (!bestRow) {
        var outNullCode = { ok: true, action: action, user: null }
        return callback ? jsonpOutput_(callback, outNullCode) : jsonOutput_(outNullCode)
      }

      var user0 = {}
      if (headerRow.length > 0) {
        for (var c0 = 0; c0 < headerRow.length; c0++) {
          var key0 = String(headerRow[c0] || '').trim()
          if (!key0) continue
          user0[key0] = bestRow[c0]
        }
      } else {
        for (var c0b = 0; c0b < headersU0.length; c0b++) user0[headersU0[c0b]] = bestRow[c0b]
      }
      var outUser0 = { ok: true, action: action, user: user0 }
      return callback ? jsonpOutput_(callback, outUser0) : jsonOutput_(outUser0)
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

      var headerRowU = sheetU.getRange(1, 1, 1, Math.max(1, sheetU.getLastColumn())).getValues()[0] || []
      var userIdIdx = findHeaderIndex_(headerRowU, 'userId')
      if (userIdIdx < 0) userIdIdx = headersU.indexOf('userId')
      var userIdCol = userIdIdx >= 0 ? userIdIdx + 1 : 1
      var rowByUserId = buildKeyRowMapFromCol_(sheetU, userIdCol, false)
      var row = rowByUserId[userId]

      if (!row || row < 2) {
        var outNull = { ok: true, action: action, user: null }
        return callback ? jsonpOutput_(callback, outNull) : jsonOutput_(outNull)
      }

      var rowWidthU = Math.max(headersU.length, sheetU.getLastColumn(), 1)
      var values = sheetU.getRange(row, 1, 1, rowWidthU).getValues()[0]
      var user = {}
      if (headerRowU.length > 0) {
        for (var i = 0; i < headerRowU.length; i++) {
          var keyU = String(headerRowU[i] || '').trim()
          if (!keyU) continue
          user[keyU] = values[i]
        }
      } else {
        for (var i0 = 0; i0 < headersU.length; i0++) user[headersU[i0]] = values[i0]
      }
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
      var headerRow0 = sheet0.getRange(1, 1, 1, Math.max(1, sheet0.getLastColumn())).getValues()[0] || []
      var keyIdx0 = findHeaderIndex_(headerRow0, 'odId')
      if (keyIdx0 < 0) keyIdx0 = headers0.indexOf('odId')
      var keyCol = keyIdx0 >= 0 ? keyIdx0 + 1 : 1
      var rowByKey = buildKeyRowMapFromCol_(sheet0, keyCol, false)
      var row0 = rowByKey[odId]
      if (!row0 || row0 < 2) {
        var outNull0 = { ok: true, action: action, item: null }
        return callback ? jsonpOutput_(callback, outNull0) : jsonOutput_(outNull0)
      }
      var rowWidth0 = Math.max(headers0.length, sheet0.getLastColumn(), 1)
      var values0 = sheet0.getRange(row0, 1, 1, rowWidth0).getValues()[0]
      var item0 = {}
      if (headerRow0.length > 0) {
        for (var j = 0; j < headerRow0.length; j++) {
          var key0 = String(headerRow0[j] || '').trim()
          if (!key0) continue
          item0[key0] = values0[j]
        }
      } else {
        for (var j0 = 0; j0 < headers0.length; j0++) item0[headers0[j0]] = values0[j0]
      }
      var outItem0 = { ok: true, action: action, item: item0 }
      return callback ? jsonpOutput_(callback, outItem0) : jsonOutput_(outItem0)
    }

    if (action === 'getUserSnapshot') {
      var userIdSnap = params.userId || params.odId || ''
      if (!userIdSnap) {
        var outSnapErr = { ok: false, action: action, error: 'missing userId' }
        return callback ? jsonpOutput_(callback, outSnapErr) : jsonOutput_(outSnapErr)
      }

      var limitGameResults = parseLimit_(params.limitGameResults, 20, 0, 200)
      var limitDaily = parseLimit_(params.limitDailyTraining, 3, 0, 50)
      var limitMiniCog = parseLimit_(params.limitMiniCog, 2, 0, 20)
      var limitBaseline = parseLimit_(params.limitBaseline, 1, 0, 20)
      var limitDecline = parseLimit_(params.limitDeclineAlerts, 3, 0, 50)
      var limitNutrition = parseLimit_(params.limitNutrition, 5, 0, 50)

      var serverTimeSnap = new Date().toISOString()
      var userSnap = getSingleByKey_(CONFIG.SHEETS.USERS, CONFIG.HEADERS.USERS.slice(), 'userId', userIdSnap)
      var settingsSnap = getSingleByKey_(CONFIG.SHEETS.USER_SETTINGS, CONFIG.HEADERS.USER_SETTINGS.slice(), 'odId', userIdSnap)
      var statsSnap = getSingleByKey_(CONFIG.SHEETS.USER_STATS, CONFIG.HEADERS.USER_STATS.slice(), 'odId', userIdSnap)
      var consentSnap = getSingleByKey_(CONFIG.SHEETS.DATA_CONSENT, CONFIG.HEADERS.DATA_CONSENT.slice(), 'odId', userIdSnap)

      var recentGameResults = collectRecentRowsByUser_(
        CONFIG.SHEETS.GAME_RESULTS,
        CONFIG.HEADERS.GAME_RESULTS.slice(),
        'userId',
        userIdSnap,
        limitGameResults
      )
      var dailyTrainingSessions = collectRecentRowsByUser_(
        CONFIG.SHEETS.DAILY_TRAINING_SESSIONS,
        CONFIG.HEADERS.DAILY_TRAINING_SESSIONS.slice(),
        'odId',
        userIdSnap,
        limitDaily
      )
      var miniCogResults = collectRecentRowsByUser_(
        CONFIG.SHEETS.MINI_COG_RESULTS,
        CONFIG.HEADERS.MINI_COG_RESULTS.slice(),
        'odId',
        userIdSnap,
        limitMiniCog
      )
      var baselineAssessments = collectRecentRowsByUser_(
        CONFIG.SHEETS.BASELINE_ASSESSMENTS,
        CONFIG.HEADERS.BASELINE_ASSESSMENTS.slice(),
        'odId',
        userIdSnap,
        limitBaseline
      )
      var declineAlerts = collectRecentRowsByUser_(
        CONFIG.SHEETS.DECLINE_ALERTS,
        CONFIG.HEADERS.DECLINE_ALERTS.slice(),
        'odId',
        userIdSnap,
        limitDecline
      )
      var nutritionRecommendations = collectRecentRowsByUser_(
        CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS,
        CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS.slice(),
        'odId',
        userIdSnap,
        limitNutrition
      )

      var outSnap = {
        ok: true,
        action: action,
        serverTime: serverTimeSnap,
        snapshotAt: serverTimeSnap,
        user: userSnap,
        settings: settingsSnap,
        stats: statsSnap,
        consent: consentSnap,
        recentGameResults: recentGameResults,
        dailyTrainingSessions: dailyTrainingSessions,
        miniCogResults: miniCogResults,
        baselineAssessments: baselineAssessments,
        declineAlerts: declineAlerts,
        nutritionRecommendations: nutritionRecommendations,
      }
      return callback ? jsonpOutput_(callback, outSnap) : jsonOutput_(outSnap)
    }

    if (action === 'getUserDelta') {
      var userIdDelta = params.userId || params.odId || ''
      if (!userIdDelta) {
        var outDeltaErr = { ok: false, action: action, error: 'missing userId' }
        return callback ? jsonpOutput_(callback, outDeltaErr) : jsonOutput_(outDeltaErr)
      }

      var sinceDelta = params.since || ''
      var serverTimeDelta = new Date().toISOString()

      var userDelta = getSingleByKey_(CONFIG.SHEETS.USERS, CONFIG.HEADERS.USERS.slice(), 'userId', userIdDelta)
      if (userDelta && !isUpdatedSince_(userDelta.updatedAt, sinceDelta)) {
        userDelta = null
      }
      var settingsDelta = getSingleByKey_(CONFIG.SHEETS.USER_SETTINGS, CONFIG.HEADERS.USER_SETTINGS.slice(), 'odId', userIdDelta)
      if (settingsDelta && !isUpdatedSince_(settingsDelta.updatedAt, sinceDelta)) {
        settingsDelta = null
      }
      var statsDelta = getSingleByKey_(CONFIG.SHEETS.USER_STATS, CONFIG.HEADERS.USER_STATS.slice(), 'odId', userIdDelta)
      if (statsDelta && !isUpdatedSince_(statsDelta.updatedAt, sinceDelta)) {
        statsDelta = null
      }
      var consentDelta = getSingleByKey_(CONFIG.SHEETS.DATA_CONSENT, CONFIG.HEADERS.DATA_CONSENT.slice(), 'odId', userIdDelta)
      if (consentDelta && !isUpdatedSince_(consentDelta.consentTimestamp, sinceDelta)) {
        consentDelta = null
      }

      var gameResultsDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.GAME_RESULTS,
        CONFIG.HEADERS.GAME_RESULTS.slice(),
        'userId',
        userIdDelta,
        sinceDelta,
        ['timestamp']
      )
      var miniCogDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.MINI_COG_RESULTS,
        CONFIG.HEADERS.MINI_COG_RESULTS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['completedAt']
      )
      var dailyTrainingDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.DAILY_TRAINING_SESSIONS,
        CONFIG.HEADERS.DAILY_TRAINING_SESSIONS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['completedAt', 'startedAt', 'date']
      )
      var baselineDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.BASELINE_ASSESSMENTS,
        CONFIG.HEADERS.BASELINE_ASSESSMENTS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['assessedAt']
      )
      var declineDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.DECLINE_ALERTS,
        CONFIG.HEADERS.DECLINE_ALERTS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['detectedAt']
      )
      var nutritionDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.NUTRITION_RECOMMENDATIONS,
        CONFIG.HEADERS.NUTRITION_RECOMMENDATIONS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['recommendedAt']
      )
      var behaviorDelta = collectRowsByUserSince_(
        CONFIG.SHEETS.BEHAVIOR_LOGS,
        CONFIG.HEADERS.BEHAVIOR_LOGS.slice(),
        'odId',
        userIdDelta,
        sinceDelta,
        ['timestamp']
      )

      var outDelta = {
        ok: true,
        action: action,
        serverTime: serverTimeDelta,
        since: sinceDelta,
        user: userDelta,
        settings: settingsDelta,
        stats: statsDelta,
        consent: consentDelta,
        gameResults: gameResultsDelta,
        miniCogResults: miniCogDelta,
        dailyTrainingSessions: dailyTrainingDelta,
        baselineAssessments: baselineDelta,
        declineAlerts: declineDelta,
        nutritionRecommendations: nutritionDelta,
        behaviorLogs: behaviorDelta,
      }
      return callback ? jsonpOutput_(callback, outDelta) : jsonOutput_(outDelta)
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
      var headerRowG = sheetG.getRange(1, 1, 1, Math.max(1, sheetG.getLastColumn())).getValues()[0] || []
      var rowWidthG = Math.max(headersG.length, sheetG.getLastColumn(), 1)
      var rows = sheetG.getRange(cursor, 1, endRow - cursor + 1, rowWidthG).getValues()

      var userIdIdx = findHeaderIndex_(headerRowG, 'userId')
      if (userIdIdx < 0) userIdIdx = headersG.indexOf('userId')
      var tsIdx = findHeaderIndex_(headerRowG, 'timestamp')
      if (tsIdx < 0) tsIdx = headersG.indexOf('timestamp')
      var items = []

      for (var r = 0; r < rows.length; r++) {
        var rowVals = rows[r]
        if (asString_(rowVals[userIdIdx]) !== userId2) continue
        var ts = asString_(rowVals[tsIdx])
        if (since && ts && ts < since) continue

        var item = {}
        if (headerRowG.length > 0) {
          for (var c = 0; c < headerRowG.length; c++) {
            var keyG = String(headerRowG[c] || '').trim()
            if (!keyG) continue
            item[keyG] = rowVals[c]
          }
        } else {
          for (var c0g = 0; c0g < headersG.length; c0g++) item[headersG[c0g]] = rowVals[c0g]
        }
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
      var headerRow2 = sheet2.getRange(1, 1, 1, Math.max(1, sheet2.getLastColumn())).getValues()[0] || []
      var rowWidth2 = Math.max(headers2.length, sheet2.getLastColumn(), 1)
      var rows2 = sheet2.getRange(cursor2, 1, endRow2 - cursor2 + 1, rowWidth2).getValues()

      var userIdIdx2 = findHeaderIndex_(headerRow2, config.key)
      if (userIdIdx2 < 0) userIdIdx2 = headers2.indexOf(config.key)
      var tsIdx2 = findHeaderIndex_(headerRow2, 'completedAt')
      if (tsIdx2 < 0) tsIdx2 = findHeaderIndex_(headerRow2, 'timestamp')
      if (tsIdx2 < 0) tsIdx2 = findHeaderIndex_(headerRow2, 'assessedAt')
      if (tsIdx2 < 0) tsIdx2 = findHeaderIndex_(headerRow2, 'detectedAt')
      if (tsIdx2 < 0) tsIdx2 = findHeaderIndex_(headerRow2, 'recommendedAt')
      if (tsIdx2 < 0) tsIdx2 = findHeaderIndex_(headerRow2, 'startedAt')
      if (tsIdx2 < 0) tsIdx2 = headers2.indexOf('completedAt')
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
        if (headerRow2.length > 0) {
          for (var c2 = 0; c2 < headerRow2.length; c2++) {
            var key2 = String(headerRow2[c2] || '').trim()
            if (!key2) continue
            item2[key2] = rowVals2[c2]
          }
        } else {
          for (var c2b = 0; c2b < headers2.length; c2b++) item2[headers2[c2b]] = rowVals2[c2b]
        }
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

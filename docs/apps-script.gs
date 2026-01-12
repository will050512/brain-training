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
  var sheet = getOrCreateSheet_(CONFIG.SHEETS.USERS, headers)
  ensureHeaders_(sheet, headers)

  var userIdCol = headers.indexOf('userId') + 1
  var rowByUserId = buildKeyRowMapFromCol_(sheet, userIdCol, false)

  var appends = []
  var updates = []
  var results = []

  var baseAppendRow = sheet.getLastRow() + 1
  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    var err = validateUser_(item)
    if (err) {
      results.push({ ok: false, userId: (item && item.userId) || '', error: err })
      continue
    }

    var userId = String(item.userId).trim()
    var rowValues = flattenUserRow_(item)
    var existingRow = rowByUserId[userId]
    if (existingRow && existingRow >= 2) {
      updates.push({ row: existingRow, values: rowValues })
      results.push({ ok: true, userId: userId, op: 'update', row: existingRow })
    } else {
      var reservedRow = baseAppendRow + appends.length
      rowByUserId[userId] = reservedRow
      appends.push(rowValues)
      results.push({ ok: true, userId: userId, op: 'append', row: reservedRow })
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

  return { ok: true, sheet: CONFIG.SHEETS.USERS, updated: updates.length, appended: appends.length, results: results }
}

/**
 * POST API
 * - { action:'upsertGameResults', items:[...] } or single object
 * - { action:'upsertUsers', items:[...] } or single object
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

    var outUnknown = { ok: false, error: 'Unknown action: ' + action }
    return callback ? jsonpOutput_(callback, outUnknown) : jsonOutput_(outUnknown)
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error) })
  }
}

function setupSheets() {
  getOrCreateSheet_(CONFIG.SHEETS.GAME_RESULTS, CONFIG.HEADERS.GAME_RESULTS.slice())
  getOrCreateSheet_(CONFIG.SHEETS.USERS, CONFIG.HEADERS.USERS.slice())
  Logger.log('Sheets initialized.')
}


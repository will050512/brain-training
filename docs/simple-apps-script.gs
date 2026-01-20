/**
 * Simple Apps Script Web App for game results
 * Columns: Timestamp, UserID, Score, GameMode, Duration, RawData
 *
 * Deploy as Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const SHEET_NAME = 'GameResultsSimple'

function doPost(e) {
  try {
    const payload = parsePayload(e)
    if (!payload) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Invalid payload' }))
        .setMimeType(ContentService.MimeType.JSON)
    }

    const { userId, score, gameMode, duration, rawData } = payload
    if (!userId || score === null || score === undefined) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Missing required fields' }))
        .setMimeType(ContentService.MimeType.JSON)
    }

    const sheet = getOrCreateSheet_(SHEET_NAME)
    const timestamp = new Date().toISOString()
    const row = [
      timestamp,
      String(userId),
      Number(score),
      gameMode ? String(gameMode) : '',
      duration ? Number(duration) : 0,
      rawData ? JSON.stringify(rawData) : '{}',
    ]

    sheet.appendRow(row)

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) return null
  try {
    return JSON.parse(e.postData.contents)
  } catch (err) {
    return null
  }
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(['Timestamp', 'UserID', 'Score', 'GameMode', 'Duration', 'RawData'])
  }
  return sheet
}

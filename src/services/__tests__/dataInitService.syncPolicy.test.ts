import { beforeEach, describe, expect, it, vi } from 'vitest'

;((globalThis as unknown as { __APP_VERSION__?: string }).__APP_VERSION__ = '1.0.0')

vi.mock('@/services/sheetRestoreService', () => ({
  restoreAllUserDataFromSheet: vi.fn().mockResolvedValue({}),
  restoreUserDeltaFromSheet: vi.fn().mockResolvedValue({}),
  restoreUserSnapshotFromSheet: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/services/googleSheetSyncService', () => ({
  SHEET_SCHEMA_VERSION: 1,
  SHEET_SCORING_VERSION: 2,
  backfillUserSessionsToSheet: vi.fn(),
}))

vi.mock('@/services/userDataSheetSyncService', () => ({
  SCHEMA_VERSION: 1,
  backfillAllUserDataToSheet: vi.fn(),
}))

vi.mock('@/stores/gameStore', () => ({
  useGameStore: () => ({
    loadUserSessions: vi.fn().mockResolvedValue(undefined),
    syncDailyTrainingFromDB: vi.fn().mockResolvedValue(undefined),
    $subscribe: vi.fn(),
  }),
}))

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    setAssessmentUser: vi.fn(),
    setAssessmentResult: vi.fn(),
  }),
}))

vi.mock('@/services/offlineSyncService', () => ({
  getSyncService: () => ({
    onStatusChange: vi.fn(() => () => undefined),
  }),
}))

vi.mock('@/services/db', () => ({
  getTodayTrainingSession: vi.fn().mockResolvedValue(null),
  saveDailyTrainingSession: vi.fn().mockResolvedValue(undefined),
  getLatestBaselineAssessment: vi.fn().mockResolvedValue(null),
  getLatestMiniCogResult: vi.fn().mockResolvedValue(null),
}))

const { restoreAllUserDataFromSheet, restoreUserDeltaFromSheet } = await import('@/services/sheetRestoreService')
const { dataInitService } = await import('@/services/dataInitService')

describe('dataInitService sync policy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('uses delta by default when version is stable', async () => {
    const odId = 'user-a'
    localStorage.setItem('sheetDeltaVersion:' + odId, JSON.stringify({
      appVersion: '1.0.0',
      sheetSchemaVersion: 1,
      sheetScoringVersion: 2,
      dataSchemaVersion: 1,
    }))

    await dataInitService.initUserData(odId)

    expect(restoreUserDeltaFromSheet).toHaveBeenCalled()
    expect(restoreAllUserDataFromSheet).not.toHaveBeenCalled()
  })

  it('falls back to full when version mismatch is detected', async () => {
    const odId = 'user-b'
    localStorage.setItem('sheetDeltaVersion:' + odId, JSON.stringify({
      appVersion: '0.9.0',
      sheetSchemaVersion: 1,
      sheetScoringVersion: 1,
      dataSchemaVersion: 1,
    }))

    await dataInitService.initUserData(odId)

    expect(restoreAllUserDataFromSheet).toHaveBeenCalled()
  })

  it('falls back to full when delta failure threshold exceeded', async () => {
    const odId = 'user-c'
    localStorage.setItem('sheetDeltaFailCount:' + odId, '3')

    await dataInitService.refreshUserDataFromSheet(odId, { mode: 'delta' })

    expect(restoreAllUserDataFromSheet).toHaveBeenCalled()
  })
})

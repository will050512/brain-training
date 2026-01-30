import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/db', () => ({
  getUnsyncedBehaviorLogs: vi.fn(async () => [{ id: 'log-1' }]),
  markBehaviorLogsSynced: vi.fn(async () => {}),
  cleanupOldBehaviorLogs: vi.fn(async () => 0),
  getPendingSyncItems: vi.fn(async () => []),
  addPendingSyncItem: vi.fn(async () => {}),
  removePendingSyncItem: vi.fn(async () => {}),
  incrementSyncRetryCount: vi.fn(async () => {}),
  generateId: vi.fn(() => 'id-1'),
}))

vi.mock('@/services/userDataSheetSyncService', () => ({
  syncBehaviorLogsToSheet: vi.fn(async () => {
    throw new Error('sync failed')
  }),
}))

describe('offlineSyncService backoff', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules retry after 5 consecutive failures', async () => {
    vi.resetModules()
    const { getSyncService } = await import('@/services/offlineSyncService')
    const service = getSyncService()

    await service.sync()
    await service.sync()
    await service.sync()
    await service.sync()
    await service.sync()

    expect(vi.getTimerCount()).toBeGreaterThan(0)
  })
})

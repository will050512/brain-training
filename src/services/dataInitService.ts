import { ref, readonly } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useUserStore } from '@/stores/userStore'
import { getSyncService, type SyncStatus } from '@/services/offlineSyncService'
import { getTodayTrainingSession, saveDailyTrainingSession, getLatestBaselineAssessment, getLatestMiniCogResult } from '@/services/db'
import { syncDailyTrainingSessionToSheet } from '@/services/userDataSheetSyncService'
import { backfillUserSessionsToSheet } from '@/services/googleSheetSyncService'
import { backfillAllUserDataToSheet } from '@/services/userDataSheetSyncService'
import { restoreAllUserDataFromSheet, restoreUserDeltaFromSheet, restoreUserSnapshotFromSheet } from '@/services/sheetRestoreService'
import { SCHEMA_VERSION as DATA_SCHEMA_VERSION } from '@/services/userDataSheetSyncService'
import { SHEET_SCHEMA_VERSION, SHEET_SCORING_VERSION } from '@/services/googleSheetSyncService'
import {
  hasVersionMismatch,
  incrementDeltaFailureCount,
  resetDeltaFailureCount,
  saveStoredSyncVersions,
  shouldFallbackToFullRestore,
  type SyncVersionSnapshot
} from '@/services/syncPolicyService'
import { useSettingsStore } from '@/stores/settingsStore'

export type DataSyncStatus = SyncStatus | 'pending'

export interface DataSyncConfig {
  debounceMs: number
  autoSyncEnabled: boolean
  maxRetries: number
}

const DEFAULT_CONFIG: DataSyncConfig = {
  debounceMs: 150,
  autoSyncEnabled: true,
  maxRetries: 3
}

class DataInitService {
  private config: DataSyncConfig
  private _syncStatus = ref<DataSyncStatus>('idle')
  private subscriptions: (() => void)[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isInitialized = false
  private backgroundSync: Promise<void> | null = null
  private backgroundSyncUserId: string | null = null

  constructor(config: Partial<DataSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get syncStatus() {
    return readonly(this._syncStatus)
  }

  private setSyncStatus(status: DataSyncStatus) {
    this._syncStatus.value = status
  }

  async initialize(config?: Partial<DataSyncConfig>) {
    if (this.isInitialized) return
    
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Setup offline sync listener
    const offlineSync = getSyncService()
    const unsubscribeOffline = offlineSync.onStatusChange((status) => {
      // Only update if not in 'pending' state (which is handled by us)
      if (this._syncStatus.value !== 'pending') {
        this.setSyncStatus(status)
      }
    })
    this.subscriptions.push(unsubscribeOffline)

    this.setupStoreSubscriptions()
    this.isInitialized = true
  }

  async initUserData(odId: string, options?: { forceRestore?: boolean; mode?: 'full' | 'fast' | 'delta' }) {
    const gameStore = useGameStore()
    const settingsStore = useSettingsStore()

    const mode = options?.mode ?? 'delta'
    this.setSyncStatus('syncing')

    const versionSnapshot: SyncVersionSnapshot = {
      appVersion: __APP_VERSION__ || 'unknown',
      sheetSchemaVersion: SHEET_SCHEMA_VERSION,
      sheetScoringVersion: SHEET_SCORING_VERSION,
      dataSchemaVersion: DATA_SCHEMA_VERSION,
    }

    if (mode === 'fast') {
      try {
        settingsStore.setAssessmentUser(odId)
        await restoreUserSnapshotFromSheet(odId, { force: options?.forceRestore })
        await Promise.all([
          gameStore.loadUserSessions(odId),
          this.loadDailyTraining(odId),
        ])
        await this.syncAssessmentStatus(odId, settingsStore)
        this.setSyncStatus('idle')
        this.startBackgroundFullSync(odId)
        saveStoredSyncVersions(odId, versionSnapshot)
        return
      } catch (error) {
        console.error('Failed to init user data (fast):', error)
        this.setSyncStatus('error')
        return
      }
    }

    try {
      settingsStore.setAssessmentUser(odId)
      if (mode === 'delta') {
        const shouldFull = options?.forceRestore
          || shouldFallbackToFullRestore(odId)
          || hasVersionMismatch(odId, versionSnapshot)

        if (shouldFull) {
          await restoreAllUserDataFromSheet(odId, { force: true })
          resetDeltaFailureCount(odId)
        } else {
          await restoreUserDeltaFromSheet(odId, { force: options?.forceRestore, fallbackToFull: false })
          resetDeltaFailureCount(odId)
        }
      } else {
        await restoreAllUserDataFromSheet(odId, { force: options?.forceRestore })
      }
      await Promise.all([
        gameStore.loadUserSessions(odId),
        this.loadDailyTraining(odId),
      ])
      await this.syncAssessmentStatus(odId, settingsStore)
      await Promise.all([
        backfillUserSessionsToSheet(odId),
        backfillAllUserDataToSheet(odId),
      ])
      saveStoredSyncVersions(odId, versionSnapshot)
      this.setSyncStatus('idle')
    } catch (error) {
      console.error('Failed to init user data:', error)
      incrementDeltaFailureCount(odId)
      this.setSyncStatus('error')
    }
  }

  async refreshUserDataFromSheet(
    odId: string,
    options?: { forceRestore?: boolean; mode?: 'full' | 'delta' }
  ) {
    if (!odId) return
    const gameStore = useGameStore()
    const settingsStore = useSettingsStore()
    this.setSyncStatus('syncing')
    const versionSnapshot: SyncVersionSnapshot = {
      appVersion: __APP_VERSION__ || 'unknown',
      sheetSchemaVersion: SHEET_SCHEMA_VERSION,
      sheetScoringVersion: SHEET_SCORING_VERSION,
      dataSchemaVersion: DATA_SCHEMA_VERSION,
    }
    try {
      settingsStore.setAssessmentUser(odId)
      if (options?.mode === 'delta') {
        const shouldFull = options?.forceRestore
          || shouldFallbackToFullRestore(odId)
          || hasVersionMismatch(odId, versionSnapshot)

        if (shouldFull) {
          await restoreAllUserDataFromSheet(odId, { force: true })
          resetDeltaFailureCount(odId)
        } else {
          await restoreUserDeltaFromSheet(odId, { force: options?.forceRestore, fallbackToFull: false })
          resetDeltaFailureCount(odId)
        }
      } else {
        await restoreAllUserDataFromSheet(odId, { force: options?.forceRestore })
      }
      await Promise.all([
        gameStore.loadUserSessions(odId),
        this.loadDailyTraining(odId),
      ])
      await this.syncAssessmentStatus(odId, settingsStore)
      saveStoredSyncVersions(odId, versionSnapshot)
      this.setSyncStatus('idle')
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      incrementDeltaFailureCount(odId)
      this.setSyncStatus('error')
    }
  }

  private startBackgroundFullSync(odId: string) {
    if (!odId) return
    if (this.backgroundSync && this.backgroundSyncUserId === odId) return
    this.backgroundSyncUserId = odId
    this.backgroundSync = this.runBackgroundFullSync(odId)
      .catch(() => {
        // errors are handled in runBackgroundFullSync
      })
      .finally(() => {
        if (this.backgroundSyncUserId === odId) {
          this.backgroundSync = null
          this.backgroundSyncUserId = null
        }
      })
  }

  private async runBackgroundFullSync(odId: string) {
    const gameStore = useGameStore()
    const settingsStore = useSettingsStore()
    this.setSyncStatus('syncing')
    try {
      settingsStore.setAssessmentUser(odId)
      await restoreAllUserDataFromSheet(odId, { force: true })
      await Promise.all([
        gameStore.loadUserSessions(odId),
        this.loadDailyTraining(odId),
      ])
      await this.syncAssessmentStatus(odId, settingsStore)
      await Promise.all([
        backfillUserSessionsToSheet(odId),
        backfillAllUserDataToSheet(odId),
      ])
      this.setSyncStatus('idle')
    } catch (error) {
      console.error('Background full sync failed:', error)
      this.setSyncStatus('error')
    }
  }

  private async syncAssessmentStatus(odId: string, settingsStore: ReturnType<typeof useSettingsStore>) {
    try {
      const baseline = await getLatestBaselineAssessment(odId)
      if (baseline) {
        const suggestedDifficulty = baseline.overallLevel === 'advanced'
          ? 'hard'
          : baseline.overallLevel === 'intermediate'
            ? 'medium'
            : 'easy'
        settingsStore.setAssessmentResult({
          suggestedDifficulty,
          completedAt: baseline.assessedAt,
          scores: {
            reaction: baseline.cognitiveScores.reaction || 0,
            memory: baseline.cognitiveScores.memory || 0,
            logic: baseline.cognitiveScores.logic || 0,
          },
        })
        return
      }

      const miniCog = await getLatestMiniCogResult(odId)
      if (miniCog) {
        const suggestedDifficulty = miniCog.totalScore >= 4 ? 'hard' : miniCog.totalScore <= 2 ? 'easy' : 'medium'
        settingsStore.setAssessmentResult({
          suggestedDifficulty,
          completedAt: miniCog.completedAt,
          scores: {
            reaction: miniCog.totalScore * 20,
            memory: miniCog.wordRecall.score * 33,
            logic: miniCog.clockDrawing.score * 50,
          },
        })
      }
    } catch (error) {
      console.error('Failed to sync assessment status:', error)
    }
  }

  private async loadDailyTraining(odId: string) {
    const gameStore = useGameStore()
    await gameStore.syncDailyTrainingFromDB(odId)
  }

  private setupStoreSubscriptions() {
    const gameStore = useGameStore()
    
    // Subscribe to gameStore changes
    const unsubGame = gameStore.$subscribe((mutation, state) => {
      // Check if daily training queue changed
      if (mutation.storeId === 'game') {
        // We are specifically interested if dailyTrainingQueue items change status
        // Since we can't easily filter deep changes in $subscribe without checking state,
        // we will just debounce sync whenever game store changes if we are in daily training mode.
        if (state.isFromDailyTraining && state.dailyTrainingQueue.length > 0) {
          this.debouncedSyncDailyTraining()
        }
      }
    })
    this.subscriptions.push(unsubGame)
  }

  private debouncedSyncDailyTraining = this.createDebouncedSync(async () => {
    const gameStore = useGameStore()
    const userStore = useUserStore()
    const odId = userStore.currentUser?.id
    
    if (!odId || !gameStore.isFromDailyTraining) return

    // Sync current queue state to DB
    const session = await getTodayTrainingSession(odId)
    if (!session) return

    // Update completed games based on store state
    const completedGameIds = gameStore.dailyTrainingQueue
      .filter(item => item.isCompleted)
      .map(item => item.gameId)
    
    // Calculate total duration from queue items if available, 
    // or we might need to track it differently. 
    // The store item has `duration`.
    const totalDuration = gameStore.dailyTrainingQueue
      .reduce((sum, item) => sum + (item.duration || 0), 0)

    // Check if there are changes to save
    const hasChanges = 
      JSON.stringify(session.completedGames.sort()) !== JSON.stringify(completedGameIds.sort()) ||
      session.totalDuration !== totalDuration

    if (hasChanges) {
      session.completedGames = completedGameIds
      session.totalDuration = totalDuration
      
      // Check completion status
      if (session.completedGames.length === session.plannedGames.length && !session.completedAt) {
        session.completedAt = new Date().toISOString()
      }
      
      await saveDailyTrainingSession(session)
      await syncDailyTrainingSessionToSheet(session)
    }
  })

  private createDebouncedSync(fn: () => Promise<void>) {
    return () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.setSyncStatus('pending')
      
      this.debounceTimer = setTimeout(async () => {
        this.setSyncStatus('syncing')
        try {
          await fn()
          this.setSyncStatus('idle')
        } catch (error) {
          console.error('Sync failed:', error)
          this.setSyncStatus('error')
        }
        this.debounceTimer = null
      }, this.config.debounceMs)
    }
  }

  async retrySync() {
    const offlineSync = getSyncService()
    await offlineSync.retryAll()
    // Trigger debounced syncs immediately if pending?
    // For now, just retry offline sync.
  }

  clearUserData() {
    const gameStore = useGameStore()
    gameStore.clearDailyTraining()
    gameStore.sessions = []
    // userStore is cleared by its own logout method
  }

  destroy() {
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions = []
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.isInitialized = false
  }
}

export const dataInitService = new DataInitService()

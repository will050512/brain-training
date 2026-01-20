import { ref, readonly } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { getSyncService, type SyncStatus } from '@/services/offlineSyncService'
import { getTodayTrainingSession, saveDailyTrainingSession } from '@/services/db'
import { syncDailyTrainingSessionToSheet } from '@/services/userDataSheetSyncService'
import { backfillUserSessionsToSheet } from '@/services/googleSheetSyncService'
import { backfillAllUserDataToSheet } from '@/services/userDataSheetSyncService'

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

  async initUserData(odId: string) {
    const userStore = useUserStore()
    const gameStore = useGameStore()

    this.setSyncStatus('syncing')
    try {
      // Parallel loading
      await Promise.all([
        gameStore.loadUserSessions(odId),
        this.loadDailyTraining(odId),
        backfillUserSessionsToSheet(odId),
        backfillAllUserDataToSheet(odId)
      ])
      this.setSyncStatus('idle')
    } catch (error) {
      console.error('Failed to init user data:', error)
      this.setSyncStatus('error')
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

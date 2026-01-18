/**
 * 離線同步服務
 * 管理離線資料的佇列和批次上傳
 * 本地保留最近 7 天資料
 */

import {
  getUnsyncedBehaviorLogs,
  markBehaviorLogsSynced,
  cleanupOldBehaviorLogs,
  getPendingSyncItems,
  addPendingSyncItem,
  removePendingSyncItem,
  incrementSyncRetryCount,
  generateId,
  type BehaviorLog,
  type PendingSyncItem
} from '@/services/db'
import { useSettingsStore } from '@/stores/settingsStore'

// 同步狀態
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

// 同步結果
export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

// 同步配置
export interface SyncConfig {
  // 批次大小
  batchSize: number
  // 最大重試次數
  maxRetries: number
  // 重試間隔（毫秒）
  retryInterval: number
  // 自動同步間隔（毫秒）
  autoSyncInterval: number
  // 是否啟用自動同步
  autoSyncEnabled: boolean
}

const DEFAULT_CONFIG: SyncConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryInterval: 5000,
  autoSyncInterval: 60000, // 1 分鐘
  autoSyncEnabled: true
}

// 同步服務類
class OfflineSyncService {
  private config: SyncConfig
  private status: SyncStatus = 'idle'
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null
  private onlineListener: (() => void) | null = null
  private offlineListener: (() => void) | null = null
  private statusChangeCallbacks: ((status: SyncStatus) => void)[] = []

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeListeners()
  }

  /**
   * 初始化網路狀態監聽器
   */
  private initializeListeners(): void {
    if (typeof window === 'undefined') return

    this.onlineListener = () => {
      this.setStatus('idle')
      this.sync() // 連線時自動同步
    }

    this.offlineListener = () => {
      this.setStatus('offline')
    }

    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)

    // 初始狀態
    if (!navigator.onLine) {
      this.setStatus('offline')
    }
  }

  /**
   * 設定狀態
   */
  private setStatus(status: SyncStatus): void {
    this.status = status
    this.statusChangeCallbacks.forEach(cb => cb(status))
  }

  /**
   * 監聽狀態變化
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback)
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * 取得當前狀態
   */
  getStatus(): SyncStatus {
    return this.status
  }

  /**
   * 檢查是否在線
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine
  }

  /**
   * 開始自動同步
   */
  startAutoSync(): void {
    if (this.autoSyncTimer) return

    this.autoSyncTimer = setInterval(() => {
      if (this.isOnline() && this.status !== 'syncing') {
        this.sync()
      }
    }, this.config.autoSyncInterval)
  }

  /**
   * 停止自動同步
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  /**
   * 執行同步
   */
  async sync(): Promise<SyncResult> {
    if (!isBehaviorTrackingEnabled()) {
      console.info('[OfflineSync] Sync skipped by user preference.')
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: []
      }
    }
    if (!this.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['目前處於離線狀態']
      }
    }

    if (this.status === 'syncing') {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['同步正在進行中']
      }
    }

    this.setStatus('syncing')

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    }

    try {
      // 同步行為日誌
      const behaviorResult = await this.syncBehaviorLogs()
      result.syncedCount += behaviorResult.syncedCount
      result.failedCount += behaviorResult.failedCount
      result.errors.push(...behaviorResult.errors)

      // 處理待同步佇列
      const queueResult = await this.processPendingQueue()
      result.syncedCount += queueResult.syncedCount
      result.failedCount += queueResult.failedCount
      result.errors.push(...queueResult.errors)

      // 清理過期資料
      await this.cleanup()

      result.success = result.failedCount === 0
      this.setStatus(result.success ? 'idle' : 'error')
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : '未知錯誤')
      this.setStatus('error')
    }

    return result
  }

  /**
   * 同步行為日誌
   */
  private async syncBehaviorLogs(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    }

    try {
      const unsyncedLogs = await getUnsyncedBehaviorLogs()
      
      if (unsyncedLogs.length === 0) {
        return result
      }

      // 分批處理
      const batches = this.createBatches(unsyncedLogs, this.config.batchSize)

      for (const batch of batches) {
        try {
          // 模擬 API 調用（實際實作時替換為真實 API）
          await this.uploadBatch(batch)
          
          // 標記為已同步
          await markBehaviorLogsSynced(batch.map(log => log.id))
          result.syncedCount += batch.length
        } catch (error) {
          result.failedCount += batch.length
          result.errors.push(`批次同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
          
          // 加入待同步佇列
          for (const log of batch) {
            await this.addToQueue('behavior-log', log as unknown as Record<string, unknown>)
          }
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : '取得未同步日誌失敗')
    }

    return result
  }

  /**
   * 處理待同步佇列
   */
  private async processPendingQueue(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    }

    try {
      const pendingItems = await getPendingSyncItems()
      
      for (const item of pendingItems) {
        // 檢查重試次數
        if (item.retryCount >= this.config.maxRetries) {
          // 超過最大重試次數，移除
          await removePendingSyncItem(item.id)
          result.failedCount++
          result.errors.push(`項目 ${item.id} 已超過最大重試次數`)
          continue
        }

        try {
          await this.uploadItem(item)
          await removePendingSyncItem(item.id)
          result.syncedCount++
        } catch (error) {
          await incrementSyncRetryCount(item.id)
          result.errors.push(`項目 ${item.id} 同步失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : '處理佇列失敗')
    }

    return result
  }

  /**
   * 上傳批次資料（模擬 API 調用）
   */
  private async uploadBatch(batch: BehaviorLog[]): Promise<void> {
    // 模擬網路延遲
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 實際實作時替換為真實 API 調用
    // const response = await fetch('/api/behavior-logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(batch)
    // })
    // if (!response.ok) throw new Error('API 錯誤')
    
    console.log(`[OfflineSync] 已上傳 ${batch.length} 筆行為日誌`)
  }

  /**
   * 上傳單一項目
   */
  private async uploadItem(item: PendingSyncItem): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50))
    console.log(`[OfflineSync] 已上傳待同步項目: ${item.type}`)
  }

  /**
   * 加入待同步佇列
   */
  async addToQueue(type: PendingSyncItem['type'], data: Record<string, unknown>): Promise<void> {
    const item: PendingSyncItem = {
      id: generateId(),
      type,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0
    }
    await addPendingSyncItem(item)
  }

  /**
   * 分批
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * 清理過期資料（保留 7 天）
   */
  async cleanup(): Promise<number> {
    try {
      const deletedCount = await cleanupOldBehaviorLogs()
      if (deletedCount > 0) {
        console.log(`[OfflineSync] 已清理 ${deletedCount} 筆過期行為日誌`)
      }
      return deletedCount
    } catch (error) {
      console.error('[OfflineSync] 清理過期資料失敗:', error)
      return 0
    }
  }

  /**
   * 取得待同步數量
   */
  async getPendingCount(): Promise<{
    behaviorLogs: number
    queueItems: number
    total: number
  }> {
    const unsyncedLogs = await getUnsyncedBehaviorLogs()
    const pendingItems = await getPendingSyncItems()
    
    return {
      behaviorLogs: unsyncedLogs.length,
      queueItems: pendingItems.length,
      total: unsyncedLogs.length + pendingItems.length
    }
  }

  /**
   * 強制重試所有失敗項目
   */
  async retryAll(): Promise<SyncResult> {
    // 重置所有重試計數
    const pendingItems = await getPendingSyncItems()
    
    for (const item of pendingItems) {
      await removePendingSyncItem(item.id)
      await addPendingSyncItem({
        ...item,
        retryCount: 0
      })
    }
    
    return this.sync()
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    this.stopAutoSync()
    
    if (typeof window !== 'undefined') {
      if (this.onlineListener) {
        window.removeEventListener('online', this.onlineListener)
      }
      if (this.offlineListener) {
        window.removeEventListener('offline', this.offlineListener)
      }
    }
    
    this.statusChangeCallbacks = []
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

// 單例實例
let syncServiceInstance: OfflineSyncService | null = null

/**
 * 取得同步服務實例
 */
export function getSyncService(config?: Partial<SyncConfig>): OfflineSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OfflineSyncService(config)
  }
  return syncServiceInstance
}

/**
 * 初始化並啟動自動同步
 */
export function initAutoSync(config?: Partial<SyncConfig>): OfflineSyncService {
  const service = getSyncService(config)
  service.startAutoSync()
  return service
}

/**
 * 手動觸發同步
 */
export async function triggerSync(): Promise<SyncResult> {
  return getSyncService().sync()
}

/**
 * 檢查是否有待同步資料
 */
export async function hasPendingSync(): Promise<boolean> {
  const counts = await getSyncService().getPendingCount()
  return counts.total > 0
}

/**
 * 取得同步狀態
 */
export function getSyncStatus(): SyncStatus {
  return getSyncService().getStatus()
}

export { OfflineSyncService }

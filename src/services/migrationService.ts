/**
 * 資料遷移服務
 * 處理資料庫版本升級時的資料格式轉換
 */

import { getDB, type BehaviorLog } from './db'
import type { GameSession } from '@/types'

// 遷移版本記錄 key
const MIGRATION_VERSION_KEY = 'brain-training-migration-version'
const CURRENT_MIGRATION_VERSION = 1

/**
 * 遷移紀錄
 */
interface MigrationRecord {
  version: number
  appliedAt: string
  migrations: string[]
}

/**
 * 取得目前遷移版本
 */
export function getCurrentMigrationVersion(): number {
  try {
    const stored = localStorage.getItem(MIGRATION_VERSION_KEY)
    if (stored) {
      const record = JSON.parse(stored) as MigrationRecord
      return record.version
    }
  } catch {
    // 忽略解析錯誤
  }
  return 0
}

/**
 * 設定遷移版本
 */
function setMigrationVersion(version: number, migrations: string[]): void {
  const record: MigrationRecord = {
    version,
    appliedAt: new Date().toISOString(),
    migrations,
  }
  localStorage.setItem(MIGRATION_VERSION_KEY, JSON.stringify(record))
}

/**
 * 執行所有待執行的遷移
 */
export async function runMigrations(): Promise<{
  migrationsRun: string[]
  errors: string[]
}> {
  const currentVersion = getCurrentMigrationVersion()
  const migrationsRun: string[] = []
  const errors: string[] = []

  // Migration 1: 遊戲會話結果格式標準化
  if (currentVersion < 1) {
    try {
      await migrateGameSessionResults()
      migrationsRun.push('gameSessionResults')
    } catch (error) {
      errors.push(`gameSessionResults: ${(error as Error).message}`)
    }
  }

  // 更新遷移版本
  if (migrationsRun.length > 0 && errors.length === 0) {
    setMigrationVersion(CURRENT_MIGRATION_VERSION, migrationsRun)
  }

  return { migrationsRun, errors }
}

/**
 * Migration 1: 遊戲會話結果格式標準化
 * 確保所有 GameSession.result 包含必要欄位
 */
async function migrateGameSessionResults(): Promise<void> {
  const db = await getDB()
  const allSessions = await db.getAll('gameSessions')
  
  const sessionsToUpdate: GameSession[] = []
  
  for (const session of allSessions) {
    let needsUpdate = false
    const updatedSession = { ...session }
    
    // 確保 result 存在
    if (!updatedSession.result) {
      updatedSession.result = {
        score: 0,
        duration: 0,
      }
      needsUpdate = true
    }
    
    // 確保 result.duration 存在
    if (updatedSession.result.duration === undefined) {
      // 嘗試從 startTime/endTime 計算
      if (updatedSession.startTime && updatedSession.endTime) {
        const start = new Date(updatedSession.startTime).getTime()
        const end = new Date(updatedSession.endTime).getTime()
        updatedSession.result.duration = Math.round((end - start) / 1000)
      } else {
        updatedSession.result.duration = 0
      }
      needsUpdate = true
    }
    
    // 確保 cognitiveScores 存在（使用預設值）
    if (!updatedSession.cognitiveScores) {
      updatedSession.cognitiveScores = {
        reaction: 0,
        logic: 0,
        memory: 0,
        cognition: 0,
        coordination: 0,
        attention: 0,
      }
      needsUpdate = true
    }
    
    if (needsUpdate) {
      sessionsToUpdate.push(updatedSession)
    }
  }
  
  // 批量更新
  if (sessionsToUpdate.length > 0) {
    const tx = db.transaction('gameSessions', 'readwrite')
    await Promise.all(sessionsToUpdate.map(s => tx.store.put(s)))
    await tx.done
    
    console.log(`[Migration] Updated ${sessionsToUpdate.length} game sessions`)
  }
}

/**
 * 驗證資料完整性
 */
export async function validateDataIntegrity(): Promise<{
  isValid: boolean
  issues: string[]
}> {
  const issues: string[] = []
  
  try {
    const db = await getDB()
    
    // 檢查 gameSessions
    const sessions = await db.getAll('gameSessions')
    for (const session of sessions) {
      if (!session.id) {
        issues.push(`GameSession missing id`)
      }
      if (!session.odId) {
        issues.push(`GameSession ${session.id} missing odId`)
      }
      if (!session.result) {
        issues.push(`GameSession ${session.id} missing result`)
      }
    }
    
    // 檢查 behaviorLogs 的 synced 欄位（用於索引）
    const logs = await db.getAll('behaviorLogs')
    for (const log of logs) {
      if (log.synced === undefined) {
        issues.push(`BehaviorLog ${log.id} missing synced flag`)
      }
    }
    
  } catch (error) {
    issues.push(`Database access error: ${(error as Error).message}`)
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * 修復資料完整性問題
 */
export async function repairDataIntegrity(): Promise<{
  repaired: number
  errors: string[]
}> {
  let repaired = 0
  const errors: string[] = []
  
  try {
    const db = await getDB()
    
    // 修復 behaviorLogs 的 synced 欄位
    const logs = await db.getAll('behaviorLogs')
    const logsToUpdate: BehaviorLog[] = []
    
    for (const log of logs) {
      if (log.synced === undefined) {
        logsToUpdate.push({ ...log, synced: false })
      }
    }
    
    if (logsToUpdate.length > 0) {
      const tx = db.transaction('behaviorLogs', 'readwrite')
      await Promise.all(logsToUpdate.map(l => tx.store.put(l)))
      await tx.done
      repaired += logsToUpdate.length
    }
    
  } catch (error) {
    errors.push(`Repair error: ${(error as Error).message}`)
  }
  
  return { repaired, errors }
}

/**
 * 初始化時執行遷移檢查
 */
export async function initMigrations(): Promise<void> {
  const currentVersion = getCurrentMigrationVersion()
  
  if (currentVersion < CURRENT_MIGRATION_VERSION) {
    console.log('[Migration] Running database migrations...')
    const result = await runMigrations()
    
    if (result.errors.length > 0) {
      console.error('[Migration] Errors:', result.errors)
    } else {
      console.log('[Migration] Completed:', result.migrationsRun)
    }
  }
}

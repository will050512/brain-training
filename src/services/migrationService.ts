/**
 * 資料遷移服務
 * 處理資料庫版本升級時的資料格式轉換
 */

import { getDB, type BehaviorLog } from './db'
import type { GameSession, User, UserStats } from '@/types'
import { defaultUserStats } from '@/types/user'
import { generateTransferCode, isValidTransferCode, normalizeTransferCode } from '@/services/userTransferCode'

// 遷移版本記錄 key
const MIGRATION_VERSION_KEY = 'brain-training-migration-version'
const CURRENT_MIGRATION_VERSION = 2

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

  // Migration 2: 使用者檔案與統計補齊
  if (currentVersion < 2) {
    try {
      await migrateUserProfilesAndStats()
      migrationsRun.push('userProfilesAndStats')
    } catch (error) {
      errors.push(`userProfilesAndStats: ${(error as Error).message}`)
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
        gameId: updatedSession.gameId,
        difficulty: updatedSession.difficulty,
        subDifficulty: updatedSession.subDifficulty,
        score: 0,
        maxScore: 100,
        correctCount: 0,
        totalCount: 0,
        accuracy: 0,
        avgReactionTime: 0,
        duration: 0,
        timestamp: updatedSession.createdAt || new Date()
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
 * Migration 2: 補齊 transferCode、gamePlayCounts、favoriteGameId
 */
async function migrateUserProfilesAndStats(): Promise<void> {
  const db = await getDB()
  const users = await db.getAll('users')
  const sessions = await db.getAll('gameSessions')

  const sessionCounts = new Map<string, Record<string, number>>()
  for (const session of sessions) {
    const odId = session.odId
    if (!odId) continue
    const counts = sessionCounts.get(odId) ?? {}
    counts[session.gameId] = (counts[session.gameId] || 0) + 1
    sessionCounts.set(odId, counts)
  }

  const existingCodes = new Set(
    users
      .map(user => normalizeTransferCode(user.transferCode || ''))
      .filter(Boolean)
  )

  const usersToUpdate: User[] = []
  const statsToUpdate: UserStats[] = []

  for (const user of users) {
    let updatedUser = { ...user }
    let userChanged = false

    const normalizedCode = normalizeTransferCode(updatedUser.transferCode || '')
    if (!normalizedCode || !isValidTransferCode(normalizedCode)) {
      let newCode = generateTransferCode()
      let guard = 0
      while (existingCodes.has(newCode) && guard < 20) {
        newCode = generateTransferCode()
        guard++
      }
      existingCodes.add(newCode)
      updatedUser.transferCode = newCode
      updatedUser.transferCodeUpdatedAt = new Date()
      userChanged = true
    } else if (normalizedCode !== updatedUser.transferCode) {
      updatedUser.transferCode = normalizedCode
      userChanged = true
    }

    if (userChanged) {
      usersToUpdate.push(updatedUser)
    }

    const stats = (await db.get('userStats', user.id)) ?? defaultUserStats(user.id)
    let statsChanged = false
    const counts = sessionCounts.get(user.id) ?? {}

    if (!stats.gamePlayCounts || Object.keys(stats.gamePlayCounts).length === 0) {
      stats.gamePlayCounts = counts
      statsChanged = true
    }

    if (stats.favoriteGameId == null) {
      let favorite: string | null = null
      let bestCount = -1
      for (const gameId of Object.keys(counts)) {
        const count = counts[gameId] || 0
        if (count > bestCount) {
          bestCount = count
          favorite = gameId
        }
      }
      if (favorite) {
        stats.favoriteGameId = favorite
        statsChanged = true
      }
    }

    if (statsChanged) {
      statsToUpdate.push(stats)
    }
  }

  if (usersToUpdate.length > 0) {
    const txUsers = db.transaction('users', 'readwrite')
    await Promise.all(usersToUpdate.map(u => txUsers.store.put(u)))
    await txUsers.done
  }

  if (statsToUpdate.length > 0) {
    const txStats = db.transaction('userStats', 'readwrite')
    await Promise.all(statsToUpdate.map(s => txStats.store.put(s)))
    await txStats.done
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

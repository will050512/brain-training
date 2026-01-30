/**
 * 使用者狀態管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSettings, UserStats, UserProfile } from '@/types'
import { 
  generateUserId, 
  defaultUserSettings, 
  defaultUserStats,
  calculateAge 
} from '@/types/user'
import { normalizeBirthdayInput } from '@/utils/birthday'
import {
  saveUser,
  getUser,
  getAllUsers,
  saveUserSettings,
  getUserSettings,
  saveUserStats,
  getUserStats,
  purgeUserDataById,
} from '@/services/db'
import { getLocalDateKey } from '@/utils/dateKey'
import { dataInitService } from '@/services/dataInitService'
import { syncUserSettingsToSheet, syncUserStatsToSheet } from '@/services/userDataSheetSyncService'
import { syncUserProfileToSheet } from '@/services/userSheetSyncService'
import { generateTransferCode, isValidTransferCode, normalizeTransferCode } from '@/services/userTransferCode'
import { appendSheetAuthParams, getSheetEndpoint } from '@/services/sheetConfig'

function normalizeUser(user: User): User {
  const now = new Date()
  return {
    ...user,
    gender: user.gender ?? 'unknown',
    authProvider: user.authProvider ?? 'local',
    transferCode: user.transferCode ? normalizeTransferCode(user.transferCode) : user.transferCode,
    clientSource: user.clientSource,
    profileVersion: user.profileVersion ?? 1,
    updatedAt: user.updatedAt ?? user.lastActiveAt ?? user.createdAt ?? now,
    createdAt: user.createdAt ?? now,
    lastActiveAt: user.lastActiveAt ?? now,
  }
}

function normalizeStats(stats: UserStats): UserStats {
  return {
    ...stats,
    gamePlayCounts: stats.gamePlayCounts ?? {},
    favoriteGameId: stats.favoriteGameId ?? null,
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function toMonthKey(dateStr: string): string | null {
  if (!dateStr) return null
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.slice(0, 7)
  try {
    const parsed = new Date(dateStr)
    if (!Number.isNaN(parsed.valueOf())) {
      const yyyy = parsed.getFullYear()
      const mm = String(parsed.getMonth() + 1).padStart(2, '0')
      return `${yyyy}-${mm}`
    }
  } catch {
    return null
  }
  return null
}

async function findUserByNameAndMonthYear(name: string, birthday: string): Promise<User | null> {
  const targetName = normalizeName(name)
  const targetMonth = toMonthKey(birthday)
  if (!targetMonth) return null

  const users = await getAllUsers()
  const matches = users.filter(u => {
    return normalizeName(u.name) === targetName && toMonthKey(u.birthday) === targetMonth
  })

  if (matches.length === 0) return null
  const [mostRecent] = matches.sort((a, b) => {
    const aTime = new Date(a.lastActiveAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime()
    const bTime = new Date(b.lastActiveAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime()
    return bTime - aTime
  })
  return mostRecent ?? null
}

async function createUniqueTransferCode(): Promise<string> {
  const users = await getAllUsers()
  const existing = new Set(users.map(u => normalizeTransferCode(u.transferCode || '')).filter(Boolean))
  let code = generateTransferCode()
  let guard = 0
  while (existing.has(code) && guard < 20) {
    code = generateTransferCode()
    guard++
  }
  return code
}

async function ensureTransferCode(user: User): Promise<User> {
  if (user.transferCode && isValidTransferCode(user.transferCode)) {
    return normalizeUser(user)
  }
  const code = await createUniqueTransferCode()
  const updated = normalizeUser({
    ...user,
    transferCode: code,
    transferCodeUpdatedAt: new Date(),
  })
  await saveUser(updated as User)
  return updated
}

async function fetchUserByTransferCodeFromSheet(code: string): Promise<User | null> {
  const normalized = normalizeTransferCode(code)
  if (!isValidTransferCode(normalized)) return null

  try {
    const endpoint = getSheetEndpoint()
    if (!endpoint) return null
    const url = appendSheetAuthParams(
      `${endpoint}?action=getUserByTransferCode&code=${encodeURIComponent(normalized)}`
    )
    const res = await fetch(url)
    if (!res.ok) return null
    const payload = await res.json()
    if (!payload?.ok || !payload.user) return null
    const user = payload.user as Record<string, unknown>
    return {
      id: String(user.userId || ''),
      name: String(user.name || ''),
      birthday: String(user.birthday || ''),
      educationYears: Number(user.educationYears || 0),
      gender: (user.gender as User['gender']) || 'unknown',
      transferCode: String(user.transferCode || ''),
      transferCodeUpdatedAt: user.transferCodeUpdatedAt ? new Date(String(user.transferCodeUpdatedAt)) : undefined,
      clientSource: user.clientSource ? String(user.clientSource) : undefined,
      authProvider: user.authProvider === 'firebase' ? 'firebase' : 'local',
      createdAt: user.createdAt ? new Date(String(user.createdAt)) : new Date(),
      lastActiveAt: user.lastActiveAt ? new Date(String(user.lastActiveAt)) : new Date(),
      updatedAt: user.updatedAt ? new Date(String(user.updatedAt)) : new Date(),
      profileVersion: user.profileVersion ? Number(user.profileVersion) : 1,
    }
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  // 狀態
  const currentUser = ref<User | null>(null)
  const currentSettings = ref<UserSettings | null>(null)
  const currentStats = ref<UserStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性
  const isLoggedIn = computed(() => currentUser.value !== null)
  
  const userAge = computed(() => {
    if (!currentUser.value) return null
    return calculateAge(currentUser.value.birthday)
  })

  const userEducationYears = computed(() => {
    if (!currentUser.value) return null
    return currentUser.value.educationYears ?? null
  })

  const userProfile = computed((): UserProfile | null => {
    if (!currentUser.value || !currentSettings.value || !currentStats.value) {
      return null
    }
    return {
      user: currentUser.value,
      settings: currentSettings.value,
      stats: currentStats.value,
    }
  })

  // 動作
  
  /**
   * 登入（使用姓名+生日）
   */
  async function login(name: string, birthday: string, educationYears?: number, gender: User['gender'] = 'unknown'): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const normalizedBirthday = normalizeBirthdayInput(birthday)
      let odId = generateUserId(name, normalizedBirthday)
      
      // 檢查使用者是否存在
      let user = await getUser(odId)
      if (!user) {
        const matched = await findUserByNameAndMonthYear(name, normalizedBirthday)
        if (matched) {
          user = matched
          odId = matched.id
        }
      }
      
      if (!user) {
        // 新使用者，建立帳號
        user = {
          id: odId,
          name: name.trim(),
          birthday: normalizedBirthday,
          educationYears: educationYears ?? 0,  // 預設教育年數為 0
          gender: gender || 'unknown',
          transferCode: await createUniqueTransferCode(),
          transferCodeUpdatedAt: new Date(),
          authProvider: 'local',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          updatedAt: new Date(),
          profileVersion: 1,
        }
        await saveUser(user as User)
        
        // 建立預設設定
        const settings = defaultUserSettings(odId)
        await saveUserSettings(settings)
        
        // 建立預設統計
        const stats = defaultUserStats(odId)
        await saveUserStats(stats)
      } else {
        // 更新最後活動時間和教育年數（如果有提供）
        const now = new Date()
        user.lastActiveAt = now
        if (educationYears !== undefined) {
          user.educationYears = educationYears
        }
        if (gender) {
          user.gender = gender
        }
        user.authProvider = user.authProvider ?? 'local'
        user.updatedAt = now
        user.profileVersion = user.profileVersion ?? 1
        user.gender = (user as User).gender || 'unknown'
        if (normalizedBirthday) {
          const existingMonth = toMonthKey(user.birthday)
          const inputMonth = toMonthKey(normalizedBirthday)
          if (!user.birthday || (existingMonth && inputMonth && existingMonth !== inputMonth)) {
            user.birthday = normalizedBirthday
          }
        }
        await saveUser(user as User)
      }

      // 載入使用者資料
      currentUser.value = await ensureTransferCode(user as User)
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      const stats = await getUserStats(odId)
      currentStats.value = stats ? normalizeStats(stats) : defaultUserStats(odId)

      await syncUserProfileToSheet(currentUser.value)

      // 保存到 localStorage 以便下次恢復 session
      localStorage.setItem('brain-training-last-user', odId)
      localStorage.setItem('brain-training-current-user', odId)

      // 初始化全局資料（每日訓練/同步狀態）
      await dataInitService.initUserData(odId, { mode: 'delta' })

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登入失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 登出
   */
  function logout(): void {
    currentUser.value = null
    currentSettings.value = null
    currentStats.value = null
    localStorage.removeItem('brain-training-last-user')
    dataInitService.clearUserData()
  }

  /**
   * 更新使用者設定
   */
  async function updateSettings(settings: Partial<UserSettings>): Promise<void> {
    if (!currentSettings.value) return

    const updated = { ...currentSettings.value, ...settings }
    await saveUserSettings(updated)
    await syncUserSettingsToSheet(updated)
    currentSettings.value = updated
  }

  /**
   * 更新學歷年數（用於外部登入補齊資料）
   */
  async function updateEducationYears(educationYears: number): Promise<void> {
    if (!currentUser.value) return
    const normalized = normalizeUser(currentUser.value)
    normalized.educationYears = educationYears
    normalized.updatedAt = new Date()
    normalized.profileVersion = (normalized.profileVersion ?? 1) + 1
    await saveUser(normalized as User)
    currentUser.value = normalized

    await syncUserProfileToSheet(currentUser.value)
  }

  /**
   * 更新使用者統計
   */
  async function updateStats(stats: Partial<UserStats>): Promise<void> {
    if (!currentStats.value) return

    const updated = normalizeStats({ ...currentStats.value, ...stats })
    await saveUserStats(updated)
    await syncUserStatsToSheet(updated)
    currentStats.value = updated
  }

  /**
   * 標記已看過歡迎畫面
   */
  async function markWelcomeSeen(): Promise<void> {
    await updateSettings({ hasSeenWelcome: true })
  }

  /**
   * 切換音效
   */
  async function toggleSound(enabled?: boolean): Promise<void> {
    const newValue = enabled ?? !currentSettings.value?.soundEnabled
    await updateSettings({ soundEnabled: newValue })
  }

  /**
   * 切換背景音樂
   */
  async function toggleMusic(enabled?: boolean): Promise<void> {
    const newValue = enabled ?? !currentSettings.value?.musicEnabled
    await updateSettings({ musicEnabled: newValue })
  }

  /**
   * 記錄遊戲完成
   */
  async function recordGamePlayed(
    score: number,
    duration: number,
    gameId: string,
    mode: 'daily' | 'free' = 'free'
  ): Promise<void> {
    if (!currentStats.value) return

    const stats = normalizeStats(currentStats.value)
    const newTotalGames = stats.totalGamesPlayed + 1
    const newTotalTime = stats.totalPlayTime + duration
    const newAvgScore = ((stats.averageScore * stats.totalGamesPlayed) + score) / newTotalGames
    
    // 更新最佳分數
    const bestScores = { ...stats.bestScores }
    if (!bestScores[gameId] || score > bestScores[gameId]) {
      bestScores[gameId] = score
    }

    const gamePlayCounts = { ...stats.gamePlayCounts }
    gamePlayCounts[gameId] = (gamePlayCounts[gameId] || 0) + 1

    let favoriteGameId = stats.favoriteGameId
    if (!favoriteGameId || gamePlayCounts[gameId] >= (gamePlayCounts[favoriteGameId] || 0)) {
      favoriteGameId = gameId
    }

    // 計算連續天數（僅每日訓練）
    let streak = stats.streak
    const now = new Date()
    let lastPlayedAt = stats.lastPlayedAt

    if (mode === 'daily') {
      const todayKey = getLocalDateKey(now)
      const lastPlayedKey = stats.lastPlayedAt ? getLocalDateKey(new Date(stats.lastPlayedAt)) : null
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = getLocalDateKey(yesterday)

      if (lastPlayedKey === todayKey) {
        // 同一天，不變
      } else if (lastPlayedKey === yesterdayKey) {
        // 昨天玩過，連續天數 +1
        streak = Math.max(1, streak) + 1
      } else {
        // 超過一天沒玩，重置
        streak = 1
      }
      lastPlayedAt = now
    }

    await updateStats({
      totalGamesPlayed: newTotalGames,
      totalPlayTime: newTotalTime,
      averageScore: Math.round(newAvgScore),
      bestScores,
      gamePlayCounts,
      favoriteGameId,
      lastPlayedAt,
      streak,
    })
  }

  /**
   * 取得所有使用者列表（用於切換帳號）
   */
  async function fetchAllUsers(): Promise<User[]> {
    const users = await getAllUsers()
    const normalized = await Promise.all(users.map(async u => {
      const hadCode = Boolean(u.transferCode)
      const ensured = await ensureTransferCode(u as User)
      if (!hadCode) {
        await syncUserProfileToSheet(ensured)
      }
      return ensured
    }))
    return normalized.map(u => normalizeUser(u as User))
  }

  /**
   * 快速登入（使用已存在的使用者 ID）
   */
  async function quickLogin(odId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const user = await getUser(odId)
      if (!user) {
        error.value = '使用者不存在'
        return false
      }

      const normalized = await ensureTransferCode(user as User)
      normalized.lastActiveAt = new Date()
      normalized.updatedAt = normalized.lastActiveAt
      await saveUser(normalized)

      currentUser.value = normalized
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      const stats = await getUserStats(odId)
      currentStats.value = stats ? normalizeStats(stats) : defaultUserStats(odId)

      // 保存到 localStorage 以便下次恢復 session
      localStorage.setItem('brain-training-last-user', odId)
      localStorage.setItem('brain-training-current-user', odId)

      // 初始化全局資料
      await dataInitService.initUserData(odId, { mode: 'delta' })
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      const refreshedStats = await getUserStats(odId)
      currentStats.value = refreshedStats ? normalizeStats(refreshedStats) : defaultUserStats(odId)

      await syncUserProfileToSheet(currentUser.value)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登入失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 使用登入碼登入（跨裝置手動轉移）
   */
  async function loginWithTransferCode(code: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const normalizedCode = normalizeTransferCode(code)
      if (!isValidTransferCode(normalizedCode)) {
        error.value = '登入碼無效'
        return false
      }

      const users = await getAllUsers()
      const localMatch = users.find(u => normalizeTransferCode(u.transferCode || '') === normalizedCode)
      if (localMatch) {
        return quickLogin(localMatch.id)
      }

      const remoteUser = await fetchUserByTransferCodeFromSheet(normalizedCode)
      if (!remoteUser || !remoteUser.id) {
        error.value = '找不到對應帳號'
        return false
      }

      const now = new Date()
      let user = await getUser(remoteUser.id)
      if (!user) {
        user = {
          ...remoteUser,
          birthday: normalizeBirthdayInput(remoteUser.birthday),
          educationYears: remoteUser.educationYears ?? 0,
          gender: remoteUser.gender ?? 'unknown',
          transferCode: normalizeTransferCode(remoteUser.transferCode || normalizedCode),
          transferCodeUpdatedAt: remoteUser.transferCodeUpdatedAt ?? now,
          createdAt: remoteUser.createdAt ?? now,
          lastActiveAt: now,
          updatedAt: now,
          profileVersion: remoteUser.profileVersion ?? 1,
        }
        await saveUser(user as User)

        const settings = defaultUserSettings(remoteUser.id)
        await saveUserSettings(settings)

        const stats = defaultUserStats(remoteUser.id)
        await saveUserStats(stats)
      } else {
        const normalized = normalizeUser(user as User)
        normalized.name = remoteUser.name?.trim() || normalized.name
        normalized.birthday = normalizeBirthdayInput(remoteUser.birthday) || normalized.birthday
        normalized.educationYears = remoteUser.educationYears ?? normalized.educationYears
        normalized.gender = remoteUser.gender ?? normalized.gender
        normalized.transferCode = normalizeTransferCode(remoteUser.transferCode || normalizedCode)
        normalized.transferCodeUpdatedAt = remoteUser.transferCodeUpdatedAt ?? normalized.transferCodeUpdatedAt ?? now
        normalized.clientSource = remoteUser.clientSource ?? normalized.clientSource
        normalized.authProvider = remoteUser.authProvider ?? normalized.authProvider
        normalized.lastActiveAt = now
        normalized.updatedAt = now
        normalized.profileVersion = Math.max(normalized.profileVersion ?? 1, remoteUser.profileVersion ?? 1)
        user = normalized
        await saveUser(user as User)
      }

      currentUser.value = await ensureTransferCode(user as User)
      currentSettings.value = await getUserSettings(remoteUser.id) || defaultUserSettings(remoteUser.id)
      const stats = await getUserStats(remoteUser.id)
      currentStats.value = stats ? normalizeStats(stats) : defaultUserStats(remoteUser.id)

      localStorage.setItem('brain-training-last-user', remoteUser.id)
      localStorage.setItem('brain-training-current-user', remoteUser.id)

      await dataInitService.initUserData(remoteUser.id, { forceRestore: true, mode: 'fast' })
      currentSettings.value = await getUserSettings(remoteUser.id) || defaultUserSettings(remoteUser.id)
      const refreshedStats = await getUserStats(remoteUser.id)
      currentStats.value = refreshedStats ? normalizeStats(refreshedStats) : defaultUserStats(remoteUser.id)
      await syncUserProfileToSheet(currentUser.value)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登入失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 產生登入碼
   */
  function getTransferCode(user: User): string {
    return normalizeTransferCode(user.transferCode || '')
  }

  /**
   * 刪除本機帳號與資料
   */
  async function deleteLocalUser(odId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await purgeUserDataById(odId)
      if (currentUser.value?.id === odId) {
        logout()
      }
      const lastUserId = localStorage.getItem('brain-training-last-user')
      if (lastUserId === odId) {
        localStorage.removeItem('brain-training-last-user')
      }
      const currentUserId = localStorage.getItem('brain-training-current-user')
      if (currentUserId === odId) {
        localStorage.removeItem('brain-training-current-user')
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '刪除失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 外部登入（APP WebView / Firebase 等）
   * - 以外部 uid 作為固定 userId，避免用姓名+生日推導造成變動
   * - 需要提供 name + birthday（用於常模與報表）
   */
  async function loginWithExternalProfile(profile: {
    provider: 'firebase'
    uid: string
    name: string
    birthday: string
    educationYears?: number
    gender?: User['gender']
    clientSource?: string
  }): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const uid = profile.uid?.trim()
      if (!uid) {
        error.value = '外部登入缺少 uid'
        return false
      }
      const name = profile.name?.trim()
      if (!name) {
        error.value = '外部登入缺少姓名'
        return false
      }
      const birthday = profile.birthday?.trim()
      if (!birthday) {
        error.value = '外部登入缺少生日'
        return false
      }

      const odId = `fb_${uid}`
      const now = new Date()

      let user = await getUser(odId)
      if (!user) {
        user = {
          id: odId,
          name,
          birthday,
          educationYears: profile.educationYears ?? 0,
          gender: profile.gender ?? 'unknown',
          transferCode: await createUniqueTransferCode(),
          transferCodeUpdatedAt: now,
          clientSource: profile.clientSource,
          authProvider: 'firebase',
          createdAt: now,
          lastActiveAt: now,
          updatedAt: now,
          profileVersion: 1,
        }
        await saveUser(user as User)

        const settings = defaultUserSettings(odId)
        await saveUserSettings(settings)

        const stats = defaultUserStats(odId)
        await saveUserStats(stats)
      } else {
        const normalized = normalizeUser(user as User)
        normalized.name = name
        normalized.birthday = birthday
        if (profile.educationYears !== undefined) normalized.educationYears = profile.educationYears
        if (profile.gender) normalized.gender = profile.gender
        if (profile.clientSource) normalized.clientSource = profile.clientSource
        normalized.authProvider = 'firebase'
        normalized.lastActiveAt = now
        normalized.updatedAt = now
        if (!normalized.transferCode) {
          normalized.transferCode = await createUniqueTransferCode()
          normalized.transferCodeUpdatedAt = now
        }
        user = normalized
        await saveUser(user as User)
      }

      currentUser.value = await ensureTransferCode(user as User)
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      const stats = await getUserStats(odId)
      currentStats.value = stats ? normalizeStats(stats) : defaultUserStats(odId)

      localStorage.setItem('brain-training-last-user', odId)
      localStorage.setItem('brain-training-current-user', odId)

      await dataInitService.initUserData(odId, { mode: 'delta' })
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      const refreshedStats = await getUserStats(odId)
      currentStats.value = refreshedStats ? normalizeStats(refreshedStats) : defaultUserStats(odId)
      await syncUserProfileToSheet(currentUser.value)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '外部登入失敗'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 恢復登入狀態（從 localStorage）
   */
  async function restoreSession(): Promise<boolean> {
    const lastUserId = localStorage.getItem('brain-training-last-user')
    if (!lastUserId) return false
    
    return quickLogin(lastUserId)
  }

  return {
    // 狀態
    currentUser,
    currentSettings,
    currentStats,
    isLoading,
    error,
    
    // 計算屬性
    isLoggedIn,
    userAge,
    userEducationYears,
    userProfile,
    
    // 動作
    login,
    loginWithExternalProfile,
    loginWithTransferCode,
    getTransferCode,
    logout,
    quickLogin,
    restoreSession,
    updateSettings,
    updateEducationYears,
    updateStats,
    markWelcomeSeen,
    toggleSound,
    toggleMusic,
    recordGamePlayed,
    fetchAllUsers,
    deleteLocalUser,
  }
})

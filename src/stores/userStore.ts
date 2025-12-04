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
import {
  saveUser,
  getUser,
  getAllUsers,
  saveUserSettings,
  getUserSettings,
  saveUserStats,
  getUserStats,
} from '@/services/db'

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
  async function login(name: string, birthday: string, educationYears?: number): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const odId = generateUserId(name, birthday)
      
      // 檢查使用者是否存在
      let user = await getUser(odId)
      
      if (!user) {
        // 新使用者，建立帳號
        user = {
          id: odId,
          name: name.trim(),
          birthday,
          educationYears: educationYears ?? 0,  // 預設教育年數為 0
          createdAt: new Date(),
          lastActiveAt: new Date(),
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
        user.lastActiveAt = new Date()
        if (educationYears !== undefined) {
          user.educationYears = educationYears
        }
        await saveUser(user as User)
      }

      // 載入使用者資料
      currentUser.value = user as User
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      currentStats.value = await getUserStats(odId) || defaultUserStats(odId)

      // 保存到 localStorage 以便下次恢復 session
      localStorage.setItem('brain-training-last-user', odId)

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
  }

  /**
   * 更新使用者設定
   */
  async function updateSettings(settings: Partial<UserSettings>): Promise<void> {
    if (!currentSettings.value) return

    const updated = { ...currentSettings.value, ...settings }
    await saveUserSettings(updated)
    currentSettings.value = updated
  }

  /**
   * 更新使用者統計
   */
  async function updateStats(stats: Partial<UserStats>): Promise<void> {
    if (!currentStats.value) return

    const updated = { ...currentStats.value, ...stats }
    await saveUserStats(updated)
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
  async function recordGamePlayed(score: number, duration: number, gameId: string): Promise<void> {
    if (!currentStats.value) return

    const stats = currentStats.value
    const newTotalGames = stats.totalGamesPlayed + 1
    const newTotalTime = stats.totalPlayTime + duration
    const newAvgScore = ((stats.averageScore * stats.totalGamesPlayed) + score) / newTotalGames
    
    // 更新最佳分數
    const bestScores = { ...stats.bestScores }
    if (!bestScores[gameId] || score > bestScores[gameId]) {
      bestScores[gameId] = score
    }

    // 計算連續天數
    let streak = stats.streak
    const today = new Date().toDateString()
    const lastPlayed = stats.lastPlayedAt ? new Date(stats.lastPlayedAt).toDateString() : null
    
    if (lastPlayed === today) {
      // 同一天，不變
    } else if (lastPlayed === new Date(Date.now() - 86400000).toDateString()) {
      // 昨天玩過，連續天數 +1
      streak += 1
    } else {
      // 超過一天沒玩，重置
      streak = 1
    }

    await updateStats({
      totalGamesPlayed: newTotalGames,
      totalPlayTime: newTotalTime,
      averageScore: Math.round(newAvgScore),
      bestScores,
      lastPlayedAt: new Date(),
      streak,
    })
  }

  /**
   * 取得所有使用者列表（用於切換帳號）
   */
  async function fetchAllUsers(): Promise<User[]> {
    return getAllUsers()
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

      user.lastActiveAt = new Date()
      await saveUser(user)

      currentUser.value = user
      currentSettings.value = await getUserSettings(odId) || defaultUserSettings(odId)
      currentStats.value = await getUserStats(odId) || defaultUserStats(odId)

      // 保存到 localStorage 以便下次恢復 session
      localStorage.setItem('brain-training-last-user', odId)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '登入失敗'
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
    logout,
    quickLogin,
    restoreSession,
    updateSettings,
    updateStats,
    markWelcomeSeen,
    toggleSound,
    toggleMusic,
    recordGamePlayed,
    fetchAllUsers,
  }
})

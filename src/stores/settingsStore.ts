/**
 * 應用設定狀態管理
 */

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

// 字體大小預設值
export type FontSize = 'small' | 'medium' | 'large'

// 退化檢測模式
export type DeclineDetectionMode = 'professional' | 'general'

// 每日訓練時長選項
export type DailyTrainingDuration = 10 | 15 | 20 | 30

// 每週訓練天數目標
export type WeeklyTrainingGoal = 1 | 2 | 3 | 4 | 5 | 6 | 7

// 主題模式
export type ThemeMode = 'light' | 'dark' | 'system'


// 遊戲難度
export type GameDifficulty = 'easy' | 'medium' | 'hard'

// 同步狀態（UI 用）
export type SyncUiStatus = 'idle' | 'syncing' | 'success' | 'error'

// 遊戲子難度（細分調整）
export type GameSubDifficulty = 1 | 2 | 3

// 單款遊戲難度設定
export interface GameDifficultySetting {
  difficulty: GameDifficulty
  subDifficulty: GameSubDifficulty
}

// 所有遊戲難度設定映射
export type GameDifficultySettings = Record<string, GameDifficultySetting>

export const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
}

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
}

function normalizeFontSize(value: unknown): FontSize {
  if (value === 'small' || value === 'medium' || value === 'large') {
    return value
  }
  return 'large'
}

// 退化檢測模式設定
export const DECLINE_DETECTION_CONFIG: Record<DeclineDetectionMode, {
  name: string
  description: string
  lookbackDays: number
  declineThreshold: number
  severeDeclineThreshold: number
}> = {
  professional: {
    name: '專業模式',
    description: '使用較短期數據（7天）與較敏感的閾值（7%）',
    lookbackDays: 7,
    declineThreshold: 0.07,
    severeDeclineThreshold: 0.15,
  },
  general: {
    name: '一般模式',
    description: '使用較長期數據（30天）與較寬鬆的閾值（15%）',
    lookbackDays: 30,
    declineThreshold: 0.15,
    severeDeclineThreshold: 0.25,
  },
}

// 每日訓練時長選項設定
export const DAILY_TRAINING_OPTIONS: { value: DailyTrainingDuration; label: string; games: string }[] = [
  { value: 10, label: '10 分鐘', games: '6 款迷你遊戲' },
  { value: 15, label: '15 分鐘', games: '6-7 款遊戲' },
  { value: 20, label: '20 分鐘', games: '6-8 款遊戲' },
  { value: 30, label: '30 分鐘', games: '6-10 款遊戲' },
]

// 每週訓練天數選項設定
export const WEEKLY_TRAINING_OPTIONS: { value: WeeklyTrainingGoal; label: string; description: string }[] = [
  { value: 1, label: '每週 1 天', description: '輕鬆起步' },
  { value: 2, label: '每週 2 天', description: '初學者' },
  { value: 3, label: '每週 3 天', description: '建立習慣' },
  { value: 4, label: '每週 4 天', description: '適度鍛鍊' },
  { value: 5, label: '每週 5 天', description: '積極進取' },
  { value: 6, label: '每週 6 天', description: '高強度' },
  { value: 7, label: '每天', description: '最佳效果' },
]

const ASSESSMENT_STORAGE_PREFIX = 'brain-training-assessment-'

export const useSettingsStore = defineStore('settings', () => {
  const hasWindow = typeof window !== 'undefined'
  let systemThemeQuery: MediaQueryList | null = null
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null
  let syncStatusTimer: ReturnType<typeof setTimeout> | null = null
  // 狀態（全域設定，不依賴使用者）
  const soundEnabled = ref(false)      // 音效預設關閉
  const musicEnabled = ref(false)      // 音樂預設關閉
  const soundVolume = ref(0.7)
  const musicVolume = ref(0.5)
  const hasSeenWelcome = ref(false)
  const fontSize = ref<FontSize>('large')  // 預設大字體，適合長者
  const hasCompletedAssessment = ref(false) // 是否完成能力評估
  const assessmentResult = ref<{
    suggestedDifficulty: 'easy' | 'medium' | 'hard'
    completedAt: string
    scores: {
      reaction: number
      memory: number
      logic: number
    }
  } | null>(null)

  // 主題設定 - 預設淺色模式
  const themeMode = ref<ThemeMode>('light')

  // 新增：退化檢測與訓練設定
  const declineDetectionMode = ref<DeclineDetectionMode>('general') // 預設一般模式
  const dailyTrainingDuration = ref<DailyTrainingDuration>(15) // 預設 15 分鐘
  const weeklyTrainingGoal = ref<WeeklyTrainingGoal>(5) // 預設每週 5 天
  const enableBehaviorTracking = ref(true) // 預設開啟行為追蹤
  const reduceMotion = ref(false) // 減少動畫
  const highContrast = ref(false) // 高對比模式
  const enableVoicePrompts = ref(false) // 語音提示
  const enableHapticFeedback = ref(true) // 震動反饋
  const syncUiStatus = ref<SyncUiStatus>('idle')
  const lastManualSyncAt = ref<string | null>(null)
  const lastManualSyncError = ref<string | null>(null)
  const assessmentUserId = ref<string | null>(null)

  // ===== 提醒設定 =====
  const assessmentReminderEnabled = ref(true) // 月度評估提醒（預設開啟）

  // ===== 佈局設定 =====
  const sidebarCollapsed = ref(false) // 側邊欄預設展開

  // ===== 遊戲難度設定 =====
  const defaultDifficulty = ref<GameDifficulty>('easy') // 全域預設難度
  const defaultSubDifficulty = ref<GameSubDifficulty>(2) // 全域預設子難度
  const gameDifficultySettings = ref<GameDifficultySettings>({}) // 每款遊戲獨立難度
  const hasGlobalDifficultyOverride = ref(false)

  // 計算屬性
  const fontSizePx = computed(() => FONT_SIZE_MAP[fontSize.value])
  
  // 取得當前退化檢測配置
  const currentDeclineConfig = computed(() => DECLINE_DETECTION_CONFIG[declineDetectionMode.value])

  // 從 localStorage 初始化
  function initFromStorage(): void {
    const stored = localStorage.getItem('brain-training-settings')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        soundEnabled.value = data.soundEnabled ?? false
        musicEnabled.value = data.musicEnabled ?? false
        soundVolume.value = data.soundVolume ?? 0.7
        musicVolume.value = data.musicVolume ?? 0.5
        hasSeenWelcome.value = data.hasSeenWelcome ?? false
        fontSize.value = normalizeFontSize(data.fontSize)
        // 主題設定
        themeMode.value = data.themeMode ?? 'light'
        // 新增設定
        declineDetectionMode.value = data.declineDetectionMode ?? 'general'
        dailyTrainingDuration.value = data.dailyTrainingDuration ?? 15
        weeklyTrainingGoal.value = data.weeklyTrainingGoal ?? 5
        enableBehaviorTracking.value = data.enableBehaviorTracking ?? true
        reduceMotion.value = data.reduceMotion ?? false
        highContrast.value = data.highContrast ?? false
        enableVoicePrompts.value = data.enableVoicePrompts ?? false
        enableHapticFeedback.value = data.enableHapticFeedback ?? true
        assessmentReminderEnabled.value = data.assessmentReminderEnabled ?? true
        // 佈局設定
        sidebarCollapsed.value = data.sidebarCollapsed ?? false
        // 遊戲難度設定
        defaultDifficulty.value = data.defaultDifficulty ?? 'easy'
        defaultSubDifficulty.value = data.defaultSubDifficulty ?? 2
        gameDifficultySettings.value = data.gameDifficultySettings ?? {}
        hasGlobalDifficultyOverride.value = data.hasGlobalDifficultyOverride === true
      } catch {
        // 忽略解析錯誤
      }
    }
    
    // 應用字體大小到根元素
    applyFontSize()
    // 應用無障礙設定
    applyAccessibilitySettings()
    // 應用主題設定
    applyTheme()
    ensureSystemThemeListener()
  }

  function getAssessmentStorageKey(odId: string): string {
    return `${ASSESSMENT_STORAGE_PREFIX}${odId}`
  }

  function loadAssessmentFromStorage(odId: string): void {
    const stored = localStorage.getItem(getAssessmentStorageKey(odId))
    if (stored) {
      try {
        const data = JSON.parse(stored)
        hasCompletedAssessment.value = data.hasCompletedAssessment === true
        assessmentResult.value = data.assessmentResult ?? null
        return
      } catch {
        // 忽略解析錯誤
      }
    }

    // 無法判斷舊資料歸屬時，不自動繼承
    hasCompletedAssessment.value = false
    assessmentResult.value = null

    const lastUserId = localStorage.getItem('brain-training-last-user') || localStorage.getItem('brain-training-current-user')
    if (lastUserId !== odId) return

    const legacy = localStorage.getItem('brain-training-settings')
    if (!legacy) return

    try {
      const legacyData = JSON.parse(legacy)
      if (legacyData.hasCompletedAssessment || legacyData.assessmentResult) {
        hasCompletedAssessment.value = legacyData.hasCompletedAssessment === true
        assessmentResult.value = legacyData.assessmentResult ?? null
        saveAssessmentToStorage()

        delete legacyData.hasCompletedAssessment
        delete legacyData.assessmentResult
        localStorage.setItem('brain-training-settings', JSON.stringify(legacyData))
      }
    } catch {
      // 忽略解析錯誤
    }
  }

  function saveAssessmentToStorage(): void {
    const odId = assessmentUserId.value
    if (!odId) return

    const data = {
      hasCompletedAssessment: hasCompletedAssessment.value,
      assessmentResult: assessmentResult.value,
    }
    localStorage.setItem(getAssessmentStorageKey(odId), JSON.stringify(data))
  }

  function setAssessmentUser(odId: string | null): void {
    assessmentUserId.value = odId
    if (!odId) {
      hasCompletedAssessment.value = false
      assessmentResult.value = null
      return
    }
    loadAssessmentFromStorage(odId)
  }

  // 儲存到 localStorage
  function saveToStorage(): void {
    const data = {
      soundEnabled: soundEnabled.value,
      musicEnabled: musicEnabled.value,
      soundVolume: soundVolume.value,
      musicVolume: musicVolume.value,
      hasSeenWelcome: hasSeenWelcome.value,
      fontSize: fontSize.value,
      // 主題設定
      themeMode: themeMode.value,
      // 新增設定
      declineDetectionMode: declineDetectionMode.value,
      dailyTrainingDuration: dailyTrainingDuration.value,
      weeklyTrainingGoal: weeklyTrainingGoal.value,
      enableBehaviorTracking: enableBehaviorTracking.value,
      reduceMotion: reduceMotion.value,
      highContrast: highContrast.value,
      enableVoicePrompts: enableVoicePrompts.value,
      enableHapticFeedback: enableHapticFeedback.value,
      assessmentReminderEnabled: assessmentReminderEnabled.value,
      // 佈局設定
      sidebarCollapsed: sidebarCollapsed.value,
      // 遊戲難度設定
      defaultDifficulty: defaultDifficulty.value,
      defaultSubDifficulty: defaultSubDifficulty.value,
      gameDifficultySettings: gameDifficultySettings.value,
      hasGlobalDifficultyOverride: hasGlobalDifficultyOverride.value,
    }
    localStorage.setItem('brain-training-settings', JSON.stringify(data))
  }

  // 應用字體大小到根元素
  function applyFontSize(): void {
    const size = FONT_SIZE_MAP[fontSize.value]
    const textScale = Math.max(0.85, Math.min(1.6, size / 16))
    document.documentElement.style.setProperty('--text-scale', `${textScale}`)
  }

  // 應用無障礙設定
  function applyAccessibilitySettings(): void {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion.value)
    document.documentElement.classList.toggle('high-contrast', highContrast.value)
  }

  function applyTheme(): void {
    if (!hasWindow) return
    const isDark = themeMode.value === 'dark' ||
      (themeMode.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }

  function stopSystemThemeListener(): void {
    if (!systemThemeQuery || !systemThemeListener) return
    const legacyQuery = systemThemeQuery as unknown as { removeListener?: (cb: (event: MediaQueryListEvent) => void) => void }
    if (legacyQuery.removeListener) {
      legacyQuery.removeListener(systemThemeListener)
    } else {
      systemThemeQuery.removeEventListener('change', systemThemeListener)
    }
    systemThemeQuery = null
    systemThemeListener = null
  }

  function ensureSystemThemeListener(): void {
    if (!hasWindow || themeMode.value !== 'system') {
      stopSystemThemeListener()
      return
    }
    if (!systemThemeQuery) {
      systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    }
    if (!systemThemeListener) {
      systemThemeListener = () => applyTheme()
      const legacyQuery = systemThemeQuery as unknown as { addListener?: (cb: (event: MediaQueryListEvent) => void) => void }
      if (legacyQuery.addListener) {
        legacyQuery.addListener(systemThemeListener)
      } else {
        systemThemeQuery.addEventListener('change', systemThemeListener)
      }
    }
  }

  // 監聽變化自動儲存
  watch(
    [soundEnabled, musicEnabled, soundVolume, musicVolume, hasSeenWelcome, fontSize, 
     themeMode, declineDetectionMode, dailyTrainingDuration, weeklyTrainingGoal,
     enableBehaviorTracking, reduceMotion, highContrast, enableVoicePrompts, enableHapticFeedback, assessmentReminderEnabled,
     sidebarCollapsed, defaultDifficulty, defaultSubDifficulty, gameDifficultySettings, hasGlobalDifficultyOverride],
    () => saveToStorage(),
    { deep: true }
  )

  watch([hasCompletedAssessment, assessmentResult], () => saveAssessmentToStorage(), { deep: true })

  // 監聽字體大小變化
  watch(fontSize, () => applyFontSize())

  // 監聽無障礙設定變化
  watch([reduceMotion, highContrast], () => applyAccessibilitySettings())

  // 監聽主題變化
  watch(themeMode, () => {
    applyTheme()
    ensureSystemThemeListener()
  })

  // 動作
  function toggleSound(enabled?: boolean): void {
    soundEnabled.value = enabled ?? !soundEnabled.value
  }

  function toggleMusic(enabled?: boolean): void {
    musicEnabled.value = enabled ?? !musicEnabled.value
  }

  function setSoundVolume(volume: number): void {
    soundVolume.value = Math.max(0, Math.min(1, volume))
  }

  function setMusicVolume(volume: number): void {
    musicVolume.value = Math.max(0, Math.min(1, volume))
  }

  function setFontSize(size: FontSize): void {
    fontSize.value = size
  }

  function markWelcomeSeen(): void {
    hasSeenWelcome.value = true
  }

  function resetWelcome(): void {
    hasSeenWelcome.value = false
  }

  function setAssessmentResult(result: typeof assessmentResult.value): void {
    assessmentResult.value = result
    hasCompletedAssessment.value = true
  }

  function resetAssessment(): void {
    assessmentResult.value = null
    hasCompletedAssessment.value = false
  }

  // 新增：設定退化檢測模式
  function setDeclineDetectionMode(mode: DeclineDetectionMode): void {
    declineDetectionMode.value = mode
  }

  // 新增：設定每日訓練時長
  function setDailyTrainingDuration(duration: DailyTrainingDuration): void {
    dailyTrainingDuration.value = duration
  }

  // 新增：設定每週訓練目標天數
  function setWeeklyTrainingGoal(goal: WeeklyTrainingGoal): void {
    weeklyTrainingGoal.value = goal
  }

  // 新增：切換行為追蹤
  function toggleBehaviorTracking(enabled?: boolean): void {
    enableBehaviorTracking.value = enabled ?? !enableBehaviorTracking.value
  }

  function setSyncUiStatus(status: SyncUiStatus, errorMessage?: string | null): void {
    syncUiStatus.value = status
    if (syncStatusTimer) {
      clearTimeout(syncStatusTimer)
      syncStatusTimer = null
    }
    if (status === 'success') {
      lastManualSyncAt.value = new Date().toISOString()
      lastManualSyncError.value = null
    } else if (status === 'error') {
      lastManualSyncError.value = errorMessage || 'sync failed'
    } else {
      lastManualSyncError.value = null
    }

    if (status === 'syncing') {
      syncStatusTimer = setTimeout(() => {
        if (syncUiStatus.value === 'syncing') {
          syncUiStatus.value = 'idle'
        }
        syncStatusTimer = null
      }, 15000)
    }
  }

  // 新增：設定主題模式
  function setThemeMode(mode: ThemeMode): void {
    themeMode.value = mode
  }

  // 新增：設定無障礙選項
  function setAccessibilityOption(option: 'reduceMotion' | 'highContrast' | 'enableVoicePrompts' | 'enableHapticFeedback', value: boolean): void {
    switch (option) {
      case 'reduceMotion':
        reduceMotion.value = value
        break
      case 'highContrast':
        highContrast.value = value
        break
      case 'enableVoicePrompts':
        enableVoicePrompts.value = value
        break
      case 'enableHapticFeedback':
        enableHapticFeedback.value = value
        break
    }
  }

  // ===== 佈局相關方法 =====
  
  /** 設定側邊欄收合狀態 */
  function setSidebarCollapsed(collapsed: boolean): void {
    sidebarCollapsed.value = collapsed
  }

  /** 切換側邊欄收合狀態 */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // ===== 遊戲難度相關方法 =====

  /** 設定全域預設難度 */
  function setDefaultDifficulty(difficulty: GameDifficulty, subDifficulty?: GameSubDifficulty): void {
    defaultDifficulty.value = difficulty
    if (subDifficulty !== undefined) {
      defaultSubDifficulty.value = subDifficulty
    }
    hasGlobalDifficultyOverride.value = true
  }

  function getDefaultDifficultySetting(): GameDifficultySetting {
    if (hasGlobalDifficultyOverride.value) {
      return {
        difficulty: defaultDifficulty.value,
        subDifficulty: defaultSubDifficulty.value,
      }
    }
    return {
      difficulty: 'easy',
      subDifficulty: 2
    }
  }

  /** 取得指定遊戲的難度設定，若無則返回全域預設 */
  function getGameDifficulty(gameId: string): GameDifficultySetting {
    return gameDifficultySettings.value[gameId] ?? getDefaultDifficultySetting()
  }

  /** 設定指定遊戲的難度 */
  function setGameDifficulty(gameId: string, settings: Partial<GameDifficultySetting>): void {
    const current = getGameDifficulty(gameId)
    gameDifficultySettings.value[gameId] = {
      ...current,
      ...settings,
    }
  }

  /** 重置指定遊戲的難度為全域預設 */
  function resetGameDifficulty(gameId: string): void {
    delete gameDifficultySettings.value[gameId]
  }

  /** 重置所有遊戲難度為全域預設 */
  function resetAllGameDifficulties(): void {
    gameDifficultySettings.value = {}
  }

  /** 檢查遊戲是否有自訂難度 */
  function hasCustomDifficulty(gameId: string): boolean {
    return gameId in gameDifficultySettings.value
  }

  // 載入設定（別名）
  async function loadSettings(): Promise<void> {
    initFromStorage()
  }

  // 初始化
  initFromStorage()
  applyTheme()
  ensureSystemThemeListener()

  return {
    // 狀態
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    hasSeenWelcome,
    fontSize,
    fontSizePx,
    hasCompletedAssessment,
    assessmentResult,
    // 主題狀態
    themeMode,
    // 新增狀態
    declineDetectionMode,
    dailyTrainingDuration,
    weeklyTrainingGoal,
    enableBehaviorTracking,
    reduceMotion,
    highContrast,
    enableVoicePrompts,
    enableHapticFeedback,
    assessmentReminderEnabled,
    syncUiStatus,
    lastManualSyncAt,
    lastManualSyncError,
    currentDeclineConfig,
    // 佈局狀態
    sidebarCollapsed,
    // 遊戲難度狀態
    defaultDifficulty,
    defaultSubDifficulty,
    gameDifficultySettings,
    hasGlobalDifficultyOverride,

    // 動作
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setFontSize,
    markWelcomeSeen,
    resetWelcome,
    setAssessmentResult,
    resetAssessment,
    // 主題動作
    setThemeMode,
    // 新增動作
    setDeclineDetectionMode,
    setDailyTrainingDuration,
    setWeeklyTrainingGoal,
    toggleBehaviorTracking,
    setAccessibilityOption,
    setSyncUiStatus,
    initFromStorage,
    loadSettings,
    setAssessmentUser,
    // 佈局動作
    setSidebarCollapsed,
    toggleSidebar,
    // 遊戲難度動作
    setDefaultDifficulty,
    getDefaultDifficultySetting,
    getGameDifficulty,
    setGameDifficulty,
    resetGameDifficulty,
    resetAllGameDifficulties,
    hasCustomDifficulty,
  }
})

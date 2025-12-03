/**
 * 應用設定狀態管理
 */

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

// 字體大小預設值
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

// 退化檢測模式
export type DeclineDetectionMode = 'professional' | 'general'

// 每日訓練時長選項
export type DailyTrainingDuration = 10 | 15 | 20 | 30

// 主題模式
export type ThemeMode = 'light' | 'dark' | 'system'

// 螢幕方向偏好
export type OrientationPreference = 'portrait' | 'landscape' | 'auto'

export const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
  xlarge: 24,
}

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
  xlarge: '特大',
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
  { value: 10, label: '10 分鐘', games: '3-4 款遊戲' },
  { value: 15, label: '15 分鐘', games: '4-5 款遊戲' },
  { value: 20, label: '20 分鐘', games: '5-6 款遊戲' },
  { value: 30, label: '30 分鐘', games: '6-8 款遊戲' },
]

export const useSettingsStore = defineStore('settings', () => {
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

  // 主題設定 - 預設跟隨系統
  const themeMode = ref<ThemeMode>('system')

  // 螢幕方向偏好設定
  const orientationPreference = ref<OrientationPreference>('auto')
  
  // 檢測是否支援方向鎖定
  const orientationSupported = computed(() => {
    return typeof screen !== 'undefined' && 
           'orientation' in screen && 
           typeof screen.orientation?.lock === 'function'
  })

  // 新增：退化檢測與訓練設定
  const declineDetectionMode = ref<DeclineDetectionMode>('general') // 預設一般模式
  const dailyTrainingDuration = ref<DailyTrainingDuration>(15) // 預設 15 分鐘
  const enableBehaviorTracking = ref(true) // 預設開啟行為追蹤
  const reduceMotion = ref(false) // 減少動畫
  const highContrast = ref(false) // 高對比模式
  const enableVoicePrompts = ref(false) // 語音提示
  const enableHapticFeedback = ref(true) // 震動反饋

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
        fontSize.value = data.fontSize ?? 'large'
        hasCompletedAssessment.value = data.hasCompletedAssessment ?? false
        assessmentResult.value = data.assessmentResult ?? null
        // 主題設定
        themeMode.value = data.themeMode ?? 'system'
        // 螢幕方向偏好
        orientationPreference.value = data.orientationPreference ?? 'auto'
        // 新增設定
        declineDetectionMode.value = data.declineDetectionMode ?? 'general'
        dailyTrainingDuration.value = data.dailyTrainingDuration ?? 15
        enableBehaviorTracking.value = data.enableBehaviorTracking ?? true
        reduceMotion.value = data.reduceMotion ?? false
        highContrast.value = data.highContrast ?? false
        enableVoicePrompts.value = data.enableVoicePrompts ?? false
        enableHapticFeedback.value = data.enableHapticFeedback ?? true
      } catch {
        // 忽略解析錯誤
      }
    }
    
    // 應用字體大小到根元素
    applyFontSize()
    // 應用無障礙設定
    applyAccessibilitySettings()
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
      hasCompletedAssessment: hasCompletedAssessment.value,
      assessmentResult: assessmentResult.value,
      // 主題設定
      themeMode: themeMode.value,
      // 螢幕方向偏好
      orientationPreference: orientationPreference.value,
      // 新增設定
      declineDetectionMode: declineDetectionMode.value,
      dailyTrainingDuration: dailyTrainingDuration.value,
      enableBehaviorTracking: enableBehaviorTracking.value,
      reduceMotion: reduceMotion.value,
      highContrast: highContrast.value,
      enableVoicePrompts: enableVoicePrompts.value,
      enableHapticFeedback: enableHapticFeedback.value,
    }
    localStorage.setItem('brain-training-settings', JSON.stringify(data))
  }

  // 應用字體大小到根元素
  function applyFontSize(): void {
    const size = FONT_SIZE_MAP[fontSize.value]
    document.documentElement.style.setProperty('--font-size-base', `${size}px`)
    document.documentElement.style.fontSize = `${size}px`
  }

  // 應用無障礙設定
  function applyAccessibilitySettings(): void {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion.value)
    document.documentElement.classList.toggle('high-contrast', highContrast.value)
  }

  // 監聽變化自動儲存
  watch(
    [soundEnabled, musicEnabled, soundVolume, musicVolume, hasSeenWelcome, fontSize, 
     hasCompletedAssessment, assessmentResult, themeMode, orientationPreference, declineDetectionMode, dailyTrainingDuration,
     enableBehaviorTracking, reduceMotion, highContrast, enableVoicePrompts, enableHapticFeedback],
    () => saveToStorage(),
    { deep: true }
  )

  // 監聽字體大小變化
  watch(fontSize, () => applyFontSize())

  // 監聽無障礙設定變化
  watch([reduceMotion, highContrast], () => applyAccessibilitySettings())

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

  // 新增：切換行為追蹤
  function toggleBehaviorTracking(enabled?: boolean): void {
    enableBehaviorTracking.value = enabled ?? !enableBehaviorTracking.value
  }

  // 新增：設定主題模式
  function setThemeMode(mode: ThemeMode): void {
    themeMode.value = mode
  }

  // 新增：設定螢幕方向偏好
  async function setOrientationPreference(preference: OrientationPreference): Promise<void> {
    orientationPreference.value = preference
    
    // 嘗試套用方向鎖定（僅在支援時）
    if (orientationSupported.value && preference !== 'auto') {
      try {
        const lockType = preference === 'portrait' ? 'portrait-primary' : 'landscape-primary'
        await screen.orientation.lock(lockType)
      } catch (error) {
        // 方向鎖定失敗（可能在桌面瀏覽器或未全螢幕），僅記錄偏好
        console.info('螢幕方向鎖定不可用，已儲存偏好設定')
      }
    } else if (orientationSupported.value && preference === 'auto') {
      try {
        screen.orientation.unlock()
      } catch {
        // 忽略解鎖錯誤
      }
    }
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

  // 載入設定（別名）
  async function loadSettings(): Promise<void> {
    initFromStorage()
  }

  // 初始化
  initFromStorage()

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
    // 螢幕方向狀態
    orientationPreference,
    orientationSupported,
    // 新增狀態
    declineDetectionMode,
    dailyTrainingDuration,
    enableBehaviorTracking,
    reduceMotion,
    highContrast,
    enableVoicePrompts,
    enableHapticFeedback,
    currentDeclineConfig,

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
    // 螢幕方向動作
    setOrientationPreference,
    // 新增動作
    setDeclineDetectionMode,
    setDailyTrainingDuration,
    toggleBehaviorTracking,
    setAccessibilityOption,
    initFromStorage,
    loadSettings,
  }
})

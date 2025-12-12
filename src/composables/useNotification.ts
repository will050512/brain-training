/**
 * 本地通知 Composable
 * 提供 PWA 本地通知功能，用於每日訓練提醒
 * 
 * 注意：PWA 本地通知無法在背景精確排程，
 * 採用「下次開啟 App 時檢查」的友善提醒方式
 */

import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

// 通知權限狀態
export type NotificationPermission = 'default' | 'granted' | 'denied'

// 通知設定
export interface NotificationSettings {
  enabled: boolean
  reminderTime: string // HH:mm 格式
  lastReminderShown: string | null // ISO 日期字串
}

// 預設設定
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: '09:00',
  lastReminderShown: null
}

// localStorage key
const NOTIFICATION_SETTINGS_KEY = 'brain-training-notification-settings'
const LAST_TRAINING_KEY = 'brain-training-last-training-date'

/**
 * 通知 Composable
 */
export function useNotification() {
  const settingsStore = useSettingsStore()
  
  // 狀態
  const permission = ref<NotificationPermission>('default')
  const settings = ref<NotificationSettings>(loadSettings())
  const isSupported = ref(false)
  
  // 計算屬性
  const canNotify = computed(() => 
    isSupported.value && permission.value === 'granted' && settings.value.enabled
  )
  
  /**
   * 載入設定
   */
  function loadSettings(): NotificationSettings {
    try {
      const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
      if (saved) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('載入通知設定失敗:', e)
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS }
  }
  
  /**
   * 儲存設定
   */
  function saveSettings(): void {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (e) {
      console.warn('儲存通知設定失敗:', e)
    }
  }
  
  /**
   * 初始化
   */
  function init(): void {
    // 檢查瀏覽器支援
    isSupported.value = 'Notification' in window
    
    if (isSupported.value) {
      permission.value = Notification.permission as NotificationPermission
    }
  }
  
  /**
   * 請求通知權限
   */
  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) {
      console.warn('此瀏覽器不支援通知')
      return false
    }
    
    try {
      const result = await Notification.requestPermission()
      permission.value = result as NotificationPermission
      return result === 'granted'
    } catch (e) {
      console.error('請求通知權限失敗:', e)
      return false
    }
  }
  
  /**
   * 切換通知開關
   */
  async function toggleNotification(enabled: boolean): Promise<boolean> {
    if (enabled && permission.value !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return false
    }
    
    settings.value.enabled = enabled
    saveSettings()
    return true
  }
  
  /**
   * 設定提醒時間
   */
  function setReminderTime(time: string): void {
    settings.value.reminderTime = time
    saveSettings()
  }
  
  /**
   * 顯示通知
   */
  function showNotification(
    title: string,
    options?: NotificationOptions
  ): Notification | null {
    if (!canNotify.value) return null
    
    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'brain-training',
        ...options
      })
      
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
      
      return notification
    } catch (e) {
      console.error('顯示通知失敗:', e)
      return null
    }
  }
  
  /**
   * 記錄今日訓練完成
   */
  function recordTrainingComplete(): void {
    const today = new Date().toISOString().split('T')[0] || ''
    localStorage.setItem(LAST_TRAINING_KEY, today)
  }
  
  /**
   * 取得上次訓練日期
   */
  function getLastTrainingDate(): string | null {
    return localStorage.getItem(LAST_TRAINING_KEY) || null
  }
  
  /**
   * 檢查是否需要顯示訓練提醒
   * 在 App 開啟時呼叫，檢查昨日是否有訓練
   */
  function checkTrainingReminder(): {
    shouldRemind: boolean
    daysMissed: number
    message: string
  } {
    const lastTraining = getLastTrainingDate()
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] || ''
    
    // 今日已顯示過提醒
    if (settings.value.lastReminderShown === todayStr) {
      return { shouldRemind: false, daysMissed: 0, message: '' }
    }
    
    if (!lastTraining) {
      // 從未訓練過，首次使用
      return { shouldRemind: false, daysMissed: 0, message: '' }
    }
    
    const lastDate = new Date(lastTraining)
    const diffTime = today.getTime() - lastDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) {
      // 今天已經訓練過
      return { shouldRemind: false, daysMissed: 0, message: '' }
    }
    
    // 標記今日已顯示提醒
    settings.value.lastReminderShown = todayStr
    saveSettings()
    
    if (diffDays === 1) {
      return {
        shouldRemind: true,
        daysMissed: 1,
        message: '昨天沒有訓練喔，今天來動動腦吧！🧠'
      }
    } else if (diffDays <= 3) {
      return {
        shouldRemind: true,
        daysMissed: diffDays,
        message: `已經 ${diffDays} 天沒訓練了，今天繼續加油！💪`
      }
    } else if (diffDays <= 7) {
      return {
        shouldRemind: true,
        daysMissed: diffDays,
        message: `好久不見！已經 ${diffDays} 天了，一起來恢復訓練吧！🌟`
      }
    } else {
      return {
        shouldRemind: true,
        daysMissed: diffDays,
        message: `歡迎回來！持續訓練對大腦健康很重要喔 🎯`
      }
    }
  }
  
  /**
   * 檢查是否需要月度評估提醒
   */
  function checkAssessmentReminder(lastAssessmentDate: string | null): {
    shouldRemind: boolean
    daysSinceAssessment: number
    message: string
  } {
    if (!lastAssessmentDate) {
      return {
        shouldRemind: true,
        daysSinceAssessment: 999,
        message: '建議先完成認知評估，幫助我們了解您的狀況 📋'
      }
    }
    
    const lastDate = new Date(lastAssessmentDate)
    const today = new Date()
    const diffTime = today.getTime() - lastDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays >= 30) {
      return {
        shouldRemind: true,
        daysSinceAssessment: diffDays,
        message: '距離上次評估已超過一個月，建議重新評估認知狀態 🔄'
      }
    }
    
    return {
      shouldRemind: false,
      daysSinceAssessment: diffDays,
      message: ''
    }
  }
  
  // 初始化
  onMounted(init)
  
  return {
    // 狀態
    permission,
    settings,
    isSupported,
    canNotify,
    
    // 方法
    init,
    requestPermission,
    toggleNotification,
    setReminderTime,
    showNotification,
    recordTrainingComplete,
    getLastTrainingDate,
    checkTrainingReminder,
    checkAssessmentReminder
  }
}

/**
 * 友善訓練提醒訊息（用於 Toast）
 */
export const FRIENDLY_REMINDER_MESSAGES = [
  '今天來動動腦吧！🧠',
  '每天訓練，大腦更年輕！💪',
  '休息夠了，來個小挑戰？🎯',
  '持續訓練，效果更好喔！⭐',
  '您的腦力訓練時間到了！🔔'
]

/**
 * 取得隨機友善提醒訊息
 */
export function getRandomReminderMessage(): string {
  const index = Math.floor(Math.random() * FRIENDLY_REMINDER_MESSAGES.length)
  return FRIENDLY_REMINDER_MESSAGES[index] || '今天來動動腦吧！🧠'
}

/**
 * 使用者類型定義
 */

import type { CognitiveScores } from './cognitive'

// ===== 資料同意相關 =====

/** 目前同意條款版本 */
export const CURRENT_CONSENT_VERSION = '1.1'

/** 資料使用同意選項 */
export interface DataConsentOptions {
  /** 使用者 ID */
  odId: string
  /** 必要功能同意（必須為 true 才能使用系統） */
  essentialConsent: boolean
  /** 分析數據收集同意（用於個人化推薦） */
  analyticsConsent: boolean
  /** 行為追蹤同意（用於記錄詳細互動行為，如時鐘繪圖圖片） */
  behaviorTrackingConsent: boolean
  /** 詳細行為追蹤同意（思考時間、取消、反悔等精細行為） */
  detailedBehaviorConsent: boolean
  /** 醫療報告分享同意（用於匯出報告給醫療人員） */
  medicalSharingConsent: boolean
  /** 同意時間戳 */
  consentTimestamp: string
  /** 同意條款版本 */
  consentVersion: string
}

/** 預設資料同意選項（全部未同意） */
export const defaultDataConsent = (odId: string): DataConsentOptions => ({
  odId,
  essentialConsent: false,
  analyticsConsent: false,
  behaviorTrackingConsent: false,
  detailedBehaviorConsent: false,
  medicalSharingConsent: false,
  consentTimestamp: '',
  consentVersion: CURRENT_CONSENT_VERSION,
})

/** 檢查同意版本是否過期 */
export function isConsentVersionOutdated(consent: DataConsentOptions): boolean {
  return consent.consentVersion !== CURRENT_CONSENT_VERSION
}

/** 同意項目說明 */
export const CONSENT_DESCRIPTIONS = {
  essential: {
    title: '必要功能',
    description: '基本的遊戲運作與本機資料儲存，此項目必須同意才能使用系統。',
    required: true,
  },
  analytics: {
    title: '分析數據收集',
    description: '收集遊戲表現數據（分數、正確率、反應時間）用於個人化訓練推薦與認知趨勢分析。所有數據僅儲存於您的裝置本機。',
    required: false,
  },
  behaviorTracking: {
    title: '行為追蹤',
    description: '記錄詳細互動行為（點擊位置、拖曳軌跡、猶豫時間）以進行更精確的認知分析。包含 Mini-Cog 時鐘繪圖圖片儲存。',
    required: false,
  },
  detailedBehavior: {
    title: '精細行為分析',
    description: '記錄更精細的認知行為指標，包含思考時間、操作取消、答案反悔、注意力漂移等。此資料有助於早期偵測認知變化趨勢。',
    required: false,
  },
  medicalSharing: {
    title: '醫療報告分享',
    description: '允許系統產生可供醫療人員參考的認知評估報告。報告僅在您主動匯出時產生。',
    required: false,
  },
} as const

// ===== 使用者基本資料 =====

// 使用者資料
export interface User {
  id: string
  name: string
  birthday: string  // YYYY-MM-DD 格式
  educationYears: number  // 教育年數（0=不識字, 1-6=國小, 7-9=國中, 10-12=高中, 13+=大專以上）
  createdAt: Date
  lastActiveAt: Date
}

// 使用者設定
export interface UserSettings {
  odId: string
  soundEnabled: boolean
  musicEnabled: boolean
  soundVolume: number    // 0-1
  musicVolume: number    // 0-1
  hasSeenWelcome: boolean
}

// 預設使用者設定
export const defaultUserSettings = (odId: string): UserSettings => ({
  odId,
  soundEnabled: false,  // 預設關閉
  musicEnabled: false,  // 預設關閉
  soundVolume: 0.7,
  musicVolume: 0.5,
  hasSeenWelcome: false,
})

// 使用者統計
export interface UserStats {
odId: string
  totalGamesPlayed: number
  totalPlayTime: number  // 秒
  averageScore: number
  bestScores: Record<string, number>  // gameId -> 最高分
  lastPlayedAt: Date | null
  streak: number  // 連續天數
}

// 預設使用者統計
export const defaultUserStats = (odId: string): UserStats => ({
odId,
  totalGamesPlayed: 0,
  totalPlayTime: 0,
  averageScore: 0,
  bestScores: {},
  lastPlayedAt: null,
  streak: 0,
})

// 使用者完整資料（含設定與統計）
export interface UserProfile {
  user: User
  settings: UserSettings
  stats: UserStats
  baselineScores?: CognitiveScores  // 基準認知分數
}

// 登入表單資料
export interface LoginForm {
  name: string
  birthday: string
}

// 使用者辨識金鑰（姓名+生日組合）
export function generateUserId(name: string, birthday: string): string {
  const normalized = `${name.trim().toLowerCase()}_${birthday}`
  // 簡單 hash
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `user_${Math.abs(hash).toString(36)}`
}

// 計算年齡
export function calculateAge(birthday: string): number {
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

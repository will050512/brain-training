/**
 * UI 組件統一匯出
 * Design System 設計系統入口
 */

// ===== 基礎組件 =====
export { default as BaseButton } from './BaseButton.vue'
export { default as BaseCard } from './BaseCard.vue'
export { default as BaseInput } from './BaseInput.vue'
export { default as LoadingSpinner } from './LoadingSpinner.vue'
export { default as CircularProgress } from './CircularProgress.vue'

// ===== 狀態顯示組件 =====
export { default as EmptyState } from './EmptyState.vue'
export { default as SyncStatusIndicator } from './SyncStatusIndicator.vue'

// ===== 提示與通知組件 =====
export { default as ToastNotification } from './ToastNotification.vue'
export { default as DisclaimerBanner } from './DisclaimerBanner.vue'
export { default as TipBanner } from './TipBanner.vue'

// ===== 模態框組件 =====
export { default as ConsentModal } from './ConsentModal.vue'
export { default as GameResultModal } from './GameResultModal.vue'
export { default as WelcomeModal } from './WelcomeModal.vue'
export { default as TrainingCompleteModal } from './TrainingCompleteModal.vue'
export { default as TrainingHistoryModal } from './TrainingHistoryModal.vue'

// ===== 導航組件 =====
export { default as MobileBottomNav } from './MobileBottomNav.vue'

// ===== PWA 相關組件 =====
export { default as InstallPrompt } from './InstallPrompt.vue'
export { default as PWAUpdateBanner } from './PWAUpdateBanner.vue'

// ===== 訓練相關組件 =====
export { default as WeekCalendar } from './WeekCalendar.vue'
export { default as WeekProgressBar } from './WeekProgressBar.vue'
export { default as TrainingGoalSettings } from './TrainingGoalSettings.vue'
export { default as DifficultyAdjustPanel } from './DifficultyAdjustPanel.vue'

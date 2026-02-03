<template>
  <PageShell contentClass="page-shell-wide">
    <SectionStack>
      <SettingsThemeCard />
      <SettingsTrainingGoalCard />
      <SettingsAccessibilityCard />
      <SettingsAudioCard />
      <SettingsReminderCard />
      <SettingsPrivacyCard
        v-if="userStore.isLoggedIn"
        :consent-state="consentState"
        :toggle-cloud-backup="toggleCloudBackup"
        :toggle-usage-analytics="toggleUsageAnalytics"
      />
      <SettingsSyncCard
        v-if="userStore.isLoggedIn"
        :sync-status="syncStatus"
        :sync-status-label="syncStatusLabel"
        :sync-status-class="syncStatusClass"
        :format-sync-time="formatSyncTime"
      />
      <SettingsAccountCard
        v-if="userStore.isLoggedIn"
        :user-name="userStore.currentUser?.name || ''"
        :user-age-label="`${userStore.userAge ?? '-'} 歲`"
        :auth-provider-label="authProviderLabel"
        :birthday-label="userStore.currentUser?.birthday ? formatBirthdayToRoc(userStore.currentUser.birthday) : undefined"
        :on-logout="handleLogout"
      />
      <SettingsStatsCard
        v-if="userStore.isLoggedIn && userStore.currentStats"
        :total-games-played="totalGamesPlayed"
        :average-score="userStore.currentStats.averageScore"
        :streak="userStore.currentStats.streak"
        :total-play-time-label="formatPlayTime(userStore.currentStats.totalPlayTime).replace('小時','h').replace('分','m').replace('秒','s')"
      />
      <SettingsAdvancedCard
        :is-logged-in="userStore.isLoggedIn"
        :reset-welcome="resetWelcome"
        :confirm-clear-data="confirmClearData"
      />
      <SettingsAboutSection :app-version="appVersion" />
    </SectionStack>
  </PageShell>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PageShell, SectionStack } from '@/components/layout'
import { useUserStore, useSettingsStore, useGameStore } from '@/stores'
import { clearUserGameSessions, getDataConsent, saveDataConsent } from '@/services/db'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTotalGamesPlayed } from '@/utils/trainingStats'
import { loadSessionSyncStatus } from '@/services/googleSheetSyncService'
import { loadUserSyncStatus } from '@/services/userSheetSyncService'
import { CURRENT_CONSENT_VERSION, defaultDataConsent, type DataConsentOptions } from '@/types/user'
import { formatBirthdayToRoc } from '@/utils/birthday'
import SettingsAboutSection from '@/components/settings/SettingsAboutSection.vue'
import SettingsAccessibilityCard from '@/components/settings/SettingsAccessibilityCard.vue'
import SettingsAccountCard from '@/components/settings/SettingsAccountCard.vue'
import SettingsAdvancedCard from '@/components/settings/SettingsAdvancedCard.vue'
import SettingsAudioCard from '@/components/settings/SettingsAudioCard.vue'
import SettingsPrivacyCard from '@/components/settings/SettingsPrivacyCard.vue'
import SettingsReminderCard from '@/components/settings/SettingsReminderCard.vue'
import SettingsStatsCard from '@/components/settings/SettingsStatsCard.vue'
import SettingsSyncCard from '@/components/settings/SettingsSyncCard.vue'
import SettingsThemeCard from '@/components/settings/SettingsThemeCard.vue'
import SettingsTrainingGoalCard from '@/components/settings/SettingsTrainingGoalCard.vue'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()
const appVersion = __APP_VERSION__ || 'Unknown'

const syncStatus = ref({
  session: {
    lastAttemptAt: null as string | null,
    lastSuccessAt: null as string | null,
    lastErrorAt: null as string | null,
    lastErrorMessage: null as string | null,
  },
  user: {
    lastAttemptAt: null as string | null,
    lastSuccessAt: null as string | null,
    lastErrorAt: null as string | null,
    lastErrorMessage: null as string | null,
  },
  consent: 'unknown' as 'allowed' | 'blocked' | 'unknown',
  online: true,
})
const consentState = ref<DataConsentOptions | null>(null)

const totalGamesPlayed = computed(() => {
  return getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
})

const authProviderLabel = computed(() => {
  const provider = userStore.currentUser?.authProvider
  if (provider === 'firebase') return 'App / Firebase'
  if (provider === 'local') return '本機帳號'
  return '未知'
})

const syncStatusLabel = computed(() => {
  if (!userStore.isLoggedIn) return '未登入'
  if (!syncStatus.value.online) return '離線'
  if (syncStatus.value.consent === 'blocked') return '未啟用'
  if (syncStatus.value.consent === 'unknown') return '未知'
  return '啟用中'
})

const syncStatusClass = computed(() => {
  if (!userStore.isLoggedIn) return 'text-[var(--color-text-muted)]'
  if (!syncStatus.value.online || syncStatus.value.consent !== 'allowed') return 'text-[var(--color-warning)]'
  return 'text-[var(--color-success)]'
})


// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  const hours = Math.floor(seconds / 3600)
  return `${hours}時`
}

function formatSyncTime(value: string | null): string {
  if (!value) return '尚未同步'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '尚未同步'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}

function refreshSyncStatus(): void {
  const odId = userStore.currentUser?.id
  if (!odId) return
  syncStatus.value.session = loadSessionSyncStatus(odId)
  syncStatus.value.user = loadUserSyncStatus(odId)
  syncStatus.value.online = typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function refreshConsentStatus(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  try {
    const consent = await getDataConsent(odId)
    if (!consent) {
      syncStatus.value.consent = 'allowed'
    } else {
      syncStatus.value.consent = (consent.essentialConsent || consent.analyticsConsent) ? 'allowed' : 'blocked'
    }
    consentState.value = consent || {
      ...defaultDataConsent(odId),
      essentialConsent: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: CURRENT_CONSENT_VERSION
    }
  } catch {
    syncStatus.value.consent = 'unknown'
  }
}

async function toggleCloudBackup(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  const base = consentState.value || {
    ...defaultDataConsent(odId),
    essentialConsent: true,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  const next = {
    ...base,
    analyticsConsent: !base.analyticsConsent,
    behaviorTrackingConsent: base.analyticsConsent ? false : base.behaviorTrackingConsent,
    detailedBehaviorConsent: base.analyticsConsent ? false : base.detailedBehaviorConsent,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  consentState.value = next
  await saveDataConsent(next)
  syncStatus.value.consent = next.essentialConsent || next.analyticsConsent ? 'allowed' : 'blocked'
}

async function toggleUsageAnalytics(): Promise<void> {
  const enabled = !settingsStore.enableBehaviorTracking
  settingsStore.toggleBehaviorTracking(enabled)
  const odId = userStore.currentUser?.id
  if (!odId) return
  const base = consentState.value || {
    ...defaultDataConsent(odId),
    essentialConsent: true,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  const next = {
    ...base,
    behaviorTrackingConsent: enabled,
    detailedBehaviorConsent: enabled ? base.detailedBehaviorConsent : false,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  consentState.value = next
  await saveDataConsent(next)
}

// 登出
function handleLogout(): void {
  userStore.logout()
  localStorage.removeItem('brain-training-current-user')
  router.push('/login')
}

// 重置歡迎畫面
function resetWelcome(): void {
  settingsStore.resetWelcome()
  alert('下次進入首頁時將顯示歡迎畫面')
}

// 確認清除資料
async function confirmClearData(): Promise<void> {
  if (!userStore.currentUser) return
  
  const confirmed = confirm('確定要清除所有遊戲記錄嗎？此操作無法復原。')
  if (!confirmed) return
  
  try {
    await clearUserGameSessions(userStore.currentUser.id)
    await gameStore.loadUserSessions(userStore.currentUser.id)
    await userStore.updateStats({
      totalGamesPlayed: 0,
      totalPlayTime: 0,
      averageScore: 0,
      bestScores: {},
      gamePlayCounts: {},
      favoriteGameId: null,
      lastPlayedAt: null,
      streak: 0,
    })
    alert('遊戲記錄已清除')
  } catch {
    alert('清除失敗，請稍後再試')
  }
}

function handleStatusRefresh(): void {
  refreshSyncStatus()
  refreshConsentStatus()
}


watch(() => userStore.currentUser?.id, (id) => {
  if (id) {
    handleStatusRefresh()
  }
})

onMounted(() => {
  handleStatusRefresh()
  window.addEventListener('online', handleStatusRefresh)
  window.addEventListener('focus', handleStatusRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleStatusRefresh)
  window.removeEventListener('focus', handleStatusRefresh)
})
</script>

<style scoped>
/* Toggle Switch 開關樣式 */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 9999px;
  background-color: var(--color-bg-muted, #e5e7eb);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;
}

.toggle-switch.toggle-on {
  background-color: var(--color-primary, #6366f1);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-switch.toggle-on .toggle-thumb {
  transform: translateX(24px);
}
</style>

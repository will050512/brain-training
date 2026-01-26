<script setup lang="ts">
import SyncStatusIndicator from '@/components/common/SyncStatusIndicator.vue'

interface SyncStatusEntry {
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
}

interface SyncStatus {
  session: SyncStatusEntry
  user: SyncStatusEntry
  consent: 'allowed' | 'blocked' | 'unknown'
  online: boolean
}

interface Props {
  syncStatus: SyncStatus
  syncStatusLabel: string
  syncStatusClass: string
  canManualSync: boolean
  lastManualSyncError: string | null
  formatSyncTime: (value: string | null) => string
  handleManualSync: () => void | Promise<void>
}

const props = defineProps<Props>()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">☁️</span>
      <h3 class="font-semibold text-[var(--color-text)]">資料同步</h3>
    </div>

    <div class="bg-[var(--color-bg-soft)] rounded-lg p-3 mb-3">
      <div class="flex items-center justify-between mb-2 pb-2 border-b border-[var(--color-border-light)]">
        <span class="text-sm font-medium text-[var(--color-text-secondary)]">同步狀態</span>
        <span class="text-sm font-bold" :class="props.syncStatusClass">{{ props.syncStatusLabel }}</span>
      </div>

      <div class="space-y-2 text-xs text-[var(--color-text-muted)]">
        <div class="flex justify-between">
          <span>手動同步</span>
          <SyncStatusIndicator />
        </div>
        <div class="flex justify-between">
          <span>上次同步</span>
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.session.lastSuccessAt) }}</span>
        </div>
        <div class="flex justify-between">
          <span>遊戲記錄上傳</span>
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.session.lastSuccessAt) }}</span>
        </div>
        <div class="flex justify-between">
          <span>個人資料上傳</span>
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.user.lastSuccessAt) }}</span>
        </div>
      </div>
    </div>

    <div v-if="props.lastManualSyncError" class="text-xs text-[var(--color-danger)] mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
      ⚠️ 同步失敗：{{ props.lastManualSyncError }}
    </div>
    <div v-if="props.syncStatus.session.lastErrorAt || props.syncStatus.user.lastErrorAt" class="text-xs text-[var(--color-danger)] mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
      ⚠️ 最近同步失敗：{{ props.formatSyncTime(props.syncStatus.session.lastErrorAt || props.syncStatus.user.lastErrorAt) }}
    </div>

    <button
      type="button"
      class="btn btn-secondary w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
      :disabled="!props.canManualSync"
      @click="props.handleManualSync"
    >
      <span>🔄</span> 立即同步
    </button>

    <p class="text-xs text-[var(--color-text-muted)] mt-2 text-center">
      需開啟「雲端備份」且在連線狀態下才能同步
    </p>
  </div>
</template>

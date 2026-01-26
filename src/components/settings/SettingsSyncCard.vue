<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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
        <SubtleLabel text="同步狀態" tone="secondary" weight="bold" />
        <span class="text-sm font-bold" :class="props.syncStatusClass">{{ props.syncStatusLabel }}</span>
      </div>

      <div class="space-y-2">
        <div class="flex justify-between">
          <SubtleLabel text="手動同步" tone="muted" />
          <SyncStatusIndicator />
        </div>
        <div class="flex justify-between">
          <SubtleLabel text="上次同步" tone="muted" />
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.session.lastSuccessAt) }}</span>
        </div>
        <div class="flex justify-between">
          <SubtleLabel text="遊戲記錄上傳" tone="muted" />
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.session.lastSuccessAt) }}</span>
        </div>
        <div class="flex justify-between">
          <SubtleLabel text="個人資料上傳" tone="muted" />
          <span class="font-mono text-[var(--color-text)]">{{ props.formatSyncTime(props.syncStatus.user.lastSuccessAt) }}</span>
        </div>
      </div>
    </div>

    <div v-if="props.lastManualSyncError" class="mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
      <SubtleLabel :text="`⚠️ 同步失敗：${props.lastManualSyncError}`" class="text-[var(--color-danger)]" />
    </div>
    <div v-if="props.syncStatus.session.lastErrorAt || props.syncStatus.user.lastErrorAt" class="mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
      <SubtleLabel
        :text="`⚠️ 最近同步失敗：${props.formatSyncTime(props.syncStatus.session.lastErrorAt || props.syncStatus.user.lastErrorAt)}`"
        class="text-[var(--color-danger)]"
      />
    </div>

    <BaseButton
      type="button"
      variant="secondary"
      size="md"
      full-width
      class="py-3 text-sm font-medium flex items-center justify-center gap-2"
      :disabled="!props.canManualSync"
      @click="props.handleManualSync"
    >
      <span>🔄</span> 立即同步
    </BaseButton>

    <SubtleLabel
      text="需開啟「雲端備份」且在連線狀態下才能同步"
      tone="muted"
      class="mt-2 text-center block"
    />
  </div>
</template>

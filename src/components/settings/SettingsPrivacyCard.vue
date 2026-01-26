<script setup lang="ts">
import { useSettingsStore } from '@/stores'
import type { DataConsentOptions } from '@/types/user'

interface Props {
  consentState: DataConsentOptions | null
  toggleCloudBackup: () => void | Promise<void>
  toggleUsageAnalytics: () => void | Promise<void>
}

const props = defineProps<Props>()

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">🔒</span>
      <h3 class="font-semibold text-[var(--color-text)]">隱私與同意</h3>
    </div>

    <div class="space-y-4">
      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="props.toggleCloudBackup()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">雲端備份</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">允許將資料備份到雲端</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': props.consentState?.analyticsConsent }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="props.toggleUsageAnalytics()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">使用分析（本機）</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">啟用行為記錄以產生洞察</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.enableBehaviorTracking }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] p-3 rounded-lg leading-relaxed">
        資料預設儲存在您的裝置上。雲端備份為選用功能，需要 Google 帳戶授權。我們重視您的隱私，不會在未經許可的情況下分享您的資料。
      </div>
    </div>
  </div>
</template>

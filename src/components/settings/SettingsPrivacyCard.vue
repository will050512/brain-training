<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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
          <SubtleLabel text="允許將資料備份到雲端" tone="muted" class="mt-0.5 block" />
        </div>
        <button
          type="button"
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': props.consentState?.analyticsConsent }"
          :aria-pressed="props.consentState?.analyticsConsent ?? false"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="props.toggleUsageAnalytics()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">使用分析（本機）</div>
          <SubtleLabel text="啟用行為記錄以產生洞察" tone="muted" class="mt-0.5 block" />
        </div>
        <button
          type="button"
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.enableBehaviorTracking }"
          :aria-pressed="settingsStore.enableBehaviorTracking"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="bg-[var(--color-bg-muted)] p-3 rounded-lg">
        <SubtleLabel
          text="資料預設儲存在您的裝置上。雲端備份為選用功能，需要 Google 帳戶授權。我們重視您的隱私，不會在未經許可的情況下分享您的資料。"
          tone="muted"
          class="leading-relaxed block"
        />
      </div>
    </div>
  </div>
</template>

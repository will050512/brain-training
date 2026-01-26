<script setup lang="ts">
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">📱</span>
      <h3 class="font-semibold text-[var(--color-text)]">螢幕方向</h3>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.orientationPreference === 'portrait'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setOrientationPreference('portrait')"
      >
        <span class="text-2xl">📱</span>
        <span class="text-sm font-medium">直向</span>
      </button>

      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.orientationPreference === 'landscape'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setOrientationPreference('landscape')"
      >
        <span class="text-2xl">📺</span>
        <span class="text-sm font-medium">橫向</span>
      </button>

      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.orientationPreference === 'auto'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setOrientationPreference('auto')"
      >
        <span class="text-2xl">🔄</span>
        <span class="text-sm font-medium">自動</span>
      </button>
    </div>

    <p
      v-if="!settingsStore.orientationSupported"
      class="text-xs text-[var(--color-warning)] bg-[var(--color-warning-bg)] p-2 rounded-lg mt-3 flex items-start gap-2"
    >
      <span class="mt-0.5">⚠️</span>
      <span>您的裝置不支援自動旋轉鎖定，請使用系統設定調整。</span>
    </p>
  </div>
</template>

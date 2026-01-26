<script setup lang="ts">
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">🎨</span>
      <h3 class="font-semibold text-[var(--color-text)]">外觀主題</h3>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.themeMode === 'light'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setThemeMode('light')"
      >
        <span class="text-2xl">☀️</span>
        <span class="text-sm font-medium">淺色</span>
      </button>

      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.themeMode === 'dark'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setThemeMode('dark')"
      >
        <span class="text-2xl">🌙</span>
        <span class="text-sm font-medium">深色</span>
      </button>

      <button
        type="button"
        class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
        :class="settingsStore.themeMode === 'system'
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
        @click="settingsStore.setThemeMode('system')"
      >
        <span class="text-2xl">🖥️</span>
        <span class="text-sm font-medium">自動</span>
      </button>
    </div>
  </div>
</template>

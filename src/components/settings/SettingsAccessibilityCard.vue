<script setup lang="ts">
import { useSettingsStore } from '@/stores'
import { FONT_SIZE_LABELS, type FontSize } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

const fontSizeOptions = (Object.entries(FONT_SIZE_LABELS) as Array<[FontSize, string]>).map(([value, label]) => ({
  value,
  label
}))
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">👁️</span>
      <h3 class="font-semibold text-[var(--color-text)]">外觀與無障礙</h3>
    </div>

    <div class="mb-4">
      <div class="text-sm font-medium text-[var(--color-text-secondary)] mb-2 px-1">字體大小</div>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="option in fontSizeOptions"
          :key="option.value"
          type="button"
          class="btn-option flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-h-[44px]"
          :class="settingsStore.fontSize === option.value
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
            : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
          @click="settingsStore.setFontSize(option.value)"
        >
          <span class="font-bold" :style="{ fontSize: option.value === 'small' ? '0.75rem' : option.value === 'large' ? '1.125rem' : option.value === 'xlarge' ? '1.25rem' : '0.875rem' }">A</span>
          <span class="text-[10px] sm:text-xs mt-1 opacity-80">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.highContrast = !settingsStore.highContrast">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">高對比模式</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">提升文字與背景對比度</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.highContrast }"
          aria-label="切換高對比模式"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.reduceMotion = !settingsStore.reduceMotion">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">減少動畫</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">降低動態效果，減少視覺干擾</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.reduceMotion }"
          aria-label="切換減少動畫"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">🔊</span>
      <h3 class="font-semibold text-[var(--color-text)]">音效與回饋</h3>
    </div>

    <div class="space-y-4">
      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.toggleSound()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">遊戲音效</div>
          <SubtleLabel text="答對、答錯等互動音效" tone="muted" class="mt-0.5 block" />
        </div>
        <div class="flex items-center gap-2">
          <span
            class="px-2 py-0.5 rounded-full text-xs font-semibold border"
            :class="settingsStore.soundEnabled
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-[var(--color-border)]'"
          >
            {{ settingsStore.soundEnabled ? '已開啟' : '已關閉' }}
          </span>
          <button
            type="button"
            class="toggle-switch flex-shrink-0"
            :class="{ 'toggle-on': settingsStore.soundEnabled }"
            :aria-pressed="settingsStore.soundEnabled"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.toggleMusic()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">背景音樂</div>
          <SubtleLabel text="遊戲過程中的背景音樂" tone="muted" class="mt-0.5 block" />
        </div>
        <div class="flex items-center gap-2">
          <span
            class="px-2 py-0.5 rounded-full text-xs font-semibold border"
            :class="settingsStore.musicEnabled
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-[var(--color-border)]'"
          >
            {{ settingsStore.musicEnabled ? '已開啟' : '已關閉' }}
          </span>
          <button
            type="button"
            class="toggle-switch flex-shrink-0"
            :class="{ 'toggle-on': settingsStore.musicEnabled }"
            :aria-pressed="settingsStore.musicEnabled"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </div>

      <div v-if="false" class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.enableVoicePrompts = !settingsStore.enableVoicePrompts">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">語音提示</div>
          <SubtleLabel text="提供語音引導（若支援）" tone="muted" class="mt-0.5 block" />
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.enableVoicePrompts }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.enableHapticFeedback = !settingsStore.enableHapticFeedback">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">震動回饋</div>
          <SubtleLabel text="觸控時的輕微震動" tone="muted" class="mt-0.5 block" />
        </div>
        <div class="flex items-center gap-2">
          <span
            class="px-2 py-0.5 rounded-full text-xs font-semibold border"
            :class="settingsStore.enableHapticFeedback
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-[var(--color-border)]'"
          >
            {{ settingsStore.enableHapticFeedback ? '已開啟' : '已關閉' }}
          </span>
          <button
            type="button"
            class="toggle-switch flex-shrink-0"
            :class="{ 'toggle-on': settingsStore.enableHapticFeedback }"
            :aria-pressed="settingsStore.enableHapticFeedback"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

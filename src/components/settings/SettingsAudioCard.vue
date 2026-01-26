<script setup lang="ts">
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
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">答對、答錯等互動音效</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.soundEnabled }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.toggleMusic()">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">背景音樂</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">遊戲過程中的背景音樂</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.musicEnabled }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>

      <div v-if="false" class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.enableVoicePrompts = !settingsStore.enableVoicePrompts">
        <div class="flex-1 pr-4">
          <div class="text-base font-medium text-[var(--color-text)]">語音提示</div>
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">提供語音引導（若支援）</div>
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
          <div class="text-xs text-[var(--color-text-muted)] mt-0.5">觸控時的輕微震動</div>
        </div>
        <button
          class="toggle-switch flex-shrink-0"
          :class="{ 'toggle-on': settingsStore.enableHapticFeedback }"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>
    </div>
  </div>
</template>

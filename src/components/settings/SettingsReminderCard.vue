<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">🔔</span>
      <h3 class="font-semibold text-[var(--color-text)]">提醒設定</h3>
    </div>

    <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.assessmentReminderEnabled = !settingsStore.assessmentReminderEnabled">
      <div class="flex-1 pr-4">
        <div class="text-base font-medium text-[var(--color-text)]">每月評估提醒</div>
        <SubtleLabel text="距離上次評估超過 30 天提醒" tone="muted" class="mt-0.5 block" />
      </div>
      <button
        class="toggle-switch flex-shrink-0"
        :class="{ 'toggle-on': settingsStore.assessmentReminderEnabled }"
      >
        <span class="toggle-thumb"></span>
      </button>
    </div>
  </div>
</template>

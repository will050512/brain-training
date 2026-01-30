<template>
  <span :class="['inline-flex items-center gap-1', statusClass]">
    <span aria-hidden="true">{{ statusIcon }}</span>
    <span v-if="showLabel">{{ statusLabel }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true
})

const settingsStore = useSettingsStore()

const statusLabel = computed(() => {
  switch (settingsStore.syncUiStatus) {
    case 'syncing':
      return '自動同步中...'
    case 'success':
      return '自動同步完成'
    case 'error':
      return '自動同步失敗'
    default:
      return '等待自動同步'
  }
})

const statusIcon = computed(() => {
  switch (settingsStore.syncUiStatus) {
    case 'syncing':
      return '⏳'
    case 'success':
      return '✅'
    case 'error':
      return '⚠️'
    default:
      return '☁️'
  }
})

const statusClass = computed(() => {
  switch (settingsStore.syncUiStatus) {
    case 'success':
      return 'text-[var(--color-success)]'
    case 'error':
      return 'text-[var(--color-danger)]'
    case 'syncing':
      return 'text-[var(--color-score)]'
    default:
      return 'text-[var(--color-text-muted)]'
  }
})
</script>

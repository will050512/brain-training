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
      return '同步中...'
    case 'success':
      return '同步完成'
    case 'error':
      return '同步失敗'
    default:
      return '待命'
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
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    case 'syncing':
      return 'text-blue-600'
    default:
      return 'text-[var(--color-text-muted)]'
  }
})
</script>

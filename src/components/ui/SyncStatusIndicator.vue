<script setup lang="ts">
import { computed } from 'vue'
import { dataInitService } from '@/services/dataInitService'

const props = defineProps<{
  position: 'header' | 'sidebar'
}>()

const status = dataInitService.syncStatus

const statusConfig = computed(() => {
  switch (status.value) {
    case 'idle':
      return { icon: '✓', color: 'text-green-500', text: '已同步', class: 'bg-green-500' }
    case 'pending':
      return { icon: '⏳', color: 'text-yellow-500', text: '準備同步...', class: 'bg-yellow-500 animate-pulse' }
    case 'syncing':
      return { icon: '🔄', color: 'text-blue-500', text: '同步中...', class: 'bg-blue-500 animate-spin' }
    case 'error':
      return { icon: '⚠️', color: 'text-red-500', text: '同步失敗，點擊重試', class: 'bg-red-500' }
    case 'offline':
      return { icon: '📴', color: 'text-gray-400', text: '離線模式', class: 'bg-gray-400' }
    default:
      return { icon: '?', color: 'text-gray-400', text: '未知狀態', class: 'bg-gray-400' }
  }
})

function handleClick() {
  if (status.value === 'error') {
    dataInitService.retrySync()
  }
}
</script>

<template>
  <div 
    class="sync-indicator flex items-center gap-2 cursor-pointer transition-all duration-300"
    :class="[
      position === 'header' ? 'px-2' : 'px-4 py-2 w-full hover:bg-black/5 dark:hover:bg-white/5',
      status === 'error' ? 'cursor-pointer' : 'cursor-default'
    ]"
    @click="handleClick"
    :title="statusConfig.text"
  >
    <!-- Header 模式：只顯示小圓點 -->
    <template v-if="position === 'header'">
      <div 
        class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
        :class="statusConfig.class"
      ></div>
    </template>

    <!-- Sidebar 模式：顯示完整圖示與文字 -->
    <template v-else>
      <span class="text-lg" :class="[statusConfig.color, status === 'syncing' ? 'animate-spin' : '']">
        {{ statusConfig.icon }}
      </span>
      <span class="text-sm font-medium text-[var(--color-text-secondary)]">
        {{ statusConfig.text }}
      </span>
    </template>
  </div>
</template>

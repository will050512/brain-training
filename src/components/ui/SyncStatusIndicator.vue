<script setup lang="ts">
import { computed } from 'vue'
import { dataInitService } from '@/services/dataInitService'

// 擴充 position 定義以支援 'icon' (收合模式)
const props = defineProps<{
  position: 'header' | 'sidebar' | 'icon'
}>()

const status = dataInitService.syncStatus

// 狀態設定檔
const statusConfig = computed(() => {
  switch (status.value) {
    case 'idle':
      return { 
        icon: '✓', 
        color: 'text-green-500', 
        bg: 'bg-green-500',
        text: '已同步', 
        action: false 
      }
    case 'pending':
      return { 
        icon: '⏳', 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-500',
        text: '準備同步...', 
        action: false 
      }
    case 'syncing':
      return { 
        icon: '🔄', 
        color: 'text-blue-500', 
        bg: 'bg-blue-500',
        text: '同步中...', 
        action: false 
      }
    case 'error':
      return { 
        icon: '⚠️', 
        color: 'text-red-500', 
        bg: 'bg-red-500',
        text: '同步失敗 (點擊重試)', 
        action: true 
      }
    case 'offline':
      return { 
        icon: '📴', 
        color: 'text-gray-400', 
        bg: 'bg-gray-400',
        text: '離線模式', 
        action: false 
      }
    default:
      return { 
        icon: '❔',
        color: 'text-gray-400', 
        bg: 'bg-gray-400',
        text: '未知狀態', 
        action: false 
      }
  }
})

function handleClick() {
  if (statusConfig.value.action) {
    dataInitService.retrySync()
  }
}
</script>

<template>
  <div 
    class="sync-indicator flex items-center transition-all duration-300 rounded-lg select-none"
    :class="[
      // 根據位置設定容器樣式
      position === 'header' ? 'px-2' : 'h-10 w-full',
      position === 'sidebar' ? 'px-3 hover:bg-black/5 dark:hover:bg-white/5' : '',
      position === 'icon' ? 'justify-center hover:bg-black/5 dark:hover:bg-white/5 px-0' : '',
      
      // 錯誤狀態顯示手型游標
      statusConfig.action ? 'cursor-pointer active:scale-95' : 'cursor-default'
    ]"
    @click="handleClick"
    :title="statusConfig.text"
  >
    <template v-if="position === 'header'">
      <div class="relative flex h-2.5 w-2.5">
        <span 
          v-if="status === 'syncing' || status === 'pending'"
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          :class="statusConfig.bg"
        ></span>
        <span 
          class="relative inline-flex rounded-full h-2.5 w-2.5"
          :class="statusConfig.bg"
        ></span>
      </div>
    </template>

    <template v-else>
      <div 
        class="flex items-center justify-center w-6 h-6 flex-shrink-0 transition-transform duration-500"
        :class="status === 'syncing' ? 'animate-spin' : ''"
      >
        <span class="text-lg leading-none" :class="statusConfig.color">
          {{ statusConfig.icon }}
        </span>
      </div>

      <Transition name="fade-width">
        <div 
          v-if="position === 'sidebar'" 
          class="ml-3 flex-1 min-w-0 overflow-hidden"
        >
          <p 
            class="text-sm font-medium text-[var(--color-text-secondary)] truncate"
          >
            {{ statusConfig.text }}
          </p>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* 控制寬度與透明度的過渡動畫，讓文字消失更自然 */
.fade-width-enter-active,
.fade-width-leave-active {
  transition: all 0.3s ease;
  max-width: 200px;
  opacity: 1;
}

.fade-width-enter-from,
.fade-width-leave-to {
  max-width: 0;
  opacity: 0;
  margin-left: 0;
}
</style>

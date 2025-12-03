<script setup lang="ts">
/**
 * 遊戲結果彈窗
 * 顯示遊戲完成後的詳細結果、與上次比較、改善建議
 */
import { ref, computed, onMounted } from 'vue'
import type { GameResult } from '@/types/game'
import type { CognitiveDimension } from '@/types/cognitive'
import { gameRegistry } from '@/core/gameRegistry'
import { analyzeDimensionTrend, type DimensionTrend } from '@/services/declineDetectionService'
import { useUserStore } from '@/stores/userStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  result: GameResult
  previousResult?: GameResult | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'playAgain'): void
  (e: 'nextGame'): void
}>()

// Stores
const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 遊戲資訊
const gameInfo = computed(() => gameRegistry.get(props.result.gameId))

// 分數變化
const scoreChange = computed(() => {
  if (!props.previousResult) return null
  return props.result.score - props.previousResult.score
})

// 表現評級
const performanceGrade = computed(() => {
  const accuracy = props.result.accuracy
  if (accuracy >= 95) return { grade: 'S', label: '完美！', color: 'text-yellow-500', bg: 'bg-yellow-100' }
  if (accuracy >= 85) return { grade: 'A', label: '優秀', color: 'text-green-500', bg: 'bg-green-100' }
  if (accuracy >= 70) return { grade: 'B', label: '良好', color: 'text-blue-500', bg: 'bg-blue-100' }
  if (accuracy >= 50) return { grade: 'C', label: '普通', color: 'text-gray-500', bg: 'bg-gray-100' }
  return { grade: 'D', label: '加油', color: 'text-red-500', bg: 'bg-red-100' }
})

// 維度名稱對照
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '注意力'
}

// 維度圖示對照
const dimensionIcons: Record<CognitiveDimension, string> = {
  reaction: '⚡',
  logic: '🧩',
  memory: '🧠',
  cognition: '💡',
  coordination: '🎯',
  attention: '👁️'
}

// 訓練的維度
const trainedDimensions = computed(() => {
  if (!gameInfo.value) return []
  
  const weights = gameInfo.value.cognitiveWeights
  return Object.entries(weights)
    .filter(([_, weight]) => weight > 0)
    .map(([dimension, weight]) => ({
      dimension: dimension as CognitiveDimension,
      name: dimensionNames[dimension as CognitiveDimension],
      icon: dimensionIcons[dimension as CognitiveDimension],
      weight: weight as number,
      contribution: Math.round(props.result.score * (weight as number))
    }))
    .sort((a, b) => b.weight - a.weight)
})

// 退化警告
const declineWarning = ref<DimensionTrend | null>(null)

// 改善建議
const suggestions = computed(() => {
  const accuracy = props.result.accuracy
  const suggestions: string[] = []
  
  if (accuracy < 50) {
    suggestions.push('試試從較低難度開始練習')
    suggestions.push('每天固定時間訓練效果更好')
  } else if (accuracy < 70) {
    suggestions.push('保持練習，您正在進步中')
    suggestions.push('嘗試不同類型的遊戲，全面提升')
  } else if (accuracy < 85) {
    suggestions.push('表現不錯！可以嘗試更高難度')
    suggestions.push('挑戰連續答對的紀錄')
  } else {
    suggestions.push('表現優異！繼續保持')
    suggestions.push('試試挑戰更高難度或新遊戲')
  }
  
  // 根據分數變化添加建議
  if (scoreChange.value !== null) {
    if (scoreChange.value > 0) {
      suggestions.push('👍 比上次進步了！繼續加油')
    } else if (scoreChange.value < 0) {
      suggestions.push('💪 分數略有下降，再試一次吧')
    }
  }
  
  return suggestions
})

// 載入退化資訊
async function loadDeclineInfo(): Promise<void> {
  try {
    const primaryDimension = trainedDimensions.value[0]?.dimension
    const odId = userStore.currentUser?.id
    if (primaryDimension && odId) {
      const result = await analyzeDimensionTrend(odId, primaryDimension, settingsStore.declineDetectionMode)
      if (result.trend === 'declining' || result.trend === 'severe-decline') {
        declineWarning.value = result
      }
    }
  } catch (error) {
    console.error('載入退化資訊失敗:', error)
  }
}

// 格式化時間
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}分${secs}秒`
  }
  return `${secs}秒`
}

// 格式化日期
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadDeclineInfo()
})
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- 標題區 -->
      <div class="relative p-6 pb-4 text-center border-b">
        <!-- 遊戲圖示 -->
        <div class="text-5xl mb-2">{{ gameInfo?.icon || '🎮' }}</div>
        <h2 class="text-xl font-bold text-gray-800">{{ gameInfo?.name || '遊戲' }}</h2>
        <p class="text-sm text-gray-500 mt-1">{{ formatDate(result.timestamp) }}</p>
        
        <!-- 關閉按鈕 -->
        <button 
          @click="emit('close')"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 評級區 -->
      <div class="p-6 text-center border-b">
        <div 
          class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
          :class="performanceGrade.bg"
        >
          <span class="text-5xl font-bold" :class="performanceGrade.color">
            {{ performanceGrade.grade }}
          </span>
        </div>
        <p class="text-lg font-semibold" :class="performanceGrade.color">
          {{ performanceGrade.label }}
        </p>
      </div>

      <!-- 分數詳情 -->
      <div class="p-6 border-b">
        <div class="grid grid-cols-3 gap-4 text-center">
          <!-- 分數 -->
          <div>
            <p class="text-sm text-gray-500">分數</p>
            <p class="text-2xl font-bold text-blue-600">{{ result.score }}</p>
            <p v-if="scoreChange !== null" class="text-xs mt-1"
               :class="scoreChange > 0 ? 'text-green-500' : scoreChange < 0 ? 'text-red-500' : 'text-gray-400'">
              {{ scoreChange > 0 ? '+' : '' }}{{ scoreChange }}
            </p>
          </div>
          
          <!-- 正確率 -->
          <div>
            <p class="text-sm text-gray-500">正確率</p>
            <p class="text-2xl font-bold text-green-600">{{ result.accuracy }}%</p>
          </div>
          
          <!-- 用時 -->
          <div>
            <p class="text-sm text-gray-500">用時</p>
            <p class="text-2xl font-bold text-gray-700">{{ formatDuration(result.duration) }}</p>
          </div>
        </div>
      </div>

      <!-- 訓練維度 -->
      <div class="p-6 border-b">
        <h3 class="text-sm font-semibold text-gray-500 mb-3">訓練維度</h3>
        <div class="space-y-2">
          <div 
            v-for="dim in trainedDimensions" 
            :key="dim.dimension"
            class="flex items-center gap-3"
          >
            <span class="text-xl">{{ dim.icon }}</span>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium">{{ dim.name }}</span>
                <span class="text-gray-500">+{{ dim.contribution }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-blue-500 rounded-full transition-all duration-500"
                  :style="{ width: (dim.weight * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 退化警告 -->
      <div v-if="declineWarning" class="p-4 mx-6 my-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <div>
            <p class="text-sm font-semibold text-yellow-800">注意：偵測到表現下降</p>
            <p class="text-xs text-yellow-700 mt-1">
              {{ dimensionNames[declineWarning.dimension] }} 較基準下降 
              {{ Math.abs(Math.round(declineWarning.changePercent)) }}%
            </p>
            <p class="text-xs text-yellow-600 mt-1">
              建議持續練習並保持規律作息
            </p>
          </div>
        </div>
      </div>

      <!-- 與上次比較 -->
      <div v-if="previousResult" class="p-6 border-b bg-gray-50">
        <h3 class="text-sm font-semibold text-gray-500 mb-3">與上次比較</h3>
        <div class="flex justify-around text-center text-sm">
          <div>
            <p class="text-gray-500">上次分數</p>
            <p class="font-bold">{{ previousResult.score }}</p>
          </div>
          <div>
            <p class="text-gray-500">上次正確率</p>
            <p class="font-bold">{{ previousResult.accuracy }}%</p>
          </div>
          <div>
            <p class="text-gray-500">遊玩時間</p>
            <p class="font-bold text-xs">{{ formatDate(previousResult.timestamp) }}</p>
          </div>
        </div>
      </div>

      <!-- 改善建議 -->
      <div class="p-6 border-b">
        <h3 class="text-sm font-semibold text-gray-500 mb-3">💡 建議</h3>
        <ul class="space-y-2">
          <li v-for="(suggestion, index) in suggestions" :key="index" class="text-sm text-gray-600">
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <!-- 操作按鈕 -->
      <div class="p-6 flex gap-3">
        <button
          @click="emit('playAgain')"
          class="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-semibold
                 hover:bg-blue-600 active:scale-95 transition-all"
        >
          🔄 再玩一次
        </button>
        <button
          @click="emit('nextGame')"
          class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold
                 hover:bg-gray-200 active:scale-95 transition-all"
        >
          ➡️ 下一個遊戲
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 動畫 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fixed > div {
  animation: slideUp 0.3s ease-out;
}
</style>

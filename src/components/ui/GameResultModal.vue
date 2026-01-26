<script setup lang="ts">
/**
 * 遊戲結果彈窗
 * 顯示遊戲完成後的詳細結果、與上次比較、改善建議
 */
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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
  if (accuracy >= 95) return { grade: 'S', label: '完美！', color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
  if (accuracy >= 85) return { grade: 'A', label: '優秀', color: 'text-green-500 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' }
  if (accuracy >= 70) return { grade: 'B', label: '良好', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
  if (accuracy >= 50) return { grade: 'C', label: '普通', color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-surface-alt)]' }
  return { grade: 'D', label: '加油', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
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
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border)]">
      <!-- 標題區 -->
      <div class="relative p-6 pb-4 text-center border-b border-[var(--color-border)]">
        <!-- 遊戲圖示 -->
        <div class="text-5xl mb-2 drop-shadow-lg">{{ gameInfo?.icon || '🎮' }}</div>
        <h2 class="text-xl font-bold text-[var(--color-text)]">{{ gameInfo?.name || '遊戲' }}</h2>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">{{ formatDate(result.timestamp) }}</p>
        
        <!-- 關閉按鈕 -->
        <button 
          @click="emit('close')"
          class="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 評級區 -->
      <div class="p-6 text-center border-b border-[var(--color-border)]">
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
      <div class="p-6 border-b border-[var(--color-border)]">
        <div class="grid grid-cols-3 gap-4 text-center">
          <!-- 分數 -->
          <div>
            <p class="text-sm text-[var(--color-text-muted)]">分數</p>
            <p class="text-2xl font-bold text-blue-500 dark:text-blue-400">{{ result.score }}</p>
            <SubtleLabel
              v-if="scoreChange !== null"
              :text="`${scoreChange > 0 ? '+' : ''}${scoreChange}`"
              class="mt-1"
              :class="scoreChange > 0 ? 'text-green-500' : scoreChange < 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'"
            />
          </div>
          
          <!-- 正確率 -->
          <div>
            <p class="text-sm text-[var(--color-text-muted)]">正確率</p>
            <p class="text-2xl font-bold text-green-500 dark:text-green-400">{{ result.accuracy }}%</p>
          </div>
          
          <!-- 用時 -->
          <div>
            <p class="text-sm text-[var(--color-text-muted)]">用時</p>
            <p class="text-2xl font-bold text-[var(--color-text)]">{{ formatDuration(result.duration) }}</p>
          </div>
        </div>
      </div>

      <!-- 訓練維度 -->
      <div class="p-6 border-b border-[var(--color-border)]">
        <h3 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">訓練維度</h3>
        <div class="space-y-2">
          <div 
            v-for="dim in trainedDimensions" 
            :key="dim.dimension"
            class="flex items-center gap-3"
          >
            <span class="text-xl">{{ dim.icon }}</span>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-[var(--color-text)]">{{ dim.name }}</span>
                <span class="text-[var(--color-text-muted)]">+{{ dim.contribution }}</span>
              </div>
              <div class="h-2 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                <div 
                  class="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                  :style="{ width: (dim.weight * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 退化警告 -->
      <div v-if="declineWarning" class="p-4 mx-6 my-4 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <div>
            <p class="text-sm font-semibold text-yellow-700 dark:text-yellow-300">注意：偵測到表現下降</p>
            <SubtleLabel
              :text="`${dimensionNames[declineWarning.dimension]} 較基準下降 ${Math.abs(Math.round(declineWarning.changePercent))}%`"
              class="text-yellow-600 dark:text-yellow-400 mt-1 block"
              size="xs"
            />
            <SubtleLabel
              text="建議持續練習並保持規律作息"
              class="text-yellow-600 dark:text-yellow-400 mt-1 block"
              size="xs"
            />
          </div>
        </div>
      </div>

      <!-- 與上次比較 -->
      <div v-if="previousResult" class="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <h3 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">與上次比較</h3>
        <div class="flex justify-around text-center text-sm">
          <div>
            <p class="text-[var(--color-text-muted)]">上次分數</p>
            <p class="font-bold text-[var(--color-text)]">{{ previousResult.score }}</p>
          </div>
          <div>
            <p class="text-[var(--color-text-muted)]">上次正確率</p>
            <p class="font-bold text-[var(--color-text)]">{{ previousResult.accuracy }}%</p>
          </div>
          <div>
            <p class="text-[var(--color-text-muted)]">遊玩時間</p>
            <SubtleLabel :text="formatDate(previousResult.timestamp)" tone="muted" class="font-bold text-[var(--color-text)]" />
          </div>
        </div>
      </div>

      <!-- 改善建議 -->
      <div class="p-6 border-b border-[var(--color-border)]">
        <h3 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">💡 建議</h3>
        <ul class="space-y-2">
          <li v-for="(suggestion, index) in suggestions" :key="index" class="text-sm text-[var(--color-text-secondary)]">
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <!-- 操作按鈕 -->
      <div class="p-6 flex gap-3">
        <BaseButton
          size="md"
          class="flex-1 py-3 px-4 shadow-lg"
          @click="emit('playAgain')"
        >
          🔄 再玩一次
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="md"
          class="flex-1 py-3 px-4 border border-[var(--color-border)]"
          @click="emit('nextGame')"
        >
          ➡️ 下一個遊戲
        </BaseButton>
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

<script setup lang="ts">
/**
 * 卡片配對遊戲專用結算畫面
 * 針對卡片配對遊戲的特殊統計數據進行展示
 */
import { computed } from 'vue'

interface Props {
  /** 遊戲結果 */
  result: {
    score: number
    accuracy: number
    duration: number
    correctCount: number
    totalCount: number
    avgReactionTime: number
    moves: number
    maxCombo: number
  }
  /** 最佳成績 */
  bestScore?: number
  /** 是否新紀錄 */
  isNewRecord?: boolean
  /** 難度調整信息 */
  difficultyAdjustment?: {
    reason: string
    currentDifficulty: string
    newDifficulty: string
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'replay': []
  'back': []
  'next-game': [gameId: string]
}>()

// 計算配對效率（移動次數相對於最小移動次數的比率）
const pairingEfficiency = computed(() => {
  if (!props.result.totalCount) return 0
  const minMoves = props.result.totalCount / 2 // 理論最小移動次數
  const actualMoves = props.result.moves
  return Math.max(0, Math.min(100, (minMoves / actualMoves) * 100))
})

// 取得效率評價
const getEfficiencyGrade = (efficiency: number) => {
  if (efficiency >= 90) return { grade: 'S', text: '完美配對！', color: 'text-yellow-500' }
  if (efficiency >= 80) return { grade: 'A', text: '優秀表現', color: 'text-green-500' }
  if (efficiency >= 70) return { grade: 'B', text: '良好表現', color: 'text-blue-500' }
  if (efficiency >= 60) return { grade: 'C', text: '表現一般', color: 'text-orange-500' }
  return { grade: 'D', text: '還有進步空間', color: 'text-red-500' }
}

const efficiencyGrade = computed(() => getEfficiencyGrade(pairingEfficiency.value))

// 格式化時間
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}秒`
}

// 取得分數顏色
const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-500'
  if (score >= 70) return 'text-blue-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

// 取得表情
const getResultEmoji = (score: number) => {
  if (score >= 90) return '🎉'
  if (score >= 70) return '😊'
  if (score >= 50) return '👍'
  return '💪'
}
</script>

<template>
  <div class="card-match-result">
    <!-- 主要成績展示 -->
    <div class="result-header text-center mb-6">
      <div class="emoji text-6xl mb-2">{{ getResultEmoji(result.score) }}</div>
      <h2 class="text-2xl font-bold text-[var(--color-text)] mb-4">配對完成！</h2>

      <!-- 分數展示 -->
      <div class="score-display bg-[var(--color-bg)] rounded-xl p-6 inline-block min-w-[140px] mb-4">
        <div class="text-5xl font-bold leading-none" :class="getScoreColor(result.score)">
          {{ result.score }}
        </div>
        <div class="text-sm text-[var(--color-text-secondary)] mt-1">分</div>
      </div>

      <!-- 新紀錄提示 -->
      <div v-if="isNewRecord" class="new-record text-green-600 dark:text-green-400 font-bold text-lg mb-4">
        🎉 新紀錄！
      </div>
    </div>

    <!-- 專用統計數據 -->
    <div class="stats-grid grid grid-cols-2 gap-4 mb-6">
      <!-- 正確率 -->
      <div class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">正確率</div>
        <div class="text-2xl font-bold text-[var(--color-text)]">{{ Math.round(result.accuracy * 100) }}%</div>
      </div>

      <!-- 配對效率 -->
      <div class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">配對效率</div>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold" :class="efficiencyGrade.color">{{ efficiencyGrade.grade }}</span>
          <span class="text-sm text-[var(--color-text-secondary)]">{{ Math.round(pairingEfficiency) }}%</span>
        </div>
      </div>

      <!-- 移動次數 -->
      <div class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">移動次數</div>
        <div class="text-2xl font-bold text-[var(--color-text)]">{{ result.moves }}</div>
      </div>

      <!-- 遊戲時長 -->
      <div class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">遊戲時長</div>
        <div class="text-2xl font-bold text-[var(--color-text)]">{{ formatTime(result.duration) }}</div>
      </div>

      <!-- 平均反應時間 -->
      <div class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">平均反應</div>
        <div class="text-2xl font-bold text-[var(--color-text)]">{{ result.avgReactionTime }}ms</div>
      </div>

      <!-- 最高連擊 -->
      <div v-if="result.maxCombo > 1" class="stat-card bg-[var(--color-surface-alt)] p-4 rounded-lg">
        <div class="text-xs text-[var(--color-text-secondary)] mb-1">最高連擊</div>
        <div class="text-2xl font-bold text-orange-500">{{ result.maxCombo }} 🔥</div>
      </div>
    </div>

    <!-- 效率評價 -->
    <div class="efficiency-feedback text-center mb-6">
      <div class="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
        {{ efficiencyGrade.text }}
      </div>
      <div class="text-sm text-[var(--color-text-muted)]">
        配對 {{ result.correctCount }}/{{ result.totalCount }} 張卡片，共移動 {{ result.moves }} 次
      </div>
    </div>

    <!-- 最佳成績比較 -->
    <div v-if="bestScore !== undefined" class="best-score mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
      <div class="flex justify-between items-center">
        <span class="text-[var(--color-text)] font-medium">最佳成績</span>
        <div class="text-right">
          <span class="font-bold text-blue-600 dark:text-blue-400 block">{{ bestScore }} 分</span>
          <div v-if="result.score > bestScore" class="text-xs text-green-600 dark:text-green-400 font-bold">
            🎉 打破紀錄！
          </div>
        </div>
      </div>
    </div>

    <!-- 難度調整通知 -->
    <div
      v-if="difficultyAdjustment"
      class="difficulty-adjustment mb-6 p-4 rounded-xl border-2"
      :class="{
        'bg-green-50 border-green-300 text-green-800': difficultyAdjustment.reason === 'accuracy-high',
        'bg-orange-50 border-orange-300 text-orange-800': difficultyAdjustment.reason === 'accuracy-low',
        'bg-blue-50 border-blue-300 text-blue-800': difficultyAdjustment.reason === 'stable'
      }"
    >
      <div class="flex items-center gap-3">
        <div class="text-2xl">
          {{ difficultyAdjustment.reason === 'accuracy-high' ? '⬆️' :
             difficultyAdjustment.reason === 'accuracy-low' ? '⬇️' : '➡️' }}
        </div>
        <div>
          <h4 class="font-bold mb-1">難度調整</h4>
          <p class="text-sm mb-2">
            {{ difficultyAdjustment.reason === 'accuracy-high' ? '表現優異，難度提升！' :
               difficultyAdjustment.reason === 'accuracy-low' ? '正在適應新難度' : '難度保持穩定' }}
          </p>
          <div class="text-xs bg-white/60 dark:bg-black/20 p-2 rounded">
            {{ difficultyAdjustment.currentDifficulty }} → {{ difficultyAdjustment.newDifficulty }}
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div class="action-buttons flex flex-col gap-3">
      <button @click="emit('replay')" class="btn btn-primary btn-lg w-full">
        🔄 再玩一次
      </button>

      <div class="grid grid-cols-2 gap-3">
        <button @click="emit('next-game', 'instant-memory')" class="btn btn-secondary">
          🎯 瞬間記憶
        </button>
        <button @click="emit('next-game', 'poker-memory')" class="btn btn-secondary">
          🃏 撲克記憶
        </button>
      </div>

      <button @click="emit('back')" class="btn btn-outline btn-lg w-full">
        ← 返回遊戲列表
      </button>
    </div>
  </div>
</template>

<style scoped>
.card-match-result {
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
}

@media (max-width: 640px) {
  .card-match-result {
    padding: 0.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .score-display {
    padding: 1rem;
  }

  .result-header .emoji {
    font-size: 3rem;
  }

  .result-header h2 {
    font-size: 1.5rem;
  }
}
</style>

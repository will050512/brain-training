<script setup lang="ts">
/**
 * 遊戲結果畫面元件
 * 顯示遊戲結束後的成績與統計
 */
import { computed } from 'vue'

interface Props {
  /** 最終分數 */
  score: number
  /** 最高分（用於比較） */
  highScore?: number
  /** 正確數 */
  correctCount?: number
  /** 錯誤數 */
  wrongCount?: number
  /** 總題數 */
  totalCount?: number
  /** 花費時間（秒） */
  timeSpent?: number
  /** 最高連擊 */
  maxCombo?: number
  /** 評價等級 */
  grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  /** 評價訊息 */
  gradeMessage?: string
  /** 是否為新高分 */
  isNewHighScore?: boolean
  /** 是否顯示重玩按鈕 */
  showReplay?: boolean
  /** 是否顯示返回按鈕 */
  showBack?: boolean
  /** 自訂統計項目 */
  customStats?: Array<{ label: string; value: string | number; icon?: string }>
}

const props = withDefaults(defineProps<Props>(), {
  showReplay: true,
  showBack: true,
})

const emit = defineEmits<{
  (e: 'replay'): void
  (e: 'back'): void
  (e: 'share'): void
}>()

// 計算正確率
const accuracy = computed(() => {
  if (!props.totalCount) return null
  return Math.round((props.correctCount ?? 0) / props.totalCount * 100)
})

// 格式化時間
const formattedTime = computed(() => {
  if (!props.timeSpent) return null
  const minutes = Math.floor(props.timeSpent / 60)
  const seconds = props.timeSpent % 60
  return minutes > 0 
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds} 秒`
})

// 評價顏色
const gradeColors: Record<string, string> = {
  S: 'grade-s',
  A: 'grade-a',
  B: 'grade-b',
  C: 'grade-c',
  D: 'grade-d',
  F: 'grade-f',
}

// 預設評價訊息
const defaultGradeMessages: Record<string, string> = {
  S: '太厲害了！完美表現！',
  A: '非常優秀！繼續保持！',
  B: '表現不錯！再接再厲！',
  C: '還可以，繼續努力！',
  D: '加油，下次會更好！',
  F: '別灰心，多練習就會進步！',
}

const displayGradeMessage = computed(() => {
  return props.gradeMessage || (props.grade ? defaultGradeMessages[props.grade] : '')
})
</script>

<template>
  <div class="result-screen">
    <!-- 新高分提示 -->
    <div v-if="isNewHighScore" class="new-high-score">
      🎉 新高分！
    </div>

    <!-- 評價等級 -->
    <div v-if="grade" class="grade-section">
      <div class="grade" :class="gradeColors[grade]">
        {{ grade }}
      </div>
      <p class="grade-message">{{ displayGradeMessage }}</p>
    </div>

    <!-- 分數 -->
    <div class="score-section">
      <span class="score-label">得分</span>
      <span class="score-value">{{ score.toLocaleString() }}</span>
      <span v-if="highScore && !isNewHighScore" class="high-score">
        最高分: {{ highScore.toLocaleString() }}
      </span>
    </div>

    <!-- 統計數據 -->
    <div class="stats-grid">
      <!-- 正確率 -->
      <div v-if="accuracy !== null" class="stat-item">
        <span class="stat-icon">🎯</span>
        <span class="stat-value">{{ accuracy }}%</span>
        <span class="stat-label">正確率</span>
      </div>

      <!-- 答題數 -->
      <div v-if="correctCount !== undefined" class="stat-item">
        <span class="stat-icon">✓</span>
        <span class="stat-value">{{ correctCount }}/{{ totalCount }}</span>
        <span class="stat-label">正確數</span>
      </div>

      <!-- 時間 -->
      <div v-if="formattedTime" class="stat-item">
        <span class="stat-icon">⏱️</span>
        <span class="stat-value">{{ formattedTime }}</span>
        <span class="stat-label">花費時間</span>
      </div>

      <!-- 連擊 -->
      <div v-if="maxCombo && maxCombo > 1" class="stat-item">
        <span class="stat-icon">🔥</span>
        <span class="stat-value">{{ maxCombo }}x</span>
        <span class="stat-label">最高連擊</span>
      </div>

      <!-- 自訂統計 -->
      <div 
        v-for="stat in customStats" 
        :key="stat.label" 
        class="stat-item"
      >
        <span v-if="stat.icon" class="stat-icon">{{ stat.icon }}</span>
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div class="action-buttons">
      <button 
        v-if="showReplay"
        type="button"
        class="action-button replay-button"
        @click="emit('replay')"
      >
        <span class="button-icon">🔄</span>
        <span>再玩一次</span>
      </button>

      <button 
        v-if="showBack"
        type="button"
        class="action-button back-button"
        @click="emit('back')"
      >
        <span class="button-icon">←</span>
        <span>返回</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.result-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 2rem;
  text-align: center;
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

/* 新高分 */
.new-high-score {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: 1rem;
  animation: bounce 0.5s ease-out;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
}

@keyframes bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 評價區塊 */
.grade-section {
  margin-bottom: 1.5rem;
}

.grade {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  font-size: 3.5rem;
  font-weight: 900;
  margin: 0 auto 0.75rem;
  animation: gradeAppear 0.5s ease-out;
}

@keyframes gradeAppear {
  0% { transform: scale(0) rotate(-180deg); }
  100% { transform: scale(1) rotate(0); }
}

.grade-s { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.grade-a { background: linear-gradient(135deg, #34d399, #10b981); color: white; }
.grade-b { background: linear-gradient(135deg, #60a5fa, #3b82f6); color: white; }
.grade-c { background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; }
.grade-d { background: linear-gradient(135deg, #fb923c, #f97316); color: white; }
.grade-f { background: linear-gradient(135deg, #f87171, #ef4444); color: white; }

.grade-message {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 分數區塊 */
.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
}

.score-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.score-value {
  font-size: 3rem;
  font-weight: 900;
  color: var(--color-primary);
  line-height: 1;
}

.high-score {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* 統計網格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  width: 100%;
  max-width: 320px;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.replay-button {
  background: var(--color-primary);
  color: white;
}

.replay-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.back-button {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.back-button:hover {
  background: var(--color-bg-tertiary);
  transform: translateY(-2px);
}

.button-icon {
  font-size: 1.125rem;
}

/* 手機優化 */
@media (max-width: 640px) {
  .result-screen {
    padding: 1.5rem;
  }
  
  .grade {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
  }
  
  .score-value {
    font-size: 2.5rem;
  }
  
  .stats-grid {
    gap: 0.75rem;
  }
  
  .stat-item {
    padding: 0.75rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  .action-buttons {
    width: 100%;
  }
  
  .action-button {
    flex: 1;
    justify-content: center;
  }
}
</style>

<script setup lang="ts">
/**
 * 每日挑戰視圖
 * 自動生成覆蓋所有6個認知維度的訓練菜單
 * 一鍵開始連續訓練模式
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { 
  createPersonalizedTrainingPlan, 
  getTodayPlan,
  type DailyTrainingPlan,
  type TrainingGameItem
} from '@/services/dailyTrainingService'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'

const router = useRouter()
const userStore = useUserStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const trainingPlan = ref<DailyTrainingPlan | null>(null)
const isLoading = ref(true)
const isStarting = ref(false)

// 維度名稱映射
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '專注力',
}

// 維度圖示映射
const dimensionIcons: Record<CognitiveDimension, string> = {
  reaction: '⚡',
  logic: '🧩',
  memory: '🧠',
  cognition: '💡',
  coordination: '🎯',
  attention: '👁️',
}

// 維度顏色映射
const dimensionColors: Record<CognitiveDimension, string> = {
  reaction: '#ef4444',
  logic: '#8b5cf6',
  memory: '#3b82f6',
  cognition: '#f59e0b',
  coordination: '#10b981',
  attention: '#ec4899',
}

// 計算覆蓋的維度
const coveredDimensions = computed(() => {
  if (!trainingPlan.value) return new Set<CognitiveDimension>()
  
  const dims = new Set<CognitiveDimension>()
  for (const game of trainingPlan.value.games) {
    for (const dim of game.targetDimensions) {
      dims.add(dim)
    }
  }
  return dims
})

// 所有維度列表
const allDimensions: CognitiveDimension[] = [
  'memory', 'attention', 'logic', 'reaction', 'cognition', 'coordination'
]

// 今日進度
const todayProgress = computed(() => {
  if (!trainingPlan.value) return 0
  return trainingPlan.value.progress
})

// 是否已完成
const isCompleted = computed(() => {
  return trainingPlan.value?.status === 'completed'
})

// 是否可以繼續（有未完成的遊戲）
const canContinue = computed(() => {
  return trainingPlan.value?.canContinue || 
         (trainingPlan.value && trainingPlan.value.completedGames < trainingPlan.value.totalGames)
})

// 預估時間（分鐘）
const estimatedMinutes = computed(() => {
  if (!trainingPlan.value) return 0
  return Math.ceil(trainingPlan.value.totalEstimatedTime / 60)
})

// 載入訓練計畫
async function loadTrainingPlan() {
  isLoading.value = true
  
  try {
    const odId = userStore.currentUser?.id
    if (!odId) return
    
    // 先嘗試取得今日已有計畫
    let plan = await getTodayPlan(odId)
    
    if (!plan) {
      // 沒有計畫，自動生成新計畫
      const cognitiveScores: CognitiveScores = gameStore.cognitiveScores || {
        reaction: 50,
        logic: 50,
        memory: 50,
        cognition: 50,
        coordination: 50,
        attention: 50,
      }
      
      const recentSessions = gameStore.recentSessions.map(s => ({
        gameId: s.gameId,
        accuracy: s.result?.accuracy,
        id: s.id
      }))
      
      const duration = settingsStore.dailyTrainingDuration || 15
      plan = await createPersonalizedTrainingPlan(
        odId,
        duration,
        cognitiveScores,
        recentSessions
      )
    }
    
    trainingPlan.value = plan
  } catch (error) {
    console.error('載入訓練計畫失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 一鍵開始訓練
async function startTraining() {
  if (!trainingPlan.value || trainingPlan.value.games.length === 0) return
  
  isStarting.value = true
  
  try {
    // 找出第一個未完成的遊戲
    const nextGame = trainingPlan.value.games.find(g => !g.isCompleted)
    if (!nextGame) {
      // 全部完成，重新開始第一個
      const firstGame = trainingPlan.value.games[0]
      if (firstGame) {
        await startGame(firstGame)
      }
      return
    }
    
    await startGame(nextGame)
  } finally {
    isStarting.value = false
  }
}

// 開始特定遊戲
async function startGame(game: TrainingGameItem) {
  // 設定訓練隊列
  const queue = trainingPlan.value!.games.map(g => ({
    gameId: g.gameId,
    difficulty: g.difficulty
  }))
  
  gameStore.setDailyTrainingQueue(queue)
  
  // 跳到對應的遊戲索引
  const gameIndex = trainingPlan.value!.games.findIndex(g => g.gameId === game.gameId)
  if (gameIndex > 0) {
    for (let i = 0; i < gameIndex; i++) {
      gameStore.moveToNextTrainingGame()
    }
  }
  
  // 選擇遊戲並跳轉
  gameStore.selectGame(game.gameId)
  gameStore.selectDifficulty(game.difficulty)
  router.push(`/games/${game.gameId}?autoStart=true&fromDaily=true`)
}

// 難度文字
function getDifficultyText(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '簡單'
    case 'medium': return '中等'
    case 'hard': return '困難'
    default: return ''
  }
}

// 難度顏色
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '#10b981'
    case 'medium': return '#f59e0b'
    case 'hard': return '#ef4444'
    default: return '#6b7280'
  }
}

onMounted(() => {
  loadTrainingPlan()
})
</script>

<template>
  <div class="daily-challenge">
    <!-- 頂部導航 -->
    <header class="page-header">
      <button class="back-btn" @click="router.push('/')">
        ← 返回
      </button>
      <h1>📅 每日訓練</h1>
    </header>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>正在生成您的專屬訓練計畫...</p>
    </div>

    <template v-else-if="trainingPlan">
      <!-- 維度覆蓋概覽 -->
      <section class="dimension-overview">
        <h2 class="section-title">今日訓練涵蓋維度</h2>
        <div class="dimension-grid">
          <div 
            v-for="dim in allDimensions" 
            :key="dim"
            class="dimension-item"
            :class="{ covered: coveredDimensions.has(dim) }"
            :style="{ '--dim-color': dimensionColors[dim] }"
          >
            <span class="dim-icon">{{ dimensionIcons[dim] }}</span>
            <span class="dim-name">{{ dimensionNames[dim] }}</span>
            <span v-if="coveredDimensions.has(dim)" class="dim-check">✓</span>
          </div>
        </div>
      </section>

      <!-- 訓練概要 + 一鍵開始 -->
      <section class="training-summary">
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-value">{{ trainingPlan.totalGames }}</span>
            <span class="stat-label">個遊戲</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ estimatedMinutes }}</span>
            <span class="stat-label">分鐘</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ coveredDimensions.size }}</span>
            <span class="stat-label">個維度</span>
          </div>
        </div>

        <!-- 進度條 -->
        <div v-if="trainingPlan.completedGames > 0" class="progress-section">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${todayProgress}%` }"
            ></div>
          </div>
          <div class="progress-text">
            已完成 {{ trainingPlan.completedGames }} / {{ trainingPlan.totalGames }}
          </div>
        </div>

        <!-- 一鍵開始按鈕 -->
        <button 
          class="start-training-btn"
          :class="{ completed: isCompleted }"
          :disabled="isStarting"
          @click="startTraining"
        >
          <span v-if="isStarting" class="btn-spinner"></span>
          <template v-else-if="isCompleted">
            🎉 今日訓練已完成！再來一次？
          </template>
          <template v-else-if="canContinue">
            ▶️ 繼續訓練
          </template>
          <template v-else>
            🚀 一鍵開始訓練
          </template>
        </button>
      </section>

      <!-- 訓練遊戲列表 -->
      <section class="games-list-section">
        <h2 class="section-title">訓練內容</h2>
        <div class="games-list">
          <div 
            v-for="(game, index) in trainingPlan.games" 
            :key="game.gameId"
            class="game-item"
            :class="{ completed: game.isCompleted }"
            @click="startGame(game)"
          >
            <div class="game-order">{{ index + 1 }}</div>
            <div class="game-icon">{{ game.game.icon }}</div>
            <div class="game-info">
              <div class="game-name">{{ game.game.name }}</div>
              <div class="game-meta">
                <span 
                  class="difficulty-tag"
                  :style="{ color: getDifficultyColor(game.difficulty) }"
                >
                  {{ getDifficultyText(game.difficulty) }}
                </span>
                <span class="dimension-tags">
                  <span 
                    v-for="dim in game.targetDimensions.slice(0, 2)" 
                    :key="dim"
                    class="mini-dim-tag"
                    :style="{ backgroundColor: dimensionColors[dim] + '20', color: dimensionColors[dim] }"
                  >
                    {{ dimensionIcons[dim] }}
                  </span>
                </span>
              </div>
            </div>
            <div class="game-status">
              <span v-if="game.isCompleted" class="status-done">✓</span>
              <span v-else class="status-arrow">→</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 底部提示 -->
      <div class="bottom-tip">
        <p>💡 每日訓練會自動覆蓋所有認知維度，幫助全面提升腦力！</p>
      </div>
    </template>

    <!-- 無計畫 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📋</div>
      <p>無法生成訓練計畫，請稍後再試</p>
      <button class="retry-btn" @click="loadTrainingPlan">
        重新載入
      </button>
    </div>
  </div>
</template>

<style scoped>
.daily-challenge {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  padding-bottom: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  padding: 0.625rem 1rem;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-bg-soft);
}

.page-header h1 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--color-text);
}

/* 載入中 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-accent-purple);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 維度概覽 */
.dimension-overview {
  padding: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.dimension-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  position: relative;
  opacity: 0.5;
  transition: all 0.3s;
}

.dimension-item.covered {
  opacity: 1;
  border-color: var(--dim-color);
  background: linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--dim-color) 10%, var(--color-surface)) 100%);
}

.dim-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.dim-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.dimension-item.covered .dim-name {
  color: var(--color-text);
}

.dim-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: var(--dim-color);
  color: white;
  border-radius: 50%;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* 訓練概要 */
.training-summary {
  padding: 1rem;
  margin: 0 1rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}

.summary-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-accent-purple);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--color-border);
}

.progress-section {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent-green) 0%, var(--color-accent-blue) 100%);
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.start-training-btn {
  width: 100%;
  padding: 1.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, var(--color-accent-purple) 0%, var(--color-accent-blue) 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.start-training-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(161, 36, 224, 0.4);
}

.start-training-btn:active:not(:disabled) {
  transform: translateY(0);
}

.start-training-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.start-training-btn.completed {
  background: linear-gradient(135deg, var(--color-accent-green) 0%, #059669 100%);
}

.btn-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 遊戲列表 */
.games-list-section {
  padding: 0 1rem;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.game-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.game-item:hover {
  border-color: var(--color-accent-purple);
  transform: translateX(4px);
}

.game-item.completed {
  opacity: 0.6;
}

.game-item.completed:hover {
  opacity: 0.8;
}

.game-order {
  width: 28px;
  height: 28px;
  background: var(--color-surface-alt);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.game-item.completed .game-order {
  background: var(--color-accent-green);
  color: white;
}

.game-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.game-info {
  flex: 1;
  min-width: 0;
}

.game-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  color: var(--color-text);
}

.game-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.difficulty-tag {
  font-size: 0.75rem;
  font-weight: 500;
}

.dimension-tags {
  display: flex;
  gap: 0.25rem;
}

.mini-dim-tag {
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.game-status {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.status-done {
  color: var(--color-accent-green);
  font-weight: bold;
}

.status-arrow {
  color: var(--color-text-muted);
}

/* 底部提示 */
.bottom-tip {
  padding: 1.5rem 1rem;
  text-align: center;
}

.bottom-tip p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

/* 響應式 */
@media (min-width: 640px) {
  .dimension-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .daily-challenge {
    max-width: 600px;
    margin: 0 auto;
  }
}
</style>

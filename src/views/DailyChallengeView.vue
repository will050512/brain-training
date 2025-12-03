<script setup lang="ts">
/**
 * 每日挑戰視圖
 * 根據用戶弱項推薦適合的遊戲組合
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { getDailyRecommendations, getTrainingSuggestion, type GameRecommendation } from '@/services/recommendationEngine'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'

const router = useRouter()
const userStore = useUserStore()
const gameStore = useGameStore()

const recommendations = ref<GameRecommendation[]>([])
const trainingSuggestion = ref<{ dimension: CognitiveDimension; message: string; games: string[] } | null>(null)
const completedToday = ref<Set<string>>(new Set())
const isLoading = ref(true)

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

// 今日進度
const todayProgress = computed(() => {
  const total = recommendations.value.length
  const completed = completedToday.value.size
  return total > 0 ? Math.round((completed / total) * 100) : 0
})

// 載入推薦
async function loadRecommendations() {
  isLoading.value = true
  
  try {
    // 取得用戶認知分數（使用 gameStore 的計算屬性）
    const cognitiveScores: CognitiveScores = gameStore.cognitiveScores || {
      reaction: 50,
      logic: 50,
      memory: 50,
      cognition: 50,
      coordination: 50,
      attention: 50,
    }
    
    // 取得最近遊戲記錄
    const sessions = gameStore.recentSessions
    
    // 生成推薦
    recommendations.value = getDailyRecommendations(cognitiveScores, sessions, 3)
    
    // 取得訓練建議
    trainingSuggestion.value = getTrainingSuggestion(cognitiveScores)
    
    // 檢查今日已完成的遊戲
    const today = new Date().toDateString()
    const todaySessions = sessions.filter(
      (s: { createdAt: Date; gameId: string }) => new Date(s.createdAt).toDateString() === today
    )
    completedToday.value = new Set(todaySessions.map((s: { gameId: string }) => s.gameId))
  } catch (error) {
    console.error('載入推薦失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 開始遊戲
function startGame(gameId: string, difficulty: string) {
  router.push({
    name: 'GamePlay',
    params: { gameId },
    query: { difficulty },
  })
}

// 取得優先級顏色
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}

// 取得優先級文字
function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '強力推薦'
    case 'medium': return '推薦'
    case 'low': return '適合'
    default: return ''
  }
}

// 難度顏色
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '#22c55e'
    case 'medium': return '#f59e0b'
    case 'hard': return '#ef4444'
    default: return '#6b7280'
  }
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

onMounted(() => {
  loadRecommendations()
})
</script>

<template>
  <div class="daily-challenge">
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        ← 返回
      </button>
      <h1>📅 每日挑戰</h1>
    </header>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>正在分析您的訓練需求...</p>
    </div>

    <template v-else>
      <!-- 今日進度 -->
      <section class="progress-section">
        <h2>今日進度</h2>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${todayProgress}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ completedToday.size }} / {{ recommendations.length }} 完成
        </div>
        <p v-if="todayProgress === 100" class="congrats">
          🎉 太棒了！今日挑戰已完成！
        </p>
      </section>

      <!-- 訓練建議 -->
      <section v-if="trainingSuggestion" class="suggestion-section">
        <div class="suggestion-card">
          <div class="suggestion-icon">
            {{ dimensionIcons[trainingSuggestion.dimension] }}
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">
              訓練焦點：{{ dimensionNames[trainingSuggestion.dimension] }}
            </div>
            <p class="suggestion-message">{{ trainingSuggestion.message }}</p>
          </div>
        </div>
      </section>

      <!-- 推薦遊戲列表 -->
      <section class="recommendations-section">
        <h2>今日推薦</h2>
        <div class="recommendation-list">
          <div 
            v-for="rec in recommendations" 
            :key="rec.gameId"
            class="recommendation-card"
            :class="{ completed: completedToday.has(rec.gameId) }"
          >
            <!-- 完成標記 -->
            <div v-if="completedToday.has(rec.gameId)" class="completed-badge">
              ✓ 已完成
            </div>
            
            <!-- 優先級標籤 -->
            <div 
              class="priority-tag"
              :style="{ backgroundColor: getPriorityColor(rec.priority) }"
            >
              {{ getPriorityText(rec.priority) }}
            </div>

            <div class="game-icon">{{ rec.game.icon }}</div>
            <h3 class="game-name">{{ rec.game.name }}</h3>
            <p class="game-description">{{ rec.game.description }}</p>
            
            <div class="game-meta">
              <span 
                class="difficulty-badge"
                :style="{ color: getDifficultyColor(rec.suggestedDifficulty) }"
              >
                {{ getDifficultyText(rec.suggestedDifficulty) }}
              </span>
              <span class="reason">{{ rec.reason }}</span>
            </div>

            <!-- 認知維度 -->
            <div class="cognitive-tags">
              <span 
                v-for="(weight, dim) in rec.game.cognitiveWeights" 
                :key="dim"
                class="cognitive-tag"
                :title="`${dimensionNames[dim as CognitiveDimension]}: ${Math.round((weight as number) * 100)}%`"
              >
                {{ dimensionIcons[dim as CognitiveDimension] }}
              </span>
            </div>

            <button 
              class="start-btn"
              :disabled="completedToday.has(rec.gameId)"
              @click="startGame(rec.gameId, rec.suggestedDifficulty)"
            >
              {{ completedToday.has(rec.gameId) ? '再玩一次' : '開始挑戰' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 更多遊戲 -->
      <section class="more-section">
        <router-link to="/games" class="more-link">
          探索更多遊戲 →
        </router-link>
      </section>
    </template>
  </div>
</template>

<style scoped>
.daily-challenge {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.page-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

/* 載入中 */
.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 進度區塊 */
.progress-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  text-align: center;
}

.progress-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 12px;
  background: var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.5s ease;
}

.progress-text {
  color: var(--color-text-light);
}

.congrats {
  margin-top: 1rem;
  font-size: 1.25rem;
  color: #22c55e;
  font-weight: bold;
}

/* 建議區塊 */
.suggestion-section {
  margin-bottom: 2rem;
}

.suggestion-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
  border-radius: 16px;
  border: 1px solid #c7d2fe;
}

.suggestion-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-weight: bold;
  font-size: 1.125rem;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.suggestion-message {
  color: var(--color-text);
  margin: 0;
}

/* 推薦列表 */
.recommendations-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.recommendation-list {
  display: grid;
  gap: 1rem;
}

.recommendation-card {
  position: relative;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.recommendation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommendation-card.completed {
  opacity: 0.7;
}

.completed-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #22c55e;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: bold;
}

.priority-tag {
  position: absolute;
  top: 1rem;
  left: 1rem;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.game-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 0.5rem;
}

.game-name {
  text-align: center;
  font-size: 1.25rem;
  margin: 0 0 0.5rem 0;
}

.game-description {
  text-align: center;
  color: var(--color-text-light);
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
}

.game-meta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.difficulty-badge {
  font-weight: bold;
}

.reason {
  color: var(--color-text-light);
}

.cognitive-tags {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.cognitive-tag {
  font-size: 1.25rem;
  padding: 0.25rem;
  background: var(--color-background-soft);
  border-radius: 8px;
}

.start-btn {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.start-btn:disabled {
  background: #9ca3af;
  cursor: default;
}

/* 更多連結 */
.more-section {
  text-align: center;
  margin-top: 2rem;
}

.more-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: bold;
  font-size: 1rem;
}

.more-link:hover {
  text-decoration: underline;
}

/* 響應式 */
@media (min-width: 640px) {
  .recommendation-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

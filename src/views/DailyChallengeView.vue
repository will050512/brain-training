<script setup lang="ts">
/**
 * 每日挑戰視圖
 * 自動生成覆蓋所有6個認知維度的訓練菜單
 * 一鍵開始連續訓練模式
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { 
  createPersonalizedTrainingPlan, 
  getTodayPlan,
  regenerateDailyPlan,
  type DailyTrainingPlan,
  type TrainingGameItem
} from '@/services/dailyTrainingService'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import { getTotalGamesPlayed } from '@/utils/trainingStats'

const router = useRouter()
const route = useRoute()
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

const totalGamesPlayed = computed(() => {
  return getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
})

const shouldPrioritizeUntested = computed(() => totalGamesPlayed.value < 18)

const untestedDimensions = computed(() => {
  return shouldPrioritizeUntested.value ? gameStore.untestedDimensions : []
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
        recentSessions,
        {
          untestedDimensions: untestedDimensions.value,
          prioritizeUntested: shouldPrioritizeUntested.value,
        }
      )
    }
    
    trainingPlan.value = plan
  } catch (error) {
    console.error('載入訓練計畫失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 重新生成計畫
async function regeneratePlan() {
  if (!trainingPlan.value || trainingPlan.value.status !== 'not-started') return
  
  isLoading.value = true
  try {
    const odId = userStore.currentUser?.id
    if (!odId) return
    
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
    
    const plan = await regenerateDailyPlan(
      odId,
      duration,
      cognitiveScores,
      recentSessions,
      {
        untestedDimensions: untestedDimensions.value,
        prioritizeUntested: shouldPrioritizeUntested.value,
      }
    )
    
    trainingPlan.value = plan
  } catch (error) {
    console.error('重新生成計畫失敗:', error)
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
    difficulty: g.difficulty,
    subDifficulty: g.subDifficulty
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
  gameStore.selectSubDifficulty(game.subDifficulty)
  router.push({
    path: `/games/${game.gameId}`,
    query: { fromDaily: 'true', subDifficulty: String(game.subDifficulty) }
  })
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

// 監聽路由變化，當重新進入此頁面時刷新
watch(() => route.path, (newPath) => {
  if (newPath === '/daily-challenge') {
    loadTrainingPlan()
  }
})
</script>

<template>
  <div class="daily-challenge">
    <div class="content-wrapper">
      <header class="page-header">
        <button class="back-btn" @click="router.push('/')">
          <span class="icon">←</span> 返回
        </button>
        <h1>📅 每日訓練</h1>
        <div class="w-12"></div>
      </header>

      <!-- 載入中 -->
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>正在為您準備專屬訓練...</p>
      </div>

      <template v-else-if="trainingPlan">
        <!-- 訓練摘要 (卡片) -->
        <section class="training-summary card">
          <h2 class="sr-only">訓練摘要</h2>

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
              <span class="stat-label">項能力</span>
            </div>
          </div>

          <div v-if="trainingPlan.completedGames > 0" class="progress-section">
            <div class="progress-header">
              <span class="progress-label">今日進度</span>
              <span class="progress-percent">{{ Math.round(todayProgress) }}%</span>
            </div>
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

          <button
            class="start-training-btn"
            :class="{ completed: isCompleted }"
            :disabled="isStarting"
            @click="startTraining"
          >
            <span v-if="isStarting" class="btn-spinner"></span>
            <template v-else-if="isCompleted">
              <span class="btn-icon">🎉</span> 今日已完成！<br><span class="text-sm font-normal opacity-90">點擊再次挑戰</span>
            </template>
            <template v-else-if="canContinue">
              <span class="btn-icon">▶️</span> 繼續訓練
            </template>
            <template v-else>
              <span class="btn-icon">🚀</span> 開始今日訓練
            </template>
          </button>

          <div v-if="trainingPlan.status === 'not-started'" class="regenerate-section">
            <button class="text-btn" @click="regeneratePlan" :disabled="isLoading">
              🔄 重新生成訓練內容
            </button>
          </div>
        </section>

        <!-- 今日訓練重點 / 維度 -->
        <section class="dimension-section">
          <h2 class="section-title">今日訓練重點</h2>
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
              <div v-if="coveredDimensions.has(dim)" class="dim-badge">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="4">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <!-- 訓練清單 -->
        <section class="games-list-section">
          <h2 class="section-title">訓練清單</h2>
          <div class="games-list">
            <div
              v-for="(game, index) in trainingPlan.games"
              :key="game.gameId"
              class="game-item card"
              :class="{ completed: game.isCompleted, active: !game.isCompleted && !isCompleted && index === trainingPlan.completedGames }"
              @click="startGame(game)"
            >
              <div class="game-item-left">
                <div class="game-order">{{ index + 1 }}</div>
                <div class="game-icon-box">{{ game.game.icon }}</div>
                <div class="game-info">
                  <div class="game-name">{{ game.game.name }}</div>
                  <div class="game-meta">
                    <span
                      class="difficulty-tag"
                      :style="{ backgroundColor: getDifficultyColor(game.difficulty) + '20', color: getDifficultyColor(game.difficulty) }"
                    >
                      {{ getDifficultyText(game.difficulty) }}
                    </span>
                    <div class="dim-dots">
                      <span
                        v-for="dim in game.targetDimensions"
                        :key="dim"
                        class="dim-dot"
                        :style="{ backgroundColor: dimensionColors[dim] }"
                        :title="dimensionNames[dim]"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="game-status">
                <span v-if="game.isCompleted" class="status-done">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3">
                    <circle cx="12" cy="12" r="10" class="opacity-20" />
                    <path d="M17 9L10 16L7 13" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span v-else class="status-arrow">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" class="opacity-20" />
                    <path d="M10 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div class="bottom-tip">
          <p>💡 提示：每天只需 15 分鐘，持續訓練大腦更健康！</p>
        </div>
      </template>

      <!-- 無計畫 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>暫無訓練計畫</h3>
        <p>無法生成訓練計畫，請檢查網路連線</p>
        <button class="retry-btn" @click="loadTrainingPlan">
          重新載入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 根容器：支援動態高度與安全區域 */
.daily-challenge {
  min-height: 100dvh; /* 動態視窗高度，解決手機工具列遮擋問題 */
  background: var(--color-bg);
  color: var(--color-text);
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
}

/* 中央內容 wrapper：桌面版置中與卡片化視覺 */
.content-wrapper {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--color-bg);
  box-shadow: 0 0 40px rgba(0,0,0,0.05);
}

/* 頁首 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  padding-top: max(1rem, env(safe-area-inset-top)); /* 避開瀏海 */
  background: rgba(var(--color-surface-rgb), 0.95);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(10px);
}

/* 返回按鈕加大可點擊面積 */
.back-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  cursor: pointer;
  font-size: 1rem;
  background: transparent;
  border: 1px solid var(--color-border);
}

/* 卡片基底 */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

/* 訓練摘要 */
.training-summary {
  margin: 1.5rem 1rem;
  padding: 1.5rem;
  background: linear-gradient(to bottom, var(--color-surface), var(--color-bg-soft));
}

.summary-stats { display:flex; justify-content:space-around; align-items:center; margin-bottom:1.5rem; }

/* 數值加大 */
.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* 進度條 */
.progress-section {
  margin-bottom: 1.5rem;
  background: rgba(255,255,255,0.5);
  padding: 1rem;
  border-radius: 1rem;
}

.progress-header { display:flex; justify-content:space-between; margin-bottom:0.5rem; font-weight:600; }

.progress-bar {
  height: 14px;
  background: var(--color-border);
  border-radius: 99px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 99px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 開始按鈕：尺寸加大、陰影更強烈 */
.start-training-btn {
  width: 100%;
  padding: 1rem;
  min-height: 4rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%);
  border: none;
  border-radius: 1rem;
  display:flex;
  gap:0.75rem;
  justify-content:center;
  align-items:center;
  box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.4);
}

/* 重新生成按鈕 */
.text-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  padding: 0.75rem 1.5rem;
  border-radius: 99px;
}

/* 維度區域：圖示、字級放大 */
.dimension-section { padding: 0 1rem 1.5rem; }
.section-title { font-size: 1.1rem; font-weight:700; color: var(--color-text); padding-left:0.5rem; border-left:4px solid var(--color-primary); }

.dimension-grid {
  display:grid;
  grid-template-columns: repeat(3,1fr);
  gap:0.75rem;
}

.dimension-item { padding:1rem 0.5rem; border-radius:1rem; opacity:0.6; transition:all .3s; }
.dimension-item.covered { opacity:1; transform:translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }

.dim-icon { font-size: 1.75rem; margin-bottom:0.25rem; }
.dim-name { font-size:0.85rem; font-weight:600; color:var(--color-text); }

/* 維度徽章*/
.dim-badge { position:absolute; top:-6px; right:-6px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; border:2px solid var(--color-surface); }

/* 遊戲清單：點擊區域提升、字體加大 */
.games-list-section { padding: 0 1rem 1.5rem; }
.games-list { display:flex; flex-direction:column; gap:1rem; }

.game-item { display:flex; align-items:center; justify-content:space-between; min-height:5rem; padding:1rem; border-radius: 12px; cursor:pointer; transition:all .2s; }
.game-item.active { border-color: var(--color-primary); background: linear-gradient(to right,var(--color-surface), rgba(var(--color-primary-rgb), 0.05)); }

.game-item-left { display:flex; gap:1rem; align-items:center; flex:1; }
.game-order { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--color-text-secondary); }
.game-icon-box { font-size:2.5rem; }
.game-name { font-weight:700; font-size:1.1rem; margin-bottom:0.4rem; }
.game-meta { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
.difficulty-tag { font-size:0.8rem; font-weight:600; padding:0.15rem 0.5rem; border-radius:6px; }

.dim-dots { display:flex; gap:0.3rem; }
.dim-dot { width:8px; height:8px; border-radius:50%; }

/* 底部提示加強可讀度 */
.bottom-tip { padding:1rem 2rem; text-align:center; background:#fffbeb; border:1px solid #fef3c7; border-radius:1rem; margin:0 1rem 1rem; }
.bottom-tip p { font-size:0.9rem; color:#92400e; font-weight:500; margin:0; }

/* 載入/空狀態 */
.loading-container, .empty-state { padding:4rem 2rem; min-height:50vh; }
.spinner { width:50px; height:50px; border:5px solid var(--color-bg-soft); border-top-color: var(--color-primary); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:1.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 響應式：桌面版置中寬度與 grid 切換 */
@media (min-width: 640px) {
  .dimension-grid { grid-template-columns: repeat(6, 1fr); }
  .content-wrapper { margin: 0 auto; }
}
</style>

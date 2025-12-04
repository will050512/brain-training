<template>
  <div class="game-preview-page">
    <!-- 漸層背景裝飾 -->
    <div class="bg-decoration">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="gradient-overlay"></div>
    </div>

    <!-- 頂部工具列 -->
    <header class="preview-header">
      <button @click="showDifficultyPanel = true" class="difficulty-btn">
        難度調整
      </button>
      <h1 class="game-title">{{ currentGame?.name || '遊戲' }}</h1>
    </header>

    <!-- 主要內容區 -->
    <main class="preview-main">
      <!-- 遊戲圖示與動畫 -->
      <div class="game-icon-area">
        <div class="game-icon-wrapper">
          <span class="game-icon">{{ currentGame?.icon || '🎮' }}</span>
        </div>
        <!-- 認知維度標籤 -->
        <div v-if="primaryDimension" class="dimension-badge" :style="{ backgroundColor: dimensionColor }">
          {{ dimensionName }}
        </div>
      </div>

      <!-- 遊戲說明 -->
      <div class="game-benefits">
        <ul>
          <li v-for="(instruction, index) in currentGame?.instructions?.slice(0, 3)" :key="index">
            {{ instruction }}
          </li>
        </ul>
      </div>

      <!-- 草地裝飾 -->
      <div class="ground-decoration">
        <div class="grass"></div>
        <div class="bottles">
          <div class="bottle bottle-1"></div>
          <div class="bottle bottle-2"></div>
          <div class="bottle bottle-3"></div>
        </div>
      </div>
    </main>

    <!-- 底部按鈕區 -->
    <footer class="preview-footer">
      <button @click="goBack" class="back-btn">
        <span class="back-icon">↩</span>
        返回
      </button>

      <div class="action-buttons">
        <button @click="showInstructions = true" class="instruction-btn">
          說 明
        </button>
        <button @click="startGame" class="start-btn">
          開 始
        </button>
      </div>
    </footer>

    <!-- 難度調整面板 -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="showDifficultyPanel" class="panel-overlay" @click.self="showDifficultyPanel = false">
          <div class="difficulty-panel">
            <h3>選擇難度</h3>
            <div class="difficulty-options">
              <button
                v-for="diff in difficulties"
                :key="diff.id"
                @click="selectDifficulty(diff.id)"
                class="difficulty-option"
                :class="{ active: selectedDifficulty === diff.id }"
                :style="{ 
                  '--diff-color': diff.color,
                  '--diff-bg': diff.bgColor
                }"
              >
                <span class="diff-name">{{ diff.name }}</span>
                <span class="diff-best">最佳: {{ getBestScore(diff.id) || '-' }}</span>
              </button>
            </div>
            <button @click="showDifficultyPanel = false" class="panel-close-btn">
              確定
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 詳細說明面板 -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="showInstructions" class="panel-overlay" @click.self="showInstructions = false">
          <div class="instructions-panel">
            <h3>{{ currentGame?.name }} - 遊戲說明</h3>
            <div class="instructions-content">
              <p class="game-description">{{ currentGame?.description }}</p>
              <ul class="instructions-list">
                <li v-for="(instruction, index) in currentGame?.instructions" :key="index">
                  {{ instruction }}
                </li>
              </ul>
            </div>
            <div class="instructions-meta">
              <div class="meta-item">
                <span class="meta-label">預估時間</span>
                <span class="meta-value">{{ estimatedTime }} 秒</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">目前難度</span>
                <span class="meta-value">{{ DIFFICULTIES[selectedDifficulty].name }}</span>
              </div>
            </div>
            <button @click="showInstructions = false" class="panel-close-btn">
              了解了
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import { DIFFICULTIES, type Difficulty, type GameDefinition } from '@/types/game'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

// 狀態
const showDifficultyPanel = ref(false)
const showInstructions = ref(false)
const selectedDifficulty = ref<Difficulty>('easy')

// 取得遊戲 ID
const gameId = computed(() => route.params.gameId as string)

// 當前遊戲
const currentGame = computed<GameDefinition | undefined>(() => {
  return gameStore.allGames.find(g => g.id === gameId.value)
})

// 難度列表
const difficulties = Object.values(DIFFICULTIES)

// 主要認知維度
const primaryDimension = computed<CognitiveDimension | null>(() => {
  if (!currentGame.value) return null
  const weights = Object.entries(currentGame.value.cognitiveWeights) as [CognitiveDimension, number][]
  if (weights.length === 0) return null
  const sorted = weights.sort((a, b) => b[1] - a[1])
  const first = sorted[0]
  return first ? first[0] : null
})

// 維度顏色
const dimensionColor = computed(() => {
  if (!primaryDimension.value) return '#6366f1'
  return COGNITIVE_DIMENSIONS[primaryDimension.value].color
})

// 維度名稱
const dimensionName = computed(() => {
  if (!primaryDimension.value) return ''
  return COGNITIVE_DIMENSIONS[primaryDimension.value].name
})

// 預估時間
const estimatedTime = computed(() => {
  if (!currentGame.value) return 60
  return currentGame.value.estimatedTime[selectedDifficulty.value] || 60
})

// 取得最佳成績
function getBestScore(difficulty: Difficulty): number {
  return gameStore.getBestScore(gameId.value, difficulty)
}

// 選擇難度
function selectDifficulty(difficulty: Difficulty): void {
  selectedDifficulty.value = difficulty
}

// 返回
function goBack(): void {
  router.push('/games')
}

// 開始遊戲
function startGame(): void {
  if (!currentGame.value) return
  
  gameStore.selectGame(currentGame.value.id)
  gameStore.selectDifficulty(selectedDifficulty.value)
  
  // 帶上 autoStart 參數讓遊戲頁面自動開始
  router.push({
    path: `/games/${currentGame.value.id}`,
    query: { autoStart: 'true' }
  })
}

// 初始化
onMounted(() => {
  if (gameId.value) {
    gameStore.selectGame(gameId.value)
  }
  
  // 嘗試恢復之前的難度設定
  const savedDifficulty = gameStore.currentDifficulty
  if (savedDifficulty) {
    selectedDifficulty.value = savedDifficulty
  }
})
</script>

<style scoped>
.game-preview-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #fef9c3 0%, #d9f99d 50%, #86efac 100%);
  overflow: hidden;
}

/* 背景裝飾 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(134, 239, 172, 0.3) 100%
  );
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  top: 15%;
  left: 20%;
  animation-delay: 0s;
}

.shape-2 {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ec4899, #f472b6);
  top: 25%;
  right: 25%;
  animation-delay: -2s;
}

.shape-3 {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #facc15, #fde047);
  top: 35%;
  left: 50%;
  animation-delay: -4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(10deg); }
}

/* 頂部工具列 */
.preview-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  padding-top: max(1rem, env(safe-area-inset-top));
}

.difficulty-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.difficulty-btn:active {
  transform: scale(0.95);
}

.game-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #65a30d;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

/* 主要內容區 */
.preview-main {
  flex: 1;
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.game-icon-area {
  text-align: center;
  margin-bottom: 2rem;
}

.game-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  margin-bottom: 1rem;
}

.game-icon {
  font-size: 4rem;
}

.dimension-badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.game-benefits {
  max-width: 400px;
  margin: 0 auto;
}

.game-benefits ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.game-benefits li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  font-size: 1.125rem;
  color: #374151;
  font-weight: 500;
}

.game-benefits li::before {
  content: '•';
  font-size: 1.5rem;
  color: #65a30d;
}

/* 草地裝飾 */
.ground-decoration {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  pointer-events: none;
}

.grass {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(to top, #22c55e, #4ade80);
  border-radius: 100% 100% 0 0 / 50% 50% 0 0;
}

.bottles {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2rem;
}

.bottle {
  width: 40px;
  height: 60px;
  border-radius: 8px 8px 12px 12px;
  opacity: 0.8;
}

.bottle-1 { background: linear-gradient(to top, #3b82f6, #60a5fa); }
.bottle-2 { background: linear-gradient(to top, #ec4899, #f472b6); }
.bottle-3 { background: linear-gradient(to top, #f97316, #fb923c); }

/* 底部按鈕區 */
.preview-footer {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: #65a30d;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.back-icon {
  font-size: 1.25rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.instruction-btn,
.start-btn {
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.instruction-btn {
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
  border: 3px solid #fff;
  box-shadow: 0 4px 16px rgba(249, 115, 22, 0.4);
}

.start-btn {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  color: white;
  border: 3px solid #fff;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
}

.instruction-btn:active,
.start-btn:active {
  transform: scale(0.95);
}

/* 面板樣式 */
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.difficulty-panel,
.instructions-panel {
  width: 100%;
  max-width: 500px;
  background: var(--color-surface, white);
  border-radius: 24px 24px 0 0;
  padding: 1.5rem;
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}

.difficulty-panel h3,
.instructions-panel h3 {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text, #1f2937);
  margin-bottom: 1.5rem;
}

.difficulty-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.difficulty-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border: 2px solid var(--diff-bg, #e5e7eb);
  border-radius: 12px;
  background: var(--diff-bg, #f3f4f6);
  cursor: pointer;
  transition: all 0.2s;
}

.difficulty-option.active {
  border-color: var(--diff-color, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.diff-name {
  font-weight: 600;
  color: var(--diff-color, #374151);
}

.diff-best {
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
}

.instructions-content {
  margin-bottom: 1.5rem;
}

.game-description {
  color: var(--color-text-secondary, #4b5563);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.instructions-list {
  padding-left: 1.25rem;
  color: var(--color-text, #1f2937);
}

.instructions-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.instructions-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  flex: 1;
  padding: 0.75rem;
  background: var(--color-surface-alt, #f3f4f6);
  border-radius: 8px;
  text-align: center;
}

.meta-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  margin-bottom: 0.25rem;
}

.meta-value {
  font-weight: 600;
  color: var(--color-text, #1f2937);
}

.panel-close-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

/* 過渡動畫 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from .difficulty-panel,
.slide-up-enter-from .instructions-panel,
.slide-up-leave-to .difficulty-panel,
.slide-up-leave-to .instructions-panel {
  transform: translateY(100%);
}

/* 深色模式 */
:root.dark .game-preview-page {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 50%, #0f172a 100%);
}

:root.dark .game-title {
  color: #a3e635;
}

:root.dark .game-benefits li {
  color: #e5e7eb;
}

:root.dark .back-btn {
  color: #a3e635;
}

:root.dark .grass {
  background: linear-gradient(to top, #166534, #15803d);
}

/* 響應式 */
@media (max-width: 640px) {
  .game-title {
    font-size: 1.5rem;
  }
  
  .game-icon-wrapper {
    width: 100px;
    height: 100px;
  }
  
  .game-icon {
    font-size: 3rem;
  }
  
  .game-benefits li {
    font-size: 1rem;
  }
  
  .action-buttons {
    gap: 0.75rem;
  }
  
  .instruction-btn,
  .start-btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    min-width: 100px;
  }
}

@media (min-width: 768px) {
  .difficulty-panel,
  .instructions-panel {
    border-radius: 24px;
    margin-bottom: 2rem;
  }
}
</style>

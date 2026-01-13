<template>
  <div class="game-preview-page">
    <div class="bg-layer">
      <div class="gradient-overlay"></div>
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      
      <div class="ground-decoration">
        <div class="grass"></div>
        <div class="bottles">
          <div class="bottle bottle-1"></div>
          <div class="bottle bottle-2"></div>
          <div class="bottle bottle-3"></div>
        </div>
      </div>
    </div>

    <main class="main-container">
      
      <div class="content-scroll-area">
        <div class="content-inner">
          
          <header class="preview-header">
            <button @click="showDifficultyPanel = true" class="difficulty-btn" aria-label="調整遊戲難度">
              <span class="btn-icon">⚙️</span>
              <span class="hidden xs:inline">難度: {{ DIFFICULTIES[selectedDifficulty].name }}</span>
              <span class="xs:inline hidden">{{ DIFFICULTIES[selectedDifficulty].name }}</span>
            </button>
            <h1 class="game-title">{{ currentGame?.name || '遊戲' }}</h1>
          </header>

          <div class="visual-center">
            <div class="game-icon-wrapper">
              <span class="game-icon" role="img" aria-label="遊戲圖示">
                {{ currentGame?.icon || '🎮' }}
              </span>
            </div>
            
            <div v-if="primaryDimension" class="dimension-badge" :style="{ backgroundColor: dimensionColor }">
              {{ dimensionName }}
            </div>
          </div>

          <div class="game-info-card">
            <h2 class="section-title">遊戲特點</h2>
            <ul class="benefits-list">
              <li v-for="(instruction, index) in currentGame?.instructions?.slice(0, 3)" :key="index">
                {{ instruction }}
              </li>
            </ul>
          </div>

          <div class="desktop-actions">
            <button @click="startGame" class="start-btn-large">
              開始遊戲
            </button>
            <div class="secondary-actions">
              <button @click="showInstructions = true" class="text-btn">詳細說明</button>
              <button @click="goBack" class="text-btn">返回列表</button>
            </div>
          </div>

          <div class="spacer"></div>
        </div>
      </div>

      <footer class="mobile-footer">
        <button @click="goBack" class="icon-btn-secondary" aria-label="返回">
          <span class="back-icon">↩</span>
        </button>

        <button @click="showInstructions = true" class="action-btn secondary">
          說明
        </button>
        
        <button @click="startGame" class="action-btn primary">
          開始
        </button>
      </footer>
    </main>

    <Teleport to="body">
      <Transition name="fade-slide">
        <div v-if="showDifficultyPanel" class="modal-overlay" @click.self="showDifficultyPanel = false">
          <div class="modal-card">
            <header class="modal-header">
              <h3>選擇遊戲難度</h3>
              <button class="close-icon" @click="showDifficultyPanel = false">✕</button>
            </header>
            
            <div class="difficulty-grid">
              <button
                v-for="diff in difficulties"
                :key="diff.id"
                @click="selectDifficulty(diff.id)"
                class="difficulty-card"
                :class="{ active: selectedDifficulty === diff.id }"
                :style="{ '--accent-color': diff.color }"
              >
                <div class="diff-info">
                  <span class="diff-name">{{ diff.name }}</span>
                  <span class="diff-score">最佳: {{ getBestScore(diff.id) || '-' }}</span>
                </div>
                <div class="radio-indicator"></div>
              </button>
            </div>

            <button @click="showDifficultyPanel = false" class="modal-confirm-btn">
              確定選擇
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade-slide">
        <div v-if="showInstructions" class="modal-overlay" @click.self="showInstructions = false">
          <div class="modal-card instructions-mode">
            <header class="modal-header">
              <h3>遊戲說明</h3>
              <button class="close-icon" @click="showInstructions = false">✕</button>
            </header>
            
            <div class="scrollable-content">
              <p class="description-text">{{ currentGame?.description }}</p>
              
              <div class="info-blocks">
                <div class="info-block">
                  <span class="label">預估時間</span>
                  <span class="value">{{ estimatedTime }} 秒</span>
                </div>
                <div class="info-block">
                  <span class="label">難度</span>
                  <span class="value" :style="{ color: DIFFICULTIES[selectedDifficulty].color }">
                    {{ DIFFICULTIES[selectedDifficulty].name }}
                  </span>
                </div>
              </div>

              <h4 class="sub-title">如何進行：</h4>
              <ul class="detailed-list">
                <li v-for="(instruction, index) in currentGame?.instructions" :key="index">
                  {{ instruction }}
                </li>
              </ul>
            </div>

            <button @click="showInstructions = false" class="modal-confirm-btn">
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
import { useUserStore } from '@/stores/userStore'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import { DIFFICULTIES, type Difficulty, type GameDefinition } from '@/types/game'
import { getSuggestedDifficulty } from '@/services/adaptiveDifficultyService'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()

// --- 狀態管理 ---
const showDifficultyPanel = ref(false)
const showInstructions = ref(false)
const selectedDifficulty = ref<Difficulty>('easy')

// --- Computed 邏輯 ---
const gameId = computed(() => route.params.gameId as string)

const currentGame = computed<GameDefinition | undefined>(() => {
  return gameStore.allGames.find(g => g.id === gameId.value)
})

const difficulties = Object.values(DIFFICULTIES)

const primaryDimension = computed<CognitiveDimension | null>(() => {
  if (!currentGame.value) return null
  const weights = Object.entries(currentGame.value.cognitiveWeights) as [CognitiveDimension, number][]
  if (weights.length === 0) return null
  return weights.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
})

const dimensionColor = computed(() => primaryDimension.value ? COGNITIVE_DIMENSIONS[primaryDimension.value]?.color ?? '#6366f1' : '#6366f1')
const dimensionName = computed(() => primaryDimension.value ? COGNITIVE_DIMENSIONS[primaryDimension.value]?.name ?? '' : '')

const estimatedTime = computed(() => {
  if (!currentGame.value?.estimatedTime) return 60
  return currentGame.value.estimatedTime[selectedDifficulty.value] || 60
})

// --- Methods ---
function getBestScore(difficulty: Difficulty): number {
  return gameStore.getBestScore(gameId.value, difficulty)
}

function selectDifficulty(difficulty: Difficulty): void {
  selectedDifficulty.value = difficulty
}

function goBack(): void {
  router.push('/games')
}

function startGame(): void {
  if (!currentGame.value) return
  gameStore.selectGame(currentGame.value.id)
  gameStore.selectDifficulty(selectedDifficulty.value)
  // 沒有 UI 讓使用者選子難度：沿用建議子難度/目前子難度
  const subDifficulty = gameStore.currentSubDifficulty ?? 2
  gameStore.selectSubDifficulty(subDifficulty)
  router.push({
    path: `/games/${currentGame.value.id}`,
    query: {
      subDifficulty: String(subDifficulty),
      autoStart: 'true',
      fromDaily: route.query.fromDaily === 'true' ? 'true' : undefined,
    }
  })
}

onMounted(() => {
  if (gameId.value) gameStore.selectGame(gameId.value)
  const savedDifficulty = gameStore.currentDifficulty
  if (savedDifficulty) selectedDifficulty.value = savedDifficulty

  // 動態難度：預設使用系統建議（避免長者被不適合的難度打擊）
  const odId = userStore.currentUser?.id
  if (odId && gameId.value) {
    getSuggestedDifficulty(odId, gameId.value)
      .then(suggested => {
        selectedDifficulty.value = suggested.difficulty
        gameStore.selectDifficulty(suggested.difficulty)
        gameStore.selectSubDifficulty(suggested.subDifficulty)
      })
      .catch(() => {
        // ignore
      })
  }
})
</script>

<style scoped>
/* =========================================
   全域設定與變數
   ========================================= */
:root {
  --header-height: 60px;
  --footer-height: 80px;
  --safe-top: env(safe-area-inset-top, 20px);
  --safe-bottom: env(safe-area-inset-bottom, 20px);
  --color-primary: #65a30d;
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --font-scale: 1; /* 可透過 JS 控制放大 */
}

.game-preview-page {
  position: fixed;
  inset: 0;
  background-color: #fef9c3; /* Fallback */
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2937;
  overflow: hidden; /* 防止整個頁面彈性滾動 */
}

/* =========================================
   背景與裝飾層 (Z-index: 0)
   ========================================= */
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #fef9c3 0%, #d9f99d 50%, #86efac 100%);
}

/* 浮動形狀動畫優化 */
.floating-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
  filter: blur(10px); /* 模糊化以減少視覺干擾 */
  animation: float 8s ease-in-out infinite;
  will-change: transform;
}

.shape-1 { width: 100px; height: 100px; background: #fb923c; top: 10%; left: 10%; }
.shape-2 { width: 80px; height: 80px; background: #f472b6; top: 40%; right: 10%; animation-delay: -2s; }
.shape-3 { width: 60px; height: 60px; background: #fde047; bottom: 20%; left: 30%; animation-delay: -4s; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* 地面裝飾 */
.ground-decoration {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 15vh;
  max-height: 120px;
  z-index: 1;
}

.grass {
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, #22c55e, #86efac);
  border-radius: 50% 50% 0 0 / 30% 30% 0 0;
  opacity: 0.9;
}

.bottles {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2rem;
  opacity: 0.6;
}

.bottle {
  width: 30px;
  height: 50px;
  border-radius: 6px 6px 10px 10px;
  background-color: rgba(255,255,255,0.5);
}

.bottle-1 { background: #60a5fa; }
.bottle-2 { background: #f472b6; }
.bottle-3 { background: #fb923c; }


/* =========================================
   主佈局容器 (Z-index: 10)
   ========================================= */
.main-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1200px; /* 桌面版限制寬度 */
  margin: 0 auto;
}

/* 內容滾動區 */
.content-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* iOS 平滑滾動 */
  padding: var(--safe-top) 1rem 0 1rem;
  scrollbar-width: none; /* Firefox 隱藏捲軸 */
}

.content-scroll-area::-webkit-scrollbar {
  display: none; /* Chrome/Safari 隱藏捲軸 */
}

.content-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding-bottom: 2rem;
}

/* 標題與導航 */
.preview-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.difficulty-btn {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(4px);
  cursor: pointer;
}

.game-title {
  font-size: clamp(1.75rem, 5vw, 2.5rem); /* 響應式字體 */
  font-weight: 800;
  color: #3f6212;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.5);
  margin: 0;
  text-align: center;
}

/* 視覺中心 */
.visual-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.game-icon-wrapper {
  width: clamp(100px, 20vw, 140px);
  height: clamp(100px, 20vw, 140px);
  background: white;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  margin-bottom: 1rem;
  border: 4px solid rgba(255, 255, 255, 0.8);
}

.game-icon {
  font-size: clamp(3.5rem, 10vw, 5rem);
}

.dimension-badge {
  padding: 0.5rem 1.25rem;
  color: white;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

/* 資訊卡片 */
.game-info-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  padding: 1.5rem;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.1rem;
  color: #4b5563;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
}

.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.benefits-list li {
  font-size: 1.15rem; /* 長者友善字體 */
  color: #1f2937;
  padding: 0.5rem 0;
  display: flex;
  align-items: flex-start;
  line-height: 1.5;
}

.benefits-list li::before {
  content: "✨";
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.spacer {
  height: calc(var(--footer-height) + var(--safe-bottom));
}

/* =========================================
   操作區樣式 (手機版 Footer)
   ========================================= */
.mobile-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 1rem 1.5rem;
  padding-bottom: max(1rem, var(--safe-bottom));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  z-index: 50;
}

/* 按鈕共用樣式 */
.action-btn {
  flex: 1;
  border: none;
  border-radius: 16px;
  padding: 0;
  height: 56px; /* 加大觸控區 */
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:active, .icon-btn-secondary:active {
  transform: scale(0.96);
}

.primary {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.secondary {
  background: #fff;
  color: #65a30d;
  border: 2px solid #bef264;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.icon-btn-secondary {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* =========================================
   桌面版/橫屏佈局調整 (隱藏 Footer，改用側邊欄或內嵌)
   ========================================= */
.desktop-actions {
  display: none; /* 預設隱藏 */
}

@media (min-width: 768px), (orientation: landscape) {
  .mobile-footer {
    display: none; /* 桌面/橫屏不顯示底部浮動條 */
  }

  .spacer {
    display: none;
  }
  
  /* 轉為網格佈局 */
  .main-container {
    padding: 2rem;
    height: 100vh;
    justify-content: center;
  }

  .content-scroll-area {
    overflow: visible; /* 桌面不需內部滾動 */
    padding: 0;
  }

  .content-inner {
    flex-direction: row; /* 左右排列 */
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 3rem;
    max-width: 1000px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.4);
    padding: 3rem;
    border-radius: 32px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.05);
    backdrop-filter: blur(10px);
  }

  .preview-header {
    width: 100%;
    flex-direction: row-reverse;
    justify-content: space-between;
    margin-bottom: 0;
    padding-bottom: 2rem;
    border-bottom: 2px solid rgba(255,255,255,0.5);
  }

  .game-title {
    text-align: left;
  }

  .visual-center {
    flex: 0 0 auto;
    margin-bottom: 0;
  }
  
  .game-info-card {
    flex: 1;
    min-width: 300px;
    background: transparent;
    box-shadow: none;
    padding: 0;
    margin-bottom: 0;
  }

  .desktop-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 220px;
    padding-left: 2rem;
    border-left: 2px solid rgba(255,255,255,0.5);
  }

  .start-btn-large {
    width: 100%;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
    transition: all 0.2s;
  }
  
  .start-btn-large:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.5);
  }

  .secondary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .text-btn {
    background: transparent;
    border: none;
    color: #4b5563;
    font-size: 1rem;
    padding: 0.5rem;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: all 0.2s;
  }
  
  .text-btn:hover {
    color: #1f2937;
    text-decoration-color: #1f2937;
  }
}

/* =========================================
   模態窗 (Modal) 共用樣式
   ========================================= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end; /* 手機版預設底部彈出 */
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-card {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 1.5rem;
  padding-bottom: max(1.5rem, var(--safe-bottom));
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center; /* 桌面版垂直置中 */
  }
  .modal-card {
    border-radius: 24px;
    width: 90%;
    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1rem;
}

.modal-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.close-icon {
  background: #f3f4f6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
}

/* 難度選擇樣式 */
.difficulty-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  overflow-y: auto;
}

.difficulty-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.difficulty-card.active {
  border-color: var(--accent-color);
  background-color: #f8fafc;
  box-shadow: 0 0 0 4px rgba(0,0,0,0.05);
}

.diff-name {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.difficulty-card.active .diff-name {
  color: var(--accent-color);
}

.diff-score {
  font-size: 0.9rem;
  color: #6b7280;
}

.radio-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  position: relative;
}

.difficulty-card.active .radio-indicator {
  border-color: var(--accent-color);
  background: var(--accent-color);
}

.difficulty-card.active .radio-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
}

.modal-confirm-btn {
  width: 100%;
  padding: 1rem;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: auto;
}

/* 說明面板內容 */
.scrollable-content {
  overflow-y: auto;
  margin-bottom: 1.5rem;
  padding-right: 0.5rem;
}

.description-text {
  font-size: 1.125rem;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 1.5rem;
}

.info-blocks {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-block {
  flex: 1;
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
}

.info-block .label {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.info-block .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.sub-title {
  font-size: 1.125rem;
  margin-bottom: 0.75rem;
  color: #1f2937;
}

.detailed-list {
  padding-left: 1.25rem;
  margin: 0;
}

.detailed-list li {
  font-size: 1.05rem;
  color: #4b5563;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

/* 動畫過渡 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
}

.fade-slide-enter-from .modal-card,
.fade-slide-leave-to .modal-card {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .fade-slide-enter-from .modal-card,
  .fade-slide-leave-to .modal-card {
    transform: scale(0.9) translateY(0);
    opacity: 0;
  }
}
</style>

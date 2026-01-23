<template>
  <div class="game-wrapper h-[100dvh] bg-[var(--color-bg)] flex flex-col overflow-hidden">
    <div
      class="game-header bg-[var(--color-surface)] shadow-sm border-b border-[var(--color-border)] z-10 sticky top-0"
      :class="{ 'game-header-compact': isMobile, 'game-header-landscape': isLandscape }"
    >
      <div class="container mx-auto flex items-center justify-between px-2 sm:px-4 py-1.5 h-12 sm:h-14 gap-2">
        <button @click="handleBack" class="btn btn-secondary btn-sm flex-shrink-0 !px-2 sm:!px-4 h-9 sm:h-10 flex items-center justify-center">
          <span class="text-lg leading-none">←</span>
          <span class="hidden sm:inline ml-1">返回</span>
        </button>

        <!-- 手機版：遊戲進行時顯示簡化標題 -->
        <div class="flex-1 min-w-0 mx-1 sm:mx-2 flex flex-col justify-center items-center" :class="{ 'opacity-50': isMobile && gameState === 'playing' }">
          <h1 class="text-sm sm:text-base lg:text-xl font-bold text-[var(--color-text)] truncate w-full text-center">
            {{ currentGame?.name || '遊戲' }}
          </h1>
          <span
            v-if="!isMobile"
            class="badge text-[10px] sm:text-xs mt-0.5"
            :class="`difficulty-${gameStore.currentDifficulty}`"
          >
            {{ DIFFICULTIES[gameStore.currentDifficulty].name }}
          </span>
        </div>

        <!-- 桌面版狀態顯示 -->
        <div class="hidden sm:flex items-center gap-3 flex-shrink-0 ml-auto bg-[var(--color-surface)]">
          <div
            v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">進度</div>
            <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-progress)] leading-none">
              {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
            </div>
          </div>

          <div
            v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">對/錯</div>
            <div class="status-value text-sm sm:text-lg font-bold leading-none whitespace-nowrap">
              <span class="text-[var(--color-success)]">{{ gameStatus.correctCount || 0 }}</span>
              <span class="text-[var(--color-text-muted)] mx-0.5">/</span>
              <span class="text-[var(--color-danger)]">{{ gameStatus.wrongCount || 0 }}</span>
            </div>
          </div>

          <div
            v-if="gameStatus.showCombo && gameStatus.combo && gameStatus.combo > 1"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">連擊</div>
            <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-combo)] leading-none animate-bounce">
              {{ gameStatus.combo }}x
            </div>
          </div>

          <div
            v-if="gameStatus.showScore !== false"
            class="status-item text-right flex flex-col items-end min-w-[2.5rem] sm:min-w-auto"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">分數</div>
            <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-score)] leading-none">
              {{ gameStatus.score ?? currentScore }}
            </div>
          </div>

          <div
            v-if="gameStatus.showTimer !== false"
            class="status-item text-right flex flex-col items-end min-w-[3.2rem] sm:min-w-[4rem]"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">
              {{ gameStatus.timeLeft !== undefined ? '剩餘' : '用時' }}
            </div>
            <div
              class="status-value text-sm sm:text-lg font-bold leading-none tabular-nums"
              :class="{
                'text-[var(--color-timer-warning)] animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10,
                'text-[var(--color-text)]': gameStatus.timeLeft === undefined || gameStatus.timeLeft > 10
              }"
            >
              {{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版浮動狀態欄 - 始終顯示關鍵狀態 -->
    <div
      v-if="isMobile && gameState === 'playing'"
      class="fixed top-12 left-0 right-0 z-20 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-2 py-1"
    >
      <div class="flex items-center justify-between gap-2 text-xs">
        <!-- 左側：時間和分數 -->
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div
            v-if="gameStatus.showTimer !== false"
            class="flex items-center gap-1 text-[var(--color-timer-warning)] font-bold"
            :class="{ 'animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10 }"
          >
            <span>⏱️</span>
            <span class="tabular-nums">{{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}</span>
          </div>
          <div
            v-if="gameStatus.showScore !== false"
            class="flex items-center gap-1 text-[var(--color-score)] font-bold"
          >
            <span>🎯</span>
            <span>{{ gameStatus.score ?? currentScore }}</span>
          </div>
        </div>

        <!-- 右側：進度和對錯 -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <div
            v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
            class="text-[var(--color-progress)] font-bold"
          >
            {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
          </div>
          <div
            v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
            class="flex items-center gap-1"
          >
            <span class="text-[var(--color-success)] font-bold">{{ gameStatus.correctCount || 0 }}</span>
            <span class="text-[var(--color-text-muted)]">/</span>
            <span class="text-[var(--color-danger)] font-bold">{{ gameStatus.wrongCount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="game-play-area flex-1 min-h-0 container mx-auto w-full"
      :class="{ 'pt-9': isMobile && gameState === 'playing' }"
      @mousedown="handlePlayAreaInteraction"
      @touchstart="handlePlayAreaInteraction"
    >
            <!-- 準備畫面 - 適應螢幕高度 -->
        <div v-if="gameState === 'ready'" class="game-content-fit max-w-lg mx-auto text-center p-2 sm:p-4">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3 sm:p-4 shadow-md">
          <div class="text-4xl sm:text-5xl lg:text-6xl mb-4 transform hover:scale-110 transition-transform">{{ currentGame?.icon }}</div>
          <h2 class="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-[var(--color-text)]">{{ currentGame?.name }}</h2>

          <p class="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4 sm:mb-6">
            準備好了嗎？先快速看過玩法，再點擊下方按鈕開始。
          </p>

          <div class="flex items-center justify-center gap-2 mb-4">
            <span
              class="badge text-[10px] sm:text-xs"
              :class="`difficulty-${gameStore.currentDifficulty}`"
            >
              {{ DIFFICULTIES[gameStore.currentDifficulty].name }}
            </span>
            <button
              class="btn btn-secondary btn-sm"
              @click="showDifficultyPanel = true"
            >
              調整難度
            </button>
          </div>

          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 mb-4 max-h-52 overflow-auto">
            <div class="section-label text-[var(--color-text-secondary)] mb-2">遊戲說明</div>
            <ul class="space-y-1 text-left text-sm sm:text-base text-[var(--color-text)] leading-snug">
              <li v-if="!currentGame?.instructions || currentGame.instructions.length === 0" class="text-[var(--color-text-secondary)]">此遊戲未提供額外說明，請依畫面提示操作。</li>
              <li v-for="(line, idx) in currentGame?.instructions" :key="idx" class="flex items-start gap-2">
                <span class="text-[var(--color-text-secondary)] mt-0.5">{{ idx + 1 }}.</span>
                <span class="flex-1">{{ line }}</span>
              </li>
            </ul>
          </div>

          <div class="space-y-2">
            <div v-if="startError" class="p-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm text-left">
              {{ startError }}
            </div>
            <button @click="startGame" class="btn btn-primary btn-lg w-full text-base shadow-md active:scale-95 transition-transform">
              開始遊戲
            </button>
            <button @click="goBackToList" class="btn btn-secondary w-full">
              ← 返回
            </button>
          </div>
        </div>
      </div>
<!-- 遊戲進行中 - 填滿可用空間 -->
      <div v-else-if="gameState === 'playing'" class="game-content-full w-full h-full min-h-0 overflow-x-hidden overflow-y-auto">
        <component
          :is="gameComponent"
          :key="gameComponentKey"
          :difficulty="gameStore.currentDifficulty"
          :sub-difficulty="gameStore.currentSubDifficulty"
          :settings="difficultySettings"
          @score-change="handleScoreChange"
          @score-update="handleScoreChange"
          @score:update="handleScoreChange"
          @game-start="handleGameStart"
          @game-end="handleGameEnd"
          @status-update="handleStatusUpdate"
          :auto-start="shouldAutoStart"
          class="w-full h-full min-h-0"
        />
      </div>

      <!-- 暫停畫面 -->
      <div v-else-if="gameState === 'paused'" class="game-content-fit">
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 sm:p-6 lg:p-8 max-w-sm mx-auto border border-[var(--color-border)] text-center shadow-2xl">
          <div class="text-4xl sm:text-5xl mb-4">⏸️</div>
          <h2 class="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-[var(--color-text)]">遊戲暫停</h2>
          <div class="flex flex-col sm:flex-row gap-3">
            <button @click="resumeGame" class="btn btn-primary btn-lg flex-1">
              繼續遊戲
            </button>
            <button @click="quitGame" class="btn btn-danger btn-lg flex-1">
              結束遊戲
            </button>
          </div>
        </div>
      </div>

      <!-- 結算畫面 - 適應螢幕高度，避免滾動 -->
      <div v-else-if="gameState === 'finished'" class="game-content-fit game-result-scroll max-w-sm sm:max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg game-result-card">
          <div class="game-result-body p-3 sm:p-6">
            <div class="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-4 animate-bounce-in">
              {{ getFinalEmoji(currentScore) }}
            </div>
            <h2 class="text-lg sm:text-xl font-bold mb-2 text-[var(--color-text)]">遊戲結束！</h2>

            <div class="my-4 sm:my-6 lg:my-8 bg-[var(--color-bg)] rounded-xl p-4 sm:p-6 inline-block min-w-[140px] sm:min-w-[180px] shadow-inner relative overflow-hidden">
              <div class="absolute inset-0 bg-[var(--color-primary)]/5"></div>
              <div class="relative z-10 text-6xl sm:text-7xl lg:text-8xl font-black leading-none filter drop-shadow-md" :class="getScoreClass(currentScore)">
                {{ currentScore }}
              </div>
              <div class="relative z-10 text-sm sm:text-base lg:text-xl text-[var(--color-text-secondary)] mt-2 font-bold tracking-widest uppercase">SCORE</div>
            </div>

            <!-- 核心統計資訊（所有遊戲一致） -->
            <div class="mb-3 sm:mb-4 grid grid-cols-2 gap-2 sm:gap-3 text-left">
              <div class="bg-[var(--color-primary-bg)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
                <div class="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">等級評定</div>
                <div class="text-xl sm:text-2xl font-bold text-[var(--color-score)]">{{ unifiedGameResult?.grade || 'N/A' }}</div>
              </div>
              <div class="bg-[var(--color-surface-alt)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
                <div class="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">遊戲時長</div>
                <div class="text-xl sm:text-2xl font-bold text-[var(--color-progress)]">{{ formatTime(gameResult?.duration || 0) }}</div>
              </div>
            </div>

            <!-- 遊戲專屬統計（由 displayStats 驅動） -->
            <div v-if="unifiedGameResult?.displayStats && unifiedGameResult.displayStats.length > 0" class="mb-4 sm:mb-6 lg:mb-8">
              <div class="text-xs sm:text-sm font-bold text-[var(--color-text-secondary)] mb-2 text-center">📊 詳細統計</div>
              <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-left">
                <div
                  v-for="(stat, index) in unifiedGameResult.displayStats"
                  :key="index"
                  class="bg-[var(--color-surface-alt)] p-2 sm:p-3 lg:p-4 rounded-lg flex items-center gap-2 border transition-all"
                  :class="[
                    stat.highlight ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]' : 'border-[var(--color-border)]'
                  ]"
                >
                  <div v-if="stat.icon" class="text-xl sm:text-2xl flex-shrink-0">{{ stat.icon }}</div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-[var(--color-text-secondary)] truncate">{{ stat.label }}</div>
                    <div class="text-base sm:text-lg lg:text-xl font-bold text-[var(--color-text)] truncate">
                      {{ typeof stat.value === 'number' ? stat.value : stat.value }}<span v-if="stat.unit" class="text-xs ml-0.5">{{ stat.unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
              <div v-if="bestScore > 0" class="mb-6 p-3 sm:p-4 bg-[var(--color-primary-bg)] rounded-lg border border-[var(--color-border)] flex justify-between items-center text-sm sm:text-base">
                <span class="text-[var(--color-text)]">最佳成績</span>
                <div class="text-right">
                  <span class="font-bold text-[var(--color-score)] block">{{ bestScore }} 分</span>
                  <div v-if="currentScore > bestScore" class="text-xs text-[var(--color-record)] font-bold">
                    🎉 新紀錄！
                  </div>
                </div>
              </div>
            
            <div 
              v-if="difficultyAdjustment"
              class="mb-6 p-3 sm:p-4 rounded-xl border-2 text-left"
              :class="[difficultyFeedbackStyle.bgClass, difficultyFeedbackStyle.borderClass]"
            >
              <div class="flex items-start gap-3">
                <div 
                  class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
                  :class="difficultyFeedbackStyle.iconBgClass"
                >
                  {{ difficultyFeedbackStyle.icon }}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-sm sm:text-base mb-1" :class="difficultyFeedbackStyle.textClass">難度調整通知</h4>
                  <p class="text-xs sm:text-sm mb-2 break-words" :class="difficultyFeedbackStyle.subTextClass">{{ difficultyReasonText }}</p>
                  
                  <div 
                    class="text-xs sm:text-sm p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-black/20"
                    :class="difficultyFeedbackStyle.subTextClass"
                  >
                    <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                      <span class="font-medium truncate">{{ getFullDifficultyLabel(difficultyAdjustment.currentDifficulty, difficultyAdjustment.currentSubDifficulty) }}</span>
                      <span>→</span>
                      <span class="font-bold truncate">{{ getFullDifficultyLabel(difficultyAdjustment.newDifficulty, difficultyAdjustment.newSubDifficulty) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!isFromDailyTraining && recommendedGames.length > 0" class="mt-4">
              <h3 class="text-sm font-medium text-[var(--color-text)] mb-3 text-left">
                🎯 其他推薦
              </h3>
              <div class="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  v-for="game in recommendedGames"
                  :key="game.id"
                  @click="startRecommendedGame(game)"
                  class="recommended-game-card"
                >
                  <span class="text-2xl sm:text-3xl mb-1 sm:mb-2">{{ game.icon }}</span>
                  <span class="text-xs sm:text-sm font-bold text-[var(--color-text)] truncate w-full px-1">
                    {{ game.name }}
                  </span>
        <span class="text-[10px] sm:text-xs text-[var(--color-accent-purple)] font-medium">
          {{ getGameDimensionLabel(game.id) }}
        </span>
                </button>
              </div>
            </div>
          </div>

          <div class="game-result-actions px-3 sm:px-6">
            <template v-if="isFromDailyTraining">
              <div class="flex flex-col gap-3">
                <button 
                  v-if="gameStore.getNextTrainingGame()"
                  @click="continueToNextGame" 
                  class="btn btn-primary btn-xl w-full shadow-lg"
                >
                  ➡️ 下一個遊戲
                </button>
                <router-link 
                  v-else-if="gameStore.dailyTrainingQueue.length > 0"
                  to="/report" 
                  class="btn btn-primary btn-xl w-full shadow-lg"
                >
                  📊 查看報告
                </router-link>
                <router-link
                  v-else
                  to="/daily-challenge"
                  class="btn btn-primary btn-xl w-full shadow-lg"
                >
                  🏠 返回每日訓練
                </router-link>
                
                <button @click="playAgain" class="btn btn-secondary btn-lg w-full">
                  🔄 再玩一次
                </button>
              </div>
              <div v-if="gameStore.dailyTrainingQueue.length > 0" class="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                訓練進度：{{ gameStore.currentTrainingIndex + 1 }} / {{ gameStore.dailyTrainingQueue.length }}
              </div>
            </template>

            <template v-else>
              <div class="flex flex-col gap-3">
                <button 
                  v-if="recommendedGames.length > 0 && recommendedGames[0]"
                  @click="recommendedGames[0] && startRecommendedGame(recommendedGames[0])" 
                  class="btn btn-primary btn-xl py-3 sm:py-4 text-base sm:text-lg w-full shadow-md flex items-center justify-center gap-2"
                >
                  <span>➡️</span>
                  <div class="text-left leading-tight">
                    <div class="text-xs opacity-80 font-normal">下一個挑戰</div>
                    <div>{{ recommendedGames[0]?.name }}</div>
                  </div>
                </button>

                <div class="grid grid-cols-2 gap-3">
                  <button @click="playAgain" class="btn btn-secondary btn-lg w-full py-3">
                    🔄 再玩一次
                  </button>
                  <router-link to="/games" class="btn btn-secondary btn-lg w-full py-3 flex items-center justify-center">
                    🎮 更多遊戲
                  </router-link>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <TrainingCompleteModal
      v-if="showCompletionModal"
      :summary="gameStore.getTodayTrainingSummary()"
      @close="handleCompletionClose"
      @skip="handleCompletionClose"
    />

    <DifficultyAdjustPanel
      :is-open="showDifficultyPanel"
      :game-info="gameInfoForDifficultyPanel"
      @close="showDifficultyPanel = false"
      @confirm="handleDifficultyConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gameRegistry } from '@/core/gameRegistry'
import { useGameStore, useUserStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import { DIFFICULTIES, type GameResult, type GameState, type GameDefinition, type GameStatusUpdate, type UnifiedGameResult, type Difficulty, type SubDifficulty, type GameMode } from '@/types/game'
import { calculateDifficultyAdjustment, applyDifficultyAdjustment, getFullDifficultyLabel, getSuggestedDifficulty, type DifficultyAdjustment } from '@/services/adaptiveDifficultyService'
import { markGameCompleted, updatePlannedGameDifficulties } from '@/services/dailyTrainingService'
import TrainingCompleteModal from '@/components/ui/TrainingCompleteModal.vue'
import DifficultyAdjustPanel from '@/components/ui/DifficultyAdjustPanel.vue'
import type { CognitiveDimension } from '@/types/cognitive'
import { isLegacyGameResult, normalizeToLegacyGameResult } from '@/services/gameResultAdapter'
import { scoreNormalizer } from '@/services/scoreNormalizer'
import { BehaviorCollector } from '@/services/behaviorAnalysisService'
import { generateId } from '@/services/db'

// 認知維度中文名稱對應
const dimensionLabels: Record<CognitiveDimension, string> = {
  memory: '記憶力',
  attention: '專注力',
  logic: '邏輯推理',
  reaction: '反應速度',
  cognition: '認知能力',
  coordination: '協調能力'
}

// 取得遊戲的主要維度名稱
function getGameDimensionLabel(gameId: string): string {
  const dimension = gameRegistry.getPrimaryDimension(gameId)
  return dimension ? dimensionLabels[dimension] : '綜合訓練'
}

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()
const { isMobile } = useResponsive()

// 檢測橫屏
const isLandscape = ref(false)

function checkOrientation() {
  isLandscape.value = window.innerHeight < 500 && window.innerWidth > window.innerHeight
}

// 遊戲狀態（預設在準備畫面顯示遊戲說明，避免直接進入造成誤判）
const gameState = ref<GameState>('ready')
const currentScore = ref(0)
const elapsedTime = ref(0)
const gameResult = ref<GameResult | null>(null)
const unifiedGameResult = ref<UnifiedGameResult | null>(null)
const difficultyAdjustment = ref<DifficultyAdjustment | null>(null)
let timerInterval: ReturnType<typeof setInterval> | null = null
const gameComponentKey = ref(0)
const autoStartOverride = ref(false)
const startError = ref<string | null>(null)

const shouldAutoStart = computed(() => {
  return route.query.autoStart === 'true' || autoStartOverride.value
})

// 遊戲元件回報的即時狀態
const gameStatus = ref<GameStatusUpdate>({
  showTimer: true,
  // 避免「遊戲中分數」與「結算統一分數/等級」形成雙系統造成誤判
  showScore: false,
  showCounts: false,
  showCombo: false,
  showProgress: false
})

const currentSessionId = ref<string | null>(null)
const behaviorCollector = ref<BehaviorCollector | null>(null)
let lastTouchAt = 0

// 每日訓練相關
const showCompletionModal = ref(false)
const recommendedGames = ref<GameDefinition[]>([])
const showDifficultyPanel = ref(false)

// 判斷是否從每日訓練進入
const isFromDailyTraining = computed(() => {
  return route.query.fromDaily === 'true' || gameStore.isFromDailyTraining
})

const gameInfoForDifficultyPanel = computed(() => {
  if (!currentGame.value) return null
  return {
    id: currentGame.value.id,
    name: currentGame.value.name,
    icon: currentGame.value.icon,
  }
})

// 取得遊戲 ID（容錯：支援 route param 為 array / 遺失時 fallback 到 store）
const routeGameId = computed(() => {
  const raw = route.params.gameId
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] || ''
  return ''
})

const resolvedGameId = computed(() => routeGameId.value || gameStore.currentGameId || '')

// 當前遊戲（優先使用路由 ID，避免 store 殘留導致顯示錯誤）
const currentGame = computed(() => {
  if (resolvedGameId.value) {
    return gameRegistry.get(resolvedGameId.value) || gameStore.currentGame
  }
  return gameStore.currentGame
})

// 難度設定
const difficultySettings = computed(() => 
  resolvedGameId.value ? gameStore.getDifficultySettings(resolvedGameId.value, gameStore.currentDifficulty) : {}
)

// 最佳成績
const bestScore = computed(() =>
  resolvedGameId.value ? gameStore.getBestScore(resolvedGameId.value, gameStore.currentDifficulty) : 0
)

// 難度調整反饋樣式
const difficultyFeedbackStyle = computed(() => {
  if (!difficultyAdjustment.value) return {}
  
  if (difficultyAdjustment.value.reason === 'accuracy-high') {
    return {
      bgClass: 'bg-gradient-to-r from-[var(--color-success-bg)] to-[var(--color-surface-alt)]',
      borderClass: 'border-[var(--color-success)]/50',
      iconBgClass: 'bg-[var(--color-success)]/10',
      textClass: 'text-[var(--color-success)]',
      subTextClass: 'text-[var(--color-success)]',
      icon: '⬆️'
    }
  } else if (difficultyAdjustment.value.reason === 'accuracy-low') {
    return {
      bgClass: 'bg-gradient-to-r from-[var(--color-warning-bg)] to-[var(--color-surface-alt)]',
      borderClass: 'border-[var(--color-warning)]/50',
      iconBgClass: 'bg-[var(--color-warning)]/10',
      textClass: 'text-[var(--color-warning)]',
      subTextClass: 'text-[var(--color-warning)]',
      icon: '⬇️'
    }
  } else {
    return {
      bgClass: 'bg-gradient-to-r from-[var(--color-info-bg)] to-[var(--color-surface-alt)]',
      borderClass: 'border-[var(--color-info)]/50',
      iconBgClass: 'bg-[var(--color-info)]/10',
      textClass: 'text-[var(--color-info)]',
      subTextClass: 'text-[var(--color-info)]',
      icon: '➡️'
    }
  }
})

// 取得難度調整原因說明
const difficultyReasonText = computed(() => {
  if (!difficultyAdjustment.value) return ''
  
  switch (difficultyAdjustment.value.reason) {
    case 'accuracy-high':
      return '連續表現優異，難度自動提升'
    case 'accuracy-low':
      return '難度已調整，循序漸進更有效'
    case 'stable':
      return '表現穩定，繼續加油'
    default:
      return ''
  }
})

// 遊戲載入中元件
const GameLoadingComponent = {
  template: `
    <div class="flex flex-col items-center justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
      <p class="text-[var(--color-text-secondary)]">遊戲載入中...</p>
    </div>
  `
}

// 遊戲載入錯誤元件
const GameErrorComponent = {
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">😵</div>
        <h3 class="text-xl font-bold text-[var(--color-danger)] mb-2">遊戲載入失敗</h3>
      <p class="text-[var(--color-text-secondary)] mb-4">抱歉，遊戲元件無法載入，請稍後再試。</p>
      <button 
        class="btn btn-primary"
        @click="$emit('retry')"
      >
        重新載入
      </button>
    </div>
  `,
  emits: ['retry']
}

// 動態載入遊戲元件（含錯誤處理）
const createGameComponent = (loader: () => Promise<any>) => {
  return defineAsyncComponent({
    loader,
    loadingComponent: GameLoadingComponent,
    errorComponent: GameErrorComponent,
    delay: 200,
    timeout: 30000,
  })
}

// 動態載入遊戲元件
const gameComponent = computed(() => {
  const id = resolvedGameId.value
  if (!id) return null
  
  // 根據遊戲 ID 載入對應元件 - 完整 15 款遊戲
  const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    // 注意力訓練
    'whack-a-mole': createGameComponent(() => import('@/components/games/WhackAMole.vue')),
    'spot-difference': createGameComponent(() => import('@/components/games/SpotDifference.vue')),
    'number-connect': createGameComponent(() => import('@/components/games/NumberConnect.vue')),
    // 記憶力訓練
    'card-match': createGameComponent(() => import('@/components/games/CardMatch.vue')),
    'instant-memory': createGameComponent(() => import('@/components/games/InstantMemory.vue')),
    'poker-memory': createGameComponent(() => import('@/components/games/PokerMemory.vue')),
    'audio-memory': createGameComponent(() => import('@/components/games/AudioMemory.vue')),
    'gesture-memory': createGameComponent(() => import('@/components/games/GestureMemory.vue')),
    // 執行功能訓練
    'balance-scale': createGameComponent(() => import('@/components/games/BalanceScale.vue')),
    'maze-navigation': createGameComponent(() => import('@/components/games/MazeNavigation.vue')),
    'math-calc': createGameComponent(() => import('@/components/games/MathCalc.vue')),
    // 視覺空間訓練
    'clock-drawing': createGameComponent(() => import('@/components/games/ClockDrawingTest.vue')),
    'pattern-reasoning': createGameComponent(() => import('@/components/games/PatternReasoning.vue')),
    // 反應能力訓練
    'rock-paper-scissors': createGameComponent(() => import('@/components/games/RockPaperScissors.vue')),
    'rhythm-mimic': createGameComponent(() => import('@/components/games/RhythmMimic.vue')),
    // 其他測試
    'stroop-test': createGameComponent(() => import('@/components/games/StroopTest.vue')),
  }
  
  return componentMap[id] || null
})

// 格式化時間（防止負數）
function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 取得分數顏色
function getScoreClass(score: number): string {
  if (score >= 80) return 'text-[var(--color-score-good)]'
  if (score >= 50) return 'text-[var(--color-score-moderate)]'
  return 'text-[var(--color-score-concern)]'
}

// 取得結束表情
function getFinalEmoji(score: number): string {
  if (score >= 90) return '🎉'
  if (score >= 70) return '😊'
  if (score >= 50) return '👍'
  return '💪'
}

// 開始遊戲
function startGame(): void {
  if (!gameComponent.value) {
    startError.value = '此遊戲目前無法載入，請返回列表重新選擇。'
    return
  }
  startError.value = null

  // 重置狀態，避免停留在「準備」畫面或用舊分數繼續
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []

  // 進入遊戲畫面並要求元件自動開始（各遊戲會自行決定倒數/起跑）
  gameState.value = 'playing'
  autoStartOverride.value = true
  gameComponentKey.value++
  startBehaviorSession()
}

// 暫停遊戲
function pauseGame(): void {
  gameState.value = 'paused'
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// 繼續遊戲
function resumeGame(): void {
  gameState.value = 'playing'
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

function handleGameStart(): void {
  // 倒數完成後由遊戲元件觸發
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'playing'
  autoStartOverride.value = false
  elapsedTime.value = 0
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
  if (!behaviorCollector.value) {
    startBehaviorSession()
  }
}

// 結束遊戲
function quitGame(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
  router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
}

// 處理分數變化
function handleScoreChange(score: number): void {
  currentScore.value = score
}

// 處理遊戲狀態更新（來自遊戲元件的 throttled emit）
function handleStatusUpdate(status: GameStatusUpdate): void {
  // 合併狀態，保留未更新的欄位
  gameStatus.value = { ...gameStatus.value, ...status, showScore: false }
  
  // 同步分數到 currentScore（兼容舊版）
  if (status.score !== undefined) {
    currentScore.value = status.score
  }
}

// 處理遊戲結束
async function handleGameEnd(rawResult: unknown): Promise<void> {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  try {
    const subDifficulty = (() => {
      const raw = Number(route.query.subDifficulty ?? gameStore.currentSubDifficulty ?? 2)
      if (!Number.isFinite(raw)) return 2
      const clamped = Math.max(1, Math.min(3, Math.round(raw)))
      return clamped as 1 | 2 | 3
    })()

    const durationSeconds = (() => {
      const dur = typeof (rawResult as any)?.duration === 'number' ? Number((rawResult as any).duration) : NaN
      if (!Number.isFinite(dur) || dur < 0) return elapsedTime.value

      // 單位校驗：若看起來是毫秒（例如 60000），轉為秒。
      // 一般單局遊戲不會超過 1 小時；若 > 3600 且 <= 3600*1000，視為毫秒。
      if (dur > 3600 && dur <= 3600 * 1000) {
        return Math.round(dur / 1000)
      }

      // 避免極端不合理值直接影響結算
      if (dur > 24 * 60 * 60) return elapsedTime.value

      return Math.round(dur)
    })()

    const id = resolvedGameId.value
    if (!id) {
      throw new Error('Missing gameId for result normalization')
    }

    const gameMode: GameMode = isFromDailyTraining.value ? 'daily' : 'free'
    const result: GameResult = isLegacyGameResult(rawResult)
      ? {
          ...rawResult,
          gameId: id,
          difficulty: gameStore.currentDifficulty,
          subDifficulty,
          duration: durationSeconds,
          timestamp: new Date(),
          mode: gameMode
        }
      : normalizeToLegacyGameResult({
          gameId: id,
          rawResult,
          difficulty: gameStore.currentDifficulty,
          subDifficulty,
          durationSeconds
        })

    // 同時產生統一結果用於結算畫面顯示
    const unified = scoreNormalizer.normalize(
      id,
      rawResult,
      gameStore.currentDifficulty,
      subDifficulty,
      durationSeconds
    )

    // 最終寫入的 GameResult：修正歷史資料常見問題
    // - score 爆表（>100）導致 Sheet/報表誤判
    // - 缺少 grade/metrics/tracking 造成 Sheet 顯示為 F、completion=0
    const clampedScore = Math.max(0, Math.min(100, Math.round(Number(result.score ?? 0))))
    const finalizedResult: GameResult = {
      ...result,
      gameId: id,
      difficulty: gameStore.currentDifficulty,
      subDifficulty,
      score: clampedScore,
      maxScore: 100,
      timestamp: new Date(),
      mode: gameMode,
      grade: unified.grade,
      metrics: unified.metrics,
      tracking: unified.tracking,
      gameSpecific: unified.gameSpecific ?? result.gameSpecific,
      displayStats: unified.displayStats ?? result.displayStats
    }

    gameResult.value = finalizedResult
    unifiedGameResult.value = unified
    currentScore.value = finalizedResult.score
    gameState.value = 'finished'

    // 先準備好「推薦/下一步」所需資料（避免 DB 寫入失敗導致結算頁沒有按鈕/推薦）
    if (isFromDailyTraining.value) {
      // 每日訓練：若沒有下一個訓練項目，提供其他推薦避免結算頁空白
      const hasNext = Boolean(gameStore.getNextTrainingGame())
      recommendedGames.value = hasNext ? [] : gameStore.getUnplayedGamesByOtherDimensions(id, 4)
    } else {
      recommendedGames.value = gameStore.getUnplayedGamesByOtherDimensions(id, 4)
    }

    // 記錄遊戲結果（失敗不阻擋結算流程）
    try {
      await gameStore.recordGameResult(finalizedResult, gameMode, currentSessionId.value ?? undefined)
    } catch (error) {
      console.error('recordGameResult failed:', error)
    }
    await finalizeBehaviorLogs()

    // 如果是每日訓練，標記完成並更新狀態（失敗不阻擋「繼續下一個」）
    if (isFromDailyTraining.value) {
      gameStore.completeCurrentTrainingGame(finalizedResult.score, finalizedResult.duration)

      const odId = userStore.currentUser?.id
      if (odId) {
        try {
          await markGameCompleted(odId, finalizedResult.gameId, finalizedResult.duration)
        } catch (error) {
          console.error('markGameCompleted failed:', error)
        }
      }

      if (gameStore.isAllTrainingCompleted()) {
        showCompletionModal.value = true
      }
    }
    
    // 計算難度調整
    const odId = userStore.currentUser?.id || ''
    if (odId && id) {
      const adjustment = await calculateDifficultyAdjustment(
        odId,
        id,
        result
      )
      difficultyAdjustment.value = adjustment
      
      // 如果需要調整，套用調整
      if (adjustment.shouldAdjust) {
        await applyDifficultyAdjustment(odId, id, adjustment, result.accuracy)
      }

      if (isFromDailyTraining.value && adjustment.shouldAdjust) {
        const direction = (() => {
          if (adjustment.reason === 'accuracy-high' || adjustment.reason === 'reaction-improved') return 1
          if (adjustment.reason === 'accuracy-low' || adjustment.reason === 'reaction-declined' || adjustment.reason === 'inactivity') return -1
          return null
        })()

        if (direction) {
          const updates = gameStore.shiftRemainingTrainingDifficulties(direction)
          if (updates.length > 0) {
            updatePlannedGameDifficulties(odId, updates).catch(err => console.error('updatePlannedGameDifficulties failed', err))
          }
        }
      }
    }
  } catch (error) {
    console.error('處理遊戲結束時發生錯誤:', error)
    // 確保狀態為 finished 以顯示結果畫面（即使部分邏輯失敗）
    gameState.value = 'finished'
    finalizeBehaviorLogs().catch(() => {
      // ignore
    })
  }
}

// 再玩一次
function playAgain(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'playing'
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []
  gameStatus.value = {
    showTimer: true,
    showScore: true,
    showCounts: false,
    showCombo: false,
    showProgress: false
  }
  autoStartOverride.value = true
  gameComponentKey.value++
  startBehaviorSession()
}

// 繼續下一個訓練遊戲
function continueToNextGame(): void {
  const nextGame = gameStore.getNextTrainingGame()
  if (nextGame) {
    // 移動到下一個遊戲
    gameStore.moveToNextTrainingGame()
    gameStore.selectGame(nextGame.gameId)
    gameStore.selectDifficulty(nextGame.difficulty)
    if (nextGame.subDifficulty) {
      gameStore.selectSubDifficulty(nextGame.subDifficulty)
    }
    
    // 進入下一個遊戲：保持在「準備畫面」顯示遊戲說明，避免無意義自動開始造成誤判
    router.replace({
      path: `/games/${nextGame.gameId}`,
      query: { 
        fromDaily: 'true',
        subDifficulty: String(nextGame.subDifficulty ?? gameStore.currentSubDifficulty),
        t: Date.now().toString() // 加入時間戳強制刷新
      }
    })
  } else {
    // 如果沒有下一個遊戲，跳轉到報告頁面
    router.push('/report')
  }
}

// 開始推薦遊戲
function startRecommendedGame(game: GameDefinition): void {
  gameStore.selectGame(game.id)
  gameStore.selectDifficulty('easy')
  router.push({
    path: `/games/${game.id}`,
    query: { autoStart: 'true' }
  })
}

// 關閉完成動畫
function handleCompletionClose(): void {
  showCompletionModal.value = false
  gameStore.clearDailyTraining()
}

// 處理返回
function handleBack(): void {
  if (gameState.value === 'playing') {
    pauseGame()
  } else {
    router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
  }
}

function goBackToList(): void {
  router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
}

function handleDifficultyConfirm(difficulty: Difficulty, subDifficulty: SubDifficulty): void {
  gameStore.selectDifficulty(difficulty)
  gameStore.selectSubDifficulty(subDifficulty)
  if (isFromDailyTraining.value && resolvedGameId.value) {
    gameStore.updateCurrentTrainingGameDifficulty(difficulty, subDifficulty, { manualOverride: true })
    const odId = userStore.currentUser?.id
    if (odId) {
      updatePlannedGameDifficulties(odId, [
        { gameId: resolvedGameId.value, difficulty, subDifficulty, manualOverride: true }
      ]).catch(err => console.error('updatePlannedGameDifficulties failed', err))
    }
  }
  router.replace({
    path: resolvedGameId.value ? `/games/${resolvedGameId.value}` : route.path,
    query: {
      ...route.query,
      subDifficulty: String(subDifficulty),
    },
  })
}

// 從資料庫還原每日訓練隊列，避免重新整理後無法「繼續下一個」
async function ensureDailyQueueHydrated(): Promise<void> {
  if (!isFromDailyTraining.value) return
  const odId = userStore.currentUser?.id
  if (!odId) return

  if (gameStore.dailyTrainingQueue.length === 0) {
    await gameStore.syncDailyTrainingFromDB(odId)
  }

  const current = gameStore.getCurrentTrainingGame()
  if (current) {
    gameStore.selectGame(current.gameId)
    gameStore.selectDifficulty(current.difficulty)
    if (current.subDifficulty) {
      gameStore.selectSubDifficulty(current.subDifficulty)
    }
  }
}

// 監聯路由變化，選擇遊戲
function resetToReadyState(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'ready'
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []
  gameStatus.value = {
    showTimer: true,
    showScore: false,
    showCounts: false,
    showCombo: false,
    showProgress: false
  }
  autoStartOverride.value = false
  startError.value = null
  showDifficultyPanel.value = false
  gameComponentKey.value++
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
}

watch(routeGameId, (newId) => {
  if (newId) {
    gameStore.selectGame(newId)
    const sd = Number(route.query.subDifficulty)
    if (Number.isFinite(sd)) {
      const clamped = Math.max(1, Math.min(3, Math.round(sd))) as 1 | 2 | 3
      gameStore.selectSubDifficulty(clamped)
    }

    // 非每日訓練：載入系統建議難度（避免長者被過難/過簡單影響信心）
    const odId = userStore.currentUser?.id
    if (!isFromDailyTraining.value && odId) {
      getSuggestedDifficulty(odId, newId)
        .then(suggested => {
          if (routeGameId.value !== newId) return
          if (isFromDailyTraining.value) return
          gameStore.selectDifficulty(suggested.difficulty)
          gameStore.selectSubDifficulty(suggested.subDifficulty)
          if (!route.query.subDifficulty) {
            router.replace({
              path: `/games/${newId}`,
              query: { ...route.query, subDifficulty: String(suggested.subDifficulty) }
            })
          }
        })
        .catch(() => {
          // ignore
        })
    }
    resetToReadyState()
    return
  }

  // 若路由缺少 gameId，但 store 有選中遊戲，補上正確路徑避免進入無效狀態
  if (gameStore.currentGameId) {
    router.replace({
      path: `/games/${gameStore.currentGameId}`,
      query: route.query,
    })
  }
}, { immediate: true })

// 組件卸載時清理
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})

// 初始化
onMounted(() => {
  if (resolvedGameId.value && !routeGameId.value) {
    router.replace({
      path: `/games/${resolvedGameId.value}`,
      query: route.query,
    })
  } else if (routeGameId.value) {
    gameStore.selectGame(routeGameId.value)
  }

  // 初始化橫屏檢測
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)

  ensureDailyQueueHydrated().catch(err => console.error('恢復每日訓練失敗', err))

  // 若從「選擇難度/說明頁」明確按下開始，可用 autoStart 直接進入遊戲，避免「開始→又回到開始」的循環體感
  if (route.query.autoStart === 'true') {
    nextTick(() => startGame())
  }
})

function startBehaviorSession(): void {
  const odId = userStore.currentUser?.id
  const gameId = resolvedGameId.value
  if (!odId || !gameId) return
  const sessionId = generateId()
  currentSessionId.value = sessionId
  behaviorCollector.value = new BehaviorCollector(odId, gameId, sessionId)
}

async function finalizeBehaviorLogs(): Promise<void> {
  if (!behaviorCollector.value) return
  try {
    await behaviorCollector.value.saveAll()
  } catch (error) {
    console.error('saveAll behavior logs failed', error)
  } finally {
    behaviorCollector.value = null
    currentSessionId.value = null
  }
}

function handlePlayAreaInteraction(event: MouseEvent | TouchEvent): void {
  if (gameState.value !== 'playing') return
  if (!behaviorCollector.value) return

  const now = Date.now()
  if (event.type.startsWith('touch')) {
    lastTouchAt = now
  } else if (now - lastTouchAt < 500) {
    return
  }

  const point = (() => {
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0]
      return touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    return { x: event.clientX, y: event.clientY }
  })()

  if (!point) return

  behaviorCollector.value.recordClick({
    targetX: point.x,
    targetY: point.y,
    clickX: point.x,
    clickY: point.y,
    distance: 0,
    targetSize: 0,
    isHit: false,
  })
}
</script>

<style scoped>
/* 推薦遊戲卡片 - 2x2 網格 */
.recommended-game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 100px;
}

.recommended-game-card:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.recommended-game-card:hover .text-\[var\(--color-text\)\] {
  color: white;
}

.recommended-game-card:hover .text-\[var\(--color-text-muted\)\] {
  color: rgba(255, 255, 255, 0.8);
}

.recommended-game-card:active {
  transform: translateY(0);
}

/* 響應式調整 */
@media (max-width: 400px) {
  .recommended-game-card {
    padding: 0.75rem;
    min-height: 80px;
  }
  
  .recommended-game-card span:first-child {
    font-size: 1.5rem;
  }
}
</style>

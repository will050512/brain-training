<template>
  <div class="app-page">
    <!-- APP 頭部 -->
    <header class="app-header">
      <router-link to="/" class="text-2xl">←</router-link>
      <h1 class="text-lg font-bold text-[var(--color-text)]">選擇遊戲</h1>
      <router-link to="/report" class="text-xl">📊</router-link>
    </header>

    <!-- 認知維度篩選標籤（固定在頂部） -->
    <div class="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div class="flex gap-2 px-3 py-2 sm:px-4 sm:py-3 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible">
        <button
          @click="selectedDimension = null"
          class="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          :class="selectedDimension === null
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]'"
        >
          全部
        </button>
        <button
          v-for="dim in cognitiveDimensions"
          :key="dim.id"
          @click="selectedDimension = dim.id"
          class="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          :class="selectedDimension === dim.id
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]'"
        >
          <span class="mr-1">{{ dim.icon }}</span>
          <span class="hidden xs:inline">{{ dim.name }}</span>
          <span class="xs:hidden">{{ dim.name.slice(0, 2) }}</span>
        </button>
      </div>
    </div>

    <!-- 遊戲列表（可滾動） -->
    <div class="app-content-scroll">
      <div class="p-3 sm:p-4 section-stack">
        <div class="section-label">遊戲清單</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          <div
            v-for="game in filteredGames"
            :key="game.id"
            class="card card-clickable p-3 sm:p-4"
            @click="openGameModal(game)"
          >
            <!-- 遊戲圖示 -->
            <div class="text-3xl sm:text-4xl text-center mb-2 sm:mb-3">{{ game.icon }}</div>

            <!-- 遊戲名稱 -->
            <h3 class="text-xs sm:text-sm font-bold text-center text-[var(--color-text)] mb-2 sm:mb-3 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center">{{ game.name }}</h3>

            <!-- 主要認知維度標籤 -->
            <div class="flex justify-center mb-2 sm:mb-3">
              <span
                v-if="primaryDimension(game)"
                class="badge truncate max-w-full"
                :style="{
                  backgroundColor: getDimensionColor(primaryDimension(game)!) + '20',
                  color: getDimensionColor(primaryDimension(game)!)
                }"
              >
                {{ getDimensionShortName(primaryDimension(game)!) }}
              </span>
            </div>

            <!-- 最佳成績 -->
            <div class="text-center">
              <span class="text-xs text-[var(--color-text-muted)]">最佳 </span>
              <span class="text-sm sm:text-base font-bold" :class="getScoreClass(gameStore.getBestScore(game.id))">
                {{ gameStore.getBestScore(game.id) || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="filteredGames.length === 0" class="text-center py-8 sm:py-12">
          <div class="text-3xl sm:text-4xl mb-3">🎮</div>
          <p class="text-sm sm:text-base text-[var(--color-text-muted)]">此分類暫無遊戲</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import type { GameDefinition } from '@/types/game'

const router = useRouter()
const gameStore = useGameStore()

// 狀態
const selectedDimension = ref<CognitiveDimension | null>(null)

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS)

// 取得維度顏色
function getDimensionColor(dimension: CognitiveDimension): string {
  return COGNITIVE_DIMENSIONS[dimension].color
}

// 取得維度名稱
function getDimensionName(dimension: CognitiveDimension): string {
  return COGNITIVE_DIMENSIONS[dimension].name
}

// 取得維度簡稱
function getDimensionShortName(dimension: CognitiveDimension): string {
  const dim = COGNITIVE_DIMENSIONS[dimension]
  return dim.name.slice(0, 2)
}

// 取得遊戲的主要認知維度 (權重最高者)
// 將此函式移到 filteredGames 之前以提高可讀性與邏輯一致性
function primaryDimension(game: GameDefinition): CognitiveDimension | null {
  const weights = Object.entries(game.cognitiveWeights) as [CognitiveDimension, number][]
  if (weights.length === 0) return null
  // 降序排列，取第一個
  const sorted = weights.sort((a, b) => b[1] - a[1])
  const first = sorted[0]
  return first ? first[0] : null
}

// 篩選後的遊戲列表（嚴格模式：只顯示主要維度為選中維度的遊戲）
const filteredGames = computed(() => {
  const games = gameStore.allGames
  if (!selectedDimension.value) return games
  return games.filter(game => primaryDimension(game) === selectedDimension.value)
})

// 取得分數顏色 class
function getScoreClass(score: number | undefined): string {
  const s = score ?? 0
  if (s >= 80) return 'score-good'
  if (s >= 50) return 'score-medium'
  return 'score-low'
}

// 直接跳轉到遊戲預覽頁
function openGameModal(game: GameDefinition): void {
  gameStore.selectGame(game.id)
  router.push(`/games/${game.id}`)
}
</script>

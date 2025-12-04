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
      <div class="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        <button
          @click="selectedDimension = null"
          class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
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
          class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
          :class="selectedDimension === dim.id 
            ? 'bg-[var(--color-primary)] text-white' 
            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]'"
        >
          {{ dim.icon }} {{ dim.name }}
        </button>
      </div>
    </div>

    <!-- 遊戲列表（可滾動） -->
    <div class="app-content-scroll">
      <div class="p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div
            v-for="game in filteredGames"
            :key="game.id"
            class="bg-[var(--color-surface)] rounded-xl p-4 shadow-sm border border-[var(--color-border-light)] active:scale-[0.98] transition-transform cursor-pointer"
            @click="openGameModal(game)"
          >
            <!-- 遊戲圖示 -->
            <div class="text-4xl text-center mb-2">{{ game.icon }}</div>
            
            <!-- 遊戲名稱 -->
            <h3 class="text-sm font-bold text-center text-[var(--color-text)] mb-2">{{ game.name }}</h3>
            
            <!-- 主要認知維度標籤 -->
            <div class="flex justify-center">
              <span
                v-if="primaryDimension(game)"
                class="text-xs px-2 py-0.5 rounded-full"
                :style="{
                  backgroundColor: getDimensionColor(primaryDimension(game)!) + '20',
                  color: getDimensionColor(primaryDimension(game)!)
                }"
              >
                {{ getDimensionName(primaryDimension(game)!) }}
              </span>
            </div>
            
            <!-- 最佳成績 -->
            <div class="text-center mt-2">
              <span class="text-xs text-[var(--color-text-muted)]">最佳 </span>
              <span class="text-sm font-bold" :class="getScoreClass(gameStore.getBestScore(game.id))">
                {{ gameStore.getBestScore(game.id) || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="filteredGames.length === 0" class="text-center py-12">
          <div class="text-4xl mb-3">🎮</div>
          <p class="text-[var(--color-text-muted)]">此分類暫無遊戲</p>
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

// 篩選後的遊戲列表
const filteredGames = computed(() => {
  const games = gameStore.allGames
  if (!selectedDimension.value) return games
  return games.filter(game => {
    const weights = game.cognitiveWeights
    return weights[selectedDimension.value!] !== undefined && (weights[selectedDimension.value!] as number) > 0
  })
})

// 取得維度顏色
function getDimensionColor(dimension: CognitiveDimension): string {
  return COGNITIVE_DIMENSIONS[dimension].color
}

// 取得維度名稱
function getDimensionName(dimension: CognitiveDimension): string {
  return COGNITIVE_DIMENSIONS[dimension].name
}

// 取得遊戲的主要認知維度
function primaryDimension(game: GameDefinition): CognitiveDimension | null {
  const weights = Object.entries(game.cognitiveWeights) as [CognitiveDimension, number][]
  if (weights.length === 0) return null
  const sorted = weights.sort((a, b) => b[1] - a[1])
  const first = sorted[0]
  return first ? first[0] : null
}

// 取得分數顏色 class
function getScoreClass(score: number): string {
  if (score >= 80) return 'score-good'
  if (score >= 50) return 'score-medium'
  return 'score-low'
}

// 直接跳轉到遊戲預覽頁
function openGameModal(game: GameDefinition): void {
  gameStore.selectGame(game.id)
  router.push(`/games/${game.id}/preview`)
}
</script>

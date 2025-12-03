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

    <!-- 遊戲詳情彈窗 -->
    <Teleport to="body">
      <div v-if="selectedGame" class="modal-overlay" @click.self="closeGameModal">
        <div class="modal-content max-w-md animate-slide-up">
          <!-- 遊戲標題 -->
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">{{ selectedGame.icon }}</div>
            <h2 class="text-xl font-bold text-[var(--color-text)]">{{ selectedGame.name }}</h2>
            <p class="text-sm text-[var(--color-text-muted)] mt-1">{{ selectedGame.description }}</p>
          </div>

          <!-- 遊戲說明 -->
          <div class="mb-4 p-3 bg-[var(--color-surface-alt)] rounded-lg">
            <h3 class="font-semibold text-sm text-[var(--color-text)] mb-2">遊戲說明</h3>
            <ul class="list-disc list-inside text-[var(--color-text-secondary)] text-sm space-y-1">
              <li v-for="(instruction, index) in selectedGame.instructions" :key="index">
                {{ instruction }}
              </li>
            </ul>
          </div>

          <!-- 難度選擇 -->
          <div class="mb-4">
            <h3 class="font-semibold text-sm text-[var(--color-text)] mb-2">選擇難度</h3>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="diff in difficulties"
                :key="diff.id"
                @click="selectedDifficulty = diff.id"
                class="py-2 rounded-lg font-medium text-sm transition-all"
                :class="{
                  'ring-2 ring-offset-2 dark:ring-offset-slate-800': selectedDifficulty === diff.id,
                  'ring-green-500': selectedDifficulty === diff.id && diff.id === 'easy',
                  'ring-yellow-500': selectedDifficulty === diff.id && diff.id === 'medium',
                  'ring-red-500': selectedDifficulty === diff.id && diff.id === 'hard',
                }"
                :style="{ backgroundColor: diff.bgColor, color: diff.color }"
              >
                {{ diff.name }}
              </button>
            </div>
          </div>

          <!-- 歷史成績 -->
          <div class="mb-4 p-3 bg-[var(--color-surface-alt)] rounded-lg text-sm">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">{{ DIFFICULTIES[selectedDifficulty].name }}最佳</span>
              <span class="font-bold text-[var(--color-text)]">
                {{ gameStore.getBestScore(selectedGame.id, selectedDifficulty) || '-' }} 分
              </span>
            </div>
          </div>

          <!-- 按鈕 -->
          <div class="flex gap-3">
            <button @click="closeGameModal" class="btn btn-secondary flex-1 py-3">
              取消
            </button>
            <button @click="startGame" class="btn btn-primary flex-1 py-3 shadow-lg">
              開始遊戲
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import { DIFFICULTIES, type Difficulty, type GameDefinition } from '@/types/game'

const router = useRouter()
const gameStore = useGameStore()

// 狀態
const selectedDimension = ref<CognitiveDimension | null>(null)
const selectedGame = ref<GameDefinition | null>(null)
const selectedDifficulty = ref<Difficulty>('easy')

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS)

// 難度列表
const difficulties = Object.values(DIFFICULTIES)

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

// 開啟遊戲詳情
function openGameModal(game: GameDefinition): void {
  selectedGame.value = game
  selectedDifficulty.value = 'easy'
}

// 關閉遊戲詳情
function closeGameModal(): void {
  selectedGame.value = null
}

// 開始遊戲
function startGame(): void {
  if (!selectedGame.value) return
  
  gameStore.selectGame(selectedGame.value.id)
  gameStore.selectDifficulty(selectedDifficulty.value)
  
  router.push(`/games/${selectedGame.value.id}`)
}
</script>

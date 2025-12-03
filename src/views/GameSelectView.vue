<template>
  <div class="min-h-screen bg-[var(--color-bg)] py-8 transition-colors duration-300">
    <div class="container mx-auto px-4">
      <!-- 頭部導航 -->
      <div class="flex items-center justify-between mb-8">
        <router-link to="/" class="btn btn-secondary">
          ← 返回首頁
        </router-link>
        <h1 class="text-xl md:text-2xl font-bold text-[var(--color-text)]">選擇遊戲</h1>
        <router-link to="/report" class="btn btn-secondary">
          📊 報告
        </router-link>
      </div>

      <!-- 認知維度篩選 -->
      <div class="flex flex-wrap gap-2 mb-8 justify-center">
        <button
          @click="selectedDimension = null"
          class="btn"
          :class="selectedDimension === null ? 'btn-primary' : 'btn-secondary'"
        >
          全部
        </button>
        <button
          v-for="dim in cognitiveDimensions"
          :key="dim.id"
          @click="selectedDimension = dim.id"
          class="btn"
          :class="selectedDimension === dim.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ dim.icon }} {{ dim.name }}
        </button>
      </div>

      <!-- 遊戲列表 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div
          v-for="game in filteredGames"
          :key="game.id"
          class="card hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          @click="openGameModal(game)"
        >
          <!-- 遊戲圖示 -->
          <div class="text-5xl text-center mb-4 drop-shadow">{{ game.icon }}</div>
          
          <!-- 遊戲名稱 -->
          <h3 class="text-lg font-bold text-center text-[var(--color-text)] mb-2">{{ game.name }}</h3>
          
          <!-- 認知維度標籤 -->
          <div class="flex flex-wrap gap-1 justify-center mb-3">
            <span
              v-for="[dimension, weight] in Object.entries(game.cognitiveWeights)"
              :key="dimension"
              class="text-xs px-2 py-1 rounded-full font-medium"
              :style="{
                backgroundColor: getDimensionColor(dimension as CognitiveDimension) + '20',
                color: getDimensionColor(dimension as CognitiveDimension)
              }"
            >
              {{ getDimensionName(dimension as CognitiveDimension) }}
              {{ Math.round((weight as number) * 100) }}%
            </span>
          </div>
          
          <!-- 遊戲說明 -->
          <p class="text-[var(--color-text-muted)] text-center text-sm mb-4">
            {{ game.description }}
          </p>
          
          <!-- 最佳成績 -->
          <div class="flex justify-between items-center text-sm text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
            <span>最佳成績</span>
            <span class="font-bold" :class="getScoreClass(gameStore.getBestScore(game.id))">
              {{ gameStore.getBestScore(game.id) || '-' }} 分
            </span>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredGames.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🎮</div>
        <p class="text-xl text-[var(--color-text-muted)]">此分類暫無遊戲</p>
      </div>
    </div>

    <!-- 遊戲詳情彈窗 -->
    <div v-if="selectedGame" class="modal-overlay" @click.self="closeGameModal">
      <div class="modal-content max-w-lg animate-slide-up">
        <!-- 遊戲標題 -->
        <div class="text-center mb-6">
          <div class="text-6xl mb-3 drop-shadow-lg">{{ selectedGame.icon }}</div>
          <h2 class="text-2xl font-bold text-[var(--color-text)]">{{ selectedGame.name }}</h2>
          <p class="text-[var(--color-text-muted)] mt-2">{{ selectedGame.description }}</p>
        </div>

        <!-- 遊戲說明 -->
        <div class="mb-6">
          <h3 class="font-semibold text-[var(--color-text)] mb-2">遊戲說明</h3>
          <ul class="list-disc list-inside text-[var(--color-text-secondary)] space-y-1">
            <li v-for="(instruction, index) in selectedGame.instructions" :key="index">
              {{ instruction }}
            </li>
          </ul>
        </div>

        <!-- 難度選擇 -->
        <div class="mb-6">
          <h3 class="font-semibold text-[var(--color-text)] mb-3">選擇難度</h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="diff in difficulties"
              :key="diff.id"
              @click="selectedDifficulty = diff.id"
              class="btn transition-all duration-200"
              :class="{
                'ring-2 ring-offset-2 dark:ring-offset-slate-800': selectedDifficulty === diff.id,
                'ring-green-500': selectedDifficulty === diff.id && diff.id === 'easy',
                'ring-yellow-500': selectedDifficulty === diff.id && diff.id === 'medium',
                'ring-red-500': selectedDifficulty === diff.id && diff.id === 'hard',
              }"
              :style="{ 
                backgroundColor: diff.bgColor, 
                color: diff.color 
              }"
            >
              {{ diff.name }}
            </button>
          </div>
        </div>

        <!-- 歷史成績 -->
        <div class="mb-6 p-4 bg-[var(--color-surface-alt)] rounded-lg">
          <div class="flex justify-between text-sm">
            <span class="text-[var(--color-text-muted)]">{{ DIFFICULTIES[selectedDifficulty].name }}難度最佳</span>
            <span class="font-bold text-[var(--color-text)]">
              {{ gameStore.getBestScore(selectedGame.id, selectedDifficulty) || '-' }} 分
            </span>
          </div>
          <div class="flex justify-between text-sm mt-1">
            <span class="text-[var(--color-text-muted)]">{{ DIFFICULTIES[selectedDifficulty].name }}難度平均</span>
            <span class="text-[var(--color-text-secondary)]">
              {{ gameStore.getAverageScore(selectedGame.id, selectedDifficulty) || '-' }} 分
            </span>
          </div>
        </div>

        <!-- 按鈕 -->
        <div class="flex gap-3">
          <button @click="closeGameModal" class="btn btn-secondary flex-1">
            取消
          </button>
          <button @click="startGame" class="btn btn-primary btn-lg flex-1 shadow-lg hover:shadow-xl transition-shadow">
            開始遊戲 →
          </button>
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

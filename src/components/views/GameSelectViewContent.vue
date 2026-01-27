<template>
  <PageShell>
    <PageHeader
      title="遊戲訓練"
      subtitle="選擇想訓練的認知維度"
      icon="🎮"
    />

    <SectionStack>
      <GameSelectFilterBar
        :selectedDimension="selectedDimension"
        :cognitiveDimensions="cognitiveDimensions"
        :onSelect="(dimension) => { selectedDimension = dimension }"
      />

      <GameSelectGrid
        :games="filteredGames"
        :resolveGameIcon="resolveGameIcon"
        :primaryDimension="primaryDimension"
        :getDimensionColor="getDimensionColor"
        :getDimensionShortName="getDimensionShortName"
        :getScoreClass="getScoreClass"
        :getBestScore="gameStore.getBestScore"
        :onOpenGame="openGameModal"
      />
    </SectionStack>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import type { GameDefinition } from '@/types/game'
import { getAssetDisplay } from '@/services/assetLoader'
import { PageShell, PageHeader, SectionStack } from '@/components/layout'
import GameSelectFilterBar from '@/components/game-select/GameSelectFilterBar.vue'
import GameSelectGrid from '@/components/game-select/GameSelectGrid.vue'

const router = useRouter()
const gameStore = useGameStore()

// 狀態
const selectedDimension = ref<CognitiveDimension | null>(null)
const gameIconMap = ref<Record<string, { emoji: string; path?: string }>>({})
const scrollKey = 'game-select.scrollTop'

function getScrollContainer(): HTMLElement | null {
  const pageScroll = document.querySelector('.app-content-scroll') as HTMLElement | null
  if (pageScroll) return pageScroll
  const appShellScroll = document.querySelector('.app-shell-content.content-scroll') as HTMLElement | null
  if (appShellScroll) return appShellScroll
  return document.scrollingElement as HTMLElement | null
}

function saveScrollPosition(): void {
  const container = getScrollContainer()
  if (!container) return
  sessionStorage.setItem(scrollKey, String(container.scrollTop))
}

function restoreScrollPosition(): void {
  const raw = sessionStorage.getItem(scrollKey)
  if (!raw) return
  const saved = Number(raw)
  if (!Number.isFinite(saved)) return

  nextTick(() => {
    const container = getScrollContainer()
    if (!container) return
    container.scrollTop = saved
  })
}

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

function resolveGameIcon(gameId: string) {
  return gameIconMap.value[gameId]
}

async function loadGameIcons(): Promise<void> {
  const entries = await Promise.all(
    gameStore.allGames.map(async game => {
      const usage = `game.icon.${game.id}`
      const info = await getAssetDisplay(usage)
      return [game.id, info] as const
    })
  )

  const map: Record<string, { emoji: string; path?: string }> = {}
  entries.forEach(([id, info]) => {
    map[id] = info
  })
  gameIconMap.value = map
}

onMounted(() => {
  loadGameIcons()
  restoreScrollPosition()
})

onBeforeRouteLeave(() => {
  saveScrollPosition()
})

// 取得分數顏色 class
function getScoreClass(score: number | null | undefined): string {
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


<script setup lang="ts">
/**
 * 營養推薦視圖
 * 根據認知表現提供營養補充建議
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { 
  getAllSupplements,
  type NutritionRecommendation,
  type SupplementInfo,
  type SupplementType,
} from '@/services/nutritionPlaceholder'
import { getUserGameSessions, saveNutritionRecommendation } from '@/services/db'
import { generateNutritionResultForUser } from '@/services/nutritionRecommendationService'
import { syncNutritionRecommendationToSheet } from '@/services/userDataSheetSyncService'
import type { CognitiveDimension } from '@/types/cognitive'
import { getTotalGamesPlayed, NUTRITION_UNLOCK_REQUIRED_TRAININGS } from '@/utils/trainingStats'
import { PageShell, SectionStack } from '@/components/layout'
import NutritionHeader from '@/components/nutrition/NutritionHeader.vue'
import NutritionDisclaimer from '@/components/nutrition/NutritionDisclaimer.vue'
import NutritionLoading from '@/components/nutrition/NutritionLoading.vue'
import NutritionLocked from '@/components/nutrition/NutritionLocked.vue'
import NutritionToggle from '@/components/nutrition/NutritionToggle.vue'
import NutritionEmptyPersonalized from '@/components/nutrition/NutritionEmptyPersonalized.vue'
import NutritionTypeFilter from '@/components/nutrition/NutritionTypeFilter.vue'
import NutritionRecommendationsList from '@/components/nutrition/NutritionRecommendationsList.vue'
import NutritionSupplementList from '@/components/nutrition/NutritionSupplementList.vue'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(true)
const isLocked = ref(false)
const completedSessionsCount = ref(0)
const REQUIRED_SESSIONS = NUTRITION_UNLOCK_REQUIRED_TRAININGS

const activeRecommendations = ref<NutritionRecommendation[]>([])
const allSupplements = ref<SupplementInfo[]>([])
const showAllSupplements = ref(false)
const selectedType = ref<string>('all')

// 類型列表
const supplementTypes = computed(() => {
  const types = allSupplements.value.map(s => s.type)
  return ['all', ...Array.from(new Set(types))]
})

// 類型名稱對照
const typeNames: Record<string, string> = {
  all: '全部',
  omega3: 'Omega-3 魚油',
  vitaminB: '維生素 B 群',
  vitaminD: '維生素 D',
  vitaminE: '維生素 E',
  lecithin: '卵磷脂',
  ginkgo: '銀杏',
  phosphatidylserine: '磷脂醯絲胺酸',
  coq10: '輔酶 Q10',
  curcumin: '薑黃素'
}

// 維度名稱對照
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '專注力'
}

// 載入推薦
async function loadRecommendations(): Promise<void> {
  isLoading.value = true
  
  try {
    const userId = userStore.currentUser?.id
    if (userId) {
      // 取得遊戲記錄
      const userSessions = await getUserGameSessions(userId)
      completedSessionsCount.value = getTotalGamesPlayed(
        userStore.currentStats?.totalGamesPlayed,
        userSessions.length
      )
      
      // 檢查是否解鎖
      if (completedSessionsCount.value < REQUIRED_SESSIONS) {
        isLocked.value = true
        isLoading.value = false
        return
      }

      // 使用共用動態推薦管線（Mini-Cog + 退化偵測 + 分數趨勢）
      const personalized = await generateNutritionResultForUser({
        odId: userId,
        age: userStore.userAge || 65,
        educationYears: userStore.currentUser?.educationYears || 9,
        sessions: userSessions
      })

      activeRecommendations.value = personalized.recommendations

      if (activeRecommendations.value.length > 0) {
        await persistNutritionRecommendations(userId, activeRecommendations.value)
      }
    }
    
    // 所有營養品
    allSupplements.value = getAllSupplements()
  } catch (error) {
    console.error('載入營養推薦失敗:', error)
  } finally {
    isLoading.value = false
  }
}

async function persistNutritionRecommendations(
  odId: string,
  recommendations: NutritionRecommendation[]
): Promise<void> {
  for (const rec of recommendations) {
    const record = {
      id: rec.id,
      odId,
      triggerId: rec.triggerId,
      supplementType: rec.supplement.type,
      dimension: rec.dimension,
      priority: rec.priority,
      reason: rec.reason,
      recommendedAt: rec.recommendedAt,
      viewed: rec.viewed,
      dismissed: rec.dismissed,
    }

    await saveNutritionRecommendation(record)
    await syncNutritionRecommendationToSheet(record)
  }
}

// 取得優先級 Class
function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'high': return 'badge--danger'
    case 'medium': return 'badge--warning'
    case 'low': return 'badge--success'
    default: return 'badge--neutral'
  }
}

// 取得優先級文字
function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '強烈建議'
    case 'medium': return '建議'
    case 'low': return '可考慮'
    default: return ''
  }
}

// 取得類型圖示
function getTypeIcon(type: SupplementType | string): string {
  switch (type) {
    case 'omega3': return '🐟'
    case 'vitaminB': return '💊'
    case 'vitaminD': return '☀️'
    case 'vitaminE': return '🌻'
    case 'lecithin': return '🥚'
    case 'ginkgo': return '🌿'
    case 'phosphatidylserine': return '🧬'
    case 'coq10': return '⚡'
    case 'curcumin': return '🧡'
    case 'ginkgoGoldenCordyceps': return '🍄'
    case 'antrodiaCinnamomea': return '🌰'
    default: return '📦'
  }
}

// 開啟合作廠商官網
function openPartnerUrl(url: string): void {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// 開啟商城（預留）
function openShopUrl(url: string): void {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    // 商城尚未上線，顯示提示
    alert('商城即將上線，敬請期待！')
  }
}

// 篩選後的推薦
const filteredRecommendations = computed(() => {
  if (selectedType.value === 'all') return activeRecommendations.value
  return activeRecommendations.value.filter(r => r.supplement.type === selectedType.value)
})

// 篩選後的所有營養品
const filteredSupplements = computed(() => {
  if (selectedType.value === 'all') return allSupplements.value
  return allSupplements.value.filter(s => s.type === selectedType.value)
})

onMounted(() => {
  loadRecommendations()
})
</script>

<template>
  <PageShell>
    <SectionStack>
      <NutritionHeader :onBack="router.back" />

      <NutritionDisclaimer />

      <NutritionLoading v-if="isLoading" />

      <NutritionLocked
        v-else-if="isLocked"
        :completedSessionsCount="completedSessionsCount"
        :requiredSessions="REQUIRED_SESSIONS"
        :onGoTraining="() => { router.push('/daily-challenge') }"
      />

      <template v-else>
        <NutritionToggle
          :showAllSupplements="showAllSupplements"
          :activeCount="activeRecommendations.length"
          :onToggle="(value) => { showAllSupplements = value }"
        />

        <NutritionEmptyPersonalized
          :show="!showAllSupplements && activeRecommendations.length === 0"
          :onShowAll="() => { showAllSupplements = true }"
        />

        <NutritionTypeFilter
          :show="(showAllSupplements ? filteredSupplements.length : filteredRecommendations.length) > 0"
          :supplementTypes="supplementTypes"
          :selectedType="selectedType"
          :typeNames="typeNames"
          :getTypeIcon="getTypeIcon"
          :onSelect="(value) => { selectedType = value }"
        />

        <NutritionRecommendationsList
          :show="!showAllSupplements && filteredRecommendations.length > 0"
          :recommendations="filteredRecommendations"
          :dimensionNames="dimensionNames"
          :getTypeIcon="getTypeIcon"
          :getPriorityClass="getPriorityClass"
          :getPriorityText="getPriorityText"
          :onOpenPartner="openPartnerUrl"
          :onOpenShop="openShopUrl"
        />

        <NutritionSupplementList
          :show="showAllSupplements"
          :supplements="filteredSupplements"
          :dimensionNames="dimensionNames"
          :getTypeIcon="getTypeIcon"
          :onOpenPartner="openPartnerUrl"
          :onOpenShop="openShopUrl"
        />
      </template>
    </SectionStack>
  </PageShell>
</template>


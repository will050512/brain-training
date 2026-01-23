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
  <div class="app-page page-ambient">
    <div class="app-content-scroll">
      <div class="page-shell section-stack pb-safe-offset">
    <header class="flex items-center gap-3 min-h-[44px]">
      <button class="btn btn-ghost btn-circle" @click="router.back()">
        <span class="text-xl">←</span>
      </button>
      <h1 class="text-xl font-bold m-0 text-primary">🥗 營養建議</h1>
    </header>

    <!-- 重要免責聲明 -->
    <div class="card p-4 flex gap-3 bg-[var(--color-surface-soft)] border-l-4 border-[var(--color-warning)]">
      <div class="text-2xl">⚠️</div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-bold text-[var(--color-text)]">重要聲明</h3>
        <p class="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
          建議僅供參考，不能替代醫療建議。服用藥物者請務必諮詢醫師，避免交互作用。
        </p>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="py-12 text-center text-[var(--color-text-secondary)]">
      <div class="spinner mx-auto mb-4"></div>
      <p class="animate-pulse">正在分析您的需求...</p>
    </div>

    <!-- 鎖定狀態 -->
    <div v-else-if="isLocked" class="card p-8 section-stack items-center text-center">
      <div class="text-6xl mb-2 animate-bounce">🔒</div>
      <h2 class="text-lg font-bold">功能尚未解鎖</h2>
      <p class="text-[var(--color-text-secondary)] text-sm max-w-xs mx-auto">
        為了提供精準的個人化營養建議，我們需要收集更多您的訓練數據。
      </p>
      
      <div class="w-full max-w-xs bg-[var(--color-surface-soft)] rounded-full h-3 overflow-hidden mt-4">
        <div 
          class="h-full bg-primary transition-all duration-1000" 
          :style="{ width: `${Math.min((completedSessionsCount / REQUIRED_SESSIONS) * 100, 100)}%` }"
        ></div>
      </div>
      <p class="text-xs font-bold text-primary mt-2">
        訓練進度：{{ completedSessionsCount }} / {{ REQUIRED_SESSIONS }} 場
      </p>
      
      <div class="bg-[var(--color-surface-soft)] p-4 rounded-xl text-left w-full max-w-xs mt-2">
        <h3 class="font-bold text-sm mb-2">解鎖後您將獲得：</h3>
        <ul class="list-disc pl-5 text-xs space-y-1 text-[var(--color-text-secondary)]">
          <li>✨ 基於認知表現的精準營養建議</li>
          <li>💊 針對弱項維度的補充方案</li>
          <li>👨‍⚕️ 專業醫師與營養師的建議</li>
        </ul>
      </div>
      
      <button class="btn btn-primary w-full max-w-xs mt-4 min-h-[44px]" @click="router.push('/daily-challenge')">
        前往每日訓練
      </button>
    </div>

    <template v-else>
      <!-- 切換顯示 -->
      <div class="grid grid-cols-2 gap-1 p-1 bg-[var(--color-surface-soft)] rounded-xl">
        <button 
          class="btn btn-sm min-h-[40px] border-0"
          :class="!showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
          @click="showAllSupplements = false"
        >
          📌 個人化建議 ({{ activeRecommendations.length }})
        </button>
        <button 
          class="btn btn-sm min-h-[40px] border-0"
          :class="showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
          @click="showAllSupplements = true"
        >
          📚 所有營養素
        </button>
      </div>

      <!-- 無個人化建議時 -->
      <div v-if="!showAllSupplements && activeRecommendations.length === 0" class="card text-center py-12 px-4">
        <div class="text-6xl mb-4">✨</div>
        <h3 class="font-bold text-lg mb-2">目前沒有特別建議</h3>
        <p class="text-[var(--color-text-secondary)] text-sm mb-6">根據您的訓練表現，目前沒有特別需要加強的營養素。<br>持續保持良好的訓練習慣！</p>
        <button class="btn btn-outline min-h-[44px]" @click="showAllSupplements = true">
          瀏覽所有營養素 →
        </button>
      </div>

      <!-- 類型篩選 -->
      <div 
        v-if="(showAllSupplements ? filteredSupplements.length : filteredRecommendations.length) > 0" 
        class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 mask-fade-sides"
      >
        <button
          v-for="t in supplementTypes"
          :key="t"
          class="btn btn-sm whitespace-nowrap rounded-full min-h-[36px] px-4"
          :class="selectedType === t ? 'btn-primary' : 'btn-secondary bg-surface border-transparent'"
          @click="selectedType = t"
        >
          {{ t !== 'all' ? getTypeIcon(t) : '📋' }}
          {{ typeNames[t] || t }}
        </button>
      </div>

      <!-- 個人化推薦列表 -->
      <div v-if="!showAllSupplements && filteredRecommendations.length > 0" class="section-stack">
        <div 
          v-for="rec in filteredRecommendations"
          :key="rec.id"
          class="card p-4 relative overflow-hidden transition-all active:scale-[0.99]"
          :class="{ 'ring-2 ring-primary ring-offset-2': rec.supplement.isPartnerProduct }"
        >
          <!-- 優先級標籤 -->
          <div 
            class="absolute top-0 right-0 rounded-bl-xl px-3 py-1 text-xs font-bold"
            :class="getPriorityClass(rec.priority)"
          >
            {{ getPriorityText(rec.priority) }}
          </div>

          <div class="flex gap-3 items-start mt-2">
            <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
              {{ getTypeIcon(rec.supplement.type) }}
            </span>
            <div class="flex-1 min-w-0 space-y-2">
              <div class="pr-16">
                <h3 class="text-lg font-bold truncate leading-tight">{{ rec.supplement.name }}</h3>
                <div class="text-xs text-[var(--color-text-secondary)] flex flex-wrap items-center gap-1 mt-1">
                  {{ rec.supplement.nameEn }}
                  <span v-if="rec.supplement.partnerName" class="text-primary font-medium px-1.5 py-0.5 bg-[var(--color-surface-soft)] rounded">
                    by {{ rec.supplement.partnerName }}
                  </span>
                </div>
              </div>
              
              <div class="p-3 bg-[var(--color-surface-soft)] rounded-lg border-l-2 border-primary/30">
                <span class="text-xs font-bold text-primary block mb-1">📋 建議原因</span>
                <p class="text-sm text-[var(--color-text)] leading-relaxed m-0">
                  {{ rec.reason }}
                </p>
              </div>

              <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                {{ rec.supplement.description }}
              </p>

              <!-- 屬性網格 -->
              <div class="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 text-sm bg-[var(--color-surface-soft)] p-3 rounded-lg">
                <div class="flex flex-col gap-1">
                  <span class="text-xs text-[var(--color-text-secondary)]">針對維度</span>
                  <div class="flex flex-wrap gap-1">
                    <span 
                      v-for="dim in rec.supplement.relatedDimensions" 
                      :key="dim"
                      class="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-[var(--color-border)]"
                    >
                      {{ dimensionNames[dim] }}
                    </span>
                  </div>
                </div>
                
                <div class="flex flex-col gap-1">
                  <span class="text-xs text-[var(--color-text-secondary)]">建議劑量</span>
                  <span class="font-medium text-xs">{{ rec.supplement.dosageRange }}</span>
                </div>
              </div>

              <!-- 摺疊資訊 -->
              <div class="space-y-2 pt-1">
                <details v-if="rec.supplement.precautions.length > 0" class="group">
                  <summary class="text-xs font-bold text-[var(--color-warning)] cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                    <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
                    <span>⚠️ 注意事項</span>
                  </summary>
                  <ul class="mt-1 pl-8 pr-2 text-xs text-[var(--color-text-secondary)] list-disc space-y-1 pb-2">
                    <li v-for="(warning, idx) in rec.supplement.precautions" :key="idx">
                      {{ warning }}
                    </li>
                  </ul>
                </details>

                <details v-if="rec.supplement.interactions.length > 0" class="group">
                  <summary class="text-xs font-bold text-[var(--color-info)] cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                    <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
                    <span>💊 可能交互作用</span>
                  </summary>
                  <ul class="mt-1 pl-8 pr-2 text-xs text-[var(--color-text-secondary)] list-disc space-y-1 pb-2">
                    <li v-for="(interaction, idx) in rec.supplement.interactions" :key="idx">
                      {{ interaction }}
                    </li>
                  </ul>
                </details>
              </div>

              <!-- 合作廠商操作 -->
              <div v-if="rec.supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
                <button 
                  v-if="rec.supplement.partnerUrl"
                  class="btn btn-sm btn-secondary min-h-[44px]"
                  @click="openPartnerUrl(rec.supplement.partnerUrl)"
                >
                  🔗 了解更多
                </button>
                <button 
                  class="btn btn-sm btn-primary min-h-[44px]"
                  :class="{ 'col-span-2': !rec.supplement.partnerUrl }"
                  :disabled="!rec.supplement.shopUrl"
                  @click="openShopUrl(rec.supplement.shopUrl || '')"
                >
                  🛒 {{ rec.supplement.shopUrl ? '立即購買' : '即將上線' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 所有營養品列表 -->
      <div v-if="showAllSupplements" class="section-stack">
        <div 
          v-for="supplement in filteredSupplements"
          :key="supplement.type"
          class="card p-4 relative"
          :class="{ 'ring-2 ring-primary ring-offset-2': supplement.isPartnerProduct }"
        >
          <div v-if="supplement.isPartnerProduct" class="absolute top-0 right-0 bg-primary text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">
            合作推薦
          </div>
          
          <div class="flex gap-3 items-start">
            <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
              {{ getTypeIcon(supplement.type) }}
            </span>
            <div class="flex-1 min-w-0 space-y-2">
              <div class="pr-12">
                <h3 class="text-lg font-bold truncate leading-tight">{{ supplement.name }}</h3>
                <div class="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                  {{ supplement.nameEn }}
                  <span v-if="supplement.partnerName" class="text-primary font-bold">
                    by {{ supplement.partnerName }}
                  </span>
                </div>
              </div>

              <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {{ supplement.description }}
              </p>

              <!-- 簡化屬性顯示 -->
              <div class="flex flex-wrap gap-1.5">
                 <span 
                  v-for="dim in supplement.relatedDimensions"
                  :key="dim"
                  class="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                >
                  {{ dimensionNames[dim] }}
                </span>
              </div>

              <div class="text-xs bg-[var(--color-surface-soft)] p-2 rounded">
                <span class="text-[var(--color-text-secondary)] font-bold mr-1">主要功效:</span>
                <span class="text-[var(--color-text)]">{{ supplement.benefits.join('、') }}</span>
              </div>

              <!-- 摺疊資訊 -->
              <div class="space-y-1">
                <details v-if="supplement.precautions.length > 0 || supplement.interactions.length > 0" class="group">
                  <summary class="text-xs font-bold text-[var(--color-text-secondary)] cursor-pointer list-none flex items-center gap-2 p-2 rounded hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                    <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
                    <span>注意事項與交互作用</span>
                  </summary>
                  <div class="mt-2 pl-3 border-l-2 border-[var(--color-warning)] text-xs space-y-3 pb-2">
                     <div v-if="supplement.precautions.length">
                       <div class="font-bold text-[var(--color-warning)] mb-1">注意事項</div>
                       <ul class="list-disc pl-4 text-[var(--color-text-secondary)] space-y-1">
                         <li v-for="(w, i) in supplement.precautions" :key="i">{{ w }}</li>
                       </ul>
                     </div>
                     <div v-if="supplement.interactions.length">
                       <div class="font-bold text-[var(--color-text)] mb-1">交互作用</div>
                       <ul class="list-disc pl-4 text-[var(--color-text-secondary)] space-y-1">
                         <li v-for="(w, i) in supplement.interactions" :key="i">{{ w }}</li>
                       </ul>
                     </div>
                  </div>
                </details>
              </div>

              <!-- 購買按鈕 -->
              <div v-if="supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
                <button 
                  v-if="supplement.partnerUrl"
                  class="btn btn-sm btn-secondary min-h-[44px]"
                  @click="openPartnerUrl(supplement.partnerUrl)"
                >
                  詳情
                </button>
                <button 
                  class="btn btn-sm btn-primary min-h-[44px]"
                  :class="{ 'col-span-2': !supplement.partnerUrl }"
                  :disabled="!supplement.shopUrl"
                  @click="openShopUrl(supplement.shopUrl || '')"
                >
                  購買
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提醒 -->
      <div class="text-center text-xs text-[var(--color-text-secondary)] mt-8 pb-8 px-8 opacity-75">
        <p>💡 營養補充應配合均衡飲食，不應取代正常飲食。</p>
        <p class="mt-1">🏥 如有任何健康疑慮，請諮詢專業醫療人員。</p>
      </div>
    </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.pb-safe-offset {
  padding-bottom: calc(env(safe-area-inset-bottom) + 5rem);
}

.mask-fade-sides {
  mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
}
</style>

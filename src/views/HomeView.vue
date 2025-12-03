<template>
  <div class="app-page">
    <!-- 首次使用歡迎彈窗 -->
    <WelcomeModal 
      v-if="showWelcome" 
      @close="handleWelcomeClose"
      @enable-sound="handleEnableSound"
    />

    <!-- APP 頭部 -->
    <header class="app-header">
      <div class="app-header-action">
        <router-link to="/settings" class="text-2xl">⚙️</router-link>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl">🧠</span>
        <h1 class="text-lg font-bold text-[var(--color-text)]">健腦訓練</h1>
      </div>
      <div class="app-header-action text-right">
        <button v-if="userStore.isLoggedIn" @click="handleLogout" class="text-sm text-[var(--color-text-muted)]">
          切換
        </button>
      </div>
    </header>

    <!-- 可滾動內容區 -->
    <div class="app-content-scroll">
      <div class="container mx-auto px-4 py-6">

      <!-- 使用者狀態（精簡版） -->
      <div v-if="userStore.isLoggedIn" class="flex items-center gap-3 mb-6 p-3 bg-[var(--color-surface)] rounded-xl">
        <div class="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl">
          👤
        </div>
        <div class="flex-1">
          <p class="font-semibold text-[var(--color-text)]">{{ userStore.currentUser?.name }}</p>
          <p class="text-sm text-[var(--color-text-muted)]">{{ userStore.userAge }} 歲</p>
        </div>
      </div>

      <!-- 評估引導卡片（未完成評估時顯示） -->
      <div v-if="userStore.isLoggedIn && !settingsStore.hasCompletedAssessment" class="mb-6">
        <div class="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 rounded-2xl p-4 text-white shadow-lg">
          <div class="flex items-center gap-3 mb-3">
            <span class="text-3xl">🧪</span>
            <div>
              <h2 class="font-bold">認知評估</h2>
              <p class="text-orange-100 text-sm">完成評估後即可開始訓練</p>
            </div>
          </div>
          
          <router-link 
            to="/assessment" 
            class="block w-full py-2.5 bg-white text-orange-600 rounded-xl font-semibold text-center
                   hover:bg-orange-50 transition-colors shadow-md text-sm"
          >
            開始評估（約 5 分鐘）
          </router-link>
        </div>
      </div>

      <!-- 每日訓練卡片（精簡版） -->
      <div v-if="userStore.isLoggedIn" class="mb-6">
        <div class="bg-gradient-to-r from-[var(--color-primary)] to-purple-500 dark:from-indigo-600 dark:to-purple-600 rounded-2xl p-4 text-white shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="font-bold">今日訓練</h2>
              <p class="text-blue-100 text-sm">{{ settingsStore.dailyTrainingDuration }} 分鐘挑戰</p>
            </div>
            <span class="text-3xl">{{ dailyProgress.completed ? '✅' : '🎯' }}</span>
          </div>
          
          <!-- 進度條 -->
          <div class="mb-3">
            <div class="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                class="h-full bg-white rounded-full transition-all duration-500"
                :style="{ width: dailyProgress.percentage + '%' }"
              ></div>
            </div>
            <p class="text-right text-xs text-blue-100 mt-1">
              {{ dailyProgress.completed ? '已完成！' : `${dailyProgress.percentage}%` }}
            </p>
          </div>
          
          <router-link 
            to="/daily-challenge" 
            class="block w-full py-2.5 bg-white text-blue-600 rounded-xl font-semibold text-center
                   hover:bg-blue-50 transition-colors shadow-md text-sm"
          >
            {{ dailyProgress.completed ? '再次挑戰' : '開始訓練' }}
          </router-link>
        </div>
      </div>

      <!-- 認知趨勢概覽（精簡版） -->
      <div v-if="userStore.isLoggedIn && settingsStore.hasCompletedAssessment" class="mb-6">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-[var(--color-text)]">📊 認知趨勢</h3>
            <router-link v-if="hasSufficientData" to="/report" class="text-sm text-[var(--color-primary)]">
              詳情 →
            </router-link>
          </div>
          
          <!-- 未達到 5 場遊戲時的解鎖進度 -->
          <div v-if="!hasSufficientData" class="p-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">🔒</span>
              <span class="text-sm text-[var(--color-text)]">完成 {{ unlockProgress.remaining }} 場遊戲後解鎖</span>
            </div>
            <div class="h-2 bg-[var(--color-primary)]/10 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-[var(--color-primary)] to-purple-500 rounded-full transition-all duration-500"
                :style="{ width: unlockProgress.percentage + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- 有足夠數據時顯示趨勢 -->
          <template v-else-if="cognitiveTrend">
            <!-- 退化警告 -->
            <div v-if="hasDeclineWarning" class="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span class="text-sm text-yellow-700 dark:text-yellow-300">⚠️ 偵測到表現變化，建議持續練習</span>
            </div>
            
            <!-- 維度摘要 -->
            <div class="grid grid-cols-3 gap-2">
              <div 
                v-for="dim in topDimensions" 
                :key="dim.dimension"
                class="text-center p-2 bg-[var(--color-surface-alt)] rounded-lg"
              >
                <span class="text-xl">{{ dim.icon }}</span>
                <p class="text-sm font-bold" :class="dim.trendClass">{{ dim.score }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ dim.name }}</p>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 主要按鈕區（更緊湊） -->
      <div class="space-y-3 mb-6">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/games" class="btn btn-primary btn-lg w-full shadow-lg">
            <span class="text-xl mr-2">🎮</span>
            開始訓練
          </router-link>
          
          <div class="grid grid-cols-2 gap-3">
            <router-link to="/report" class="btn btn-secondary w-full py-3">
              <span class="text-lg mr-1">📊</span>
              報告
            </router-link>
            
            <router-link to="/nutrition" class="btn btn-secondary w-full py-3">
              <span class="text-lg mr-1">🥗</span>
              營養
            </router-link>
          </div>
        </template>
        
        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-lg w-full shadow-lg">
            <span class="text-xl mr-2">👋</span>
            開始使用
          </router-link>
        </template>
      </div>

      <!-- 統計摘要（精簡版） -->
      <div v-if="userStore.isLoggedIn && userStore.currentStats" class="mb-6">
        <h2 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">訓練統計</h2>
        <div class="grid grid-cols-4 gap-2">
          <div class="text-center p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-xl font-bold text-blue-500">
              {{ userStore.currentStats.totalGamesPlayed }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">次數</div>
          </div>
          <div class="text-center p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-xl font-bold text-green-500">
              {{ userStore.currentStats.averageScore }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">平均</div>
          </div>
          <div class="text-center p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-xl font-bold text-purple-500">
              {{ formatPlayTime(userStore.currentStats.totalPlayTime) }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">時長</div>
          </div>
          <div class="text-center p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-xl font-bold text-orange-500">
              {{ userStore.currentStats.streak }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">連續</div>
          </div>
        </div>
      </div>

      <!-- 認知維度說明（可水平滾動） -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">六大認知能力</h2>
        <div class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div 
            v-for="dim in cognitiveDimensions" 
            :key="dim.id" 
            class="flex-shrink-0 w-28 text-center p-3 bg-[var(--color-surface)] rounded-xl"
          >
            <div class="text-2xl mb-1">{{ dim.icon }}</div>
            <h3 class="font-semibold text-sm" :style="{ color: dim.color }">
              {{ dim.name }}
            </h3>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- 版本資訊 -->
    <footer class="flex-shrink-0 py-2 text-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
      健腦訓練 Brain Training © 2024
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, type CognitiveDimensionInfo, type CognitiveDimension } from '@/types/cognitive'
import WelcomeModal from '@/components/ui/WelcomeModal.vue'
import { getOverallDeclineSummary } from '@/services/declineDetectionService'
import { getTodayTrainingStatus } from '@/services/dailyTrainingService'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 是否顯示歡迎彈窗
const showWelcome = computed(() => !settingsStore.hasSeenWelcome)

// 每日訓練進度
const dailyProgress = ref({ percentage: 0, completed: false })

// 認知趨勢資料
const cognitiveTrend = ref<{
  dimensions: Record<CognitiveDimension, { score: number; trend: number }>
  hasDecline: boolean
} | null>(null)

// 是否有退化警告
const hasDeclineWarning = computed(() => cognitiveTrend.value?.hasDecline || false)

// 遊戲次數
const gamesPlayedCount = computed(() => userStore.currentStats?.totalGamesPlayed || 0)

// 是否有足夠數據（5場遊戲）
const hasSufficientData = computed(() => gamesPlayedCount.value >= 5)

// 解鎖進度
const unlockProgress = computed(() => {
  const current = Math.min(gamesPlayedCount.value, 5)
  return {
    current,
    percentage: (current / 5) * 100,
    remaining: Math.max(0, 5 - current)
  }
})

// 維度圖示對照
const dimensionMeta: Record<CognitiveDimension, { icon: string; name: string }> = {
  reaction: { icon: '⚡', name: '反應力' },
  logic: { icon: '🧩', name: '邏輯力' },
  memory: { icon: '🧠', name: '記憶力' },
  cognition: { icon: '💡', name: '認知力' },
  coordination: { icon: '🎯', name: '協調力' },
  attention: { icon: '👁️', name: '注意力' }
}

// 前三個維度顯示
const topDimensions = computed(() => {
  if (!cognitiveTrend.value) return []
  
  const dims = Object.entries(cognitiveTrend.value.dimensions) as [CognitiveDimension, { score: number; trend: number }][]
  
  return dims
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([dimension, data]) => ({
      dimension,
      icon: dimensionMeta[dimension].icon,
      name: dimensionMeta[dimension].name,
      score: Math.round(data.score),
      trend: Math.round(data.trend),
      trendClass: data.trend > 0 ? 'trend-up' : data.trend < 0 ? 'trend-down' : 'trend-neutral'
    }))
})

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  return `${Math.floor(seconds / 3600)}時`
}

// 處理歡迎彈窗關閉
function handleWelcomeClose(): void {
  settingsStore.markWelcomeSeen()
}

// 處理開啟音效
function handleEnableSound(): void {
  settingsStore.toggleSound(true)
  settingsStore.markWelcomeSeen()
}

// 處理登出
function handleLogout(): void {
  userStore.logout()
  localStorage.removeItem('brain-training-current-user')
  router.push('/login')
}

// 載入認知趨勢
async function loadCognitiveTrend(): Promise<void> {
  try {
    const summary = await getOverallDeclineSummary()
    
    const dimensions: Record<CognitiveDimension, { score: number; trend: number }> = {
      reaction: { score: 0, trend: 0 },
      logic: { score: 0, trend: 0 },
      memory: { score: 0, trend: 0 },
      cognition: { score: 0, trend: 0 },
      coordination: { score: 0, trend: 0 },
      attention: { score: 0, trend: 0 }
    }
    
    let hasDecline = false
    
    summary.dimensions.forEach(dim => {
      dimensions[dim.dimension] = {
        score: dim.currentAverage,
        trend: -dim.declinePercentage // 負數表示下降
      }
      if (dim.isDeclined) {
        hasDecline = true
      }
    })
    
    cognitiveTrend.value = { dimensions, hasDecline }
  } catch (error) {
    console.error('載入認知趨勢失敗:', error)
  }
}

// 載入每日訓練狀態
async function loadDailyProgress(): Promise<void> {
  try {
    const status = await getTodayTrainingStatus()
    dailyProgress.value = {
      percentage: status.progress,
      completed: status.completed
    }
  } catch (error) {
    console.error('載入每日進度失敗:', error)
  }
}

// 初始化
onMounted(async () => {
  // 嘗試恢復登入狀態
  const savedUserId = localStorage.getItem('brain-training-current-user')
  if (savedUserId && !userStore.isLoggedIn) {
    await userStore.quickLogin(savedUserId)
  }
  
  // 載入額外資料
  if (userStore.isLoggedIn) {
    await Promise.all([
      loadCognitiveTrend(),
      loadDailyProgress()
    ])
  }
})
</script>

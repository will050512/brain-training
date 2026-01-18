<script setup lang="ts">
/**
 * 新手引導與初始評估
 * 首次使用時進行基線能力評估
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { CognitiveDimension } from '@/types/cognitive'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 步驟
type Step = 'welcome' | 'profile' | 'settings' | 'assessment-choice' | 'assessment' | 'complete'

const currentStep = ref<Step>('welcome')
const isLoading = ref(false)

// 使用者資料
const userName = ref('')
const userAge = ref<number | null>(null)
const userGender = ref<'male' | 'female' | 'other'>('other')
const userEducationYears = ref<number>(12) // 新增：教育年數

// 評估選擇
const assessmentChoice = ref<'mini-cog' | 'quick' | 'trial'>('mini-cog')

// 設定選項
const selectedDuration = ref<10 | 15 | 20 | 30>(15)
const selectedMode = ref<'general' | 'professional'>('general')
const enableBehaviorTracking = ref(true)

// 評估遊戲結果
interface MiniGameResult {
  dimension: CognitiveDimension
  score: number
  accuracy: number
  responseTime: number
}

const assessmentResults = ref<MiniGameResult[]>([])
const currentAssessmentGame = ref(0)

// 迷你評估遊戲列表
const assessmentGames = [
  { 
    id: 'memory',
    dimension: 'memory' as CognitiveDimension,
    name: '記憶測試',
    icon: '🧠',
    description: '記住閃現的圖案順序'
  },
  {
    id: 'reaction',
    dimension: 'reaction' as CognitiveDimension,
    name: '反應測試',
    icon: '⚡',
    description: '點擊出現的目標'
  },
  {
    id: 'attention',
    dimension: 'attention' as CognitiveDimension,
    name: '注意力測試',
    icon: '👁️',
    description: '找出不同的圖案'
  }
]

// 當前評估遊戲（安全訪問）
const currentGame = computed(() => {
  return assessmentGames[currentAssessmentGame.value] || null
})

// 步驟標題
const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'welcome': return '歡迎使用愛護腦'
    case 'profile': return '建立您的資料'
    case 'settings': return '設定訓練偏好'
    case 'assessment-choice': return '選擇評估方式'
    case 'assessment': return '初始能力評估'
    case 'complete': return '設定完成！'
    default: return ''
  }
})

// 進度
const progress = computed(() => {
  const steps: Step[] = ['welcome', 'profile', 'settings', 'assessment-choice', 'assessment', 'complete']
  const index = steps.indexOf(currentStep.value)
  return ((index + 1) / steps.length) * 100
})

// 下一步
function nextStep(): void {
  switch (currentStep.value) {
    case 'welcome':
      currentStep.value = 'profile'
      break
    case 'profile':
      currentStep.value = 'settings'
      break
    case 'settings':
      currentStep.value = 'assessment-choice'
      break
    case 'assessment-choice':
      handleAssessmentChoice()
      break
    case 'assessment':
      if (currentAssessmentGame.value >= assessmentGames.length) {
        finishAssessment()
      }
      break
  }
}

// 處理評估選擇
async function handleAssessmentChoice(): Promise<void> {
  // 先儲存設定，因為評估後可能不會回到此頁面
  try {
    settingsStore.setDailyTrainingDuration(selectedDuration.value)
    settingsStore.setDeclineDetectionMode(selectedMode.value)
    settingsStore.toggleBehaviorTracking(enableBehaviorTracking.value)
  } catch (error) {
    console.error('儲存設定失敗:', error)
  }

  switch (assessmentChoice.value) {
    case 'mini-cog':
      // 導向 Mini-Cog（可做基線）
      router.push({ path: '/assessment', query: { mode: 'mini-cog' } })
      break
    case 'quick':
      // 導向 3 分鐘快評（可做基線）
      router.push({ path: '/assessment', query: { mode: 'quick' } })
      break
    case 'trial':
      finishAssessment()
      break
  }
}

// 跳過評估
function skipAssessment(): void {
  finishAssessment()
}

// 模擬迷你評估遊戲完成
function completeAssessmentGame(result: MiniGameResult): void {
  assessmentResults.value.push(result)
  currentAssessmentGame.value++
  
  if (currentAssessmentGame.value >= assessmentGames.length) {
    nextStep()
  }
}

// 模擬快速評估（點擊後自動生成結果）
function runQuickAssessment(): void {
  // 為每個維度生成模擬分數
  for (const game of assessmentGames) {
    const score = Math.round(50 + Math.random() * 50)
    assessmentResults.value.push({
      dimension: game.dimension,
      score,
      accuracy: Math.round(50 + Math.random() * 50),
      responseTime: Math.round(500 + Math.random() * 1000)
    })
  }
  currentAssessmentGame.value = assessmentGames.length
  finishAssessment()
}

// 完成評估
async function finishAssessment(): Promise<void> {
  isLoading.value = true
  
  try {
    // 儲存設定（使用 store 的正確方法）
    settingsStore.setDailyTrainingDuration(selectedDuration.value)
    settingsStore.setDeclineDetectionMode(selectedMode.value)
    settingsStore.toggleBehaviorTracking(enableBehaviorTracking.value)
    
    // 注意：本頁的「試玩」不應寫入任何評估基線。
    // Mini-Cog / 3 分鐘快評會在 /assessment 內完成並寫入結果。
    
    currentStep.value = 'complete'
  } catch (error) {
    console.error('儲存引導資料失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 開始訓練
function startTraining(): void {
  router.push('/home')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
    <div class="max-w-md mx-auto section-stack">
      <!-- 進度條 -->
      <div class="mb-8">
        <div class="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            :style="{ width: progress + '%' }"
          ></div>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-2 text-center">{{ stepTitle }}</p>
      </div>

      <!-- 歡迎頁 -->
      <div v-if="currentStep === 'welcome'" class="text-center py-12">
        <img src="/logo.png" alt="愛護腦" class="w-24 h-24 mx-auto mb-6 drop-shadow-lg" />
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-4">歡迎使用愛護腦</h1>
        <p class="text-gray-600 dark:text-slate-300 mb-8 leading-relaxed">
          透過有趣的遊戲訓練您的認知能力<br>
          包含記憶力、反應力、注意力等多種維度
        </p>
        
        <div class="space-y-3 mb-8 text-left bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎮</span>
            <span class="text-gray-700 dark:text-slate-200">15+ 種趣味訓練遊戲</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-2xl">📊</span>
            <span class="text-gray-700 dark:text-slate-200">詳細的表現報告與趨勢</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎯</span>
            <span class="text-gray-700 dark:text-slate-200">個人化每日訓練計畫</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-2xl">🔔</span>
            <span class="text-gray-700 dark:text-slate-200">智慧提醒與進度追蹤</span>
          </div>
        </div>
        
        <button
          @click="nextStep"
          class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl
                 font-semibold text-lg hover:opacity-90 active:scale-98 transition-all"
        >
          開始設定
        </button>
      </div>

      <!-- 資料設定 -->
      <div v-if="currentStep === 'profile'" class="py-8">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700 mb-6">
          <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">👤 基本資料（可選）</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">暱稱</label>
              <input
                v-model="userName"
                type="text"
                placeholder="請輸入您的暱稱"
                class="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">年齡</label>
              <input
                v-model="userAge"
                type="number"
                placeholder="請輸入年齡"
                min="1"
                max="120"
                class="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">性別</label>
              <div class="flex gap-3">
                <button
                  v-for="gender in [{ value: 'male', label: '👨 男' }, { value: 'female', label: '👩 女' }, { value: 'other', label: '🙂 其他' }]"
                  :key="gender.value"
                  @click="userGender = gender.value as typeof userGender"
                  class="flex-1 py-3 rounded-lg border-2 transition-all"
                  :class="userGender === gender.value 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-slate-300'"
                >
                  {{ gender.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <button
          @click="nextStep"
          class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl
                 font-semibold text-lg hover:opacity-90 active:scale-98 transition-all"
        >
          下一步
        </button>
      </div>

      <!-- 訓練設定 -->
      <div v-if="currentStep === 'settings'" class="py-8">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700 mb-6">
          <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">⚙️ 訓練設定</h2>
          
          <div class="space-y-6">
            <!-- 每日訓練時間 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">每日訓練時間</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="duration in [10, 15, 20, 30]"
                  :key="duration"
                  @click="selectedDuration = duration as typeof selectedDuration"
                  class="py-3 rounded-lg border-2 transition-all text-center"
                  :class="selectedDuration === duration 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-slate-300'"
                >
                  {{ duration }}分鐘
                </button>
              </div>
            </div>
            
            <!-- 追蹤模式 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">追蹤模式</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="selectedMode = 'general'"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="selectedMode === 'general' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'"
                >
                  <p class="font-semibold" :class="selectedMode === 'general' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'">🌱 一般模式</p>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">30天趨勢，15%閾值</p>
                </button>
                <button
                  @click="selectedMode = 'professional'"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="selectedMode === 'professional' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'"
                >
                  <p class="font-semibold" :class="selectedMode === 'professional' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'">⚕️ 專業模式</p>
                  <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">7天趨勢，7%閾值</p>
                </button>
              </div>
            </div>
            
            <!-- 行為追蹤 -->
            <div class="flex items-center justify-between py-3 border-t border-gray-200 dark:border-slate-700">
              <div>
                <p class="font-medium text-gray-800 dark:text-white">行為偵測</p>
                <p class="text-xs text-gray-500 dark:text-slate-400">追蹤點擊模式與反應時間</p>
              </div>
              <button
                @click="enableBehaviorTracking = !enableBehaviorTracking"
                class="w-12 h-7 rounded-full transition-colors"
                :class="enableBehaviorTracking ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'"
              >
                <div 
                  class="w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transform transition-transform"
                  :class="enableBehaviorTracking ? 'translate-x-6' : 'translate-x-1'"
                ></div>
              </button>
            </div>
          </div>
        </div>
        
        <button
          @click="nextStep"
          class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl
                 font-semibold text-lg hover:opacity-90 active:scale-98 transition-all"
        >
          下一步
        </button>
      </div>

      <!-- 評估選擇 -->
      <div v-if="currentStep === 'assessment-choice'" class="py-8">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700 mb-6">
          <h2 class="text-lg font-semibold mb-2 text-gray-800 dark:text-white">🧪 選擇評估方式</h2>
          <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
            評估結果將幫助系統為您推薦合適的訓練難度
          </p>
          
          <!-- 推薦：Mini-Cog -->
          <button
            @click="assessmentChoice = 'mini-cog'"
            class="w-full p-4 rounded-xl border-2 text-left transition-all mb-3 relative overflow-hidden"
            :class="assessmentChoice === 'mini-cog' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-opacity-50' 
              : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'"
          >
            <div v-if="assessmentChoice === 'mini-cog'" class="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg">
              已選擇
            </div>
            <div class="flex items-start gap-3">
              <span class="text-3xl">🧠</span>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-bold text-lg text-gray-800 dark:text-white">Mini-Cog 認知篩檢</p>
                  <span class="badge badge--success">強烈推薦</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  國際標準認知篩檢工具，包含詞語回憶與時鐘繪圖測試，約 3-5 分鐘。
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">✓ 精準難度匹配</span>
                  <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">✓ 長期追蹤</span>
                  <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">✓ 專業報告</span>
                </div>
              </div>
            </div>
          </button>
          
          <!-- 快速評估 -->
          <button
            @click="assessmentChoice = 'quick'"
            class="w-full p-4 rounded-xl border-2 text-left transition-all mb-3"
            :class="assessmentChoice === 'quick' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚡</span>
              <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-white">3 分鐘快評（可做基線）</p>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  透過題組快速評估反應/記憶/邏輯，約 3 分鐘
                </p>
                <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ✓ 可用於難度匹配 ✓ 適合想快速開始的人
                </p>
              </div>
            </div>
          </button>
          
          <!-- 試玩 -->
          <button
            @click="assessmentChoice = 'trial'"
            class="w-full p-4 rounded-xl border-2 text-left transition-all"
            :class="assessmentChoice === 'trial' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">⏭️</span>
              <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-white">試玩（不計入評估）</p>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  先體驗訓練內容，不寫入評估基線，也不影響難度匹配
                </p>
              </div>
            </div>
          </button>
        </div>
        
        <button
          @click="nextStep"
          class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl
                 font-semibold text-lg hover:opacity-90 active:scale-98 transition-all"
        >
          {{ assessmentChoice === 'mini-cog' ? '開始 Mini-Cog 評估' : assessmentChoice === 'quick' ? '開始 3 分鐘快評' : '開始試玩' }}
        </button>
      </div>

      <!-- 初始評估 -->
      <div v-if="currentStep === 'assessment'" class="py-8">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700 mb-6 text-center">
          <h2 class="text-lg font-semibold mb-2 text-gray-800 dark:text-white">🎯 初始能力評估</h2>
          <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
            進行簡短測試以建立您的基線能力
          </p>
          
          <!-- 評估進度 -->
          <div class="flex justify-center gap-2 mb-6">
            <div 
              v-for="(game, index) in assessmentGames"
              :key="game.id"
              class="w-3 h-3 rounded-full transition-colors"
              :class="index < currentAssessmentGame ? 'bg-green-500' : 
                      index === currentAssessmentGame ? 'bg-blue-500 animate-pulse' : 'bg-gray-200 dark:bg-slate-600'"
            ></div>
          </div>
          
          <!-- 當前測試 -->
          <div v-if="currentGame" class="py-8">
            <div class="text-6xl mb-4">
              {{ currentGame.icon }}
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              {{ currentGame.name }}
            </h3>
            <p class="text-gray-500 dark:text-slate-400 mb-6">
              {{ currentGame.description }}
            </p>
            
            <!-- 模擬完成按鈕（實際實作時替換為迷你遊戲） -->
            <button
              @click="completeAssessmentGame({
                dimension: currentGame.dimension,
                score: Math.round(50 + Math.random() * 50),
                accuracy: Math.round(50 + Math.random() * 50),
                responseTime: Math.round(500 + Math.random() * 1000)
              })"
              class="px-8 py-3 bg-blue-500 text-white rounded-xl font-semibold
                     hover:bg-blue-600 active:scale-95 transition-all"
            >
              開始測試
            </button>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="skipAssessment"
            class="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-semibold
                   hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
          >
            跳過評估
          </button>
          <button
            @click="runQuickAssessment"
            class="flex-1 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl font-semibold
                   hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
          >
            快速完成
          </button>
        </div>
      </div>

      <!-- 完成 -->
      <div v-if="currentStep === 'complete'" class="py-12 text-center">
        <div class="text-8xl mb-6">🎉</div>
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-4">設定完成！</h1>
        <p class="text-gray-600 dark:text-slate-300 mb-8">
          您的腦力訓練之旅即將開始<br>
          祝您訓練愉快！
        </p>
        
        <!-- 評估結果摘要 -->
        <div v-if="assessmentResults.length > 0" class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-transparent dark:border-slate-700 mb-8 text-left">
          <h3 class="font-semibold mb-4 text-gray-800 dark:text-white">📊 您的初始評估</h3>
          <div class="grid grid-cols-3 gap-4">
            <div v-for="result in assessmentResults" :key="result.dimension" class="text-center">
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ result.score }}</p>
              <p class="text-xs text-gray-500 dark:text-slate-400 capitalize">{{ result.dimension }}</p>
            </div>
          </div>
        </div>
        
        <button
          @click="startTraining"
          :disabled="isLoading"
          class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl
                 font-semibold text-lg hover:opacity-90 active:scale-98 transition-all
                 disabled:opacity-50"
        >
          {{ isLoading ? '載入中...' : '開始訓練' }}
        </button>
      </div>
    </div>
  </div>
</template>

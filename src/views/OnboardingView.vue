<script setup lang="ts">
/**
 * 新手引導與初始評估
 * 首次使用時進行基線能力評估
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { saveBaselineAssessment, generateId } from '@/services/db'
import type { CognitiveDimension } from '@/types/cognitive'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 步驟
type Step = 'welcome' | 'profile' | 'settings' | 'assessment' | 'complete'

const currentStep = ref<Step>('welcome')
const isLoading = ref(false)

// 使用者資料
const userName = ref('')
const userAge = ref<number | null>(null)
const userGender = ref<'male' | 'female' | 'other'>('other')

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
    case 'assessment': return '初始能力評估'
    case 'complete': return '設定完成！'
    default: return ''
  }
})

// 進度
const progress = computed(() => {
  const steps: Step[] = ['welcome', 'profile', 'settings', 'assessment', 'complete']
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
      currentStep.value = 'assessment'
      break
    case 'assessment':
      if (currentAssessmentGame.value >= assessmentGames.length) {
        finishAssessment()
      }
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
    
    // 儲存基線評估
    if (assessmentResults.value.length > 0 && userStore.currentUser?.id) {
      const cognitiveScores: Record<CognitiveDimension, number> = {
        memory: 0,
        reaction: 0,
        logic: 0,
        cognition: 0,
        coordination: 0,
        attention: 0
      }
      
      assessmentResults.value.forEach(result => {
        cognitiveScores[result.dimension] = result.score
      })
      
      // 計算整體等級
      const avgScore = Object.values(cognitiveScores).reduce((a, b) => a + b, 0) / 6
      const overallLevel = avgScore >= 70 ? 'advanced' : avgScore >= 40 ? 'intermediate' : 'beginner'
      
      await saveBaselineAssessment({
        id: generateId(),
        odId: userStore.currentUser.id,
        assessedAt: new Date().toISOString(),
        cognitiveScores,
        suggestedDifficulties: {
          default: avgScore >= 70 ? 'hard' : avgScore >= 40 ? 'medium' : 'easy'
        },
        overallLevel,
        gamesPlayed: assessmentResults.value.map(result => ({
          gameId: result.dimension,
          score: result.score,
          difficulty: 'easy'
        }))
      })
    }
    
    // 標記已完成評估
    settingsStore.setAssessmentResult({
      suggestedDifficulty: 'easy',
      completedAt: new Date().toISOString(),
      scores: {
        reaction: assessmentResults.value.find(r => r.dimension === 'reaction')?.score || 0,
        memory: assessmentResults.value.find(r => r.dimension === 'memory')?.score || 0,
        logic: assessmentResults.value.find(r => r.dimension === 'attention')?.score || 0, // 使用 attention 作為 logic
      }
    })
    
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
    <div class="max-w-md mx-auto">
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
                  class="w-5 h-5 bg-white rounded-full shadow transform transition-transform"
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

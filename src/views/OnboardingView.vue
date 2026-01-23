<script setup lang="ts">
/**
 * 新手引導與初始評估
 * 首次使用時進行基線能力評估
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import type { CognitiveDimension } from '@/types/cognitive'

const router = useRouter()
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
const assessmentChoice = ref<'mini-cog' | 'quick'>('mini-cog')

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
  }
}

// 模擬迷你評估遊戲完成
function completeAssessmentGame(result: MiniGameResult): void {
  assessmentResults.value.push(result)
  currentAssessmentGame.value++
  
  if (currentAssessmentGame.value >= assessmentGames.length) {
    nextStep()
  }
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
  <div class="app-page page-ambient">
    <!-- Header: Progress & Title -->
    <header class="app-header flex-col items-stretch gap-2 !h-auto py-4 border-b-0 shadow-none bg-transparent">
      <div class="flex items-center justify-between px-1">
        <span class="text-sm font-semibold" style="color: var(--color-text-muted)">{{ stepTitle }}</span>
        <span class="text-xs font-bold" style="color: var(--color-primary)">{{ Math.round(progress) }}%</span>
      </div>
      <div class="h-1.5 w-full bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: progress + '%', backgroundColor: 'var(--color-primary)' }"
        ></div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-content app-content-scroll p-4">
      <div class="max-w-md mx-auto w-full flex flex-col gap-6">
        
        <!-- Welcome Step -->
        <div v-if="currentStep === 'welcome'" class="flex flex-col items-center text-center pt-2">
          <img src="/logo.png" alt="愛護腦" class="w-24 h-24 mb-6 drop-shadow-lg object-contain" />
          <h1 class="title-lg mb-3">歡迎使用愛護腦</h1>
          <p class="text-lg leading-relaxed mb-6" style="color: var(--color-text-secondary)">
            透過有趣的遊戲訓練您的認知能力<br>
            包含記憶、反應、注意力等多種維度
          </p>
          
          <div class="card w-full p-5 flex flex-col gap-4 text-left shadow-sm">
            <div class="flex items-center gap-4">
              <span class="text-2xl w-8 text-center">🎮</span>
              <span class="font-medium" style="color: var(--color-text)">15+ 種趣味訓練遊戲</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-2xl w-8 text-center">📊</span>
              <span class="font-medium" style="color: var(--color-text)">詳細的表現報告與趨勢</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-2xl w-8 text-center">🎯</span>
              <span class="font-medium" style="color: var(--color-text)">個人化每日訓練計畫</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-2xl w-8 text-center">🔔</span>
              <span class="font-medium" style="color: var(--color-text)">智慧提醒與進度追蹤</span>
            </div>
          </div>
        </div>

        <!-- Profile Step -->
        <div v-if="currentStep === 'profile'" class="card p-5 flex flex-col gap-5">
          <div>
            <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">暱稱</label>
            <input
              v-model="userName"
              type="text"
              placeholder="請輸入您的暱稱"
              class="input"
            />
          </div>
          
          <div>
            <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">年齡</label>
            <input
              v-model="userAge"
              type="number"
              placeholder="請輸入年齡"
              min="1"
              max="120"
              class="input"
            />
          </div>
          
          <div>
            <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">性別</label>
            <div class="flex gap-3">
              <button
                v-for="gender in [{ value: 'male', label: '👨 男' }, { value: 'female', label: '👩 女' }, { value: 'other', label: '🙂 其他' }]"
                :key="gender.value"
                @click="userGender = gender.value as typeof userGender"
                class="flex-1 py-3 rounded-lg border-2 transition-all font-medium touch-min"
                :class="userGender === gender.value 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'"
              >
                {{ gender.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Settings Step -->
        <div v-if="currentStep === 'settings'" class="card p-5 flex flex-col gap-6">
          <!-- Daily Duration -->
          <div>
            <label class="block text-sm font-semibold mb-3" style="color: var(--color-text-secondary)">每日訓練時間</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="duration in [10, 15, 20, 30]"
                :key="duration"
                @click="selectedDuration = duration as typeof selectedDuration"
                class="py-3 rounded-lg border-2 transition-all text-center font-medium touch-min"
                :class="selectedDuration === duration 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'"
              >
                {{ duration }}<span class="text-xs ml-0.5">分</span>
              </button>
            </div>
          </div>
          
          <!-- Mode -->
          <div>
            <label class="block text-sm font-semibold mb-3" style="color: var(--color-text-secondary)">追蹤模式</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                @click="selectedMode = 'general'"
                class="p-4 rounded-lg border-2 text-left transition-all touch-min"
                :class="selectedMode === 'general' 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                  : 'border-[var(--color-border)]'"
              >
                <p class="font-bold mb-1" :class="selectedMode === 'general' ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-text-secondary)]'">🌱 一般模式</p>
                <p class="text-xs opacity-80" style="color: var(--color-text-muted)">30天趨勢，15%閾值</p>
              </button>
              <button
                @click="selectedMode = 'professional'"
                class="p-4 rounded-lg border-2 text-left transition-all touch-min"
                :class="selectedMode === 'professional' 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                  : 'border-[var(--color-border)]'"
              >
                <p class="font-bold mb-1" :class="selectedMode === 'professional' ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-text-secondary)]'">⚕️ 專業模式</p>
                <p class="text-xs opacity-80" style="color: var(--color-text-muted)">7天趨勢，7%閾值</p>
              </button>
            </div>
          </div>
          
          <!-- Behavior Tracking -->
          <div class="flex items-center justify-between py-2 border-t" style="border-color: var(--color-border-light)">
            <div>
              <p class="font-bold" style="color: var(--color-text)">行為偵測</p>
              <p class="text-xs mt-1" style="color: var(--color-text-muted)">追蹤點擊模式與反應時間</p>
            </div>
            <button
              @click="enableBehaviorTracking = !enableBehaviorTracking"
              class="w-12 h-7 rounded-full transition-colors relative touch-min"
              :class="enableBehaviorTracking ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'"
              aria-label="Toggle behavior tracking"
            >
              <div 
                class="absolute top-1 left-1 w-5 h-5 bg-[var(--color-surface)] rounded-full shadow transition-transform"
                :class="enableBehaviorTracking ? 'translate-x-5' : 'translate-x-0'"
              ></div>
            </button>
          </div>
        </div>

        <!-- Assessment Choice Step -->
        <div v-if="currentStep === 'assessment-choice'" class="flex flex-col gap-4">
           <p class="text-sm text-center px-4" style="color: var(--color-text-muted)">
             評估結果將幫助系統為您推薦合適的訓練難度
           </p>
           
           <!-- Mini-Cog (Recommended) -->
           <button
             @click="assessmentChoice = 'mini-cog'"
             class="card p-4 text-left transition-all relative overflow-hidden group border-2 touch-min"
             :class="assessmentChoice === 'mini-cog' 
               ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
               : 'border-transparent hover:border-[var(--color-border)]'"
           >
             <div v-if="assessmentChoice === 'mini-cog'" class="absolute top-0 right-0 bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-xs px-2 py-1 rounded-bl-lg font-bold">
               已選擇
             </div>
             <div class="flex items-start gap-4">
               <span class="text-3xl mt-1">🧠</span>
               <div class="flex-1">
                 <div class="flex items-center gap-2 flex-wrap mb-1">
                   <p class="font-bold text-lg" style="color: var(--color-text)">Mini-Cog 認知篩檢</p>
                   <span class="badge badge--success">強烈推薦</span>
                 </div>
                 <p class="text-sm mb-3" style="color: var(--color-text-secondary)">
                   國際標準認知篩檢工具，包含詞語回憶與時鐘繪圖測試，約 3-5 分鐘。
                 </p>
                 <div class="flex flex-wrap gap-2">
                   <span class="badge badge--neutral bg-[var(--color-surface)]">✓ 精準難度匹配</span>
                   <span class="badge badge--neutral bg-[var(--color-surface)]">✓ 專業報告</span>
                 </div>
               </div>
             </div>
           </button>
           
           <!-- Quick Assessment -->
           <button
             @click="assessmentChoice = 'quick'"
             class="card p-4 text-left transition-all border-2 touch-min"
             :class="assessmentChoice === 'quick' 
               ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
               : 'border-transparent hover:border-[var(--color-border)]'"
           >
             <div class="flex items-start gap-4">
               <span class="text-2xl mt-1">⚡</span>
               <div class="flex-1">
                 <p class="font-bold text-lg mb-1" style="color: var(--color-text)">3 分鐘快評</p>
                 <p class="text-sm" style="color: var(--color-text-secondary)">
                   透過題組快速評估反應/記憶/邏輯，可作為基線。
                 </p>
               </div>
             </div>
           </button>
           
        </div>

        <!-- Assessment Execution Step -->
        <div v-if="currentStep === 'assessment'" class="card p-6 text-center flex flex-col items-center shadow-md">
          <p class="text-sm mb-6" style="color: var(--color-text-muted)">
            進行簡短測試以建立您的基線能力
          </p>
          
          <!-- Progress Dots -->
          <div class="flex justify-center gap-2 mb-8">
            <div 
              v-for="(game, index) in assessmentGames"
              :key="game.id"
              class="w-3 h-3 rounded-full transition-all duration-300"
              :class="index < currentAssessmentGame ? 'bg-[var(--color-success)] scale-100' : 
                      index === currentAssessmentGame ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-bg-muted)]'"
            ></div>
          </div>
          
          <div v-if="currentGame" class="py-4 w-full flex flex-col items-center">
            <div class="text-7xl mb-6 animate-bounce" style="animation-duration: 2s;">
              {{ currentGame.icon }}
            </div>
            <h3 class="title-lg mb-3">
              {{ currentGame.name }}
            </h3>
            <p class="mb-8 max-w-xs mx-auto" style="color: var(--color-text-secondary)">
              {{ currentGame.description }}
            </p>
            
            <button
              @click="completeAssessmentGame({
                dimension: currentGame.dimension,
                score: Math.round(50 + Math.random() * 50),
                accuracy: Math.round(50 + Math.random() * 50),
                responseTime: Math.round(500 + Math.random() * 1000)
              })"
              class="btn btn-primary btn-lg w-full max-w-xs shadow-lg hover-lift"
            >
              開始測試
            </button>
          </div>
        </div>

        <!-- Complete Step -->
        <div v-if="currentStep === 'complete'" class="text-center pt-8">
          <div class="text-8xl mb-6 animate-pulse">🎉</div>
          <h1 class="title-lg mb-4">設定完成！</h1>
          <p class="text-lg mb-8" style="color: var(--color-text-secondary)">
            您的腦力訓練之旅即將開始<br>
            祝您訓練愉快！
          </p>
          
          <div v-if="assessmentResults.length > 0" class="card p-5 mb-4 text-left">
            <h3 class="font-bold mb-4 flex items-center gap-2" style="color: var(--color-text)">
              <span>📊</span> 您的初始評估
            </h3>
            <div class="grid grid-cols-3 gap-4">
              <div v-for="result in assessmentResults" :key="result.dimension" class="text-center p-2 rounded-lg bg-[var(--color-bg-soft)]">
                <p class="text-2xl font-bold text-[var(--color-primary)]">{{ result.score }}</p>
                <p class="text-xs font-medium mt-1 capitalize opacity-70" style="color: var(--color-text)">{{ result.dimension }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Footer Actions -->
    <footer class="app-footer">
      <div class="max-w-md mx-auto w-full flex flex-col gap-3">
        
        <button 
          v-if="currentStep === 'welcome'"
          @click="nextStep"
          class="btn btn-primary btn-block btn-xl shadow-lg hover-lift"
        >
          開始設定
        </button>

        <button 
          v-if="currentStep === 'profile' || currentStep === 'settings'"
          @click="nextStep"
          class="btn btn-primary btn-block btn-lg shadow-md"
        >
          下一步
        </button>

        <button 
          v-if="currentStep === 'assessment-choice'"
          @click="nextStep"
          class="btn btn-primary btn-block btn-lg shadow-md"
        >
          {{ assessmentChoice === 'mini-cog' ? '開始 Mini-Cog 評估' : '開始 3 分鐘快評' }}
        </button>
        
        <button 
          v-if="currentStep === 'complete'"
          @click="startTraining"
          class="btn btn-primary btn-block btn-xl shadow-lg hover-lift"
          :disabled="isLoading"
        >
          {{ isLoading ? '載入中...' : '開始訓練' }}
        </button>
      </div>
    </footer>
  </div>
</template>

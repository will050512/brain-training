<script setup lang="ts">
/**
 * 新手引導與初始評估
 * 首次使用時進行基線能力評估
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { SectionStack } from '@/components/layout'
import type { CognitiveDimension } from '@/types/cognitive'
import OnboardingHeader from '@/components/onboarding/OnboardingHeader.vue'
import OnboardingWelcomeStep from '@/components/onboarding/OnboardingWelcomeStep.vue'
import OnboardingProfileStep from '@/components/onboarding/OnboardingProfileStep.vue'
import OnboardingSettingsStep from '@/components/onboarding/OnboardingSettingsStep.vue'
import OnboardingAssessmentChoiceStep from '@/components/onboarding/OnboardingAssessmentChoiceStep.vue'
import OnboardingAssessmentStep from '@/components/onboarding/OnboardingAssessmentStep.vue'
import OnboardingCompleteStep from '@/components/onboarding/OnboardingCompleteStep.vue'
import OnboardingFooter from '@/components/onboarding/OnboardingFooter.vue'

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

function startAssessmentGame(): void {
  if (!currentGame.value) return
  completeAssessmentGame({
    dimension: currentGame.value.dimension,
    score: Math.round(50 + Math.random() * 50),
    accuracy: Math.round(50 + Math.random() * 50),
    responseTime: Math.round(500 + Math.random() * 1000)
  })
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
    <OnboardingHeader :stepTitle="stepTitle" :progress="progress" />

    <main class="app-content app-content-scroll">
      <div class="page-shell max-w-xl mx-auto">
        <SectionStack>
          <OnboardingWelcomeStep v-if="currentStep === 'welcome'" />

          <OnboardingProfileStep
            v-if="currentStep === 'profile'"
            :userName="userName"
            :userAge="userAge"
            :userGender="userGender"
            @update:userName="(value) => { userName = value }"
            @update:userAge="(value) => { userAge = value }"
            @update:userGender="(value) => { userGender = value }"
          />

          <OnboardingSettingsStep
            v-if="currentStep === 'settings'"
            :selectedDuration="selectedDuration"
            :selectedMode="selectedMode"
            :enableBehaviorTracking="enableBehaviorTracking"
            :onDurationSelect="(value) => { selectedDuration = value }"
            :onModeSelect="(value) => { selectedMode = value }"
            :onToggleBehavior="() => { enableBehaviorTracking = !enableBehaviorTracking }"
          />

          <OnboardingAssessmentChoiceStep
            v-if="currentStep === 'assessment-choice'"
            :assessmentChoice="assessmentChoice"
            :onSelect="(value) => { assessmentChoice = value }"
          />

          <OnboardingAssessmentStep
            v-if="currentStep === 'assessment'"
            :assessmentGames="assessmentGames"
            :currentAssessmentGame="currentAssessmentGame"
            :currentGame="currentGame"
            :onStart="startAssessmentGame"
          />

          <OnboardingCompleteStep
            v-if="currentStep === 'complete'"
            :assessmentResults="assessmentResults"
          />
        </SectionStack>
      </div>
    </main>

    <OnboardingFooter
      :currentStep="currentStep"
      :assessmentChoice="assessmentChoice"
      :isLoading="isLoading"
      :onNext="nextStep"
      :onStartTraining="startTraining"
    />
  </div>
</template>


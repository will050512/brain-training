<template>
  <div 
    class="app-page page-ambient flex flex-col transition-colors duration-300 font-sans overflow-hidden"
  >
    <AssessmentHeader />

    <!-- Main Content -->
    <main 
      class="flex-1 w-full flex flex-col safe-area-bottom relative overflow-hidden"
    >
      
      <!-- 1. Mini-Cog Mode (Preserved Wrapper) -->
      <MiniCogFlow 
        v-if="stage === 'mini-cog'"
        :language="selectedLanguage"
        @complete="handleMiniCogComplete"
        @cancel="stage = 'select'"
        class="h-full w-full overflow-y-auto"
      />

      <AssessmentSelectStage
        v-else-if="stage === 'select'"
        :selectedLanguage="selectedLanguage"
        :hasRecentMiniCog="hasRecentMiniCog"
        :formatRecentMiniCogDate="formatRecentMiniCogDate"
        :onStartMiniCog="startMiniCog"
        :onStartFullAssessment="() => { stage = 'intro' }"
        :onViewMiniCogHistory="viewMiniCogHistory"
        @update:selectedLanguage="(value) => { selectedLanguage = value }"
      />
      <AssessmentIntroStage
        v-else-if="stage === 'intro'"
        :onStart="startAssessment"
        :onBack="() => { stage = 'select' }"
      />

      <!-- 4. Testing Stage (Optimized Layout for Elderly) -->
      <div v-else-if="stage === 'testing'" class="flex-1 flex flex-col w-full p-3 md:p-6 h-full overflow-hidden bg-[var(--color-bg)]">
        
        <!-- Progress Header -->
        <div class="mb-3 shrink-0 rounded-xl bg-[var(--color-surface)]/90 border border-[var(--color-border)]/70 px-4 py-3 shadow-sm z-10">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary-bg)] px-3 py-1.5 rounded-lg">
              {{ questionTypeLabel }}
            </span>
            <span class="text-sm font-medium text-[var(--color-text-muted)] tracking-wider">
              <span class="text-xl font-bold text-[var(--color-text)]">{{ currentIndex + 1 }}</span>
              <span class="opacity-40 mx-1">/</span>
              <span>{{ questions.length }}</span>
            </span>
          </div>
          <div class="h-3 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
            <div 
              class="h-full bg-[var(--color-primary)] transition-all duration-500 ease-out rounded-full"
              :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Question Card -->
        <div class="card flex-1 flex flex-col relative overflow-hidden shadow-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] rounded-2xl">
          <!-- Timer Bar (Top) -->
          <div class="absolute top-0 left-0 w-full h-2 bg-[var(--color-bg-muted)] z-20">
            <div 
              class="h-full transition-all duration-1000 linear"
              :class="timeLeft <= 3 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-primary)]'"
              :style="{ width: `${(timeLeft / (currentQuestion?.timeLimit || 10)) * 100}%` }"
            ></div>
          </div>

          <!-- Scrollable Content Area -->
          <div ref="questionScrollRef" class="flex-1 flex flex-col p-4 w-full h-full overflow-hidden">
            
            <!-- Reaction Type -->
            <template v-if="currentQuestion?.type === 'reaction'">
              <div class="flex flex-col h-full">
                <!-- Question Title (Fixed) -->
                <div class="shrink-0 mb-4 text-center">
                   <h3 class="text-2xl md:text-3xl text-[var(--color-text)] font-bold tracking-tight leading-tight">
                     {{ currentQuestion.question }}
                   </h3>
                </div>
                
                <!-- Color Block (Flexible Height - can shrink) -->
                <div class="flex-1 min-h-[80px] flex flex-col justify-center mb-6">
                  <div 
                    class="w-full h-full max-h-[35vh] rounded-3xl shadow-sm flex items-center justify-center transform transition-all duration-300 border-4 border-white/20 relative overflow-hidden"
                    :style="{ 
                      backgroundColor: currentQuestion.data?.displayColor as string,
                      boxShadow: `0 10px 30px -10px ${currentQuestion.data?.displayColor}`
                    }"
                  >
                    <span class="text-5xl md:text-7xl font-black text-white drop-shadow-lg tracking-widest z-10">
                      {{ currentQuestion.data?.displayText }}
                    </span>
                  </div>
                </div>

                <!-- Options (Fixed Bottom - LARGE BUTTONS) -->
                <div class="grid grid-cols-2 gap-4 shrink-0 mt-auto">
                  <BaseButton
                    v-for="option in currentQuestion.options"
                    :key="option"
                    variant="secondary"
                    size="lg"
                    class="text-2xl md:text-3xl font-bold border-2 border-transparent hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)] transition-all active:scale-95 py-6 min-h-[80px] md:min-h-[100px] rounded-2xl shadow-sm"
                    :disabled="isSubmitting"
                    @click="submitAnswer(option)"
                  >
                    {{ option }}
                  </BaseButton>
                </div>
              </div>
            </template>

            <!-- Memory Type -->
            <template v-else-if="currentQuestion?.type === 'memory'">
              <div class="flex flex-col h-full items-center justify-center text-center">
                 <!-- Question Title -->
                <h3 class="text-2xl md:text-3xl text-[var(--color-text)] mb-8 font-bold shrink-0">
                  {{ currentQuestion.question }}
                </h3>
                
                <div class="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto">
                  <!-- Display Phase -->
                  <div v-if="memoryPhase === 'display'" class="w-full flex flex-col items-center animate-fade-in">
                    <div class="text-[clamp(4rem,18vw,6rem)] font-black text-[var(--color-primary)] tracking-[0.15em] mb-10 select-none leading-none">
                      {{ currentQuestion.data?.sequence }}
                    </div>
                    <div class="w-full max-w-[240px] bg-[var(--color-bg-muted)] h-3 rounded-full overflow-hidden">
                       <div class="h-full bg-[var(--color-primary)] animate-[shrink_3s_linear_forwards]"></div>
                    </div>
                  </div>
                  
                  <!-- Input Phase -->
                  <div v-else class="w-full flex flex-col items-center animate-fade-in">
                    <input
                      v-model="memoryInput"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      class="input text-center text-5xl font-bold tracking-[0.3em] h-24 w-full mb-8 rounded-2xl shadow-inner bg-[var(--color-bg-soft)] border-2 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                      placeholder="____"
                      @keyup.enter="submitAnswer(memoryInput)"
                      ref="memoryInputRef"
                      autocomplete="off"
                    />
                    <BaseButton
                      size="lg"
                      full-width
                      class="shadow-lg py-5 min-h-[70px] text-2xl font-bold rounded-2xl"
                      :disabled="!memoryInput || isSubmitting"
                      @click="submitAnswer(memoryInput)"
                    >
                      確認答案
                    </BaseButton>
                  </div>
                </div>
                <!-- Spacer -->
                <div class="h-10 shrink-0"></div>
              </div>
            </template>

            <!-- Logic Type -->
            <template v-else-if="currentQuestion?.type === 'logic'">
               <div class="flex flex-col h-full">
                <!-- Title -->
                <div class="shrink-0 mb-4 text-center">
                  <h3 class="text-2xl md:text-3xl text-[var(--color-text)] font-bold">請計算結果</h3>
                </div>
                
                <!-- Calculation Display (Flexible - can shrink) -->
                <div class="flex-1 flex items-center justify-center mb-6 min-h-[80px]">
                  <div class="w-full bg-[var(--color-accent-purple)]/5 border-2 border-[var(--color-accent-purple)]/20 rounded-3xl p-4 flex items-center justify-center h-full max-h-[35vh]">
                    <!-- Use standard break words to prevent overflow, and clamp for sizing -->
                    <div class="text-[clamp(2.5rem,12vw,4.5rem)] font-black text-[var(--color-accent-purple)] tracking-wider leading-none text-center break-words w-full">
                      {{ currentQuestion.question }}
                    </div>
                  </div>
                </div>

                <!-- Options (LARGE BUTTONS) -->
                <div class="grid grid-cols-2 gap-4 shrink-0 mt-auto">
                  <BaseButton
                    v-for="option in currentQuestion.options"
                    :key="option"
                    variant="secondary"
                    size="lg"
                    class="text-3xl md:text-4xl font-bold border-2 border-transparent hover:border-[var(--color-accent-purple)] hover:text-[var(--color-accent-purple)] active:scale-95 py-6 min-h-[80px] md:min-h-[100px] rounded-2xl shadow-sm"
                    :disabled="isSubmitting"
                    @click="submitAnswer(option)"
                  >
                    {{ option }}
                  </BaseButton>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <AssessmentMiniCogResult
        v-else-if="stage === 'mini-cog-result'"
        :result="recentMiniCogResult"
        :onStartDailyTraining="startDailyTraining"
        :onViewReport="viewReport"
      />
      <AssessmentFullResult
        v-else-if="stage === 'result'"
        :result="result"
        :difficultyLabel="difficultyLabel"
        :difficultyDescription="difficultyDescription"
        :onSaveAndContinue="saveAndContinue"
        :onRetake="retakeAssessment"
      />

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore, useUserStore } from '@/stores'
import { DIFFICULTIES } from '@/types/game'
import BaseButton from '@/components/ui/BaseButton.vue'
import MiniCogFlow from '@/components/assessment/MiniCogFlow.vue'
import AssessmentHeader from '@/components/assessment/AssessmentHeader.vue'
import AssessmentSelectStage from '@/components/assessment/AssessmentSelectStage.vue'
import AssessmentIntroStage from '@/components/assessment/AssessmentIntroStage.vue'
import AssessmentMiniCogResult from '@/components/assessment/AssessmentMiniCogResult.vue'
import AssessmentFullResult from '@/components/assessment/AssessmentFullResult.vue'
import { getLatestMiniCogResult, saveBaselineAssessment, generateId } from '@/services/db'
import { syncBaselineAssessmentToSheet } from '@/services/userDataSheetSyncService'
import type { MiniCogResult } from '@/services/miniCogService'
import {
  generateAssessmentQuestions,
  calculateAssessmentResult,
  getDifficultyDescription,
  type AssessmentQuestion,
  type AssessmentAnswer,
  type AssessmentResult,
} from '@/services/assessmentService'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

// 狀態
const stage = ref<'select' | 'mini-cog' | 'intro' | 'testing' | 'result' | 'mini-cog-result'>('select')
const questions = ref<AssessmentQuestion[]>([])
const answers = ref<AssessmentAnswer[]>([])
const currentIndex = ref(0)
const timeLeft = ref(0)
const isSubmitting = ref(false)
const result = ref<AssessmentResult | null>(null)

// Mini-Cog 相關
const selectedLanguage = ref<'zh-TW' | 'zh-CN' | 'en'>('zh-TW')
const recentMiniCogResult = ref<MiniCogResult | null>(null)

// 記憶題專用
const memoryPhase = ref<'display' | 'input'>('display')
const memoryInput = ref('')
const memoryInputRef = ref<HTMLInputElement | null>(null)
const questionScrollRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const mode = String(route.query.mode || '').toLowerCase()
  if (mode === 'mini-cog' || mode === 'minicog') {
    stage.value = 'mini-cog'
    return
  }

  if (mode === 'quick' || mode === 'full' || mode === 'quick-assessment' || mode === 'quickassessment') {
    stage.value = 'intro'
  }
})

// 計時器
let timer: ReturnType<typeof setInterval> | null = null
let questionStartTime = 0

// 計算屬性
const currentQuestion = computed(() => questions.value[currentIndex.value])

const questionTypeLabel = computed(() => {
  switch (currentQuestion.value?.type) {
    case 'reaction': return '⚡ 反應力'
    case 'memory': return '🧠 記憶力'
    case 'logic': return '🧩 邏輯力'
    default: return ''
  }
})

const difficultyLabel = computed(() => {
  if (!result.value) return ''
  return DIFFICULTIES[result.value.suggestedDifficulty].name
})

const difficultyDescription = computed(() => {
  if (!result.value) return ''
  return getDifficultyDescription(result.value.suggestedDifficulty)
})

// Mini-Cog 相關計算屬性
const hasRecentMiniCog = computed(() => recentMiniCogResult.value !== null)

const formatRecentMiniCogDate = computed(() => {
  if (!recentMiniCogResult.value) return ''
  const date = new Date(recentMiniCogResult.value.completedAt)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Mini-Cog 方法
function startMiniCog() {
  stage.value = 'mini-cog'
}

function handleMiniCogComplete(miniCogResult: MiniCogResult) {
  recentMiniCogResult.value = miniCogResult
  // 根據 Mini-Cog 分數設定建議難度
  let suggestedDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  if (miniCogResult.totalScore >= 4) {
    suggestedDifficulty = 'hard'
  } else if (miniCogResult.totalScore <= 2) {
    suggestedDifficulty = 'easy'
  }
  
  settingsStore.setAssessmentResult({
    suggestedDifficulty,
    completedAt: miniCogResult.completedAt,
    scores: {
      reaction: miniCogResult.totalScore * 20,
      memory: miniCogResult.wordRecall.score * 33,
      logic: miniCogResult.clockDrawing.score * 50
    }
  })
  
  stage.value = 'mini-cog-result'
}

function startDailyTraining() {
  router.push('/daily-challenge')
}

function viewReport() {
  router.push('/report')
}

function viewMiniCogHistory() {
  router.push('/report')
}

async function loadRecentMiniCog() {
  if (!userStore.currentUser?.id) return
  try {
    recentMiniCogResult.value = await getLatestMiniCogResult(userStore.currentUser.id) || null
  } catch (error) {
    console.error('Failed to load recent Mini-Cog result:', error)
  }
}

// 開始評估
function startAssessment() {
  questions.value = generateAssessmentQuestions()
  answers.value = []
  currentIndex.value = 0
  stage.value = 'testing'
  // 重置滾動位置
  nextTick(() => {
     window.scrollTo(0, 0)
  })
  startQuestion()
}

// 開始單一題目
function startQuestion() {
  const q = currentQuestion.value
  if (!q) return

  timeLeft.value = q.timeLimit
  questionStartTime = Date.now()
  isSubmitting.value = false
  
  // 確保滾動回到頂部，解決換題看不到題目的問題
  nextTick(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
    if (questionScrollRef.value) {
      questionScrollRef.value.scrollTop = 0
    }
  })

  // 記憶題特殊處理
  if (q.type === 'memory') {
    memoryPhase.value = 'display'
    memoryInput.value = ''
    
    // 顯示一段時間後進入輸入階段
    const displayTime = (q.data?.displayTime as number) || 3000
    setTimeout(() => {
      memoryPhase.value = 'input'
      nextTick(() => {
        memoryInputRef.value?.focus()
      })
    }, displayTime)
  }

  // 開始倒數
  startTimer()
}

// 倒數計時器
function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      // 時間到，自動提交空答案
      submitAnswer(null)
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 提交答案
function submitAnswer(answer: string | number | null) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  stopTimer()

  const q = currentQuestion.value
  if (!q) return

  const reactionTime = Date.now() - questionStartTime
  const isCorrect = answer !== null && String(answer) === String(q.correctAnswer)

  answers.value.push({
    questionId: q.id,
    userAnswer: answer,
    isCorrect,
    reactionTime,
  })

  // 下一題或結束
  setTimeout(() => {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      startQuestion()
    } else {
      finishAssessment()
    }
  }, 300)
}

// 完成評估
function finishAssessment() {
  stopTimer()
  result.value = calculateAssessmentResult(questions.value, answers.value)
  stage.value = 'result'
}

// 儲存結果並繼續
async function saveAndContinue() {
  if (result.value) {
    settingsStore.setAssessmentResult({
      suggestedDifficulty: result.value.suggestedDifficulty,
      completedAt: result.value.completedAt,
      scores: result.value.scores,
    })

    const odId = userStore.currentUser?.id
    if (odId) {
      const overallLevel = result.value.suggestedDifficulty === 'hard'
        ? 'advanced'
        : result.value.suggestedDifficulty === 'medium'
          ? 'intermediate'
          : 'beginner'

      const baseline = {
        id: generateId(),
        odId,
        assessedAt: result.value.completedAt,
        cognitiveScores: {
          reaction: result.value.scores.reaction,
          logic: result.value.scores.logic,
          memory: result.value.scores.memory,
          cognition: 0,
          coordination: 0,
          attention: 0,
        },
        suggestedDifficulties: {},
        overallLevel,
        gamesPlayed: [],
      }

      await saveBaselineAssessment({ ...baseline, overallLevel: overallLevel as 'beginner' | 'intermediate' | 'advanced' })
      await syncBaselineAssessmentToSheet({ ...baseline, overallLevel: overallLevel as 'beginner' | 'intermediate' | 'advanced' })
    }
  }
  // 引導至每日訓練，讓用戶可以直接開始個人化訓練
  router.push('/daily-challenge')
}

// 重新測試
function retakeAssessment() {
  stage.value = 'select'
  result.value = null
}

// 生命週期
onMounted(() => {
  loadRecentMiniCog()
})

// 監聽頁面離開
watch(stage, (newStage: string) => {
  if (newStage !== 'testing') {
    stopTimer()
  }
})
</script>

<style scoped>
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>


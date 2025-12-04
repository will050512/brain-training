<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
    <!-- 頭部 -->
    <div class="bg-[var(--color-surface)] shadow-sm">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <router-link to="/" class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            ← 返回
          </router-link>
          <h1 class="text-xl font-bold text-[var(--color-text)]">能力評估測試</h1>
          <div class="w-16"></div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-8">
      <!-- Mini-Cog 測驗模式 -->
      <MiniCogFlow 
        v-if="stage === 'mini-cog'"
        :language="selectedLanguage"
        @complete="handleMiniCogComplete"
        @cancel="stage = 'select'"
      />

      <!-- 選擇評估類型 -->
      <div v-else-if="stage === 'select'" class="max-w-3xl mx-auto">
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">🧠</div>
          <h2 class="text-2xl font-bold text-[var(--color-text)] mb-2">選擇評估類型</h2>
          <p class="text-[var(--color-text-secondary)]">請選擇適合您的評估方式</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Mini-Cog 快速篩檢 -->
          <div class="assessment-card mini-cog-card" @click="startMiniCog">
            <div class="card-badge">推薦</div>
            <div class="card-icon">⏱️</div>
            <h3 class="card-title">Mini-Cog™ 快速篩檢</h3>
            <p class="card-description">
              國際標準的認知篩檢工具，適合快速評估認知功能狀態。
            </p>
            <ul class="card-features">
              <li>⏱️ 約 3 分鐘完成</li>
              <li>📝 3 詞語記憶 + 時鐘繪圖</li>
              <li>📊 專業評分與 MMSE 對照</li>
              <li>🎯 早期認知變化偵測</li>
            </ul>
            <div class="card-action">
              <span>開始快速篩檢</span>
              <span class="arrow">→</span>
            </div>
          </div>

          <!-- 完整能力評估 -->
          <div class="assessment-card full-assessment-card" @click="stage = 'intro'">
            <div class="card-icon">📋</div>
            <h3 class="card-title">完整能力評估</h3>
            <p class="card-description">
              全面評估反應力、記憶力、邏輯力，為您推薦適合的遊戲難度。
            </p>
            <ul class="card-features">
              <li>⏱️ 約 5 分鐘完成</li>
              <li>⚡ 反應力測試</li>
              <li>🧠 記憶力測試</li>
              <li>🧩 邏輯力測試</li>
            </ul>
            <div class="card-action">
              <span>開始完整評估</span>
              <span class="arrow">→</span>
            </div>
          </div>
        </div>

        <!-- 語言選擇（用於 Mini-Cog） -->
        <div class="language-selector mt-8">
          <label class="text-sm text-[var(--color-text-muted)] mr-3">Mini-Cog 詞語語言：</label>
          <select v-model="selectedLanguage" class="language-select">
            <option value="zh-TW">繁體中文</option>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <!-- 歷史記錄提示 -->
        <div v-if="hasRecentMiniCog" class="recent-result-banner mt-6">
          <div class="banner-icon">📊</div>
          <div class="banner-content">
            <p class="banner-title">您最近有 Mini-Cog 評估記錄</p>
            <p class="banner-date">{{ formatRecentMiniCogDate }}</p>
          </div>
          <button class="banner-action" @click="viewMiniCogHistory">
            查看記錄
          </button>
        </div>
      </div>

      <!-- 開始前說明（完整評估） -->
      <div v-else-if="stage === 'intro'" class="max-w-2xl mx-auto">
        <div class="card text-center">
          <div class="text-6xl mb-6">🧠</div>
          <h2 class="text-2xl font-bold mb-4">能力評估測試</h2>
          <p class="text-[var(--color-text-secondary)] text-lg mb-6">
            這個簡短的測試將幫助我們了解您的認知能力，
            <br />並為您推薦最適合的遊戲難度。
          </p>
          
          <div class="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 mb-6 text-left">
            <h3 class="font-bold mb-3 text-blue-800 dark:text-blue-300">📋 測試內容</h3>
            <ul class="space-y-2 text-blue-700 dark:text-blue-300">
              <li class="flex items-center gap-2">
                <span class="text-xl">⚡</span>
                <span>反應力測試 - 快速選擇正確顏色</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-xl">🧠</span>
                <span>記憶力測試 - 記住並輸入數字序列</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-xl">🧩</span>
                <span>邏輯力測試 - 簡單數學計算</span>
              </li>
            </ul>
          </div>

          <div class="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 mb-4 text-orange-800 dark:text-orange-300">
            <p class="font-medium">⏰ 倒數計時說明</p>
            <p class="text-sm mt-1">每道題目有固定的作答時間限制，畫面上會顯示剩餘秒數。</p>
            <p class="text-sm mt-1">當剩餘時間少於 3 秒時，計時器會變成紅色提醒您加快作答。</p>
            <p class="text-sm mt-1">若時間到未作答，系統將自動跳至下一題。</p>
          </div>
          
          <div class="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 mb-8 text-amber-800 dark:text-amber-300">
            <p>⏱️ 預計時間：約 3 分鐘</p>
            <p class="text-sm mt-1">請在安靜的環境下進行測試</p>
          </div>
          
          <button 
            @click="startAssessment" 
            class="btn btn-primary btn-lg text-xl px-12 py-4"
          >
            開始測試
          </button>
          <button 
            @click="stage = 'select'" 
            class="btn btn-secondary mt-4 px-8"
          >
            返回選擇
          </button>
        </div>
      </div>

      <!-- 測試進行中 -->
      <div v-else-if="stage === 'testing'" class="max-w-2xl mx-auto">
        <!-- 進度條 -->
        <div class="mb-6">
          <div class="flex justify-between text-sm text-[var(--color-text-muted)] mb-2">
            <span>第 {{ currentIndex + 1 }} 題，共 {{ questions.length }} 題</span>
            <span>{{ questionTypeLabel }}</span>
          </div>
          <div class="progress-bar h-3">
            <div 
              class="progress-bar-fill transition-all duration-300"
              :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 題目卡片 -->
        <div class="card">
          <!-- 反應力題目 -->
          <template v-if="currentQuestion?.type === 'reaction'">
            <div class="text-center">
              <p class="text-lg text-[var(--color-text-secondary)] mb-6">{{ currentQuestion.question }}</p>
              <div 
                class="text-6xl font-bold mb-8 p-8 rounded-xl"
                :style="{ 
                  backgroundColor: currentQuestion.data?.displayColor as string,
                  color: 'white'
                }"
              >
                {{ currentQuestion.data?.displayText }}
              </div>
              <div class="grid grid-cols-2 gap-4">
                <button
                  v-for="option in currentQuestion.options"
                  :key="option"
                  @click="submitAnswer(option)"
                  class="btn btn-secondary text-xl py-4"
                  :disabled="isSubmitting"
                >
                  {{ option }}
                </button>
              </div>
            </div>
          </template>

          <!-- 記憶力題目 -->
          <template v-else-if="currentQuestion?.type === 'memory'">
            <div class="text-center">
              <p class="text-lg text-[var(--color-text-secondary)] mb-6">{{ currentQuestion.question }}</p>
              
              <!-- 顯示數字階段 -->
              <div v-if="memoryPhase === 'display'" class="mb-8">
                <div class="text-6xl font-bold text-blue-600 tracking-widest py-8">
                  {{ currentQuestion.data?.sequence }}
                </div>
                <p class="text-[var(--color-text-muted)]">請記住這些數字...</p>
              </div>
              
              <!-- 輸入階段 -->
              <div v-else class="mb-6">
                <input
                  v-model="memoryInput"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="text-4xl text-center font-bold tracking-widest w-full max-w-xs border-2 border-[var(--color-border)] rounded-xl p-4 focus:border-blue-500 focus:outline-none bg-[var(--color-surface)] text-[var(--color-text)]"
                  placeholder="輸入數字"
                  @keyup.enter="submitAnswer(memoryInput)"
                  ref="memoryInputRef"
                />
                <button
                  @click="submitAnswer(memoryInput)"
                  class="btn btn-primary btn-lg mt-6 px-12"
                  :disabled="!memoryInput || isSubmitting"
                >
                  確定
                </button>
              </div>
            </div>
          </template>

          <!-- 邏輯力題目 -->
          <template v-else-if="currentQuestion?.type === 'logic'">
            <div class="text-center">
              <p class="text-lg text-[var(--color-text-secondary)] mb-4">請計算以下算式</p>
              <div class="text-5xl font-bold text-purple-600 mb-8 py-6">
                {{ currentQuestion.question }}
              </div>
              <div class="grid grid-cols-2 gap-4">
                <button
                  v-for="option in currentQuestion.options"
                  :key="option"
                  @click="submitAnswer(option)"
                  class="btn btn-secondary text-2xl py-4"
                  :disabled="isSubmitting"
                >
                  {{ option }}
                </button>
              </div>
            </div>
          </template>

          <!-- 倒數計時 -->
          <div class="mt-6 text-center">
            <div 
              class="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              :class="timeLeft <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'"
            >
              <span>⏱️</span>
              <span class="font-bold">{{ timeLeft }} 秒</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 結果頁面 -->
      <div v-else-if="stage === 'result'" class="max-w-2xl mx-auto">
        <div class="card text-center">
          <div class="text-6xl mb-6">🎉</div>
          <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">測試完成！</h2>
          <p class="text-[var(--color-text-secondary)] mb-8">以下是您的評估結果</p>

          <!-- 分數卡片 -->
          <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <div class="text-3xl mb-2">⚡</div>
              <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ result?.scores.reaction }}</div>
              <div class="text-sm text-[var(--color-text-muted)]">反應力</div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div class="text-3xl mb-2">🧠</div>
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ result?.scores.memory }}</div>
              <div class="text-sm text-[var(--color-text-muted)]">記憶力</div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div class="text-3xl mb-2">🧩</div>
              <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ result?.scores.logic }}</div>
              <div class="text-sm text-[var(--color-text-muted)]">邏輯力</div>
            </div>
          </div>

          <!-- 統計資訊 -->
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-6 mb-8">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-[var(--color-text-muted)]">答對題數</div>
                <div class="text-xl font-bold">
                  {{ result?.correctCount }} / {{ result?.totalQuestions }}
                </div>
              </div>
              <div>
                <div class="text-[var(--color-text-muted)]">平均反應時間</div>
                <div class="text-xl font-bold text-[var(--color-text)]">
                  {{ (result?.averageReactionTime ?? 0 / 1000).toFixed(1) }} 秒
                </div>
              </div>
            </div>
          </div>

          <!-- 建議難度 -->
          <div class="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
            <h3 class="font-bold text-green-800 mb-2">🎯 建議難度</h3>
            <div class="text-3xl font-bold text-green-600 mb-2">
              {{ difficultyLabel }}
            </div>
            <p class="text-green-700 text-sm">
              {{ difficultyDescription }}
            </p>
          </div>

          <div class="flex gap-4 justify-center">
            <button 
              @click="saveAndContinue" 
              class="btn btn-primary btn-lg px-8"
            >
              儲存並開始訓練
            </button>
            <button 
              @click="retakeAssessment" 
              class="btn btn-secondary px-6"
            >
              重新測試
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore, useUserStore } from '@/stores'
import { DIFFICULTIES } from '@/types/game'
import MiniCogFlow from '@/components/assessment/MiniCogFlow.vue'
import { getLatestMiniCogResult } from '@/services/db'
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
const settingsStore = useSettingsStore()
const userStore = useUserStore()

// 狀態
const stage = ref<'select' | 'mini-cog' | 'intro' | 'testing' | 'result'>('select')
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

// 計時器
let timer: ReturnType<typeof setInterval> | null = null
let questionStartTime = 0

// 計算屬性
const currentQuestion = computed(() => questions.value[currentIndex.value])

const questionTypeLabel = computed(() => {
  switch (currentQuestion.value?.type) {
    case 'reaction': return '⚡ 反應力測試'
    case 'memory': return '🧠 記憶力測試'
    case 'logic': return '🧩 邏輯力測試'
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
  startQuestion()
}

// 開始單一題目
function startQuestion() {
  const q = currentQuestion.value
  if (!q) return

  timeLeft.value = q.timeLimit
  questionStartTime = Date.now()
  isSubmitting.value = false

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
function saveAndContinue() {
  if (result.value) {
    settingsStore.setAssessmentResult({
      suggestedDifficulty: result.value.suggestedDifficulty,
      completedAt: result.value.completedAt,
      scores: result.value.scores,
    })
  }
  router.push('/games')
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
watch(stage, (newStage) => {
  if (newStage !== 'testing') {
    stopTimer()
  }
})
</script>

<style scoped>
.progress-bar {
  background-color: var(--color-bg-soft);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: 9999px;
}

/* Assessment Card Styles */
.assessment-card {
  position: relative;
  background: var(--color-surface);
  border-radius: 1.5rem;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid var(--color-border);
  overflow: hidden;
}

.assessment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
}

.mini-cog-card {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.mini-cog-card:hover {
  border-color: var(--color-logic);
}

.full-assessment-card:hover {
  border-color: var(--color-primary);
}

.card-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.card-description {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
}

.card-features li {
  padding: 0.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-primary);
  font-weight: 600;
}

.card-action .arrow {
  font-size: 1.25rem;
  transition: transform 0.2s ease;
}

.assessment-card:hover .card-action .arrow {
  transform: translateX(4px);
}

/* Language Selector */
.language-selector {
  text-align: center;
}

.language-select {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  color: var(--color-text);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.language-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Recent Result Banner */
.recent-result-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--gradient-result-good);
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  border: 1px solid var(--color-success);
}

.banner-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.banner-content {
  flex: 1;
}

.banner-title {
  font-weight: 600;
  color: var(--color-score-good);
  margin: 0;
}

.banner-date {
  font-size: 0.875rem;
  color: var(--color-score-good);
  margin: 0.25rem 0 0;
}

.banner-action {
  background: var(--color-success);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.banner-action:hover {
  background: var(--color-score-good);
}

/* Responsive */
@media (max-width: 768px) {
  .assessment-card {
    padding: 1.5rem;
  }
  
  .recent-result-banner {
    flex-direction: column;
    text-align: center;
  }
  
  .banner-action {
    width: 100%;
  }
}

/* 手機橫屏優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .min-h-screen {
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* 頭部壓縮 */
  .container.mx-auto.px-4.py-4 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .container.mx-auto.px-4.py-8 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    overflow-y: auto;
    max-height: calc(100vh - 60px);
    max-height: calc(100dvh - 60px);
  }

  /* 選擇頁面橫屏並列 */
  .max-w-3xl.mx-auto .text-center.mb-8 {
    margin-bottom: 0.75rem;
  }

  .max-w-3xl.mx-auto .text-center.mb-8 .text-6xl {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .max-w-3xl.mx-auto .text-center.mb-8 .text-2xl {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .grid[class*="grid-cols-2"] {
    display: flex !important;
    flex-direction: row;
    gap: 1rem;
  }

  .assessment-card {
    padding: 1rem;
    flex: 1;
  }

  .card-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .card-title {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .card-description {
    font-size: 0.8125rem;
    margin-bottom: 0.75rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-features {
    margin-bottom: 0.75rem;
  }

  .card-features li {
    padding: 0.25rem 0;
    font-size: 0.75rem;
  }

  .card-action {
    padding-top: 0.5rem;
    font-size: 0.875rem;
  }

  .card-badge {
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
  }

  .language-selector {
    margin-top: 0.75rem;
  }

  .language-selector label {
    font-size: 0.75rem;
  }

  .language-select {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .recent-result-banner {
    margin-top: 0.75rem;
    padding: 0.75rem;
    flex-direction: row;
    align-items: center;
  }

  .banner-icon {
    font-size: 1.5rem;
  }

  .banner-title {
    font-size: 0.875rem;
  }

  .banner-date {
    font-size: 0.75rem;
  }

  .banner-action {
    width: auto;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  /* 說明頁橫屏 */
  .max-w-2xl.mx-auto .card.text-center {
    padding: 1rem;
    max-height: calc(100vh - 80px);
    max-height: calc(100dvh - 80px);
    overflow-y: auto;
  }

  .max-w-2xl.mx-auto .card.text-center .text-6xl {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .max-w-2xl.mx-auto .card.text-center .text-2xl {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .max-w-2xl.mx-auto .card.text-center .text-lg {
    font-size: 0.9375rem;
    margin-bottom: 0.5rem;
  }

  .bg-blue-50,
  .bg-orange-50,
  .bg-amber-50,
  [class*="bg-blue-900"],
  [class*="bg-orange-900"],
  [class*="bg-amber-900"] {
    padding: 0.75rem !important;
    margin-bottom: 0.5rem !important;
  }

  .bg-blue-50 .font-bold,
  .bg-orange-50 .font-medium {
    font-size: 0.9375rem;
  }

  .bg-blue-50 li,
  .bg-orange-50 .text-sm,
  .bg-amber-50 p {
    font-size: 0.8125rem;
  }

  .btn.btn-primary.btn-lg {
    padding: 0.75rem 2rem !important;
    font-size: 1rem !important;
  }

  .btn.btn-secondary {
    padding: 0.5rem 1.5rem !important;
    margin-top: 0.5rem !important;
  }

  /* 測試進行中頁面 */
  .max-w-2xl.mx-auto .mb-6 {
    margin-bottom: 0.5rem;
  }

  .max-w-2xl.mx-auto .mb-8 {
    margin-bottom: 0.75rem;
  }

  .progress-bar.h-3 {
    height: 0.5rem;
  }

  .max-w-2xl.mx-auto .card {
    padding: 1rem;
  }

  .text-6xl.font-bold {
    font-size: 2.5rem !important;
    padding: 1rem !important;
    margin-bottom: 0.75rem !important;
  }

  .text-5xl.font-bold {
    font-size: 2rem !important;
    padding: 0.75rem !important;
    margin-bottom: 0.75rem !important;
  }

  .text-4xl.text-center {
    font-size: 1.75rem;
  }

  .grid.grid-cols-2.gap-4 {
    gap: 0.5rem;
  }

  .grid.grid-cols-2.gap-4 .btn {
    padding: 0.75rem !important;
    font-size: 1rem !important;
    min-height: 48px;
  }

  .mt-6.text-center .inline-flex {
    padding: 0.375rem 0.75rem;
  }

  /* 結果頁面 */
  .grid.grid-cols-3.gap-4 {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .grid.grid-cols-3.gap-4 > div {
    padding: 0.75rem;
  }

  .grid.grid-cols-3.gap-4 .text-3xl {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .grid.grid-cols-3.gap-4 .text-2xl {
    font-size: 1.25rem;
  }

  .grid.grid-cols-3.gap-4 .text-sm {
    font-size: 0.75rem;
  }

  .bg-green-50 {
    padding: 0.75rem !important;
    margin-bottom: 0.75rem !important;
  }

  .bg-green-50 .text-3xl {
    font-size: 1.5rem;
  }

  .flex.gap-4.justify-center {
    gap: 0.75rem;
  }

  .flex.gap-4.justify-center .btn {
    padding: 0.625rem 1.25rem !important;
    font-size: 0.9375rem !important;
  }
}
</style>

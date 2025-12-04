<template>
  <div class="mini-cog-flow">
    <!-- Progress Indicator -->
    <div class="progress-bar">
      <div class="progress-steps">
        <div
          v-for="(stepInfo, index) in steps"
          :key="index"
          class="step"
          :class="{
            'active': currentStep === index,
            'completed': currentStep > index
          }"
        >
          <div class="step-circle">
            <span v-if="currentStep > index">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="step-label">{{ stepInfo.label }}</span>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressWidth }"></div>
      </div>
    </div>

    <!-- Step Content -->
    <Transition name="slide-fade" mode="out-in">
      <!-- Step 0: Instructions -->
      <div v-if="currentStep === 0" key="intro" class="step-content intro-step">
        <div class="intro-icon">🧠</div>
        <h2>Mini-Cog™ 快速認知篩檢</h2>
        <p class="intro-description">
          這是一個簡短的認知評估，大約需要 3 分鐘完成。
          測驗包含記憶力測試和時鐘繪圖。
        </p>
        
        <div class="info-cards">
          <div class="info-card">
            <span class="info-icon">⏱️</span>
            <div class="info-text">
              <strong>時長</strong>
              <span>約 3 分鐘</span>
            </div>
          </div>
          <div class="info-card">
            <span class="info-icon">📝</span>
            <div class="info-text">
              <strong>內容</strong>
              <span>3 個詞語 + 時鐘繪圖</span>
            </div>
          </div>
          <div class="info-card">
            <span class="info-icon">🎯</span>
            <div class="info-text">
              <strong>目的</strong>
              <span>認知功能初步篩檢</span>
            </div>
          </div>
        </div>

        <div class="disclaimer">
          <p>⚠️ 此測驗僅供參考，不能取代專業醫療診斷。如有疑慮，請諮詢醫療專業人員。</p>
        </div>

        <button class="btn-primary btn-large" @click="startTest">
          開始測驗
        </button>
      </div>

      <!-- Step 1: Word Presentation -->
      <div v-else-if="currentStep === 1" key="words" class="step-content words-step">
        <h2>詞語記憶</h2>
        <p class="instruction">請仔細記住以下 3 個詞語：</p>
        
        <div class="word-display">
          <TransitionGroup name="word-appear" tag="div" class="words-container">
            <div
              v-for="(word, index) in session.wordSet?.words"
              :key="word"
              class="word-card"
              :style="{ animationDelay: `${index * 0.5}s` }"
            >
              {{ word }}
            </div>
          </TransitionGroup>
        </div>

        <div v-if="showWordsComplete" class="word-complete-section">
          <p class="repeat-instruction">
            請大聲重複這 3 個詞語，確保記住它們。
          </p>
          <p class="words-summary">
            <strong>{{ session.wordSet?.words?.join('、') }}</strong>
          </p>
          <button class="btn-primary" @click="proceedToClockDrawing">
            我記住了，繼續
          </button>
        </div>

        <div v-else class="timer-display">
          <span>請記憶中...</span>
          <div class="countdown">{{ wordDisplayCountdown }}</div>
        </div>
      </div>

      <!-- Step 2: Clock Drawing -->
      <div v-else-if="currentStep === 2" key="clock" class="step-content clock-step">
        <h2>時鐘繪圖</h2>
        <p class="instruction">
          請在下方畫一個時鐘，顯示時間：<strong>{{ clockTime }}</strong>
          <span class="time-hint">（{{ clockTimeDescription }}）</span>
        </p>
        
        <ClockDrawingTest
          :target-time="clockTime"
          :randomize="false"
          @complete="handleClockComplete"
        />
      </div>

      <!-- Step 3: Delayed Recall -->
      <div v-else-if="currentStep === 3" key="recall" class="step-content recall-step">
        <h2>詞語回憶</h2>
        <p class="instruction">
          請回想剛才記住的 3 個詞語，點選您記得的詞語：
        </p>

        <div class="recall-options">
          <div
            v-for="word in recallOptions"
            :key="word"
            class="recall-option"
            :class="{
              'selected': selectedWords.includes(word),
              'correct': showResults && session.wordSet?.words.includes(word) && selectedWords.includes(word),
              'incorrect': showResults && !session.wordSet?.words.includes(word) && selectedWords.includes(word),
              'missed': showResults && session.wordSet?.words.includes(word) && !selectedWords.includes(word)
            }"
            @click="toggleWord(word)"
          >
            {{ word }}
            <span v-if="showResults && session.wordSet?.words.includes(word)" class="result-icon">✓</span>
            <span v-if="showResults && !session.wordSet?.words.includes(word) && selectedWords.includes(word)" class="result-icon">✗</span>
          </div>
        </div>

        <p class="selection-count" v-if="!showResults">
          已選擇 {{ selectedWords.length }} / 3 個詞語
        </p>

        <button
          v-if="!showResults"
          class="btn-primary"
          :disabled="selectedWords.length === 0"
          @click="submitRecall"
        >
          確認提交
        </button>
      </div>

      <!-- Step 4: Results -->
      <div v-else-if="currentStep === 4" key="results" class="step-content results-step">
        <!-- 儲存成功提示 -->
        <Transition name="fade">
          <div v-if="saveSuccess" class="save-success-overlay">
            <div class="success-content">
              <div class="success-icon">✅</div>
              <h3>儲存成功！</h3>
              <p>正在跳轉到報告頁面...</p>
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </Transition>

        <div class="results-header">
          <div class="score-circle" :class="scoreClass">
            <span class="score-value">{{ result?.totalScore }}</span>
            <span class="score-max">/ 5</span>
          </div>
          <h2>測驗完成</h2>
        </div>

        <div class="score-breakdown">
          <div class="score-item">
            <span class="score-label">詞語回憶</span>
            <span class="score-badge">{{ result?.wordRecall.score }} / 3</span>
          </div>
          <div class="score-item">
            <span class="score-label">時鐘繪圖</span>
            <span class="score-badge">{{ result?.clockDrawing.score }} / 2</span>
          </div>
        </div>

        <div class="interpretation-card" :class="interpretationClass">
          <div class="interpretation-icon">
            {{ interpretationIcon }}
          </div>
          <div class="interpretation-content">
            <h3>{{ getResultInterpretation?.level }}</h3>
            <p>{{ getResultInterpretation?.description }}</p>
          </div>
        </div>

        <div v-if="getResultInterpretation?.needsFurtherAssessment" class="warning-card">
          <h4>⚠️ 建議事項</h4>
          <p>{{ result?.mmseCorrelation }}</p>
          <p class="mmse-note" v-if="getResultInterpretation?.mmseCorrespondence">
            此分數對應 MMSE 約 {{ getResultInterpretation.mmseCorrespondence }} 分
          </p>
        </div>

        <!-- 儲存錯誤提示 -->
        <div v-if="saveError" class="save-error">
          <span>⚠️ {{ saveError }}</span>
        </div>

        <div class="result-actions">
          <button class="btn-secondary" @click="retakeTest" :disabled="isSaving">
            重新測驗
          </button>
          <button 
            class="btn-primary" 
            @click="saveAndClose" 
            :disabled="isSaving || saveSuccess"
          >
            <span v-if="isSaving" class="btn-loading">
              <span class="spinner-small"></span>
              儲存中...
            </span>
            <span v-else-if="saveSuccess">✓ 已儲存</span>
            <span v-else>儲存結果</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import ClockDrawingTest from '@/components/games/ClockDrawingTest.vue'
import {
  type MiniCogResult,
  type ClockDrawingSelfAssessment,
  type MiniCogWordSet,
  type MiniCogLocale,
  getRandomWordSet,
  createMiniCogResult,
  calculateWordRecallScore,
  calculateClockDrawingScore,
  getRiskLevelDescription,
  WORD_SETS
} from '@/services/miniCogService'
import { getRandomClockTime, getTimeDescription } from '@/services/clockDrawingAnalyzer'
import { saveMiniCogResult, getDataConsent } from '@/services/db'
import { useUserStore } from '@/stores/userStore'

// Props
const props = withDefaults(defineProps<{
  language?: 'zh-TW' | 'zh-CN' | 'en'
}>(), {
  language: 'zh-TW'
})

// Emits
const emit = defineEmits<{
  (e: 'complete', result: MiniCogResult): void
  (e: 'cancel'): void
}>()

// Stores
const userStore = useUserStore()

// 本地 Session 類型（不需要從 miniCogService 導入）
interface LocalMiniCogSession {
  id: string
  startTime: string
  language: MiniCogLocale
  wordSet: MiniCogWordSet | null
}

// State
const currentStep = ref(0)
const session = ref<LocalMiniCogSession>({
  id: '',
  startTime: '',
  language: props.language,
  wordSet: null
})

// 隨機化時鐘時間（每次評估都不同）
const clockTime = ref('11:10')
const clockTimeDescription = computed(() => getTimeDescription(clockTime.value))

const wordDisplayCountdown = ref(10)
const showWordsComplete = ref(false)
const selectedWords = ref<string[]>([])
const showResults = ref(false)
const result = ref<MiniCogResult | null>(null)
const clockAssessment = ref<ClockDrawingSelfAssessment | null>(null)
const clockImageData = ref<string | undefined>(undefined)
const clockCompletionTime = ref(0)

// 儲存狀態
const isSaving = ref(false)
const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

let countdownTimer: ReturnType<typeof setInterval> | null = null
let sessionStartTime = 0

// 初始化隨機時間
onMounted(() => {
  clockTime.value = getRandomClockTime()
})

// Steps configuration
const steps = [
  { label: '說明' },
  { label: '記憶詞語' },
  { label: '時鐘繪圖' },
  { label: '詞語回憶' },
  { label: '結果' }
]

// Computed
const progressWidth = computed(() => {
  return `${(currentStep.value / (steps.length - 1)) * 100}%`
})

const recallOptions = computed(() => {
  if (!session.value.wordSet) return []
  
  // Get all words from the language set and shuffle
  const allWordSets = WORD_SETS[props.language] || WORD_SETS['zh-TW']
  const flatWords = allWordSets.flat()
  const distractors = flatWords
    .filter((w: string) => !session.value.wordSet?.words.includes(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
  
  // Combine with correct words and shuffle
  return [...(session.value.wordSet?.words || []), ...distractors]
    .sort(() => Math.random() - 0.5)
})

const scoreClass = computed(() => {
  if (!result.value) return ''
  const score = result.value.totalScore
  if (score >= 4) return 'score-good'
  if (score >= 3) return 'score-moderate'
  return 'score-concern'
})

const interpretationClass = computed(() => {
  if (!result.value) return ''
  if (result.value.atRisk) {
    return 'interpretation-warning'
  }
  return 'interpretation-normal'
})

const interpretationIcon = computed(() => {
  if (!result.value) return '📊'
  if (result.value.totalScore >= 4) return '✅'
  if (result.value.totalScore >= 3) return '⚡'
  return '⚠️'
})

// 取得結果解讀
const getResultInterpretation = computed(() => {
  if (!result.value) return null
  const score = result.value.totalScore
  let riskLevel: 'normal' | 'borderline' | 'at-risk' = 'normal'
  if (score <= 2) riskLevel = 'at-risk'
  else if (score === 3) riskLevel = 'borderline'
  
  const riskInfo = getRiskLevelDescription(riskLevel)
  return {
    level: riskInfo.label,
    description: riskInfo.description,
    needsFurtherAssessment: riskLevel === 'at-risk',
    recommendation: result.value.mmseCorrelation,
    mmseCorrespondence: score <= 2 ? '≤24' : (score === 3 ? '~24-26' : null)
  }
})

// Methods
const startTest = () => {
  sessionStartTime = Date.now()
  session.value = {
    id: `minicog-${Date.now()}`,
    startTime: new Date().toISOString(),
    language: props.language,
    wordSet: getRandomWordSet(props.language)
  }
  currentStep.value = 1
  startWordDisplay()
}

const startWordDisplay = () => {
  wordDisplayCountdown.value = 10
  showWordsComplete.value = false
  
  countdownTimer = setInterval(() => {
    wordDisplayCountdown.value--
    if (wordDisplayCountdown.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      showWordsComplete.value = true
    }
  }, 1000)
}

const proceedToClockDrawing = () => {
  currentStep.value = 2
}

const handleClockComplete = async (data: {
  selfAssessment: ClockDrawingSelfAssessment
  imageData?: string
  score: number
}) => {
  clockAssessment.value = data.selfAssessment
  clockCompletionTime.value = data.score * 1000 // 暫時使用
  
  // Check consent before storing image
  const odId = userStore.currentUser?.id
  if (!odId) {
    currentStep.value = 3
    return
  }
  
  const consent = await getDataConsent(odId)
  if (consent?.behaviorTrackingConsent && data.imageData) {
    clockImageData.value = data.imageData
  }
  
  currentStep.value = 3
}

const toggleWord = (word: string) => {
  if (showResults.value) return
  
  const index = selectedWords.value.indexOf(word)
  if (index > -1) {
    selectedWords.value.splice(index, 1)
  } else if (selectedWords.value.length < 3) {
    selectedWords.value.push(word)
  }
}

const submitRecall = () => {
  if (!session.value.wordSet || !clockAssessment.value) return
  
  showResults.value = true
  
  // Calculate results
  const correctWords = selectedWords.value.filter(w => 
    session.value.wordSet?.words.includes(w)
  )
  
  // Calculate scores
  const wordRecallScore = calculateWordRecallScore(
    session.value.wordSet,
    correctWords
  )
  const clockScore = calculateClockDrawingScore(clockAssessment.value)
  
  // Calculate duration
  const duration = Math.round((Date.now() - sessionStartTime) / 1000)
  
  // Create result
  result.value = createMiniCogResult({
    id: session.value.id,
    odId: userStore.currentUser?.id || 'anonymous',
    wordRecall: {
      wordSet: session.value.wordSet,
      immediateRecall: session.value.wordSet.words.slice(), // Assumed perfect
      delayedRecall: correctWords,
      score: wordRecallScore
    },
    clockDrawing: {
      targetTime: clockTime.value,
      selfAssessment: clockAssessment.value,
      score: clockScore,
      imageData: clockImageData.value,
      completionTime: clockCompletionTime.value
    },
    duration
  })
  
  // Short delay then show results
  setTimeout(() => {
    currentStep.value = 4
  }, 1500)
}

const retakeTest = () => {
  // Reset all state
  currentStep.value = 0
  session.value = {
    id: '',
    startTime: '',
    language: props.language,
    wordSet: null
  }
  selectedWords.value = []
  showResults.value = false
  result.value = null
  clockAssessment.value = null
  clockImageData.value = undefined
  clockCompletionTime.value = 0
  sessionStartTime = 0
}

const saveAndClose = async () => {
  if (result.value) {
    isSaving.value = true
    saveError.value = null
    
    try {
      // 確保結果有有效的使用者 ID
      const resultToSave = { ...result.value }
      
      // 如果有登入使用者，更新 odId
      if (userStore.currentUser?.id) {
        resultToSave.odId = userStore.currentUser.id
      }
      
      // 確保必要欄位存在
      if (!resultToSave.id) {
        resultToSave.id = `minicog-${Date.now()}`
      }
      if (!resultToSave.completedAt) {
        resultToSave.completedAt = new Date().toISOString()
      }
      
      // 使用 sanitizeForIDB 移除 Vue Proxy 等不可序列化的內容
      // 解決 "Failed to execute 'put' on 'IDBObjectStore': #<Object> could not be cloned" 錯誤
      const { sanitizeForIDB } = await import('@/utils/serialization')
      const sanitizedResult = sanitizeForIDB(resultToSave)
      
      console.log('Saving Mini-Cog result:', sanitizedResult)
      await saveMiniCogResult(sanitizedResult)
      saveSuccess.value = true
      
      // 短暫顯示成功訊息後觸發完成事件
      setTimeout(() => {
        emit('complete', result.value!)
      }, 1500)
    } catch (error) {
      console.error('Failed to save Mini-Cog result:', error)
      // 提供更詳細的錯誤訊息
      if (error instanceof Error) {
        saveError.value = `儲存失敗：${error.message}`
      } else {
        saveError.value = '儲存失敗，請稍後再試'
      }
      isSaving.value = false
    }
  }
}

// Lifecycle
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.mini-cog-flow {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Progress Bar */
.progress-bar {
  margin-bottom: 2rem;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--color-step);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-step-label);
  transition: all 0.3s ease;
  z-index: 1;
}

.step.active .step-circle {
  background: var(--color-step-active);
  color: var(--color-text-inverse);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.step.completed .step-circle {
  background: var(--color-step-complete);
  color: var(--color-text-inverse);
}

.step-label {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-step-label);
  text-align: center;
}

.step.active .step-label {
  color: var(--color-step-label-active);
  font-weight: 600;
}

.progress-track {
  height: 4px;
  background: var(--color-step);
  border-radius: 2px;
  margin-top: -1.75rem;
  margin-left: 1.25rem;
  margin-right: 1.25rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-step-complete) 0%, var(--color-primary) 100%);
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Step Content */
.step-content {
  background: var(--color-surface);
  border-radius: 1.5rem;
  padding: 2rem;
  box-shadow: var(--shadow-lg);
}

/* Intro Step */
.intro-step {
  text-align: center;
}

.intro-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.intro-step h2 {
  font-size: 1.75rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.intro-description {
  font-size: 1.125rem;
  color: var(--color-text-muted);
  margin-bottom: 2rem;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-infocard);
  border-radius: 1rem;
}

.info-icon {
  font-size: 1.5rem;
}

.info-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.info-text strong {
  font-size: 0.875rem;
  color: var(--color-text);
}

.info-text span {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.disclaimer {
  background: var(--color-disclaimer);
  padding: 1rem;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
}

.disclaimer p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-disclaimer-text);
}

/* Words Step */
.words-step h2 {
  text-align: center;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.instruction {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.word-display {
  margin-bottom: 2rem;
}

.words-container {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.word-card {
  padding: 1.5rem 2.5rem;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  font-size: 1.5rem;
  font-weight: 700;
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  animation: word-pop 0.5s ease forwards;
  opacity: 0;
  transform: scale(0.8);
}

@keyframes word-pop {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.timer-display {
  text-align: center;
  color: var(--color-text-muted);
}

.countdown {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 0.5rem;
}

.word-complete-section {
  text-align: center;
}

.repeat-instruction {
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.words-summary {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: 2rem;
}

/* Clock Step */
.clock-step h2 {
  text-align: center;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.clock-step .instruction strong {
  color: var(--color-primary);
  font-size: 1.25rem;
}

.clock-step .time-hint {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  font-weight: normal;
}

/* Recall Step */
.recall-step h2 {
  text-align: center;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.recall-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.recall-option {
  position: relative;
  padding: 1rem 1.5rem;
  background: var(--color-wordcard);
  border: 2px solid var(--color-wordcard-border);
  border-radius: 1rem;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.recall-option:hover {
  border-color: var(--color-primary);
  background: var(--color-wordcard-selected);
}

.recall-option.selected {
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border-color: transparent;
}

.recall-option.correct {
  background: var(--color-success);
  color: var(--color-text-inverse);
  border-color: transparent;
}

.recall-option.incorrect {
  background: var(--color-danger);
  color: var(--color-text-inverse);
  border-color: transparent;
}

.recall-option.missed {
  border-color: var(--color-success);
  border-style: dashed;
}

.result-icon {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.selection-count {
  text-align: center;
  color: var(--color-text-muted);
  margin-bottom: 2rem;
}

/* Results Step */
.results-step {
  text-align: center;
}

.results-header {
  margin-bottom: 2rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: var(--shadow-lg);
}

.score-circle.score-good {
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-score-good) 100%);
  color: var(--color-text-inverse);
}

.score-circle.score-moderate {
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-score-moderate) 100%);
  color: var(--color-text-inverse);
}

.score-circle.score-concern {
  background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-score-concern) 100%);
  color: var(--color-text-inverse);
}

.score-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-max {
  font-size: 1rem;
  opacity: 0.8;
}

.results-header h2 {
  color: var(--color-text);
}

.score-breakdown {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.score-label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.score-badge {
  padding: 0.5rem 1rem;
  background: var(--color-infocard);
  border-radius: 9999px;
  font-weight: 600;
  color: var(--color-text);
}

.interpretation-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.interpretation-card.interpretation-normal {
  background: var(--gradient-result-good);
}

.interpretation-card.interpretation-warning {
  background: var(--gradient-result-warning);
}

.interpretation-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.interpretation-content h3 {
  margin: 0 0 0.5rem;
  color: var(--color-text);
}

.interpretation-content p {
  margin: 0;
  color: var(--color-text-muted);
}

.warning-card {
  background: var(--color-danger-bg);
  padding: 1.5rem;
  border-radius: 1rem;
  border-left: 4px solid var(--color-danger);
  text-align: left;
  margin-bottom: 2rem;
}

.warning-card h4 {
  margin: 0 0 0.5rem;
  color: var(--color-score-concern);
}

.warning-card p {
  margin: 0;
  color: var(--color-text-secondary);
}

.mmse-note {
  margin-top: 0.75rem !important;
  font-size: 0.875rem;
  color: var(--color-disclaimer-text);
  background: var(--color-disclaimer);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  display: inline-block;
}

.result-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* 儲存成功覆蓋層 */
.save-success-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.5rem;
  z-index: 10;
}

.success-content {
  text-align: center;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.success-content h3 {
  font-size: 1.5rem;
  color: var(--color-score-good);
  margin-bottom: 0.5rem;
}

.success-content p {
  color: var(--color-text-muted);
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--color-score-good);
  border-radius: 50%;
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 儲存錯誤提示 */
.save-error {
  background: var(--color-danger-bg);
  color: var(--color-score-concern);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.875rem;
}

/* 按鈕載入狀態 */
.btn-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Fade 過渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-md);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -3px rgba(79, 70, 229, 0.5);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary.btn-large {
  padding: 1.25rem 3rem;
  font-size: 1.125rem;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 2px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-soft);
  border-color: var(--color-border-light);
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.word-appear-enter-active {
  transition: all 0.5s ease;
}

.word-appear-leave-active {
  transition: all 0.3s ease;
}

.word-appear-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

/* Responsive */
@media (max-width: 640px) {
  .mini-cog-flow {
    padding: 1rem;
    max-width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .step-content {
    padding: 1.5rem;
    border-radius: 1rem;
    min-height: calc(100vh - 150px);
    min-height: calc(100dvh - 150px);
  }

  .step-label {
    display: none;
  }

  .word-card {
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
  }

  .score-breakdown {
    flex-direction: column;
    gap: 1rem;
  }

  .result-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    padding: 1.25rem 2rem;
    font-size: 1.125rem;
    min-height: 56px;
  }

  h2 {
    font-size: 1.5rem !important;
  }
  
  .instruction-text {
    font-size: 1.125rem;
  }
}

/* 平板裝置優化 */
@media (min-width: 641px) and (max-width: 1024px) {
  .mini-cog-flow {
    max-width: 100%;
    padding: 1.5rem;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .step-content {
    padding: 2rem;
    min-height: calc(100vh - 180px);
    min-height: calc(100dvh - 180px);
  }

  .btn-primary,
  .btn-secondary {
    padding: 1.25rem 2.5rem;
    font-size: 1.125rem;
    min-height: 60px;
  }
}

/* 年長者友善 - 大字體模式 */
@media (max-width: 1024px) {
  .word-display h3 {
    font-size: 1.5rem;
  }

  .word-list {
    gap: 1.25rem;
  }

  .word-card {
    font-size: 1.5rem;
    padding: 1.25rem 2rem;
    min-height: 60px;
  }

  .countdown {
    font-size: 1.25rem;
    padding: 1rem 1.5rem;
  }

  .recall-options {
    gap: 1rem;
  }

  .recall-option {
    font-size: 1.25rem;
    padding: 1.25rem 1.5rem;
    min-height: 60px;
  }

  .score-display .score {
    font-size: 4rem;
  }

  .risk-indicator {
    font-size: 1.125rem;
    padding: 1rem 1.5rem;
  }
}

/* 超大螢幕（桌面全螢幕） */
@media (min-width: 1200px) {
  .mini-cog-flow {
    max-width: 900px;
  }

  .step-content {
    padding: 3rem;
  }
}

/* 橫向模式優化（手機橫放）- 增強版 */
@media (orientation: landscape) and (max-height: 500px) {
  .mini-cog-flow {
    padding: 0.5rem;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .progress-bar {
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .progress-steps {
    gap: 0.5rem;
  }

  .step-circle {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
  }

  .step-label {
    display: none;
  }

  .step-content {
    flex: 1;
    padding: 0.75rem 1rem;
    min-height: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* 說明頁橫屏並列 */
  .intro-step {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .intro-step .intro-icon {
    font-size: 2.5rem;
    margin-bottom: 0;
  }

  .intro-step h2 {
    font-size: 1.25rem !important;
    margin-bottom: 0.25rem;
    width: 100%;
    text-align: center;
  }

  .intro-description {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    width: 100%;
  }

  .info-cards {
    flex-direction: row;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    width: 100%;
  }

  .info-card {
    padding: 0.5rem;
    flex: 1;
  }

  .info-icon {
    font-size: 1rem;
  }

  .info-text strong {
    font-size: 0.75rem;
  }

  .info-text span {
    font-size: 0.625rem;
  }

  .disclaimer {
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
    width: 100%;
  }

  /* 詞語記憶頁橫屏 */
  .words-step h2 {
    font-size: 1.125rem !important;
    margin-bottom: 0.25rem;
  }

  .words-step .instruction {
    font-size: 0.9375rem;
    margin-bottom: 0.75rem;
  }

  .word-display {
    margin-bottom: 0.75rem;
  }

  .words-container {
    gap: 0.75rem;
  }

  .word-card {
    padding: 0.75rem 1.25rem;
    font-size: 1.125rem;
  }

  .countdown {
    font-size: 2rem;
  }

  .timer-display {
    font-size: 0.875rem;
  }

  /* 時鐘繪圖頁橫屏 */
  .clock-step h2 {
    font-size: 1.125rem !important;
    margin-bottom: 0.25rem;
  }

  .clock-step .instruction {
    font-size: 0.9375rem;
    margin-bottom: 0.5rem;
  }

  /* 詞語回憶頁橫屏 */
  .recall-step h2 {
    font-size: 1.125rem !important;
    margin-bottom: 0.25rem;
  }

  .recall-step .instruction {
    font-size: 0.9375rem;
    margin-bottom: 0.75rem;
  }

  .recall-options {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .recall-option {
    padding: 0.625rem 0.75rem;
    font-size: 0.9375rem;
    min-height: 44px;
  }

  .selection-count {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  /* 結果頁橫屏並列 */
  .results-step {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: center;
  }

  .results-header {
    flex: 0 0 auto;
    margin-bottom: 0;
  }

  .score-circle {
    width: 80px;
    height: 80px;
  }

  .score-value {
    font-size: 1.75rem;
  }

  .score-max {
    font-size: 0.75rem;
  }

  .results-header h2 {
    font-size: 1rem !important;
  }

  .score-breakdown {
    flex-direction: row;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .score-item {
    gap: 0.25rem;
  }

  .score-label {
    font-size: 0.75rem;
  }

  .score-badge {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .interpretation-card {
    padding: 0.75rem;
    flex: 1 1 auto;
    min-width: 250px;
  }

  .interpretation-icon {
    font-size: 1.5rem;
  }

  .interpretation-content h3 {
    font-size: 0.9375rem;
  }

  .interpretation-content p {
    font-size: 0.8125rem;
  }

  .warning-card {
    padding: 0.75rem;
    width: 100%;
  }

  .warning-card h4 {
    font-size: 0.875rem;
  }

  .warning-card p {
    font-size: 0.8125rem;
  }

  .result-actions {
    width: 100%;
    flex-direction: row;
    gap: 0.75rem;
  }

  .btn-primary,
  .btn-secondary {
    min-height: 44px;
    padding: 0.625rem 1.25rem;
    font-size: 0.9375rem;
  }

  .btn-primary.btn-large {
    padding: 0.625rem 1.5rem;
    font-size: 1rem;
  }
}

/* 觸控優化 */
@media (hover: none) and (pointer: coarse) {
  .btn-primary,
  .btn-secondary {
    min-height: 56px;
    -webkit-tap-highlight-color: transparent;
  }

  .recall-option {
    min-height: 56px;
    -webkit-tap-highlight-color: transparent;
  }

  .word-card {
    -webkit-tap-highlight-color: transparent;
  }
}

/* 成功覆蓋層深色模式 */
:root.dark .save-success-overlay {
  background: rgba(15, 23, 42, 0.95);
}
</style>

<template>
  <div class="clock-drawing-test">
    <!-- 指示區域 -->
    <div class="instructions" v-if="!isComplete">
      <h3>🕐 時鐘繪圖測試</h3>
      <p class="target-time">
        請在下方畫布上畫一個時鐘，並將指針指向 
        <strong>{{ targetTime }}</strong>
      </p>
      <p class="hint">提示：先畫圓形，再填入數字 1-12，最後畫指針</p>
    </div>

    <!-- Canvas 繪圖區域 -->
    <div class="canvas-container" v-if="!isComplete">
      <canvas
        ref="canvasRef"
        :width="responsiveCanvasSize"
        :height="responsiveCanvasSize"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend="stopDrawing"
      />
    </div>

    <!-- 繪圖工具列 -->
    <div class="toolbar" v-if="!isComplete">
      <div class="brush-size">
        <label>筆刷粗細：</label>
        <input 
          type="range" 
          v-model.number="brushSize" 
          min="2" 
          max="10" 
          step="1"
        />
        <span>{{ brushSize }}px</span>
      </div>
      
      <div class="tool-buttons">
        <button 
          class="tool-btn"
          :class="{ active: currentTool === 'pen' }"
          @click="currentTool = 'pen'"
        >
          ✏️ 畫筆
        </button>
        <button 
          class="tool-btn"
          :class="{ active: currentTool === 'eraser' }"
          @click="currentTool = 'eraser'"
        >
          🧽 橡皮擦
        </button>
        <button class="tool-btn clear-btn" @click="clearCanvas">
          🗑️ 清除
        </button>
      </div>
      
      <button class="complete-btn" @click="showSelfAssessment">
        ✅ 完成繪圖
      </button>
    </div>

    <!-- 自評量表 -->
    <div class="self-assessment" v-if="showAssessment">
      <h3>📋 評估結果</h3>
      
      <!-- AI 分析中 -->
      <div v-if="isAnalyzing" class="analyzing-indicator">
        <div class="spinner"></div>
        <p>AI 正在分析您的時鐘繪圖...</p>
      </div>
      
      <template v-else>
        <!-- AI 分析結果顯示 -->
        <div v-if="aiAnalysisResult" class="ai-result-section">
          <div class="ai-result-header">
            <span class="ai-badge">🤖 AI 自動分析</span>
            <span class="confidence-badge" :class="getConfidenceClass(aiAnalysisResult.confidence)">
              信心度: {{ aiAnalysisResult.confidence }}%
            </span>
          </div>
          
          <div class="ai-score-display">
            <div class="ai-score-circle" :class="getAIScoreClass(aiAnalysisResult.overallScore)">
              <span class="score-num">{{ aiAnalysisResult.overallScore }}</span>
              <span class="score-max">/2</span>
            </div>
            <div class="ai-score-breakdown">
              <div class="breakdown-row" :class="{ correct: aiAnalysisResult.hasCircle }">
                <span class="icon">{{ aiAnalysisResult.hasCircle ? '✅' : '❌' }}</span>
                <span>完整圓形 ({{ aiAnalysisResult.circleQuality }}%)</span>
              </div>
              <div class="breakdown-row" :class="{ correct: aiAnalysisResult.numbersPositionScore >= 50 }">
                <span class="icon">{{ aiAnalysisResult.numbersPositionScore >= 50 ? '✅' : '❌' }}</span>
                <span>數字位置 (偵測到 {{ aiAnalysisResult.numbersDetected.length }}/12)</span>
              </div>
              <div class="breakdown-row" :class="{ correct: aiAnalysisResult.handsPointToCorrectTime }">
                <span class="icon">{{ aiAnalysisResult.handsPointToCorrectTime ? '✅' : '❌' }}</span>
                <span>指針時間正確</span>
              </div>
            </div>
          </div>
          
          <!-- 詳細分析展開 -->
          <button class="details-toggle" @click="showAIDetails = !showAIDetails">
            {{ showAIDetails ? '收起詳細分析 ▲' : '查看詳細分析 ▼' }}
          </button>
          <div v-if="showAIDetails" class="ai-details">
            <ul>
              <li v-for="(detail, index) in aiAnalysisResult.analysisDetails" :key="index">
                {{ detail }}
              </li>
            </ul>
          </div>
        </div>

        <p class="assessment-intro">
          {{ aiAnalysisResult ? 'AI 已自動分析，您可以確認或修改以下評估：' : '請根據您剛才畫的時鐘，勾選符合的項目：' }}
        </p>
        
        <div class="assessment-preview">
          <img 
            v-if="previewImageUrl" 
            :src="previewImageUrl" 
            alt="您畫的時鐘"
            class="clock-preview"
          />
        </div>

        <div class="assessment-items">
          <label class="assessment-item" :class="{ 'ai-suggested': aiAnalysisResult?.selfAssessment.hasCompleteCircle }">
            <input 
              type="checkbox" 
              v-model="selfAssessment.hasCompleteCircle"
            />
            <span class="checkmark">✓</span>
            <span class="item-text">
              <strong>完整圓形</strong>
              <small>時鐘的外框是一個完整的圓形（或接近圓形）</small>
            </span>
          </label>

          <label class="assessment-item" :class="{ 'ai-suggested': aiAnalysisResult?.selfAssessment.hasCorrectNumbers }">
            <input 
              type="checkbox" 
              v-model="selfAssessment.hasCorrectNumbers"
            />
            <span class="checkmark">✓</span>
            <span class="item-text">
              <strong>數字位置正確</strong>
              <small>數字 1-12 的位置大致正確（12 在上、6 在下、3 在右、9 在左）</small>
            </span>
          </label>

          <label class="assessment-item" :class="{ 'ai-suggested': aiAnalysisResult?.selfAssessment.hasCorrectHands }">
            <input 
              type="checkbox" 
              v-model="selfAssessment.hasCorrectHands"
            />
            <span class="checkmark">✓</span>
            <span class="item-text">
              <strong>指針指向正確時間</strong>
              <small>時針和分針正確指向 {{ targetTime }}</small>
            </span>
          </label>
        </div>

        <div class="assessment-actions">
          <button class="back-btn" @click="showAssessment = false; aiAnalysisResult = null">
            ← 返回修改
          </button>
          <button class="submit-btn" @click="submitResult">
            確認提交 →
          </button>
        </div>
      </template>
    </div>

    <!-- 完成結果 -->
    <div class="result" v-if="isComplete && !showAssessment">
      <h3>✅ 時鐘繪圖完成</h3>
      <div class="score-display">
        <span class="score-label">得分：</span>
        <span class="score-value" :class="scoreClass">
          {{ score }}/2
        </span>
      </div>
      <p class="score-description">{{ scoreDescription }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ClockDrawingSelfAssessment, ClockDrawingResult } from '@/services/miniCogService'
import { calculateClockDrawingScore } from '@/services/miniCogService'
import { analyzeClockDrawing, type ClockAnalysisResult } from '@/services/clockDrawingAnalyzer'

// Props
const props = withDefaults(defineProps<{
  targetTime?: string
  canvasSize?: number
  behaviorTrackingConsent?: boolean
  enableAIAnalysis?: boolean  // 啟用 AI 自動分析
}>(), {
  targetTime: '11:10',
  canvasSize: 350,
  behaviorTrackingConsent: false,
  enableAIAnalysis: true,  // 預設啟用
})

// Emits
const emit = defineEmits<{
  (e: 'complete', result: ClockDrawingResult): void
}>()

// 響應式 Canvas 尺寸
const responsiveCanvasSize = ref(props.canvasSize)

// 計算適合螢幕的 canvas 尺寸
function calculateResponsiveSize(): number {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const padding = 40 // 預留邊距
  
  // 手機模式
  if (windowWidth < 640) {
    return Math.min(windowWidth - padding, windowHeight * 0.4, 350)
  }
  // 平板模式
  if (windowWidth < 1024) {
    return Math.min(windowWidth * 0.6, windowHeight * 0.5, 400)
  }
  // 桌面模式
  return props.canvasSize
}

// 處理視窗大小變化
function handleResize() {
  const newSize = calculateResponsiveSize()
  if (newSize !== responsiveCanvasSize.value) {
    // 保存當前繪圖
    const canvas = canvasRef.value
    const tempCanvas = document.createElement('canvas')
    if (canvas) {
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx?.drawImage(canvas, 0, 0)
    }
    
    responsiveCanvasSize.value = newSize
    
    // 在下一個 tick 恢復繪圖
    setTimeout(() => {
      const ctx = getContext()
      if (ctx && canvas) {
        canvas.width = newSize
        canvas.height = newSize
        // 縮放恢復繪圖
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, newSize, newSize)
      }
    }, 0)
  }
}

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const currentTool = ref<'pen' | 'eraser'>('pen')
const brushSize = ref(4)
const showAssessment = ref(false)
const isComplete = ref(false)
const previewImageUrl = ref<string>('')
const startTime = ref<number>(0)

// AI 分析相關
const isAnalyzing = ref(false)
const aiAnalysisResult = ref<ClockAnalysisResult | null>(null)
const showAIDetails = ref(false)

// 自評結果
const selfAssessment = ref<ClockDrawingSelfAssessment>({
  hasCompleteCircle: false,
  hasCorrectNumbers: false,
  hasCorrectHands: false,
})

// 計算屬性
const score = computed(() => calculateClockDrawingScore(selfAssessment.value))

const scoreClass = computed(() => {
  if (score.value === 2) return 'score-high'
  if (score.value === 1) return 'score-medium'
  return 'score-low'
})

const scoreDescription = computed(() => {
  if (score.value === 2) return '時鐘繪製完整且正確'
  if (score.value === 1) return '時鐘繪製部分正確'
  return '時鐘繪製需要改進'
})

// AI 分析輔助函數
function getConfidenceClass(confidence: number): string {
  if (confidence >= 70) return 'confidence-high'
  if (confidence >= 40) return 'confidence-medium'
  return 'confidence-low'
}

function getAIScoreClass(aiScore: number): string {
  if (aiScore === 2) return 'ai-score-high'
  if (aiScore === 1) return 'ai-score-medium'
  return 'ai-score-low'
}

// 取得 Canvas Context
function getContext(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') || null
}

// 初始化 Canvas
function initCanvas() {
  const ctx = getContext()
  if (!ctx) return
  
  const size = responsiveCanvasSize.value
  
  // 設定白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  // 畫一個淡灰色的圓形參考線
  ctx.beginPath()
  ctx.arc(
    size / 2,
    size / 2,
    size / 2 - 20,
    0,
    Math.PI * 2
  )
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.setLineDash([])
  
  // 記錄開始時間
  startTime.value = Date.now()
}

// 開始繪圖
function startDrawing(e: MouseEvent) {
  isDrawing.value = true
  const ctx = getContext()
  if (!ctx) return
  
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  ctx.beginPath()
  ctx.moveTo(x, y)
}

// 繪圖
function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const ctx = getContext()
  if (!ctx) return
  
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  ctx.lineTo(x, y)
  ctx.strokeStyle = currentTool.value === 'pen' ? '#1f2937' : '#ffffff'
  ctx.lineWidth = currentTool.value === 'eraser' ? brushSize.value * 3 : brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// 停止繪圖
function stopDrawing() {
  isDrawing.value = false
}

// 觸控支援
function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  
  isDrawing.value = true
  const ctx = getContext()
  if (!ctx) return
  
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function handleTouchMove(e: TouchEvent) {
  if (!isDrawing.value) return
  const touch = e.touches[0]
  if (!touch) return
  
  const ctx = getContext()
  if (!ctx) return
  
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  
  ctx.lineTo(x, y)
  ctx.strokeStyle = currentTool.value === 'pen' ? '#1f2937' : '#ffffff'
  ctx.lineWidth = currentTool.value === 'eraser' ? brushSize.value * 3 : brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// 清除畫布
function clearCanvas() {
  const ctx = getContext()
  if (!ctx) return
  
  const size = responsiveCanvasSize.value
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  // 重新畫參考線
  ctx.beginPath()
  ctx.arc(
    size / 2,
    size / 2,
    size / 2 - 20,
    0,
    Math.PI * 2
  )
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.setLineDash([])
}

// 顯示自評量表
async function showSelfAssessment() {
  // 產生預覽圖
  if (canvasRef.value) {
    previewImageUrl.value = canvasRef.value.toDataURL('image/png')
  }
  
  // 如果啟用 AI 分析，先執行分析
  if (props.enableAIAnalysis && previewImageUrl.value) {
    isAnalyzing.value = true
    try {
      aiAnalysisResult.value = await analyzeClockDrawing(previewImageUrl.value, props.targetTime)
      // 使用 AI 分析結果預填自評
      selfAssessment.value = { ...aiAnalysisResult.value.selfAssessment }
    } catch (error) {
      console.error('AI 分析失敗:', error)
      aiAnalysisResult.value = null
    } finally {
      isAnalyzing.value = false
    }
  }
  
  showAssessment.value = true
}

// 提交結果
function submitResult() {
  const completionTime = Date.now() - startTime.value
  const finalScore = calculateClockDrawingScore(selfAssessment.value)
  
  const result: ClockDrawingResult = {
    targetTime: props.targetTime,
    selfAssessment: { ...selfAssessment.value },
    score: finalScore,
    completionTime,
  }
  
  // 根據同意設定決定是否儲存圖片
  if (props.behaviorTrackingConsent && canvasRef.value) {
    result.imageData = canvasRef.value.toDataURL('image/png')
  }
  
  isComplete.value = true
  showAssessment.value = false
  
  emit('complete', result)
}

// 生命週期
onMounted(() => {
  // 初始計算響應式尺寸
  responsiveCanvasSize.value = calculateResponsiveSize()
  
  // 添加視窗大小變化監聽
  window.addEventListener('resize', handleResize)
  
  // 初始化畫布
  setTimeout(initCanvas, 0)
})

onUnmounted(() => {
  // 移除監聽器
  window.removeEventListener('resize', handleResize)
  // 清理
  previewImageUrl.value = ''
})
</script>

<style scoped>
.clock-drawing-test {
  max-width: 450px;
  margin: 0 auto;
  padding: 1rem;
}

.instructions {
  text-align: center;
  margin-bottom: 1rem;
}

.instructions h3 {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.target-time {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.target-time strong {
  color: #2563eb;
  font-size: 1.3rem;
}

.hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

canvas {
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: #ffffff; /* 繪圖區始終保持白色 */
  cursor: crosshair;
  touch-action: none;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-bg-soft);
  border-radius: 12px;
}

.brush-size {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.brush-size input[type="range"] {
  flex: 1;
  max-width: 150px;
}

.tool-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: var(--color-bg-soft);
}

.tool-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.clear-btn {
  margin-left: auto;
  border-color: #fca5a5;
  color: #dc2626;
}

.clear-btn:hover {
  background: #fef2f2;
}

.complete-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.complete-btn:hover {
  background: #1d4ed8;
}

/* 自評量表 */
.self-assessment {
  padding: 1rem;
}

.self-assessment h3 {
  text-align: center;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.assessment-intro {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.assessment-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.clock-preview {
  max-width: 200px;
  max-height: 200px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.assessment-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.assessment-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-bg-soft);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.assessment-item:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.assessment-item input[type="checkbox"] {
  display: none;
}

.assessment-item input:checked + .checkmark {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}

.checkmark {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: transparent;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.2s;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-text strong {
  color: var(--color-text);
  font-size: 1rem;
}

.item-text small {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.assessment-actions {
  display: flex;
  gap: 1rem;
}

.back-btn, .submit-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn {
  background: var(--color-bg-soft);
  border: 2px solid var(--color-border);
  color: var(--color-text-secondary);
}

.back-btn:hover {
  background: var(--color-surface);
}

.submit-btn {
  background: #22c55e;
  border: none;
  color: white;
}

.submit-btn:hover {
  background: #16a34a;
}

/* 結果顯示 */
.result {
  text-align: center;
  padding: 2rem;
  background: var(--color-bg-soft);
  border-radius: 12px;
}

.result h3 {
  color: var(--color-text);
  margin-bottom: 1rem;
}

.score-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.score-label {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.score-value {
  font-size: 2rem;
  font-weight: bold;
}

.score-high {
  color: #22c55e;
}

.score-medium {
  color: #f59e0b;
}

.score-low {
  color: #ef4444;
}

.score-description {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

/* AI 分析相關樣式 */
.analyzing-indicator {
  text-align: center;
  padding: 2rem;
}

.analyzing-indicator p {
  color: var(--color-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result-section {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.ai-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.ai-badge {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.confidence-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.confidence-high {
  background: #dcfce7;
  color: #166534;
}

.confidence-medium {
  background: #fef3c7;
  color: #92400e;
}

.confidence-low {
  background: #fee2e2;
  color: #991b1b;
}

.ai-score-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ai-score-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-score-high {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.ai-score-medium {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.ai-score-low {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.ai-score-circle .score-num {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.ai-score-circle .score-max {
  font-size: 0.75rem;
  opacity: 0.8;
}

.ai-score-breakdown {
  flex: 1;
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.25rem 0;
  color: var(--color-text-muted);
}

.breakdown-row.correct {
  color: #166534;
}

.breakdown-row .icon {
  font-size: 1rem;
}

.details-toggle {
  display: block;
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: transparent;
  border: 1px dashed #93c5fd;
  border-radius: 0.5rem;
  color: #2563eb;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.details-toggle:hover {
  background: #eff6ff;
}

.ai-details {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 0.5rem;
  font-size: 0.8rem;
}

.ai-details ul {
  margin: 0;
  padding-left: 1.25rem;
}

.ai-details li {
  color: var(--color-text-secondary);
  margin: 0.25rem 0;
}

.assessment-item.ai-suggested {
  border-color: #3b82f6;
  background: #eff6ff;
}

/* ========== 響應式設計 - 年長者友善 ========== */

/* 手機優化 */
@media (max-width: 640px) {
  .clock-drawing-test {
    padding: 0.75rem;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .instructions {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .instructions h3 {
    font-size: 1.25rem;
  }

  .target-time {
    font-size: 1.125rem;
  }

  .hint {
    font-size: 0.9rem;
  }

  .canvas-container {
    margin: 0 auto 0.75rem;
    max-width: 100%;
    overflow: hidden;
  }

  .canvas-container canvas {
    width: 100% !important;
    height: auto !important;
    max-width: 100vw;
    touch-action: none;
  }

  .toolbar {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .brush-size {
    width: 100%;
    justify-content: space-between;
  }

  .tool-buttons {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tool-btn {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    min-height: 48px;
    flex: 1;
    min-width: 100px;
  }

  .complete-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1.125rem;
    min-height: 56px;
  }

  .self-assessment {
    padding: 1rem;
  }

  .self-assessment h3 {
    font-size: 1.25rem;
  }

  .assessment-item {
    padding: 0.875rem;
  }

  .assessment-item label {
    font-size: 1rem;
  }

  .submit-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1.125rem;
    min-height: 56px;
  }

  .ai-result-section {
    padding: 0.75rem;
  }

  .ai-result-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .ai-score-display {
    flex-direction: column;
    text-align: center;
  }

  .ai-score-circle {
    width: 80px;
    height: 80px;
    margin: 0 auto;
  }

  .ai-score-circle .score-num {
    font-size: 2rem;
  }

  .breakdown-row {
    font-size: 1rem;
    padding: 0.5rem 0;
  }
}

/* 平板優化 */
@media (min-width: 641px) and (max-width: 1024px) {
  .clock-drawing-test {
    padding: 1rem;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .canvas-container {
    max-width: 450px;
    margin: 0 auto 1rem;
  }

  .toolbar {
    max-width: 500px;
    margin: 0 auto;
  }

  .tool-btn {
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
  }

  .complete-btn {
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }

  .self-assessment {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
  }
}

/* 年長者友善大字體 */
@media (max-width: 1024px) {
  .assessment-item label {
    font-size: 1.125rem;
  }

  .assessment-item input[type="checkbox"] {
    width: 24px;
    height: 24px;
    margin-right: 0.75rem;
  }

  .score-value {
    font-size: 2.5rem;
  }

  .result h3 {
    font-size: 1.5rem;
  }
}

/* 橫向模式（手機橫放） */
@media (max-height: 500px) and (orientation: landscape) {
  .clock-drawing-test {
    padding: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .instructions {
    flex: 1 1 100%;
    padding: 0.5rem;
    margin-bottom: 0;
  }

  .instructions h3 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .canvas-container {
    flex: 0 0 auto;
    max-width: 280px;
  }

  .toolbar {
    flex: 1;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .self-assessment {
    padding: 0.75rem;
  }
}

/* 觸控裝置優化 */
@media (hover: none) and (pointer: coarse) {
  .canvas-container canvas {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .tool-btn,
  .complete-btn,
  .submit-btn {
    min-height: 48px;
    -webkit-tap-highlight-color: transparent;
  }

  .assessment-item {
    min-height: 56px;
    display: flex;
    align-items: center;
    -webkit-tap-highlight-color: transparent;
  }
}

/* 深色模式 - 使用 .dark class 而非 media query */
:root.dark .clock-drawing-test {
  background: var(--color-background);
  color: var(--color-text);
}

:root.dark .instructions {
  background: var(--color-bg-soft);
  border-color: var(--color-border);
}

:root.dark .canvas-container {
  border-color: var(--color-border);
  background: var(--color-bg-soft);
}

/* 繪圖區始終保持白色以確保清晰度 */
:root.dark .canvas-container canvas {
  background: white;
}

:root.dark .toolbar {
  background: var(--color-bg-soft);
  border-color: var(--color-border);
}

:root.dark .tool-btn {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

:root.dark .tool-btn:hover,
:root.dark .tool-btn.active {
  background: #4f46e5;
  color: white;
}

:root.dark .self-assessment {
  background: var(--color-bg-soft);
}

:root.dark .assessment-item {
  background: var(--color-surface);
  border-color: var(--color-border);
}

:root.dark .assessment-item:hover {
  background: rgba(79, 70, 229, 0.2);
  border-color: #6366f1;
}

:root.dark .result {
  background: var(--color-bg-soft);
}

:root.dark .ai-result-section {
  background: linear-gradient(135deg, #1e3a5f, var(--color-bg-soft));
  border-color: #3b82f6;
}

:root.dark .ai-details {
  background: var(--color-bg-soft);
}

:root.dark .ai-details li {
  color: var(--color-text-secondary);
}

/* 全螢幕時確保內容填滿 */
.clock-drawing-test:fullscreen,
.clock-drawing-test:-webkit-full-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  background: white;
}
</style>

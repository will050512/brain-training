<template>
  <div 
    ref="containerRef"
    class="clock-drawing-test"
    :class="{ 'pseudo-fullscreen': isPseudoFullscreen }"
  >
    <!-- 模擬全螢幕關閉按鈕 -->
    <button 
      v-if="isPseudoFullscreen" 
      class="pseudo-fullscreen-close"
      @click="exitPseudoFullscreen"
    >
      ✕
    </button>

    <!-- 指示區域 -->
    <div class="instructions" v-if="!isComplete">
      <h3>🕐 時鐘繪圖測試</h3>
      <p class="target-time">
        請{{ currentMode === 'draw' ? '在下方畫布上畫' : '組裝' }}一個時鐘，並將指針指向 
        <strong>{{ actualTargetTime }}</strong>
        <span class="time-hint">（{{ targetTimeDescription }}）</span>
      </p>
      <p class="hint" v-if="currentMode === 'draw'">提示：先畫圓形，再填入數字 1-12，最後畫指針</p>
      <p class="hint" v-else>提示：拖放數字到正確位置，然後旋轉指針設定時間</p>
      
      <!-- 模式切換按鈕 -->
      <div class="mode-toggle">
        <button 
          class="mode-btn" 
          :class="{ active: currentMode === 'draw' }"
          @click="switchMode('draw')"
        >
          🖊️ 繪製模式
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: currentMode === 'assemble' }"
          @click="switchMode('assemble')"
        >
          🧩 組裝模式
        </button>
      </div>
    </div>

    <!-- Canvas 繪圖區域 -->
    <div class="canvas-container" v-if="!isComplete && currentMode === 'draw'">
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

    <!-- 組裝模式區域 -->
    <div 
      class="assemble-container" 
      v-if="!isComplete && currentMode === 'assemble'"
      ref="assembleContainerRef"
    >
      <!-- 時鐘面盤 -->
      <div 
        class="clock-face"
        :style="{ width: clockFaceSize + 'px', height: clockFaceSize + 'px' }"
      >
        <!-- 吸附區域指示器（可選） -->
        <div 
          v-for="pos in snapPositions" 
          :key="pos.number"
          class="snap-indicator"
          :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
          :class="{ 'occupied': isPositionOccupied(pos.number) }"
        >
          {{ pos.number }}
        </div>

        <!-- 可拖放的數字 -->
        <div 
          v-for="num in assembleNumbers"
          :key="num.id"
          class="draggable-number"
          :class="{ 
            'dragging': num.isDragging,
            'snapped': num.snapped
          }"
          :style="{ 
            left: num.x + 'px', 
            top: num.y + 'px',
            transform: num.isDragging ? 'scale(1.2)' : 'scale(1)'
          }"
          @mousedown="startDragNumber($event, num)"
          @touchstart.prevent="startDragNumberTouch($event, num)"
        >
          {{ num.value }}
        </div>

        <!-- 時針 -->
        <div 
          class="clock-hand hour-hand"
          :style="{ transform: `rotate(${hourHandAngle}deg)` }"
          @mousedown="startRotateHand('hour', $event)"
          @touchstart.prevent="startRotateHandTouch('hour', $event)"
        >
          <div class="hand-grip">🔴</div>
        </div>

        <!-- 分針 -->
        <div 
          class="clock-hand minute-hand"
          :style="{ transform: `rotate(${minuteHandAngle}deg)` }"
          @mousedown="startRotateHand('minute', $event)"
          @touchstart.prevent="startRotateHandTouch('minute', $event)"
        >
          <div class="hand-grip">🔵</div>
        </div>

        <!-- 中心點 -->
        <div class="clock-center"></div>
      </div>

      <!-- 數字備用區 -->
      <div class="number-pool" v-if="unplacedNumbers.length > 0">
        <p class="pool-hint">拖放下方數字到時鐘上：</p>
        <div class="pool-numbers">
          <div 
            v-for="num in unplacedNumbers"
            :key="'pool-' + num.id"
            class="pool-number"
            @mousedown="startDragNumber($event, num)"
            @touchstart.prevent="startDragNumberTouch($event, num)"
          >
            {{ num.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- 繪圖工具列（僅繪製模式） -->
    <div class="toolbar" v-if="!isComplete && currentMode === 'draw'">
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
        <!-- 全螢幕按鈕 -->
        <button 
          class="tool-btn fullscreen-btn" 
          @click="toggleFullscreen"
          :title="isFullscreen || isPseudoFullscreen ? '退出全螢幕' : '全螢幕模式'"
        >
          {{ isFullscreen || isPseudoFullscreen ? '✖' : '⛶' }}
        </button>
      </div>
      
      <button class="complete-btn" @click="showSelfAssessment">
        ✅ 完成繪圖
      </button>
    </div>

    <!-- 組裝模式工具列 -->
    <div class="toolbar assemble-toolbar" v-if="!isComplete && currentMode === 'assemble'">
      <div class="assemble-info">
        <span class="info-item">
          📍 已放置：{{ placedNumbersCount }}/12 個數字
        </span>
        <span class="info-item">
          🕐 時針：{{ Math.round(hourHandAngle) }}°
        </span>
        <span class="info-item">
          🕐 分針：{{ Math.round(minuteHandAngle) }}°
        </span>
      </div>
      
      <div class="assemble-actions">
        <button class="tool-btn reset-btn" @click="resetAssemble">
          🔄 重置
        </button>
        <button 
          class="complete-btn" 
          @click="completeAssemble"
          :disabled="placedNumbersCount < 12"
        >
          ✅ 完成組裝
        </button>
      </div>
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
              <small>時針和分針正確指向 {{ actualTargetTime }}（{{ targetTimeDescription }}）</small>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { ClockDrawingSelfAssessment, ClockDrawingResult } from '@/services/miniCogService'
import { calculateClockDrawingScore } from '@/services/miniCogService'
import { analyzeClockDrawing, getRandomClockTime, getTimeDescription, type ClockAnalysisResult } from '@/services/clockDrawingAnalyzer'
import { useTheme } from '@/composables/useTheme'

// 主題
const { isDark } = useTheme()

// 輔助函式：從 CSS 變數取得實際顏色值
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Props
const props = withDefaults(defineProps<{
  targetTime?: string
  randomize?: boolean  // 是否隨機化題目時間
  canvasSize?: number
  behaviorTrackingConsent?: boolean
  enableAIAnalysis?: boolean  // 啟用 AI 自動分析
}>(), {
  targetTime: '',  // 空字串表示使用隨機時間
  randomize: true, // 預設啟用隨機化
  canvasSize: 350,
  behaviorTrackingConsent: false,
  enableAIAnalysis: true,  // 預設啟用
})

// 實際使用的目標時間（支援隨機化）
const actualTargetTime = ref<string>('')
const targetTimeDescription = computed(() => getTimeDescription(actualTargetTime.value))

// 初始化目標時間
function initializeTargetTime() {
  if (props.targetTime) {
    // 如果有指定時間，使用指定的
    actualTargetTime.value = props.targetTime
  } else if (props.randomize) {
    // 隨機選擇時間
    actualTargetTime.value = getRandomClockTime()
  } else {
    // 預設使用 11:10
    actualTargetTime.value = '11:10'
  }
}

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
const containerRef = ref<HTMLElement | null>(null)
const assembleContainerRef = ref<HTMLElement | null>(null)
const isDrawing = ref(false)
const currentTool = ref<'pen' | 'eraser'>('pen')
const brushSize = ref(4)
const showAssessment = ref(false)
const isComplete = ref(false)
const previewImageUrl = ref<string>('')
const startTime = ref<number>(0)

// ===== 模式切換 =====
type ClockMode = 'draw' | 'assemble'
const currentMode = ref<ClockMode>('draw')

// 偵測裝置類型，行動裝置預設組裝模式
function detectDefaultMode(): ClockMode {
  const isMobile = window.innerWidth < 768 || 'ontouchstart' in window
  return isMobile ? 'assemble' : 'draw'
}

function switchMode(mode: ClockMode) {
  currentMode.value = mode
  if (mode === 'assemble') {
    initAssembleMode()
  }
}

// ===== 組裝模式狀態 =====
interface AssembleNumber {
  id: number
  value: number
  x: number
  y: number
  isDragging: boolean
  snapped: boolean
  snappedTo: number | null  // 吸附到哪個位置（1-12）
  isCorrect: boolean
}

const assembleNumbers = ref<AssembleNumber[]>([])
const hourHandAngle = ref(0)  // 時針角度（0 = 12點方向）
const minuteHandAngle = ref(0)  // 分針角度
const clockFaceSize = ref(300)
const draggingNumber = ref<AssembleNumber | null>(null)
const rotatingHand = ref<'hour' | 'minute' | null>(null)

// 12 個數字的正確位置（圓周上等分）
const snapPositions = computed(() => {
  const size = clockFaceSize.value
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 40  // 距離邊緣留白
  
  return Array.from({ length: 12 }, (_, i) => {
    const number = i === 0 ? 12 : i
    // 從 12 點方向開始（-90度），順時針
    const angle = ((i * 30) - 90) * (Math.PI / 180)
    return {
      number,
      x: centerX + radius * Math.cos(angle) - 15,  // -15 居中調整
      y: centerY + radius * Math.sin(angle) - 15,
      angle: i * 30
    }
  })
})

// 未放置的數字
const unplacedNumbers = computed(() => 
  assembleNumbers.value.filter(n => !n.snapped)
)

// 已放置數字計數
const placedNumbersCount = computed(() => 
  assembleNumbers.value.filter(n => n.snapped).length
)

// 檢查位置是否已被佔用
function isPositionOccupied(posNumber: number): boolean {
  return assembleNumbers.value.some(n => n.snappedTo === posNumber)
}

// 初始化組裝模式
function initAssembleMode() {
  const size = Math.min(window.innerWidth - 40, 350)
  clockFaceSize.value = size
  
  // 初始化 12 個數字，打亂順序放在備用區
  const numbers = Array.from({ length: 12 }, (_, i) => i + 1)
  const shuffled = numbers.sort(() => Math.random() - 0.5)
  
  assembleNumbers.value = shuffled.map((value, index) => ({
    id: index,
    value,
    x: -100,  // 初始放在畫面外（備用區）
    y: -100,
    isDragging: false,
    snapped: false,
    snappedTo: null,
    isCorrect: false
  }))
  
  // 初始化指針角度
  hourHandAngle.value = 0
  minuteHandAngle.value = 0
  
  startTime.value = Date.now()
}

// 開始拖動數字（滑鼠）
function startDragNumber(event: MouseEvent, num: AssembleNumber) {
  event.preventDefault()
  draggingNumber.value = num
  num.isDragging = true
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  num.x = event.clientX - rect.left - 15
  num.y = event.clientY - rect.top - 15
  
  // 如果從吸附位置拖出，解除吸附
  if (num.snapped) {
    num.snapped = false
    num.snappedTo = null
    num.isCorrect = false
  }
  
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

// 開始拖動數字（觸控）
function startDragNumberTouch(event: TouchEvent, num: AssembleNumber) {
  const touch = event.touches[0]
  if (!touch) return
  
  draggingNumber.value = num
  num.isDragging = true
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  num.x = touch.clientX - rect.left - 15
  num.y = touch.clientY - rect.top - 15
  
  if (num.snapped) {
    num.snapped = false
    num.snappedTo = null
    num.isCorrect = false
  }
  
  document.addEventListener('touchmove', handleDragMoveTouch, { passive: false })
  document.addEventListener('touchend', handleDragEndTouch)
}

// 拖動中（滑鼠）
function handleDragMove(event: MouseEvent) {
  if (!draggingNumber.value) return
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  draggingNumber.value.x = event.clientX - rect.left - 15
  draggingNumber.value.y = event.clientY - rect.top - 15
}

// 拖動中（觸控）
function handleDragMoveTouch(event: TouchEvent) {
  event.preventDefault()
  const touch = event.touches[0]
  if (!touch || !draggingNumber.value) return
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  draggingNumber.value.x = touch.clientX - rect.left - 15
  draggingNumber.value.y = touch.clientY - rect.top - 15
}

// 拖動結束
function handleDragEnd() {
  if (draggingNumber.value) {
    checkSnapPosition(draggingNumber.value)
    draggingNumber.value.isDragging = false
    draggingNumber.value = null
  }
  
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

function handleDragEndTouch() {
  if (draggingNumber.value) {
    checkSnapPosition(draggingNumber.value)
    draggingNumber.value.isDragging = false
    draggingNumber.value = null
  }
  
  document.removeEventListener('touchmove', handleDragMoveTouch)
  document.removeEventListener('touchend', handleDragEndTouch)
}

// 檢查是否吸附到正確位置
function checkSnapPosition(num: AssembleNumber) {
  const SNAP_RADIUS = 40  // 40px 吸附容差
  
  for (const pos of snapPositions.value) {
    // 檢查該位置是否已被其他數字佔用
    if (isPositionOccupied(pos.number)) continue
    
    const distance = Math.hypot(num.x - pos.x, num.y - pos.y)
    
    if (distance <= SNAP_RADIUS) {
      // 吸附到該位置
      num.x = pos.x
      num.y = pos.y
      num.snapped = true
      num.snappedTo = pos.number
      num.isCorrect = num.value === pos.number
      
      // 震動回饋
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      
      return
    }
  }
  
  // 沒有吸附，放回備用區
  num.x = -100
  num.y = -100
  num.snapped = false
  num.snappedTo = null
  num.isCorrect = false
}

// 開始旋轉指針（滑鼠）
function startRotateHand(hand: 'hour' | 'minute', event: MouseEvent) {
  event.preventDefault()
  rotatingHand.value = hand
  
  document.addEventListener('mousemove', handleRotateMove)
  document.addEventListener('mouseup', handleRotateEnd)
}

// 開始旋轉指針（觸控）
function startRotateHandTouch(hand: 'hour' | 'minute', event: TouchEvent) {
  rotatingHand.value = hand
  
  document.addEventListener('touchmove', handleRotateMoveTouch, { passive: false })
  document.addEventListener('touchend', handleRotateEndTouch)
}

// 計算旋轉角度
function calculateAngle(clientX: number, clientY: number): number {
  const container = assembleContainerRef.value
  if (!container) return 0
  
  const rect = container.getBoundingClientRect()
  const clockFace = container.querySelector('.clock-face')
  if (!clockFace) return 0
  
  const clockRect = (clockFace as HTMLElement).getBoundingClientRect()
  const centerX = clockRect.left + clockRect.width / 2
  const centerY = clockRect.top + clockRect.height / 2
  
  // 計算角度（以12點方向為0度）
  const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90
  return (angle + 360) % 360
}

// 旋轉中（滑鼠）
function handleRotateMove(event: MouseEvent) {
  if (!rotatingHand.value) return
  
  const angle = calculateAngle(event.clientX, event.clientY)
  
  if (rotatingHand.value === 'hour') {
    hourHandAngle.value = angle
  } else {
    minuteHandAngle.value = angle
  }
}

// 旋轉中（觸控）
function handleRotateMoveTouch(event: TouchEvent) {
  event.preventDefault()
  const touch = event.touches[0]
  if (!touch || !rotatingHand.value) return
  
  const angle = calculateAngle(touch.clientX, touch.clientY)
  
  if (rotatingHand.value === 'hour') {
    hourHandAngle.value = angle
  } else {
    minuteHandAngle.value = angle
  }
}

// 旋轉結束
function handleRotateEnd() {
  rotatingHand.value = null
  document.removeEventListener('mousemove', handleRotateMove)
  document.removeEventListener('mouseup', handleRotateEnd)
}

function handleRotateEndTouch() {
  rotatingHand.value = null
  document.removeEventListener('touchmove', handleRotateMoveTouch)
  document.removeEventListener('touchend', handleRotateEndTouch)
}

// 重置組裝
function resetAssemble() {
  initAssembleMode()
}

// 完成組裝，進行評分
function completeAssemble() {
  // 計算數字位置正確率
  const correctNumbers = assembleNumbers.value.filter(n => n.isCorrect).length
  const numbersScore = correctNumbers / 12
  
  // 計算指針角度正確性
  const [targetHour = 0, targetMinute = 0] = actualTargetTime.value.split(':').map(Number)
  
  // 目標時針角度：每小時30度 + 每分鐘0.5度
  const targetHourAngle = ((targetHour % 12) * 30 + targetMinute * 0.5) % 360
  // 目標分針角度：每分鐘6度
  const targetMinuteAngle = (targetMinute * 6) % 360
  
  // 角度誤差（考慮360度環繞）
  const hourError = Math.min(
    Math.abs(hourHandAngle.value - targetHourAngle),
    360 - Math.abs(hourHandAngle.value - targetHourAngle)
  )
  const minuteError = Math.min(
    Math.abs(minuteHandAngle.value - targetMinuteAngle),
    360 - Math.abs(minuteHandAngle.value - targetMinuteAngle)
  )
  
  // 時針容許誤差 15 度，分針容許誤差 20 度
  const hourCorrect = hourError <= 15
  const minuteCorrect = minuteError <= 20
  const handsCorrect = hourCorrect && minuteCorrect
  
  // 設定自評結果
  selfAssessment.value = {
    hasCompleteCircle: true,  // 組裝模式圓形一定完整
    hasCorrectNumbers: numbersScore >= 0.75,  // 75% 以上數字正確
    hasCorrectHands: handsCorrect
  }
  
  // 產生預覽圖（從組裝模式）
  generateAssemblePreview()
  
  showAssessment.value = true
}

// 產生組裝模式的預覽圖
function generateAssemblePreview() {
  const canvas = document.createElement('canvas')
  const size = 300
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  // 畫圓形
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 3
  ctx.stroke()
  
  // 畫數字
  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  for (const num of assembleNumbers.value) {
    if (num.snapped && num.snappedTo) {
      const pos = snapPositions.value.find(p => p.number === num.snappedTo)
      if (pos) {
        ctx.fillText(
          num.value.toString(), 
          pos.x + 15 + (size - clockFaceSize.value) / 2, 
          pos.y + 15 + (size - clockFaceSize.value) / 2
        )
      }
    }
  }
  
  // 畫指針
  const centerX = size / 2
  const centerY = size / 2
  
  // 時針
  const hourRad = (hourHandAngle.value - 90) * Math.PI / 180
  const hourLen = size * 0.25
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(
    centerX + Math.cos(hourRad) * hourLen,
    centerY + Math.sin(hourRad) * hourLen
  )
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()
  
  // 分針
  const minRad = (minuteHandAngle.value - 90) * Math.PI / 180
  const minLen = size * 0.35
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(
    centerX + Math.cos(minRad) * minLen,
    centerY + Math.sin(minRad) * minLen
  )
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 4
  ctx.stroke()
  
  // 中心點
  ctx.beginPath()
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#1f2937'
  ctx.fill()
  
  previewImageUrl.value = canvas.toDataURL('image/png')
}

// 全螢幕相關狀態
const isFullscreen = ref(false)
const isPseudoFullscreen = ref(false)

// 檢測是否支援全螢幕 API
const supportsFullscreen = computed(() => {
  return typeof document !== 'undefined' && 
         (document.fullscreenEnabled || 
          (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled)
})

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
  
  // 設定背景顏色（從 CSS 變數取得）
  const bgColor = getCSSVar('--color-canvas-bg') || '#ffffff'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, size, size)
  
  // 畫一個淡色參考線（從 CSS 變數取得）
  ctx.beginPath()
  ctx.arc(
    size / 2,
    size / 2,
    size / 2 - 20,
    0,
    Math.PI * 2
  )
  const gridColor = getCSSVar('--color-canvas-grid') || '#e5e7eb'
  ctx.strokeStyle = gridColor
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
  if (!ctx || !canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  
  ctx.beginPath()
  ctx.moveTo(x, y)
}

// 繪圖
function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const ctx = getContext()
  if (!ctx || !canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  
  ctx.lineTo(x, y)
  // 從 CSS 變數取得繪圖顏色
  const strokeColor = currentTool.value === 'pen' 
    ? (getCSSVar('--color-canvas-stroke') || '#1f2937')
    : (getCSSVar('--color-canvas-bg') || '#ffffff')
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = currentTool.value === 'eraser' ? brushSize.value * 3 : brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// 停止繪圖
function stopDrawing() {
  isDrawing.value = false
}

// 觸控支援 - 改進座標計算防止不跟手
function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  
  // 只處理單點觸控，多點觸控時忽略
  if (e.touches.length > 1) {
    isDrawing.value = false
    return
  }
  
  const touch = e.touches[0]
  if (!touch) return
  
  isDrawing.value = true
  const ctx = getContext()
  if (!ctx || !canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  const x = (touch.clientX - rect.left) * scaleX
  const y = (touch.clientY - rect.top) * scaleY
  
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  
  // 多點觸控時停止繪圖
  if (e.touches.length > 1) {
    isDrawing.value = false
    return
  }
  
  if (!isDrawing.value) return
  const touch = e.touches[0]
  if (!touch) return
  
  const ctx = getContext()
  if (!ctx || !canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  const x = (touch.clientX - rect.left) * scaleX
  const y = (touch.clientY - rect.top) * scaleY
  
  ctx.lineTo(x, y)
  // 從 CSS 變數取得繪圖顏色
  const strokeColor = currentTool.value === 'pen' 
    ? (getCSSVar('--color-canvas-stroke') || '#1f2937')
    : (getCSSVar('--color-canvas-bg') || '#ffffff')
  ctx.strokeStyle = strokeColor
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
  
  // 從 CSS 變數取得背景顏色
  const bgColor = getCSSVar('--color-canvas-bg') || '#ffffff'
  ctx.fillStyle = bgColor
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
  const gridColor = getCSSVar('--color-canvas-grid') || '#e5e7eb'
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.setLineDash([])
}

// 全螢幕切換
async function toggleFullscreen(): Promise<void> {
  if (isFullscreen.value) {
    // 退出全螢幕
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
      }
    } catch (error) {
      console.warn('退出全螢幕失敗:', error)
    }
  } else if (isPseudoFullscreen.value) {
    // 退出模擬全螢幕
    exitPseudoFullscreen()
  } else {
    // 進入全螢幕
    if (supportsFullscreen.value && containerRef.value) {
      try {
        if (containerRef.value.requestFullscreen) {
          await containerRef.value.requestFullscreen()
        } else if ((containerRef.value as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (containerRef.value as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
        }
      } catch (error) {
        // Fullscreen API 失敗，使用模擬全螢幕
        console.warn('全螢幕 API 不可用，使用模擬模式:', error)
        enterPseudoFullscreen()
      }
    } else {
      // 不支援 Fullscreen API（iOS Safari），使用模擬全螢幕
      enterPseudoFullscreen()
    }
  }
}

// 進入模擬全螢幕
function enterPseudoFullscreen(): void {
  isPseudoFullscreen.value = true
  // 禁用頁面滾動
  document.body.style.overflow = 'hidden'
  // 重新計算 canvas 尺寸
  setTimeout(() => {
    const newSize = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.65)
    updateCanvasSize(newSize)
  }, 50)
}

// 退出模擬全螢幕
function exitPseudoFullscreen(): void {
  isPseudoFullscreen.value = false
  // 恢復頁面滾動
  document.body.style.overflow = ''
  // 恢復原始 canvas 尺寸
  setTimeout(() => {
    const newSize = calculateResponsiveSize()
    updateCanvasSize(newSize)
  }, 50)
}

// 更新 canvas 尺寸並保留繪圖內容
function updateCanvasSize(newSize: number): void {
  const canvas = canvasRef.value
  if (!canvas) return
  
  // 保存當前繪圖
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx?.drawImage(canvas, 0, 0)
  
  // 更新尺寸
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

// 監聽全螢幕變化並調整 canvas 尺寸
function handleFullscreenChange(): void {
  const fullscreenElement = document.fullscreenElement || 
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
  
  isFullscreen.value = !!fullscreenElement
  
  if (isFullscreen.value) {
    // 進入全螢幕，放大 canvas
    setTimeout(() => {
      const newSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.7)
      updateCanvasSize(newSize)
    }, 100)
  } else {
    // 退出全螢幕，恢復原始尺寸
    setTimeout(() => {
      const newSize = calculateResponsiveSize()
      updateCanvasSize(newSize)
    }, 100)
  }
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
      aiAnalysisResult.value = await analyzeClockDrawing(previewImageUrl.value, actualTargetTime.value)
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
    targetTime: actualTargetTime.value,
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
  // 初始化目標時間（支援隨機化）
  initializeTargetTime()
  
  // 偵測預設模式（行動裝置預設組裝模式）
  currentMode.value = detectDefaultMode()
  
  // 初始計算響應式尺寸
  responsiveCanvasSize.value = calculateResponsiveSize()
  
  // 添加視窗大小變化監聯
  window.addEventListener('resize', handleResize)
  
  // 添加全螢幕變化監聽
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  
  // 根據模式初始化
  if (currentMode.value === 'draw') {
    setTimeout(initCanvas, 0)
  } else {
    initAssembleMode()
  }
})

onUnmounted(() => {
  // 移除監聽器
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  
  // 清理觸控滾動監聽器
  if ((window as any).__clockDrawingCleanup) {
    (window as any).__clockDrawingCleanup()
    delete (window as any).__clockDrawingCleanup
  }
  
  // 清理模擬全螢幕狀態
  if (isPseudoFullscreen.value) {
    document.body.style.overflow = ''
  }
  
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

.time-hint {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  font-weight: normal;
}

.hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

/* ===== 模式切換按鈕 ===== */
.mode-toggle {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.mode-btn {
  padding: 0.5rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: var(--color-bg-soft);
}

.mode-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* ===== 組裝模式樣式 ===== */
.assemble-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.clock-face {
  position: relative;
  background: #ffffff;
  border: 3px solid var(--color-border);
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.snap-indicator {
  position: absolute;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #d1d5db;
  border: 2px dashed #e5e7eb;
  border-radius: 50%;
  pointer-events: none;
}

.snap-indicator.occupied {
  border-color: transparent;
  color: transparent;
}

.draggable-number {
  position: absolute;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: bold;
  color: #1f2937;
  background: #ffffff;
  border: 2px solid #667eea;
  border-radius: 50%;
  cursor: grab;
  user-select: none;
  transition: transform 0.1s, box-shadow 0.2s;
  z-index: 10;
}

.draggable-number:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.draggable-number.dragging {
  cursor: grabbing;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.draggable-number.snapped {
  border-color: #667eea;
  background: #f5f3ff;
}

/* 完成評分後才顯示正確/錯誤狀態 */
.draggable-number.show-result.correct {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.draggable-number.show-result.incorrect {
  border-color: #ef4444;
  background: #fef2f2;
  color: #ef4444;
}

/* 時鐘指針 */
.clock-hand {
  position: absolute;
  left: 50%;
  bottom: 50%;
  transform-origin: bottom center;
  cursor: pointer;
  z-index: 20;
}

.hour-hand {
  width: 8px;
  height: 30%;
  background: linear-gradient(to top, #1f2937, #374151);
  border-radius: 4px;
  margin-left: -4px;
}

.minute-hand {
  width: 5px;
  height: 40%;
  background: linear-gradient(to top, #3b82f6, #60a5fa);
  border-radius: 3px;
  margin-left: -2.5px;
}

.hand-grip {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1rem;
  cursor: grab;
}

.hand-grip:active {
  cursor: grabbing;
}

.clock-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: #1f2937;
  border-radius: 50%;
  z-index: 30;
}

/* 數字備用區 */
.number-pool {
  width: 100%;
  max-width: 350px;
  padding: 1rem;
  background: var(--color-bg-soft);
  border-radius: 12px;
  text-align: center;
}

.pool-hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.pool-numbers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.pool-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: bold;
  color: #1f2937;
  background: #ffffff;
  border: 2px solid #667eea;
  border-radius: 50%;
  cursor: grab;
  user-select: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pool-number:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 組裝工具列 */
.assemble-toolbar {
  max-width: 400px;
  margin: 0 auto;
}

.assemble-info {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.info-item {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.assemble-actions {
  display: flex;
  gap: 0.75rem;
}

.reset-btn {
  flex: 1;
  background: var(--color-surface);
  border-color: var(--color-border);
}

.reset-btn:hover {
  background: var(--color-bg-soft);
}

.assemble-actions .complete-btn {
  flex: 2;
}

.assemble-actions .complete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
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

/* 全螢幕按鈕 */
.fullscreen-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: #3b82f6;
  font-size: 1.25rem;
  min-width: 48px;
  min-height: 48px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
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

/* 模擬全螢幕樣式（iOS Safari） */
.pseudo-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  background: var(--color-bg) !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 1rem !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
}

.pseudo-fullscreen .instructions {
  max-width: 600px;
  text-align: center;
}

.pseudo-fullscreen .canvas-container {
  margin: 0 auto;
}

.pseudo-fullscreen .toolbar {
  max-width: 600px;
  width: 100%;
}

.pseudo-fullscreen-close {
  position: fixed;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.pseudo-fullscreen-close:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

:root.dark .pseudo-fullscreen-close {
  background: rgba(255, 255, 255, 0.2);
}

:root.dark .pseudo-fullscreen-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

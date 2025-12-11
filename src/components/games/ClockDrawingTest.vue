<template>
  <div 
    ref="containerRef"
    class="clock-drawing-test"
  >
    <!-- 指示區域 -->
    <div class="instructions px-4" v-if="!isComplete">
      <h3 class="text-lg sm:text-xl font-bold text-[var(--color-text)]">🕐 時鐘測驗</h3>
      <p class="target-time text-sm sm:text-base text-[var(--color-text-secondary)]">
        請組裝一個時鐘，並將指針指向
        <strong class="text-blue-600 text-base sm:text-lg">{{ actualTargetTime }}</strong>
        <span class="time-hint text-xs sm:text-sm">（{{ targetTimeDescription }}）</span>
      </p>
      <p class="hint text-xs sm:text-sm text-[var(--color-text-muted)]">提示：拖放數字到正確位置，然後旋轉指針設定時間</p>
    </div>

    <!-- 組裝模式區域 -->
    <div 
      class="assemble-container" 
      v-if="!isComplete"
      ref="assembleContainerRef"
    >
      <!-- 時鐘面盤 -->
      <div 
        class="clock-face"
        :style="{ width: clockFaceSize + 'px', height: clockFaceSize + 'px' }"
      >
        <!-- 吸附區域指示器 (不顯示數字，避免提示) -->
        <div 
          v-for="pos in snapPositions" 
          :key="pos.number"
          class="snap-indicator"
          :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
          :class="{ 'occupied': isPositionOccupied(pos.number) }"
        >
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

    <!-- 工具列 -->
    <div class="toolbar assemble-toolbar" v-if="!isComplete">
      <div class="assemble-actions">
        <button class="tool-btn reset-btn" @click="resetAssemble">
          🔄 重置
        </button>
        <button 
          class="complete-btn" 
          @click="completeAssemble"
          :disabled="placedNumbersCount < 12"
        >
          ✅ 完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ClockDrawingResult } from '@/services/miniCogService'
import { calculateClockDrawingScore } from '@/services/miniCogService'
import { getRandomClockTime, getTimeDescription } from '@/services/clockDrawingAnalyzer'

// Props
const props = withDefaults(defineProps<{
  targetTime?: string
  randomize?: boolean
  behaviorTrackingConsent?: boolean
}>(), {
  targetTime: '',
  randomize: true,
  behaviorTrackingConsent: false,
})

// Emits
const emit = defineEmits<{
  (e: 'game-end', result: ClockDrawingResult): void
}>()

// 實際使用的目標時間
const actualTargetTime = ref<string>('')
const targetTimeDescription = computed(() => getTimeDescription(actualTargetTime.value))

// 初始化目標時間
function initializeTargetTime() {
  if (props.targetTime) {
    actualTargetTime.value = props.targetTime
  } else if (props.randomize) {
    actualTargetTime.value = getRandomClockTime()
  } else {
    actualTargetTime.value = '11:10'
  }
}

// Refs
const containerRef = ref<HTMLElement | null>(null)
const assembleContainerRef = ref<HTMLElement | null>(null)
const isComplete = ref(false)
const startTime = ref<number>(0)
const previewImageUrl = ref<string>('')

// ===== 組裝模式狀態 =====
interface AssembleNumber {
  id: number
  value: number
  x: number
  y: number
  isDragging: boolean
  snapped: boolean
  snappedTo: number | null
  isCorrect: boolean
}

const assembleNumbers = ref<AssembleNumber[]>([])
const hourHandAngle = ref(0)
const minuteHandAngle = ref(0)
const clockFaceSize = ref(300)
const draggingNumber = ref<AssembleNumber | null>(null)
const rotatingHand = ref<'hour' | 'minute' | null>(null)

// 12 個數字的正確位置
const snapPositions = computed(() => {
  const size = clockFaceSize.value
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 40
  
  return Array.from({ length: 12 }, (_, i) => {
    const number = i === 0 ? 12 : i
    const angle = ((i * 30) - 90) * (Math.PI / 180)
    return {
      number,
      x: centerX + radius * Math.cos(angle) - 15,
      y: centerY + radius * Math.sin(angle) - 15,
      angle: i * 30
    }
  })
})

const unplacedNumbers = computed(() => 
  assembleNumbers.value.filter(n => !n.snapped)
)

const placedNumbersCount = computed(() => 
  assembleNumbers.value.filter(n => n.snapped).length
)

function isPositionOccupied(posNumber: number): boolean {
  return assembleNumbers.value.some(n => n.snappedTo === posNumber)
}

function initAssembleMode() {
  const size = Math.min(window.innerWidth - 40, 350)
  clockFaceSize.value = size
  
  const numbers = Array.from({ length: 12 }, (_, i) => i + 1)
  const shuffled = numbers.sort(() => Math.random() - 0.5)
  
  assembleNumbers.value = shuffled.map((value, index) => ({
    id: index,
    value,
    x: -100,
    y: -100,
    isDragging: false,
    snapped: false,
    snappedTo: null,
    isCorrect: false
  }))
  
  hourHandAngle.value = 0
  minuteHandAngle.value = 0
  
  startTime.value = Date.now()
}

// 拖曳邏輯
function startDragNumber(event: MouseEvent, num: AssembleNumber) {
  event.preventDefault()
  draggingNumber.value = num
  num.isDragging = true
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  num.x = event.clientX - rect.left - 15
  num.y = event.clientY - rect.top - 15
  
  if (num.snapped) {
    num.snapped = false
    num.snappedTo = null
    num.isCorrect = false
  }
  
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

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

function handleDragMove(event: MouseEvent) {
  if (!draggingNumber.value) return
  
  const container = assembleContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  draggingNumber.value.x = event.clientX - rect.left - 15
  draggingNumber.value.y = event.clientY - rect.top - 15
}

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

function checkSnapPosition(num: AssembleNumber) {
  const SNAP_RADIUS = 40
  
  for (const pos of snapPositions.value) {
    if (isPositionOccupied(pos.number)) continue
    
    const distance = Math.hypot(num.x - pos.x, num.y - pos.y)
    
    if (distance <= SNAP_RADIUS) {
      num.x = pos.x
      num.y = pos.y
      num.snapped = true
      num.snappedTo = pos.number
      num.isCorrect = num.value === pos.number
      
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      return
    }
  }
  
  num.x = -100
  num.y = -100
  num.snapped = false
  num.snappedTo = null
  num.isCorrect = false
}

// 指針旋轉邏輯
function startRotateHand(hand: 'hour' | 'minute', event: MouseEvent) {
  event.preventDefault()
  rotatingHand.value = hand
  document.addEventListener('mousemove', handleRotateMove)
  document.addEventListener('mouseup', handleRotateEnd)
}

function startRotateHandTouch(hand: 'hour' | 'minute', event: TouchEvent) {
  rotatingHand.value = hand
  document.addEventListener('touchmove', handleRotateMoveTouch, { passive: false })
  document.addEventListener('touchend', handleRotateEndTouch)
}

function calculateAngle(clientX: number, clientY: number): number {
  const container = assembleContainerRef.value
  if (!container) return 0
  
  const rect = container.getBoundingClientRect()
  const clockFace = container.querySelector('.clock-face')
  if (!clockFace) return 0
  
  const clockRect = (clockFace as HTMLElement).getBoundingClientRect()
  const centerX = clockRect.left + clockRect.width / 2
  const centerY = clockRect.top + clockRect.height / 2
  
  const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90
  return (angle + 360) % 360
}

function handleRotateMove(event: MouseEvent) {
  if (!rotatingHand.value) return
  const angle = calculateAngle(event.clientX, event.clientY)
  if (rotatingHand.value === 'hour') {
    hourHandAngle.value = angle
  } else {
    minuteHandAngle.value = angle
  }
}

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

function resetAssemble() {
  initAssembleMode()
}

// 完成並評分
function completeAssemble() {
  // 計算數字位置正確率
  const correctNumbers = assembleNumbers.value.filter(n => n.isCorrect).length
  const numbersScore = correctNumbers / 12
  
  // 計算指針角度正確性
  const [targetHour = 0, targetMinute = 0] = actualTargetTime.value.split(':').map(Number)
  
  const targetHourAngle = ((targetHour % 12) * 30 + targetMinute * 0.5) % 360
  const targetMinuteAngle = (targetMinute * 6) % 360
  
  const hourError = Math.min(
    Math.abs(hourHandAngle.value - targetHourAngle),
    360 - Math.abs(hourHandAngle.value - targetHourAngle)
  )
  const minuteError = Math.min(
    Math.abs(minuteHandAngle.value - targetMinuteAngle),
    360 - Math.abs(minuteHandAngle.value - targetMinuteAngle)
  )
  
  // 時針容許誤差 30 度（允許指向數字或正確時間位置），分針容許誤差 25 度
  const hourCorrect = hourError <= 30
  const minuteCorrect = minuteError <= 25
  const handsCorrect = hourCorrect && minuteCorrect
  
  // 自動評分標準
  const selfAssessment = {
    hasCompleteCircle: true, // 組裝模式圓形一定完整
    hasCorrectNumbers: numbersScore >= 0.75, // 75% 以上數字正確
    hasCorrectHands: handsCorrect
  }
  
  const finalScore = calculateClockDrawingScore(selfAssessment)
  const completionTime = Date.now() - startTime.value
  
  // 產生預覽圖
  generateAssemblePreview()
  
  const result: ClockDrawingResult = {
    targetTime: actualTargetTime.value,
    selfAssessment,
    score: finalScore,
    completionTime,
    imageData: props.behaviorTrackingConsent ? previewImageUrl.value : undefined
  }
  
  isComplete.value = true
  emit('game-end', result)
}

function generateAssemblePreview() {
  const canvas = document.createElement('canvas')
  const size = 300
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 3
  ctx.stroke()
  
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
  
  const centerX = size / 2
  const centerY = size / 2
  
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
  
  ctx.beginPath()
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#1f2937'
  ctx.fill()
  
  previewImageUrl.value = canvas.toDataURL('image/png')
}

onMounted(() => {
  initializeTargetTime()
  initAssembleMode()
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
  border: 2px dashed #e5e7eb;
  border-radius: 50%;
  pointer-events: none;
}

.snap-indicator.occupied {
  border-color: transparent;
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

.assemble-toolbar {
  max-width: 400px;
  margin: 0 auto;
}

.assemble-actions {
  display: flex;
  gap: 0.75rem;
}

.reset-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: var(--color-bg-soft);
}

.complete-btn {
  flex: 2;
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

.complete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 深色模式 */
:root.dark .clock-drawing-test {
  background: var(--color-background);
  color: var(--color-text);
}

:root.dark .instructions {
  background: var(--color-bg-soft);
  border-color: var(--color-border);
}

:root.dark .clock-face {
  background: #ffffff; /* 保持白色 */
}

:root.dark .draggable-number,
:root.dark .pool-number {
  background: #ffffff;
  color: #1f2937;
}

:root.dark .reset-btn {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

:root.dark .reset-btn:hover {
  background: #4f46e5;
  color: white;
}
</style>

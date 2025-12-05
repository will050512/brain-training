<script setup lang="ts">
/**
 * 每日訓練完成慶祝動畫
 * 顯示煙火動畫、當日總得分摘要
 * 2-3秒後自動導向報告頁面
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

interface TrainingSummary {
  completedGames: number
  totalGames: number
  averageScore: number
  totalDuration: number // 秒
  bestGameName?: string
  bestGameScore?: number
}

interface Props {
  summary: TrainingSummary
  autoRedirectDelay?: number // 毫秒
}

const props = withDefaults(defineProps<Props>(), {
  autoRedirectDelay: 3000
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
}>()

const router = useRouter()
const countdown = ref(Math.ceil(props.autoRedirectDelay / 1000))
let countdownTimer: ReturnType<typeof setInterval> | null = null
let redirectTimer: ReturnType<typeof setTimeout> | null = null

// 格式化時間
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`
}

// 跳過動畫，直接導向報告
function handleSkip() {
  clearTimers()
  emit('skip')
  router.push('/report')
}

// 清除計時器
function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (redirectTimer) {
    clearTimeout(redirectTimer)
    redirectTimer = null
  }
}

// 自動導向報告頁
function autoRedirect() {
  emit('close')
  router.push('/report')
}

onMounted(() => {
  // 倒數計時
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearTimers()
    }
  }, 1000)
  
  // 自動跳轉
  redirectTimer = setTimeout(() => {
    autoRedirect()
  }, props.autoRedirectDelay)
})

onUnmounted(() => {
  clearTimers()
})
</script>

<template>
  <Teleport to="body">
    <div class="training-complete-overlay">
      <!-- 跳過按鈕 -->
      <button 
        class="skip-btn"
        @click="handleSkip"
        aria-label="跳過動畫"
      >
        跳過 ({{ countdown }}s) ✕
      </button>
      
      <!-- 煙火動畫背景 -->
      <div class="fireworks-container">
        <div class="firework firework-1"></div>
        <div class="firework firework-2"></div>
        <div class="firework firework-3"></div>
        <div class="firework firework-4"></div>
        <div class="firework firework-5"></div>
      </div>
      
      <!-- 彩帶裝飾 -->
      <div class="confetti-container">
        <div v-for="i in 50" :key="i" class="confetti" :style="getConfettiStyle(i)"></div>
      </div>
      
      <!-- 主要內容 -->
      <div class="complete-content">
        <!-- 慶祝圖示 -->
        <div class="celebration-icon">🎉</div>
        
        <!-- 標題 -->
        <h1 class="complete-title">太棒了！</h1>
        <p class="complete-subtitle">今日訓練已完成</p>
        
        <!-- 摘要卡片 -->
        <div class="summary-card">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-value text-blue-500">{{ summary.completedGames }}/{{ summary.totalGames }}</span>
              <span class="summary-label">完成遊戲</span>
            </div>
            <div class="summary-item">
              <span class="summary-value text-green-500">{{ summary.averageScore }}</span>
              <span class="summary-label">平均分數</span>
            </div>
            <div class="summary-item">
              <span class="summary-value text-purple-500">{{ formatDuration(summary.totalDuration) }}</span>
              <span class="summary-label">訓練時長</span>
            </div>
          </div>
          
          <!-- 最佳表現 -->
          <div v-if="summary.bestGameName" class="best-performance">
            <span class="best-icon">🏆</span>
            <span class="best-text">
              最佳表現：{{ summary.bestGameName }} ({{ summary.bestGameScore }}分)
            </span>
          </div>
        </div>
        
        <!-- 提示 -->
        <p class="redirect-hint">
          {{ countdown }}秒後自動查看報告...
        </p>
        
        <!-- 立即查看按鈕 -->
        <button class="view-report-btn" @click="handleSkip">
          📊 立即查看報告
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
// 生成隨機彩帶樣式
function getConfettiStyle(index: number) {
  const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#7209b7', '#3a0ca3', '#4361ee']
  const left = Math.random() * 100
  const delay = Math.random() * 3
  const duration = 2 + Math.random() * 2
  const size = 8 + Math.random() * 8
  
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: colors[index % colors.length],
  }
}
</script>

<style scoped>
.training-complete-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 跳過按鈕 */
.skip-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.skip-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 煙火動畫 */
.fireworks-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.firework {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: firework 1.5s ease-out infinite;
}

.firework::before,
.firework::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: inherit;
}

.firework-1 {
  top: 20%;
  left: 20%;
  background: #ff6b6b;
  animation-delay: 0s;
}

.firework-2 {
  top: 15%;
  left: 70%;
  background: #ffd93d;
  animation-delay: 0.3s;
}

.firework-3 {
  top: 30%;
  left: 85%;
  background: #6bcb77;
  animation-delay: 0.6s;
}

.firework-4 {
  top: 25%;
  left: 10%;
  background: #4d96ff;
  animation-delay: 0.9s;
}

.firework-5 {
  top: 10%;
  left: 50%;
  background: #ff6fff;
  animation-delay: 1.2s;
}

@keyframes firework {
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor,
      0 0 0 0 currentColor;
  }
  100% {
    transform: scale(0);
    opacity: 0;
    box-shadow: 
      -40px -40px 0 -2px currentColor,
      40px -40px 0 -2px currentColor,
      40px 40px 0 -2px currentColor,
      -40px 40px 0 -2px currentColor,
      0 -50px 0 -2px currentColor,
      50px 0 0 -2px currentColor,
      0 50px 0 -2px currentColor,
      -50px 0 0 -2px currentColor;
  }
}

/* 彩帶 */
.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation: confettiFall linear infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

/* 主要內容 */
.complete-content {
  text-align: center;
  color: white;
  z-index: 5;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.celebration-icon {
  font-size: 5rem;
  animation: bounce 0.6s ease infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-15px); }
}

.complete-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0.5rem 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.complete-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 1.5rem;
}

/* 摘要卡片 */
.summary-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
  margin: 0 1rem;
  max-width: 400px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-label {
  font-size: 0.75rem;
  opacity: 0.8;
}

.best-performance {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.best-icon {
  font-size: 1.25rem;
}

/* 提示與按鈕 */
.redirect-hint {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  opacity: 0.7;
}

.view-report-btn {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.view-report-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* 響應式 */
@media (max-width: 480px) {
  .complete-title {
    font-size: 2rem;
  }
  
  .celebration-icon {
    font-size: 4rem;
  }
  
  .summary-card {
    padding: 1rem;
  }
  
  .summary-value {
    font-size: 1.25rem;
  }
}
</style>

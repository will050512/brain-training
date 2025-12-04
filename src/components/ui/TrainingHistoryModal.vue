<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-container" :class="{ 'is-mobile': isMobile }">
          <div class="modal-header">
            <div class="header-content">
              <h3 class="modal-title">{{ formattedDate }}</h3>
              <span class="modal-subtitle">訓練紀錄</span>
            </div>
            <button class="close-btn" @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-content">
            <!-- 沒有訓練記錄 -->
            <div v-if="!sessions || sessions.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <p class="empty-text">這一天沒有訓練紀錄</p>
              <p class="empty-hint">開始訓練後，您的進度會顯示在這裡</p>
            </div>

            <!-- 有訓練記錄 -->
            <template v-else>
              <!-- 訓練摘要 -->
              <div class="summary-card">
                <div class="summary-item">
                  <span class="summary-icon">⏱️</span>
                  <div class="summary-info">
                    <span class="summary-value">{{ totalMinutes }}</span>
                    <span class="summary-label">總時長 (分鐘)</span>
                  </div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                  <span class="summary-icon">🎮</span>
                  <div class="summary-info">
                    <span class="summary-value">{{ sessions.length }}</span>
                    <span class="summary-label">遊戲次數</span>
                  </div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                  <span class="summary-icon">⭐</span>
                  <div class="summary-info">
                    <span class="summary-value">{{ averageScore }}</span>
                    <span class="summary-label">平均分數</span>
                  </div>
                </div>
              </div>

              <!-- 訓練詳情列表 -->
              <div class="sessions-list">
                <div 
                  v-for="(session, index) in sessions" 
                  :key="index"
                  class="session-item"
                >
                  <div class="session-icon" :style="{ background: getGameColor(session.gameId) }">
                    {{ getGameIcon(session.gameId) }}
                  </div>
                  <div class="session-info">
                    <span class="session-name">{{ getGameName(session.gameId) }}</span>
                    <span class="session-time">{{ formatTime(session.timestamp) }}</span>
                  </div>
                  <div class="session-stats">
                    <div class="stat">
                      <span class="stat-value">{{ session.score || 0 }}</span>
                      <span class="stat-label">分數</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ Math.round((session.duration || 0) / 60) }}</span>
                      <span class="stat-label">分鐘</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 認知領域分佈 -->
              <div class="domain-section">
                <h4 class="section-title">認知領域訓練分佈</h4>
                <div class="domain-bars">
                  <div 
                    v-for="domain in domainStats" 
                    :key="domain.name"
                    class="domain-bar"
                  >
                    <div class="bar-header">
                      <span class="domain-name">{{ domain.name }}</span>
                      <span class="domain-count">{{ domain.count }} 次</span>
                    </div>
                    <div class="bar-track">
                      <div 
                        class="bar-fill"
                        :style="{ 
                          width: `${domain.percentage}%`,
                          background: domain.color
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="modal-footer" v-if="sessions && sessions.length > 0">
            <button class="action-btn secondary" @click="close">
              關閉
            </button>
            <button class="action-btn primary" @click="goToReport">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              查看完整報告
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'
import { gameRegistry } from '@/core/gameRegistry'

// 輔助函數：獲取遊戲元資料
function getGameMeta(gameId: string) {
  const game = gameRegistry.get(gameId)
  return game ? { name: game.name, icon: game.icon } : { name: gameId, icon: '🎮' }
}

interface TrainingSession {
  gameId: string
  score?: number
  duration?: number  // 秒
  timestamp: string | number
}

interface Props {
  isOpen: boolean
  date: string  // YYYY-MM-DD 格式
  sessions?: TrainingSession[]
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  date: '',
  sessions: () => []
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const { isMobile } = useResponsive()

// 格式化日期
const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(props.date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${month} 月 ${day} 日（週${weekDay}）`
})

// 總訓練時長（分鐘）
const totalMinutes = computed(() => {
  if (!props.sessions) return 0
  const totalSeconds = props.sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  return Math.round(totalSeconds / 60)
})

// 平均分數
const averageScore = computed(() => {
  if (!props.sessions || props.sessions.length === 0) return 0
  const total = props.sessions.reduce((sum, s) => sum + (s.score || 0), 0)
  return Math.round(total / props.sessions.length)
})

// 認知領域映射
const domainMapping: Record<string, { name: string; color: string }> = {
  'card-match': { name: '記憶力', color: '#667eea' },
  'instant-memory': { name: '記憶力', color: '#667eea' },
  'poker-memory': { name: '記憶力', color: '#667eea' },
  'audio-memory': { name: '記憶力', color: '#667eea' },
  'whack-a-mole': { name: '注意力', color: '#10b981' },
  'spot-difference': { name: '注意力', color: '#10b981' },
  'number-connect': { name: '注意力', color: '#10b981' },
  'maze-navigation': { name: '執行功能', color: '#f59e0b' },
  'balance-scale': { name: '執行功能', color: '#f59e0b' },
  'math-calc': { name: '執行功能', color: '#f59e0b' },
  'clock-drawing': { name: '視覺空間', color: '#ec4899' },
  'pattern-reasoning': { name: '視覺空間', color: '#ec4899' },
  'gesture-memory': { name: '視覺空間', color: '#ec4899' },
  'rock-paper-scissors': { name: '反應能力', color: '#8b5cf6' },
  'rhythm-mimic': { name: '反應能力', color: '#8b5cf6' }
}

// 認知領域統計
const domainStats = computed(() => {
  if (!props.sessions) return []
  
  const stats: Record<string, { count: number; color: string }> = {}
  
  for (const session of props.sessions) {
    const domain = domainMapping[session.gameId]
    if (domain) {
      if (!stats[domain.name]) {
        stats[domain.name] = { count: 0, color: domain.color }
      }
      const stat = stats[domain.name]
      if (stat) {
        stat.count++
      }
    }
  }
  
  const total = props.sessions.length || 1
  
  return Object.entries(stats).map(([name, { count, color }]) => ({
    name,
    count,
    color,
    percentage: Math.round((count / total) * 100)
  })).sort((a, b) => b.count - a.count)
})

// 取得遊戲名稱
function getGameName(gameId: string): string {
  const meta = getGameMeta(gameId)
  return meta?.name || gameId
}

// 取得遊戲圖示
function getGameIcon(gameId: string): string {
  const meta = getGameMeta(gameId)
  return meta?.icon || '🎮'
}

// 取得遊戲顏色
function getGameColor(gameId: string): string {
  const domain = domainMapping[gameId]
  return domain?.color || '#6b7280'
}

// 格式化時間
function formatTime(timestamp: string | number): string {
  const d = new Date(timestamp)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 關閉
function close() {
  emit('close')
}

// 前往報告頁
function goToReport() {
  router.push('/report')
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: var(--color-bg-primary, #ffffff);
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-container.is-mobile {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-content {
  display: flex;
  flex-direction: column;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.modal-subtitle {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 2px;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

/* 摘要卡片 */
.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
  border-radius: 16px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-icon {
  font-size: 24px;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary, #1f2937);
  line-height: 1;
}

.summary-label {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 2px;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: var(--color-border, #e5e7eb);
}

/* 訓練詳情列表 */
.sessions-list {
  margin-bottom: 20px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  margin-bottom: 8px;
}

.session-item:last-child {
  margin-bottom: 0;
}

.session-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.session-stats {
  display: flex;
  gap: 16px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary, #667eea);
}

.stat-label {
  font-size: 10px;
  color: var(--color-text-secondary, #6b7280);
}

/* 認知領域分佈 */
.domain-section {
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 12px 0;
}

.domain-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.domain-bar {
  
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.domain-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1f2937);
}

.domain-count {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.bar-track {
  height: 8px;
  background: var(--color-bg-tertiary, #e5e7eb);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  background: var(--color-bg-tertiary, #f3f4f6);
  border: none;
  color: var(--color-text-secondary, #6b7280);
}

.action-btn.secondary:hover {
  background: var(--color-bg-hover, #e5e7eb);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

/* 動畫 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: translateY(20px) scale(0.95);
}

.is-mobile.modal-enter-from .modal-container,
.is-mobile.modal-leave-to .modal-container {
  transform: translateY(100%);
}

/* 深色模式 */
:global(.dark) .modal-container {
  background: #1f2937;
}

:global(.dark) .modal-header {
  border-bottom-color: #374151;
}

:global(.dark) .empty-text {
  color: #f9fafb;
}

:global(.dark) .empty-hint {
  color: #9ca3af;
}

:global(.dark) .summary-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
}

:global(.dark) .summary-value {
  color: #f9fafb;
}

:global(.dark) .session-item {
  background: #374151;
}

:global(.dark) .session-name {
  color: #f9fafb;
}

:global(.dark) .domain-section {
  border-top-color: #374151;
}

:global(.dark) .domain-name {
  color: #f9fafb;
}

:global(.dark) .bar-track {
  background: #374151;
}

:global(.dark) .modal-footer {
  border-top-color: #374151;
}

:global(.dark) .action-btn.secondary {
  background: #374151;
  color: #9ca3af;
}

:global(.dark) .action-btn.secondary:hover {
  background: #4b5563;
}
</style>

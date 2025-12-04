<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="isOpen" class="difficulty-panel-overlay" @click.self="close">
        <div class="difficulty-panel" :class="{ 'is-mobile': isMobile }">
          <div class="panel-header">
            <h3 class="panel-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              難度調整
            </h3>
            <button class="close-btn" @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="panel-content">
            <!-- 遊戲名稱 -->
            <div v-if="gameInfo" class="game-info">
              <span class="game-icon">{{ gameInfo.icon }}</span>
              <span class="game-name">{{ gameInfo.name }}</span>
            </div>

            <!-- 主要難度選擇 -->
            <div class="difficulty-section">
              <label class="section-label">難度等級</label>
              <div class="difficulty-buttons">
                <button
                  v-for="level in difficultyLevels"
                  :key="level.value"
                  class="difficulty-btn"
                  :class="[level.value, { active: currentDifficulty === level.value }]"
                  @click="setDifficulty(level.value)"
                >
                  <span class="level-icon">{{ level.icon }}</span>
                  <span class="level-name">{{ level.name }}</span>
                  <span class="level-desc">{{ level.description }}</span>
                </button>
              </div>
            </div>

            <!-- 細分難度調整 -->
            <div class="sub-difficulty-section">
              <label class="section-label">
                細微調整
                <span class="sub-label">({{ currentDifficulty }}難度內)</span>
              </label>
              <div class="sub-difficulty-slider">
                <button 
                  class="sub-btn"
                  :class="{ active: currentSubDifficulty === 1 }"
                  @click="setSubDifficulty(1)"
                >
                  簡單
                </button>
                <button 
                  class="sub-btn"
                  :class="{ active: currentSubDifficulty === 2 }"
                  @click="setSubDifficulty(2)"
                >
                  標準
                </button>
                <button 
                  class="sub-btn"
                  :class="{ active: currentSubDifficulty === 3 }"
                  @click="setSubDifficulty(3)"
                >
                  挑戰
                </button>
              </div>
            </div>

            <!-- 難度說明 -->
            <div class="difficulty-preview">
              <div class="preview-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                難度說明
              </div>
              <p class="preview-text">{{ difficultyDescription }}</p>
            </div>

            <!-- 是否套用到所有遊戲 -->
            <div class="apply-all-section">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="applyToAll"
                  class="checkbox-input"
                />
                <span class="checkbox-mark"></span>
                <span class="checkbox-text">同時套用到所有遊戲</span>
              </label>
            </div>
          </div>

          <div class="panel-footer">
            <button class="reset-btn" @click="resetToDefault">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              重置為預設
            </button>
            <button class="confirm-btn" @click="confirmAndClose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              確認
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore, type GameDifficulty, type GameSubDifficulty } from '@/stores/settingsStore'
import { useResponsive } from '@/composables/useResponsive'

interface GameInfo {
  id: string
  name: string
  icon: string
}

interface Props {
  /** 是否開啟 */
  isOpen: boolean
  /** 遊戲資訊 */
  gameInfo?: GameInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  gameInfo: null
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', difficulty: GameDifficulty, subDifficulty: GameSubDifficulty): void
}>()

const settingsStore = useSettingsStore()
const { isMobile } = useResponsive()

// 難度等級
const difficultyLevels = [
  { value: 'easy' as const, name: '簡單', icon: '🌱', description: '適合初學者' },
  { value: 'medium' as const, name: '中等', icon: '🌿', description: '適度挑戰' },
  { value: 'hard' as const, name: '困難', icon: '🌳', description: '高階挑戰' }
]

// 當前選擇
const currentDifficulty = ref<GameDifficulty>('easy')
const currentSubDifficulty = ref<GameSubDifficulty>(2)
const applyToAll = ref(false)

// 初始化難度設定
watch(() => props.isOpen, (open) => {
  if (open && props.gameInfo) {
    const settings = settingsStore.getGameDifficulty(props.gameInfo.id)
    currentDifficulty.value = settings.difficulty
    currentSubDifficulty.value = settings.subDifficulty
    applyToAll.value = false
  }
}, { immediate: true })

// 難度描述
const difficultyDescription = computed(() => {
  const descriptions: Record<GameDifficulty, Record<GameSubDifficulty, string>> = {
    easy: {
      1: '最基礎的難度，適合剛開始訓練的用戶。遊戲節奏較慢，給予充足的思考時間。',
      2: '簡單難度的標準設定，適合日常輕鬆訓練。',
      3: '簡單難度中較有挑戰性的設定，幫助您逐步進步。'
    },
    medium: {
      1: '中等難度的入門設定，遊戲速度適中。',
      2: '中等難度的標準設定，需要一定的專注力和反應能力。',
      3: '中等難度中較具挑戰性的設定，適合想要突破的用戶。'
    },
    hard: {
      1: '困難難度的入門設定，考驗您的能力極限。',
      2: '困難難度的標準設定，需要高度專注和快速反應。',
      3: '最具挑戰性的設定，適合追求極限的進階用戶。'
    }
  }
  
  return descriptions[currentDifficulty.value][currentSubDifficulty.value]
})

// 設定主難度
function setDifficulty(difficulty: GameDifficulty) {
  currentDifficulty.value = difficulty
}

// 設定子難度
function setSubDifficulty(sub: GameSubDifficulty) {
  currentSubDifficulty.value = sub
}

// 重置為預設
function resetToDefault() {
  currentDifficulty.value = settingsStore.defaultDifficulty
  currentSubDifficulty.value = settingsStore.defaultSubDifficulty
}

// 關閉面板
function close() {
  emit('close')
}

// 確認並關閉
function confirmAndClose() {
  // 儲存設定
  if (applyToAll.value) {
    // 套用到所有遊戲
    settingsStore.setDefaultDifficulty(currentDifficulty.value, currentSubDifficulty.value)
    settingsStore.resetAllGameDifficulties()
  } else if (props.gameInfo) {
    // 只套用到當前遊戲
    settingsStore.setGameDifficulty(props.gameInfo.id, {
      difficulty: currentDifficulty.value,
      subDifficulty: currentSubDifficulty.value
    })
  }
  
  emit('confirm', currentDifficulty.value, currentSubDifficulty.value)
  close()
}
</script>

<style scoped>
.difficulty-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.difficulty-panel {
  background: var(--color-bg-primary, #ffffff);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.difficulty-panel.is-mobile {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 20px 20px 0 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary, #1f2937);
}

.panel-title svg {
  color: var(--color-primary, #667eea);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--color-bg-tertiary, #f3f4f6);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-bg-hover, #e5e7eb);
  color: var(--color-text-primary, #1f2937);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  margin-bottom: 20px;
}

.game-icon {
  font-size: 24px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.difficulty-section {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 12px;
}

.sub-label {
  font-weight: 400;
  opacity: 0.7;
}

.difficulty-buttons {
  display: flex;
  gap: 10px;
}

.difficulty-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 14px;
  background: var(--color-bg-secondary, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.difficulty-btn:hover {
  border-color: var(--color-primary-light, #a5b4fc);
}

.difficulty-btn.active {
  border-color: var(--color-primary, #667eea);
}

.difficulty-btn.easy.active {
  background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
  border-color: #10b981;
}

.difficulty-btn.medium.active {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
}

.difficulty-btn.hard.active {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #ef4444;
}

.level-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.level-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.level-desc {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 2px;
}

.sub-difficulty-section {
  margin-bottom: 20px;
}

.sub-difficulty-slider {
  display: flex;
  gap: 8px;
}

.sub-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  background: var(--color-bg-secondary, #ffffff);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sub-btn:hover {
  border-color: var(--color-primary-light, #a5b4fc);
}

.sub-btn.active {
  border-color: var(--color-primary, #667eea);
  background: var(--color-primary, #667eea);
  color: white;
}

.difficulty-preview {
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 8px;
}

.preview-header svg {
  color: var(--color-primary, #667eea);
}

.preview-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-primary, #1f2937);
}

.apply-all-section {
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-input {
  display: none;
}

.checkbox-mark {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-mark {
  background: var(--color-primary, #667eea);
  border-color: var(--color-primary, #667eea);
}

.checkbox-input:checked + .checkbox-mark::after {
  content: '✓';
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.checkbox-text {
  font-size: 14px;
  color: var(--color-text-primary, #1f2937);
}

.panel-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.reset-btn,
.confirm-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn {
  background: var(--color-bg-tertiary, #f3f4f6);
  border: none;
  color: var(--color-text-secondary, #6b7280);
}

.reset-btn:hover {
  background: var(--color-bg-hover, #e5e7eb);
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

/* 動畫 */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.panel-enter-from .difficulty-panel,
.panel-leave-to .difficulty-panel {
  transform: translateY(20px) scale(0.95);
}

.is-mobile.panel-enter-from .difficulty-panel,
.is-mobile.panel-leave-to .difficulty-panel {
  transform: translateY(100%);
}

/* 深色模式 */
:global(.dark) .difficulty-panel {
  background: #1f2937;
}

:global(.dark) .panel-header {
  border-bottom-color: #374151;
}

:global(.dark) .panel-title {
  color: #f9fafb;
}

:global(.dark) .close-btn {
  background: #374151;
  color: #9ca3af;
}

:global(.dark) .close-btn:hover {
  background: #4b5563;
  color: #f9fafb;
}

:global(.dark) .game-info {
  background: #374151;
}

:global(.dark) .game-name {
  color: #f9fafb;
}

:global(.dark) .difficulty-btn {
  background: #374151;
  border-color: #4b5563;
}

:global(.dark) .difficulty-btn:hover {
  border-color: #667eea;
}

:global(.dark) .level-name {
  color: #f9fafb;
}

:global(.dark) .sub-btn {
  background: #374151;
  border-color: #4b5563;
}

:global(.dark) .difficulty-preview {
  background: #374151;
}

:global(.dark) .preview-text {
  color: #e5e7eb;
}

:global(.dark) .apply-all-section {
  border-top-color: #374151;
}

:global(.dark) .checkbox-text {
  color: #f9fafb;
}

:global(.dark) .panel-footer {
  border-top-color: #374151;
}

:global(.dark) .reset-btn {
  background: #374151;
  color: #9ca3af;
}

:global(.dark) .reset-btn:hover {
  background: #4b5563;
}
</style>

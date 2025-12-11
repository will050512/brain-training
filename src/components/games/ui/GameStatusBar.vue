<script setup lang="ts">
/**
 * 遊戲狀態列元件 (GameStatusBar)
 * * 優化重點：
 * 1. 響應式佈局：適配 Desktop 大螢幕與 Mobile 窄螢幕。
 * 2. 長者友善：字體加大、對比增強、數字防抖動。
 * 3. PWA 適配：緊湊模式下優化觸控與視覺空間。
 */
import { computed } from 'vue'
import GameTimer from './GameTimer.vue'

interface Props {
  /** 剩餘時間（秒） */
  timeLeft?: number
  /** 總時間（秒） */
  totalTime?: number
  /** 當前回合 */
  currentRound?: number
  /** 總回合數 */
  totalRounds?: number
  /** 當前分數 */
  score?: number
  /** 正確數 */
  correctCount?: number
  /** 錯誤數 */
  wrongCount?: number
  /** 連擊數 */
  combo?: number
  /** 是否顯示計時器 */
  showTimer?: boolean
  /** 是否顯示進度 */
  showProgress?: boolean
  /** 是否顯示分數 */
  showScore?: boolean
  /** 是否顯示正確/錯誤計數 */
  showCounts?: boolean
  /** 是否顯示連擊 */
  showCombo?: boolean
  /** 佈局方向 (水平/垂直) */
  layout?: 'horizontal' | 'vertical'
  /** 是否緊湊模式（手機強制開啟建議） */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  timeLeft: 0,
  totalTime: 60,
  currentRound: 0,
  totalRounds: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  combo: 0,
  showTimer: true,
  showProgress: true,
  showScore: true,
  showCounts: true,
  showCombo: false,
  layout: 'horizontal',
  compact: false,
})

// 計算進度百分比，用於可能的進度條顯示
const progressPercent = computed(() => {
  if (props.totalRounds <= 0) return 0
  return Math.min(100, Math.round((props.currentRound / props.totalRounds) * 100))
})

// 時間警告狀態 (剩餘 10 秒變紅)
const isTimeRunningOut = computed(() => {
  return props.timeLeft !== undefined && props.timeLeft <= 10
})

// 格式化分數 (千分位)
const formattedScore = computed(() => {
  return props.score.toLocaleString()
})
</script>

<template>
  <div 
    class="game-status-bar w-full transition-all duration-300 select-none bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm"
    :class="[
      layout === 'vertical' ? 'flex-col h-full py-4' : 'flex-row items-center h-14 sm:h-16 px-2 sm:px-4',
      compact ? 'gap-2 text-sm' : 'gap-4 sm:gap-6'
    ]"
  >
    
    <div 
      v-if="showTimer" 
      class="status-group flex-shrink-0 min-w-[3.5rem] sm:min-w-[5rem]"
      :class="{ 'w-full mb-4': layout === 'vertical' }"
    >
      <div 
        class="flex flex-col items-end sm:items-center justify-center"
        :class="{ 'items-center': layout === 'vertical' }"
      >
        <span class="status-label" v-if="!compact || layout === 'vertical'">
          {{ timeLeft !== undefined ? '剩餘時間' : '時間' }}
        </span>
        <div class="relative flex items-center justify-center">
          <GameTimer
            :time="timeLeft"
            :total-time="totalTime"
            :show-progress="false"
            :size="compact ? 'sm' : 'md'"
            class="mr-1"
          />
          <span 
            class="status-value tabular-nums leading-none"
            :class="[
              isTimeRunningOut ? 'text-red-600 animate-pulse font-black' : 'text-[var(--color-text)]',
              compact ? 'text-lg' : 'text-xl sm:text-2xl'
            ]"
          >
            {{ Math.floor((timeLeft || 0) / 60) }}:{{ ((timeLeft || 0) % 60).toString().padStart(2, '0') }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="layout === 'horizontal' && !compact" class="h-8 w-px bg-[var(--color-border)] mx-1 hidden sm:block"></div>

    <div 
      v-if="showProgress && totalRounds > 0" 
      class="status-group flex-1 flex flex-col items-center justify-center min-w-[3rem]"
    >
      <span class="status-label">進度</span>
      <div class="flex items-baseline gap-0.5 status-value text-[var(--color-primary)]">
        <span class="text-lg sm:text-2xl font-black">{{ currentRound }}</span>
        <span class="text-sm sm:text-base font-medium opacity-60">/{{ totalRounds }}</span>
      </div>
    </div>

    <div 
      v-if="showCombo && combo > 1" 
      class="status-group combo-container animate-bounce-in"
      :class="{ 'absolute top-14 left-1/2 -translate-x-1/2 z-50': compact && layout === 'horizontal' }"
    >
      <div class="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full shadow-md">
        <span class="text-sm">🔥</span>
        <span class="font-black italic text-sm sm:text-base tracking-widest">{{ combo }}</span>
        <span class="text-xs font-bold uppercase">Combo</span>
      </div>
    </div>

    <div 
      v-if="showCounts" 
      class="status-group flex items-center justify-center gap-2 sm:gap-4 bg-[var(--color-bg)] rounded-lg px-2 py-1"
      :class="{ 'flex-col w-full gap-2': layout === 'vertical' }"
    >
      <div class="flex items-center gap-1" title="答對題數">
        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">✓</span>
        <span class="status-value text-green-700 dark:text-green-400 min-w-[1rem] text-center">{{ correctCount }}</span>
      </div>
      <div class="w-px h-4 bg-[var(--color-border)]" v-if="layout !== 'vertical'"></div>
      <div class="flex items-center gap-1" title="答錯題數">
        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold">✗</span>
        <span class="status-value text-red-600 dark:text-red-400 min-w-[1rem] text-center">{{ wrongCount }}</span>
      </div>
    </div>

    <div v-if="layout === 'horizontal' && !compact" class="h-8 w-px bg-[var(--color-border)] mx-1 hidden sm:block"></div>

    <div 
      v-if="showScore" 
      class="status-group flex flex-col items-end justify-center min-w-[4rem]"
      :class="{ 'items-center w-full mt-auto': layout === 'vertical' }"
    >
      <span class="status-label">分數</span>
      <span 
        class="status-value tabular-nums text-[var(--color-primary)] tracking-tight"
        :class="compact ? 'text-xl' : 'text-2xl sm:text-3xl'"
      >
        {{ formattedScore }}
      </span>
    </div>

  </div>
</template>

<style scoped>
/* 基礎 Flex 容器設定 
  確保所有內容在容器內垂直居中，並根據空間自動伸縮
*/
.game-status-bar {
  display: flex;
  background-color: var(--color-surface);
  box-sizing: border-box;
}

/* 狀態群組通用樣式 */
.status-group {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

/* 長者友善標籤 
  1. 字體不小於 10px/12px
  2. 顏色對比度足夠 (text-secondary)
  3. 間距適中
*/
.status-label {
  font-size: 0.75rem; /* 12px */
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  letter-spacing: 0.025em;
  white-space: nowrap;
}

/* 數值強調 
  1. 使用最粗體 (font-black/bold)
  2. Tabular Nums 防止數字跳動
*/
.status-value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* 手機版/緊湊模式微調 */
@media (max-width: 640px) {
  .status-label {
    font-size: 0.625rem; /* 10px - 手機上允許稍微縮小，但保持可讀 */
    margin-bottom: 0.125rem;
  }

  /* 在極窄螢幕隱藏部分次要標籤，靠圖示識別 */
  .game-status-bar.gap-2 .status-label {
    display: none;
  }

  /* 手機版垂直佈局優化 */
  .game-status-bar[layout="vertical"] {
    padding: 1rem 0.5rem;
    gap: 0.75rem;
  }

  .game-status-bar[layout="vertical"] .status-group {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem;
    background: var(--color-bg-soft);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-light);
  }

  .game-status-bar[layout="vertical"] .status-label {
    margin-bottom: 0;
    margin-right: 0.5rem;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .game-status-bar[layout="vertical"] .status-value {
    text-align: right;
    font-size: 1rem;
  }
}

/* 極小螢幕緊急優化 */
@media (max-width: 375px) {
  .game-status-bar {
    padding: 0.25rem;
    font-size: 0.875rem;
  }

  .status-value {
    font-size: 0.875rem;
  }

  .game-status-bar[layout="vertical"] .status-group {
    padding: 0.375rem;
    gap: 0.25rem;
  }

  .game-status-bar[layout="vertical"] .status-label {
    font-size: 0.6875rem;
  }

  .game-status-bar[layout="vertical"] .status-value {
    font-size: 0.875rem;
  }
}

/* 長者友善：確保最小可點擊區域 */
@media (hover: none) and (pointer: coarse) {
  .game-status-bar {
    min-height: 3rem;
    padding: 0.75rem;
  }

  .status-group {
    min-height: 2.5rem;
    padding: 0.5rem;
  }
}

/* 橫屏模式優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .game-status-bar {
    height: 3rem;
    padding: 0.25rem 0.5rem;
    gap: 0.5rem;
  }

  .status-group {
    min-width: 3rem;
  }

  .status-label {
    font-size: 0.5625rem;
    margin-bottom: 0.125rem;
  }

  .status-value {
    font-size: 0.875rem;
  }

  /* 橫屏垂直佈局 */
  .game-status-bar[layout="vertical"] {
    flex-direction: row;
    height: auto;
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .game-status-bar[layout="vertical"] .status-group {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 3.5rem;
    padding: 0.375rem;
    gap: 0.125rem;
  }

  .game-status-bar[layout="vertical"] .status-label {
    margin: 0;
    font-size: 0.625rem;
  }

  .game-status-bar[layout="vertical"] .status-value {
    font-size: 0.875rem;
    text-align: center;
  }
}

/* Combo 動畫 */
@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>

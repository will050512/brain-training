<template>
  <div class="game-content-fit game-result-scroll max-w-sm sm:max-w-lg mx-auto text-center">
    <div class="game-result-card">
      <div class="game-result-body p-3 sm:p-6">
        <div class="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-4 animate-bounce-in">
          {{ getFinalEmoji(currentScore) }}
        </div>
        <h2 class="text-lg sm:text-xl font-bold mb-2 text-[var(--color-text)]">遊戲結束！</h2>

        <div class="my-4 sm:my-6 lg:my-8 bg-[var(--color-bg)] rounded-xl p-4 sm:p-6 inline-block min-w-[140px] sm:min-w-[180px] shadow-inner relative overflow-hidden">
          <div class="absolute inset-0 bg-[var(--color-primary)]/5"></div>
          <div class="relative z-10 text-6xl sm:text-7xl lg:text-8xl font-black leading-none filter drop-shadow-md" :class="getScoreClass(currentScore)">
            {{ currentScore }}
          </div>
          <div class="relative z-10 text-sm sm:text-base lg:text-xl text-[var(--color-text-secondary)] mt-2 font-bold tracking-widest uppercase">SCORE</div>
        </div>

        <div class="mb-3 sm:mb-4 grid grid-cols-2 gap-2 sm:gap-3 text-left">
          <div class="bg-[var(--color-primary-bg)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
            <div class="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">等級評定</div>
            <div class="text-xl sm:text-2xl font-bold text-[var(--color-score)]">{{ unifiedGameResult?.grade || 'N/A' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
            <div class="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">遊戲時長</div>
            <div class="text-xl sm:text-2xl font-bold text-[var(--color-progress)]">{{ formatTime(gameResult?.duration || 0) }}</div>
          </div>
        </div>

        <div v-if="unifiedGameResult?.displayStats && unifiedGameResult.displayStats.length > 0" class="mb-4 sm:mb-6 lg:mb-8">
          <div class="text-xs sm:text-sm font-bold text-[var(--color-text-secondary)] mb-2 text-center">📊 詳細統計</div>
          <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-left">
            <div
              v-for="(stat, index) in unifiedGameResult.displayStats"
              :key="index"
              class="bg-[var(--color-surface-alt)] p-2 sm:p-3 lg:p-4 rounded-lg flex items-center gap-2 border transition-all"
              :class="[
                stat.highlight ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]' : 'border-[var(--color-border)]'
              ]"
            >
              <div v-if="stat.icon" class="text-xl sm:text-2xl flex-shrink-0">{{ stat.icon }}</div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-[var(--color-text-secondary)] truncate">{{ stat.label }}</div>
                <div class="text-base sm:text-lg lg:text-xl font-bold text-[var(--color-text)] truncate">
                  {{ typeof stat.value === 'number' ? stat.value : stat.value }}<span v-if="stat.unit" class="text-xs ml-0.5">{{ stat.unit }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="bestScore > 0" class="mb-6 p-3 sm:p-4 bg-[var(--color-primary-bg)] rounded-lg border border-[var(--color-border)] flex justify-between items-center text-sm sm:text-base">
          <span class="text-[var(--color-text)]">最佳成績</span>
          <div class="text-right">
            <span class="font-bold text-[var(--color-score)] block">{{ bestScore }} 分</span>
            <div v-if="currentScore > bestScore" class="text-xs text-[var(--color-record)] font-bold">
              🎉 新紀錄！
            </div>
          </div>
        </div>

        <div
          v-if="difficultyAdjustment"
          class="mb-6 p-3 sm:p-4 rounded-xl border-2 text-left"
          :class="[difficultyFeedbackStyle.bgClass, difficultyFeedbackStyle.borderClass]"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
              :class="difficultyFeedbackStyle.iconBgClass"
            >
              {{ difficultyFeedbackStyle.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-sm sm:text-base mb-1" :class="difficultyFeedbackStyle.textClass">難度調整通知</h4>
              <p class="text-xs sm:text-sm mb-2 break-words" :class="difficultyFeedbackStyle.subTextClass">{{ difficultyReasonText }}</p>

              <div
                class="text-xs sm:text-sm p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-black/20"
                :class="difficultyFeedbackStyle.subTextClass"
              >
                <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span class="font-medium truncate">{{ getFullDifficultyLabel(difficultyAdjustment.currentDifficulty, difficultyAdjustment.currentSubDifficulty) }}</span>
                  <span>→</span>
                  <span class="font-bold truncate">{{ getFullDifficultyLabel(difficultyAdjustment.newDifficulty, difficultyAdjustment.newSubDifficulty) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isFromDailyTraining && recommendedGames.length > 0" class="mt-4">
          <h3 class="text-sm font-medium text-[var(--color-text)] mb-3 text-left">
            🎯 其他推薦
          </h3>
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              v-for="game in recommendedGames"
              :key="game.id"
              @click="onStartRecommendedGame(game)"
              class="recommended-game-card"
            >
              <span class="text-2xl sm:text-3xl mb-1 sm:mb-2">{{ game.icon }}</span>
              <span class="text-xs sm:text-sm font-bold text-[var(--color-text)] truncate w-full px-1">
                {{ game.name }}
              </span>
              <span class="text-[10px] sm:text-xs text-[var(--color-accent-purple)] font-medium">
                {{ getGameDimensionLabel(game.id) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="game-result-actions px-3 sm:px-6">
        <template v-if="isFromDailyTraining">
          <div class="flex flex-col gap-3">
            <button
              v-if="nextTrainingAvailable"
              @click="onContinueToNextGame"
              class="btn btn-primary btn-xl w-full shadow-lg"
            >
              ➡️ 下一個遊戲
            </button>
            <router-link
              v-else-if="dailyQueueCount > 0"
              to="/report"
              class="btn btn-primary btn-xl w-full shadow-lg"
            >
              📊 查看報告
            </router-link>
            <router-link
              v-else
              to="/daily-challenge"
              class="btn btn-primary btn-xl w-full shadow-lg"
            >
              🏠 返回每日訓練
            </router-link>

            <button @click="onPlayAgain" class="btn btn-secondary btn-lg w-full">
              🔄 再玩一次
            </button>
          </div>
          <div v-if="dailyQueueCount > 0" class="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
            訓練進度：{{ trainingIndex + 1 }} / {{ dailyQueueCount }}
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-3">
            <button
              v-if="recommendedGames.length > 0 && recommendedGames[0]"
              @click="recommendedGames[0] && onStartRecommendedGame(recommendedGames[0])"
              class="btn btn-primary btn-xl py-3 sm:py-4 text-base sm:text-lg w-full shadow-md flex items-center justify-center gap-2"
            >
              <span>➡️</span>
              <div class="text-left leading-tight">
                <div class="text-xs opacity-80 font-normal">下一個挑戰</div>
                <div>{{ recommendedGames[0]?.name }}</div>
              </div>
            </button>

            <div class="grid grid-cols-2 gap-3">
              <button @click="onPlayAgain" class="btn btn-secondary btn-lg w-full py-3">
                🔄 再玩一次
              </button>
              <router-link to="/games" class="btn btn-secondary btn-lg w-full py-3 flex items-center justify-center">
                🎮 更多遊戲
              </router-link>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameDefinition, GameResult, UnifiedGameResult, Difficulty, SubDifficulty } from '@/types/game'
import type { DifficultyAdjustment } from '@/services/adaptiveDifficultyService'

type DifficultyFeedbackStyle = {
  bgClass: string
  borderClass: string
  iconBgClass: string
  icon: string
  textClass: string
  subTextClass: string
}

defineProps<{
  currentScore: number
  unifiedGameResult: UnifiedGameResult | null
  gameResult: GameResult | null
  bestScore: number
  difficultyAdjustment: DifficultyAdjustment | null
  difficultyFeedbackStyle: DifficultyFeedbackStyle
  difficultyReasonText: string
  recommendedGames: GameDefinition[]
  isFromDailyTraining: boolean
  nextTrainingAvailable: boolean
  dailyQueueCount: number
  trainingIndex: number
  formatTime: (seconds: number) => string
  getFinalEmoji: (score: number) => string
  getScoreClass: (score: number) => string
  getFullDifficultyLabel: (difficulty: Difficulty, subDifficulty: SubDifficulty) => string
  getGameDimensionLabel: (gameId: string) => string
  onStartRecommendedGame: (game: GameDefinition) => void
  onPlayAgain: () => void
  onContinueToNextGame: () => void
}>()
</script>

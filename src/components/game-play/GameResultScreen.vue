<template>
  <div class="game-content-fit game-result-scroll max-w-sm sm:max-w-lg mx-auto text-center">
    <div class="game-result-card">
      <div class="game-result-body p-3 sm:p-6">
        <div class="game-text-6xl mb-2 sm:mb-4 animate-bounce-in">
          {{ getFinalEmoji(currentScore) }}
        </div>
        <h2 class="game-text-xl font-bold mb-2 text-[var(--color-text)]">遊戲結束！</h2>

        <div class="my-4 sm:my-6 lg:my-8 bg-[var(--color-bg)] rounded-xl p-4 sm:p-6 inline-block min-w-[140px] sm:min-w-[180px] shadow-inner relative overflow-hidden">
          <div class="absolute inset-0 bg-[var(--color-primary)]/5"></div>
          <div class="relative z-10 game-text-6xl game-number font-black leading-none filter drop-shadow-md" :class="getScoreClass(currentScore)">
            {{ currentScore }}
          </div>
          <div class="relative z-10 game-text-sm text-[var(--color-text-secondary)] mt-2 font-bold tracking-widest uppercase">SCORE</div>
        </div>

        <div class="mb-3 sm:mb-4 grid grid-cols-2 gap-2 sm:gap-3 text-left">
          <div class="bg-[var(--color-primary-bg)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
            <SubtleLabel text="等級評定" tone="secondary" weight="bold" class="mb-0.5" />
            <div class="game-text-2xl font-bold text-[var(--color-score)]">{{ unifiedGameResult?.grade || 'N/A' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)] p-2 sm:p-3 rounded-lg border border-[var(--color-border)] flex flex-col justify-center">
            <SubtleLabel text="遊戲時長" tone="secondary" weight="bold" class="mb-0.5" />
            <div class="game-text-2xl font-bold text-[var(--color-progress)]">{{ formatTime(gameResult?.duration || 0) }}</div>
          </div>
        </div>

        <div v-if="unifiedGameResult?.displayStats && unifiedGameResult.displayStats.length > 0" class="mb-4 sm:mb-6 lg:mb-8">
          <SubtleLabel text="📊 詳細統計" tone="secondary" weight="bold" class="mb-2 text-center block" />
          <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-left">
            <div
              v-for="(stat, index) in unifiedGameResult.displayStats"
              :key="index"
              class="bg-[var(--color-surface-alt)] p-2 sm:p-3 lg:p-4 rounded-lg flex items-center gap-2 border transition-all"
              :class="[
                stat.highlight ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]' : 'border-[var(--color-border)]'
              ]"
            >
              <div v-if="stat.icon" class="game-text-2xl flex-shrink-0">{{ stat.icon }}</div>
              <div class="flex-1 min-w-0">
                <SubtleLabel :text="stat.label" tone="secondary" class="truncate block" />
                <div class="game-text-lg font-bold text-[var(--color-text)] truncate">
                  {{ typeof stat.value === 'number' ? stat.value : stat.value }}
                  <SubtleLabel v-if="stat.unit" :text="stat.unit" size="xs" tone="muted" class="ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="bestScore > 0" class="mb-6 p-3 sm:p-4 bg-[var(--color-primary-bg)] rounded-lg border border-[var(--color-border)] flex justify-between items-center game-text-base">
          <span class="text-[var(--color-text)]">最佳成績</span>
          <div class="text-right">
            <span class="font-bold text-[var(--color-score)] block game-number">{{ bestScore }} 分</span>
            <SubtleLabel v-if="currentScore > bestScore" text="🎉 新紀錄！" size="xs" class="text-[var(--color-record)] font-bold block" />
          </div>
        </div>

        <div
          v-if="difficultyAdjustment"
          class="mb-6 p-3 sm:p-4 rounded-xl border-2 text-left"
          :class="[difficultyFeedbackStyle.bgClass, difficultyFeedbackStyle.borderClass]"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center game-text-2xl flex-shrink-0"
              :class="difficultyFeedbackStyle.iconBgClass"
            >
              {{ difficultyFeedbackStyle.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold game-text-base mb-1" :class="difficultyFeedbackStyle.textClass">難度調整通知</h4>
              <SubtleLabel :text="difficultyReasonText" size="sm" class="mb-2 break-words block" :class="difficultyFeedbackStyle.subTextClass" />

              <div
                class="p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-black/20"
                :class="difficultyFeedbackStyle.subTextClass"
              >
                <div class="flex flex-wrap items-center gap-1 sm:gap-2 game-text-base">
                  <span class="font-medium truncate">{{ getFullDifficultyLabel(difficultyAdjustment.currentDifficulty, difficultyAdjustment.currentSubDifficulty) }}</span>
                  <span>→</span>
                  <span class="font-bold truncate">{{ getFullDifficultyLabel(difficultyAdjustment.newDifficulty, difficultyAdjustment.newSubDifficulty) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isFromDailyTraining && recommendedGames.length > 0" class="mt-4">
          <h3 class="game-text-sm font-medium text-[var(--color-text)] mb-3 text-left">
            🎯 其他推薦
          </h3>
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              v-for="game in recommendedGames"
              :key="game.id"
              @click="onStartRecommendedGame(game)"
              class="recommended-game-card"
            >
              <span class="game-text-3xl mb-1 sm:mb-2">{{ game.icon }}</span>
              <SubtleLabel :text="game.name" tone="secondary" weight="bold" class="truncate w-full px-1" />
              <SubtleLabel :text="getGameDimensionLabel(game.id)" size="xs" class="text-[var(--color-accent-purple)] font-medium" />
            </button>
          </div>
        </div>
      </div>

      <div class="game-result-actions px-3 sm:px-6">
        <template v-if="isFromDailyTraining">
          <div class="flex flex-col gap-3">
            <BaseButton
              v-if="nextTrainingAvailable"
              size="xl"
              full-width
              class="shadow-lg"
              @click="onContinueToNextGame"
            >
              ➡️ 下一個遊戲
            </BaseButton>
            <router-link
              v-else-if="dailyQueueCount > 0"
              to="/report"
              custom
              v-slot="{ navigate }"
            >
              <BaseButton size="xl" full-width class="shadow-lg" @click="navigate">
                📊 查看報告
              </BaseButton>
            </router-link>
            <router-link
              v-else
              to="/daily-challenge"
              custom
              v-slot="{ navigate }"
            >
              <BaseButton size="xl" full-width class="shadow-lg" @click="navigate">
                🏠 返回每日訓練
              </BaseButton>
            </router-link>

            <BaseButton variant="secondary" size="lg" full-width @click="onPlayAgain">
              🔄 再玩一次
            </BaseButton>
          </div>
          <SubtleLabel
            v-if="dailyQueueCount > 0"
            :text="`訓練進度：${trainingIndex + 1} / ${dailyQueueCount}`"
            tone="secondary"
            class="mt-2 block"
          />
        </template>

        <template v-else>
          <div class="flex flex-col gap-3">
            <BaseButton
              v-if="recommendedGames.length > 0 && recommendedGames[0]"
              size="xl"
              full-width
              class="py-3 sm:py-4 game-text-lg shadow-md flex items-center justify-center gap-2"
              @click="recommendedGames[0] && onStartRecommendedGame(recommendedGames[0])"
            >
              <span>➡️</span>
              <div class="text-left leading-tight">
                <SubtleLabel text="下一個挑戰" size="xs" class="opacity-80 font-normal" />
                <div>{{ recommendedGames[0]?.name }}</div>
              </div>
            </BaseButton>

            <div class="grid grid-cols-2 gap-3">
              <BaseButton variant="secondary" size="lg" full-width class="py-3" @click="onPlayAgain">
                🔄 再玩一次
              </BaseButton>
              <router-link to="/games" custom v-slot="{ navigate }">
                <BaseButton variant="secondary" size="lg" full-width class="py-3 flex items-center justify-center" @click="navigate">
                  🎮 更多遊戲
                </BaseButton>
              </router-link>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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
  onStartRecommendedGame: (game: GameDefinition) => void | Promise<void>
  onPlayAgain: () => void | Promise<void>
  onContinueToNextGame: () => void | Promise<void>
}>()
</script>

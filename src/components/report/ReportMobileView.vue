<template>
  <div class="flex flex-col min-h-screen pb-safe">
    <header class="h-[52px] flex items-center justify-between px-3 sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
      <h2 class="text-base font-bold tracking-tight text-[var(--color-text)]">認知評估報告</h2>
      <BaseButton
        variant="secondary"
        size="sm"
        class="w-11 h-11 rounded-full border border-[var(--color-border)] active:scale-95 transition-transform"
        :disabled="isGenerating"
        aria-label="下載報告"
        @click="onDownloadReport"
      >
        <span class="text-lg">{{ isGenerating ? '⏳' : '📥' }}</span>
      </BaseButton>
    </header>

    <main class="flex-1 p-3 space-y-3 overflow-x-hidden">
      <div class="px-3 py-2 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 flex items-start gap-2">
        <span class="text-sm">⚠️</span>
        <p class="leading-snug pt-0.5">
          <SubtleLabel text="數據僅供參考，非醫療診斷。" tone="secondary" />
        </p>
      </div>

      <section class="p-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-sm relative overflow-hidden">
        <div class="absolute right-0 top-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)] shadow-inner text-xl">
            👤
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold truncate leading-tight">{{ userName || '使用者' }}</h2>
            <SubtleLabel :text="`${userAge || '?'} 歲 • ${educationYears || 0}年教育`" tone="secondary" class="block" />
            <SubtleLabel
              v-if="birthday"
              :text="`生日: ${formatBirthdayToRoc(birthday)}`"
              size="xs"
              tone="muted"
              class="block"
            />
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold leading-none" :class="getScoreClass(cognitiveIndex)">{{ cognitiveIndex }}</div>
            <SubtleLabel text="綜合指數" size="xs" caps />
          </div>
        </div>
      </section>

      <section class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="能力分佈" size="sm" spacing="sm" />
        <div class="h-44 -ml-2">
          <RadarChart ref="radarChartRef" :scores="cognitiveScores" :previousScores="previousScores" />
        </div>
      </section>

      <section class="space-y-2">
        <div v-for="dim in cognitiveDimensions" :key="dim.id" class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3 shadow-sm active:scale-[0.99] transition-transform">
          <div class="w-9 h-9 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg shrink-0 text-[var(--color-text)]">
            {{ dim.icon }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-sm font-bold text-[var(--color-text)]">{{ dim.name }}</span>
              <span class="text-sm font-bold font-mono" :style="{ color: dim.color }">{{ cognitiveScores[dim.id] }}</span>
            </div>
            <div class="h-1.5 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-1000" :style="{ width: `${cognitiveScores[dim.id]}%`, backgroundColor: dim.color }"></div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="normativeData" class="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="台灣常模參考" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>📊</span>
          </template>
        </SectionTitle>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <SubtleLabel text="MMSE" size="xs" weight="bold" caps class="mb-0.5" />
            <div class="text-xl font-bold text-[var(--color-score)]">{{ normativeData.mmse.cutoff || '-' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <SubtleLabel text="MoCA" size="xs" weight="bold" caps class="mb-0.5" />
            <div class="text-xl font-bold text-[var(--color-progress)]">{{ normativeData.moca.cutoff || '-' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <SubtleLabel text="CASI" size="xs" weight="bold" caps class="mb-0.5" />
            <div class="text-xl font-bold text-[var(--color-score-good)]">{{ normativeData.casi.cutoff || '-' }}</div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="歷史趨勢" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>📈</span>
          </template>
        </SectionTitle>
        <div class="h-40 -ml-2">
          <TrendChart ref="trendChartRef" :history="scoreHistory" chartType="bar" :showWarningLines="true" :professionalMode="false" />
        </div>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div class="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[var(--color-border-light)]">
            <SectionTitle
              title="每日訓練"
              as="h4"
              size="sm"
              spacing="none"
              :show-accent="false"
            >
              <template #prefix>
                <span class="text-sm">📅</span>
              </template>
            </SectionTitle>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between">
              <SubtleLabel text="次數" size="sm" />
              <span class="font-bold text-[var(--color-text)]">{{ dailyStats.totalGames }}</span>
            </div>
            <div class="flex justify-between">
              <SubtleLabel text="平均" size="sm" />
              <span class="font-bold text-[var(--color-score-good)]">{{ dailyStats.averageScore }}</span>
            </div>
            <div class="flex justify-between">
              <SubtleLabel text="總時長" size="sm" />
              <span class="font-bold text-[var(--color-text)]">{{ formatPlayTime(dailyStats.totalPlayTime) }}</span>
            </div>
          </div>
        </div>
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div class="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[var(--color-border-light)]">
            <SectionTitle
              title="自由遊戲"
              as="h4"
              size="sm"
              spacing="none"
              :show-accent="false"
            >
              <template #prefix>
                <span class="text-sm">🎮</span>
              </template>
            </SectionTitle>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between">
              <SubtleLabel text="次數" size="sm" />
              <span class="font-bold text-[var(--color-text)]">{{ freeStats.totalGames }}</span>
            </div>
            <div class="flex justify-between">
              <SubtleLabel text="平均" size="sm" />
              <span class="font-bold text-[var(--color-score-good)]">{{ freeStats.averageScore }}</span>
            </div>
            <div class="flex justify-between">
              <SubtleLabel text="總時長" size="sm" />
              <span class="font-bold text-[var(--color-text)]">{{ formatPlayTime(freeStats.totalPlayTime) }}</span>
            </div>
          </div>
        </div>
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm sm:col-span-2">
          <div class="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-[var(--color-border-light)]">
            <SectionTitle
              title="連續訓練"
              as="h4"
              size="sm"
              spacing="none"
              :show-accent="false"
            >
              <template #prefix>
                <span class="text-sm">🔥</span>
              </template>
            </SectionTitle>
          </div>
          <div class="flex justify-between">
            <SubtleLabel text="連續天數" size="sm" />
            <span class="font-bold text-[var(--color-text)]">{{ userStreak }}</span>
          </div>
        </div>
      </section>

      <section v-if="latestMiniCogResult" class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm relative overflow-hidden">
        <div class="absolute right-0 top-0 w-24 h-24 bg-[var(--color-bg-soft)] rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex justify-between items-center mb-2">
            <SectionTitle title="Mini-Cog" size="sm" spacing="sm" accent-class="bg-[var(--color-accent-purple)]" />
            <span class="bg-[var(--color-surface-alt)] px-2 py-0.5 rounded-full">
              <SubtleLabel :text="formatDateTime(latestMiniCogResult.completedAt).split(' ')[0]" size="xs" />
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-bold shrink-0 bg-[var(--color-surface)]"
              :class="[getMiniCogBorderClass(latestMiniCogResult.totalScore), getMiniCogScoreClass(latestMiniCogResult.totalScore)]"
            >
              {{ latestMiniCogResult.totalScore }}
            </div>
            <div class="flex-1 text-sm p-2 rounded-lg bg-[var(--color-bg-soft)] border-l-2" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
              <SubtleLabel
                :text="getMiniCogInterpretation(latestMiniCogResult).label"
                size="xs"
                weight="bold"
                class="mb-0.5 block leading-none"
              />
              <SubtleLabel
                :text="getMiniCogInterpretation(latestMiniCogResult).description"
                size="xs"
                tone="secondary"
                class="leading-tight opacity-90 block truncate"
              />
            </div>
          </div>
        </div>
        <div v-if="miniCogHistory.length > 1" class="mt-2 pt-2 border-t border-[var(--color-border)]">
          <button @click="onToggleMiniCogHistory" class="flex items-center gap-2 w-full">
            <span>{{ showMiniCogHistory ? '▼' : '▶' }}</span>
            <SubtleLabel :text="`查看歷史 (${miniCogHistory.length})`" tone="secondary" />
          </button>
          <Transition name="expand">
            <div v-if="showMiniCogHistory" class="grid grid-cols-1 gap-1.5 mt-2">
              <div v-for="record in miniCogHistory.slice(1)" :key="record.id" class="flex justify-between p-2 bg-[var(--color-bg-soft)] rounded-lg border border-[var(--color-border-light)]">
                <SubtleLabel :text="formatDateTime(record.completedAt)" />
                <span class="font-bold" :class="getMiniCogScoreClass(record.totalScore)">{{ record.totalScore }} 分</span>
              </div>
            </div>
          </Transition>
        </div>
      </section>
      <section v-else class="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] shadow-sm text-center">
        <div class="text-2xl mb-2">📋</div>
        <SubtleLabel text="無 Mini-Cog 記錄" class="mb-2" />
        <router-link to="/assessment" custom v-slot="{ navigate }">
          <BaseButton size="sm" class="px-4 py-1.5 shadow-sm" @click="navigate">
            開始評估
          </BaseButton>
        </router-link>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="關聯分析" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>📐</span>
          </template>
        </SectionTitle>
        <MiniCogCorrelationChart :mini-cog-results="miniCogHistory" :game-sessions="recentSessions" />
      </section>

      <section v-if="trainingSuggestions.length > 0" class="space-y-3">
        <SectionTitle title="智能建議" size="sm" spacing="sm" :show-accent="false" class="px-1">
          <template #prefix>
            <span>💡</span>
          </template>
        </SectionTitle>
        <div
          v-for="(suggestion, i) in trainingSuggestions"
          :key="i"
          class="p-3 rounded-xl border-l-[3px] bg-[var(--color-surface)] shadow-sm"
          :class="suggestion.priority === 'high' ? 'border-[var(--color-danger)]' : (suggestion.priority === 'medium' ? 'border-[var(--color-warning)]' : 'border-[var(--color-success)]')"
        >
          <div class="flex items-center gap-1.5 font-bold mb-1 text-[var(--color-text)]">
            {{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }} {{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}
          </div>
          <SubtleLabel :text="suggestion.message" tone="secondary" class="leading-relaxed block" />
          <div v-if="suggestion.suggestedGames.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span v-for="g in suggestion.suggestedGames" :key="g" class="px-2 py-1 bg-[var(--color-surface-alt)] rounded border border-[var(--color-border)]">
              <SubtleLabel :text="g" size="xs" />
            </span>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="各遊戲表現" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>🎮</span>
          </template>
        </SectionTitle>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div v-for="game in allGames" :key="game.id" class="p-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">{{ game.icon }}</span>
              <span class="text-sm font-bold text-[var(--color-text)]">{{ game.name }}</span>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <SubtleLabel text="最佳" />
                <span class="font-bold text-[var(--color-text)]">{{ getBestScore(game.id) || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <SubtleLabel text="平均" />
                <span class="text-[var(--color-text)]">{{ getAverageScore(game.id) || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="最近遊戲記錄" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>🕐</span>
          </template>
        </SectionTitle>
        <div v-if="recentSessions.length > 0" class="space-y-2">
          <div v-for="session in recentSessions" :key="session.id" class="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-lg">
            <div class="flex items-center gap-3">
              <span class="text-lg">{{ getGameIcon(session.gameId) }}</span>
              <div>
                <div class="text-sm font-bold text-[var(--color-text)]">{{ getGameName(session.gameId) }}</div>
                <SubtleLabel :text="formatDateTime(session.createdAt)" size="xs" />
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold" :class="getScoreClass(session.result.score)">{{ session.result.score }} 分</div>
              <SubtleLabel :text="DIFFICULTIES[session.difficulty]?.name" size="xs" />
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-sm">
          <SubtleLabel text="尚無近期記錄" />
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <SectionTitle title="營養建議" size="sm" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>🥗</span>
          </template>
        </SectionTitle>
        <div v-if="!nutritionUnlocked" class="text-center py-2">
          <div class="text-xl mb-1">🔒</div>
          <p class="mb-2">
            <SubtleLabel
              :text="`再玩 ${NUTRITION_UNLOCK_REQUIRED_TRAININGS - nutritionUnlockProgress} 場解鎖`"
              tone="muted"
            />
          </p>
          <div class="w-32 h-1 bg-[var(--color-bg-muted)] rounded-full mx-auto overflow-hidden">
            <div class="h-full bg-[var(--color-success)]" :style="{ width: `${nutritionUnlockPercent}%` }"></div>
          </div>
        </div>
        <div v-else-if="nutritionResult" class="space-y-3">
          <div class="bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 p-3 rounded-lg">
            <div class="flex items-start gap-2">
              <span class="text-lg">⚠️</span>
              <div class="flex-1">
                <SubtleLabel text="以下建議僅供參考，不構成醫療診斷。" class="block" />
                <button @click="onToggleNutritionDisclaimer" class="text-[var(--color-warning)] underline mt-1">
                  <SubtleLabel :text="showNutritionDisclaimer ? '收起' : '完整免責聲明'" size="xs" class="text-[var(--color-warning)]" />
                </button>
                <div v-if="showNutritionDisclaimer" class="mt-2 pt-2 border-t border-[var(--color-warning)]/30">
                  <SubtleLabel :text="NUTRITION_DISCLAIMER" size="xs" tone="secondary" class="block whitespace-pre-wrap" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="nutritionResult.recommendations.filter(r => r.priority === 'high').length > 0" class="space-y-2">
            <SectionTitle title="重點關注" as="h4" size="sm" spacing="sm" :show-accent="false" class="uppercase tracking-wider text-[var(--color-danger)]">
              <template #prefix>
                <span class="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span>
              </template>
            </SectionTitle>
            <div class="space-y-2">
              <div v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'high')" :key="rec.id" class="p-3 rounded-xl bg-[var(--color-danger-bg)] border-l-4 border-[var(--color-danger)]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-bold text-[var(--color-text)]">{{ rec.supplement.name }}</span>
                  <span v-if="rec.supplement.isPartnerProduct" class="badge badge--warning">
                    <SubtleLabel text="合作" size="xs" />
                  </span>
                </div>
                <SubtleLabel :text="rec.reason" tone="secondary" class="mb-2 block" />
                <div class="bg-[var(--color-surface)]/50 p-2 rounded inline-block">
                  <SubtleLabel text="建議劑量：" size="xs" tone="secondary" class="mr-1" />
                  <SubtleLabel :text="rec.supplement.dosageRange" size="xs" tone="secondary" weight="bold" />
                </div>
              </div>
            </div>
          </div>

          <div class="bg-[var(--color-success-bg)] p-4 rounded-xl border border-[var(--color-success)]/30">
            <SectionTitle title="一般建議" as="h4" size="sm" spacing="sm" :show-accent="false" class="uppercase tracking-wider text-[var(--color-success)]" />
            <ul class="grid grid-cols-1 gap-2">
              <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i" class="flex gap-2">
                <span class="text-[var(--color-success)] font-bold">✓</span>
                <SubtleLabel :text="advice" tone="secondary" class="block" />
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="text-center py-3">
          <SubtleLabel text="載入中..." size="xs" />
        </div>
      </section>

      <div class="h-8"></div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CognitiveScores, CognitiveDimensionInfo } from '@/types/cognitive'
import type { GameDefinition, GameSession } from '@/types/game'
import type { ScoreHistory, TrainingSuggestion } from '@/services/scoreCalculator'
import type { MiniCogResult } from '@/services/miniCogService'
import type { PersonalizedNutritionResult } from '@/services/nutritionPlaceholder'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import MiniCogCorrelationChart from '@/components/charts/MiniCogCorrelationChart.vue'
import { COGNITIVE_DIMENSIONS } from '@/types/cognitive'
import { DIFFICULTIES } from '@/types/game'
import { NUTRITION_DISCLAIMER } from '@/services/nutritionPlaceholder'
import { NUTRITION_UNLOCK_REQUIRED_TRAININGS } from '@/utils/trainingStats'

type NormativeData = {
  mmse: { cutoff: number | null }
  moca: { cutoff: number | null }
  casi: { cutoff: number | null }
}

type StatSummary = {
  totalGames: number
  totalPlayTime: number
  averageScore: number
}

defineProps<{
  isGenerating: boolean
  onDownloadReport: () => void
  userName: string
  userAge: number | null
  educationYears: number
  birthday: string | null
  cognitiveIndex: number
  getScoreClass: (score: number) => string
  formatBirthdayToRoc: (birthday: string) => string
  cognitiveDimensions: CognitiveDimensionInfo[]
  cognitiveScores: CognitiveScores
  previousScores: CognitiveScores
  normativeData: NormativeData | null
  scoreHistory: ScoreHistory[]
  dailyStats: StatSummary
  freeStats: StatSummary
  formatPlayTime: (seconds: number) => string
  userStreak: number
  latestMiniCogResult: MiniCogResult | null
  miniCogHistory: MiniCogResult[]
  showMiniCogHistory: boolean
  onToggleMiniCogHistory: () => void
  formatDateTime: (date: Date | string) => string
  getMiniCogScoreClass: (score: number) => string
  getMiniCogBorderClass: (score: number) => string
  getMiniCogInterpretation: (result: MiniCogResult) => { label: string; description: string }
  getMiniCogInterpretationClass: (result: MiniCogResult) => string
  trainingSuggestions: TrainingSuggestion[]
  allGames: GameDefinition[]
  getBestScore: (gameId: string) => number | null | undefined
  getAverageScore: (gameId: string) => number | null | undefined
  recentSessions: GameSession[]
  getGameIcon: (gameId: string) => string
  getGameName: (gameId: string) => string
  nutritionUnlocked: boolean
  nutritionUnlockProgress: number
  nutritionUnlockPercent: number
  nutritionResult: PersonalizedNutritionResult | null
  showNutritionDisclaimer: boolean
  onToggleNutritionDisclaimer: () => void
}>()

const radarChartRef = ref<InstanceType<typeof RadarChart> | null>(null)
const trendChartRef = ref<InstanceType<typeof TrendChart> | null>(null)

defineExpose({
  getRadarChartDataURL: () => radarChartRef.value?.getDataURL() ?? null,
  getTrendChartDataURL: () => trendChartRef.value?.getDataURL() ?? null
})
</script>

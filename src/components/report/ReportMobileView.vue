<template>
  <div class="flex flex-col min-h-screen pb-safe">
    <header class="h-[52px] flex items-center justify-between px-3 sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
      <h2 class="text-base font-bold tracking-tight text-[var(--color-text)]">認知評估報告</h2>
      <button
        @click="onDownloadReport"
        class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)] active:scale-95 transition-transform"
        :disabled="isGenerating"
        aria-label="下載報告"
      >
        <span class="text-lg">{{ isGenerating ? '⏳' : '📥' }}</span>
      </button>
    </header>

    <main class="flex-1 p-3 space-y-3 overflow-x-hidden">
      <div class="px-3 py-2 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 flex items-start gap-2">
        <span class="text-sm">⚠️</span>
        <p class="text-xs text-[var(--color-text-secondary)] leading-snug pt-0.5">
          數據僅供參考，非醫療診斷。
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
            <p class="text-xs text-[var(--color-text-secondary)] font-medium">{{ userAge || '?' }} 歲 • {{ educationYears || 0 }}年教育</p>
            <p v-if="birthday" class="text-[10px] text-[var(--color-text-muted)]">
              生日: {{ formatBirthdayToRoc(birthday) }}
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold leading-none" :class="getScoreClass(cognitiveIndex)">{{ cognitiveIndex }}</div>
            <div class="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider">綜合指數</div>
          </div>
        </div>
      </section>

      <section class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-1 h-3 rounded-full bg-[var(--color-primary)]"></span>
          <h3 class="text-sm font-bold text-[var(--color-text)]">能力分佈</h3>
        </div>
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
        <h3 class="text-sm font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">
          <span>📊</span> 台灣常模參考
        </h3>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <div class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">MMSE</div>
            <div class="text-xl font-bold text-[var(--color-score)]">{{ normativeData.mmse.cutoff || '-' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <div class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">MoCA</div>
            <div class="text-xl font-bold text-[var(--color-progress)]">{{ normativeData.moca.cutoff || '-' }}</div>
          </div>
          <div class="bg-[var(--color-surface-alt)]/90 backdrop-blur p-2.5 rounded-lg border border-[var(--color-border)] shadow-sm">
            <div class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">CASI</div>
            <div class="text-xl font-bold text-[var(--color-score-good)]">{{ normativeData.casi.cutoff || '-' }}</div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
        <h3 class="text-sm font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">
          <span>📈</span> 歷史趨勢
        </h3>
        <div class="h-40 -ml-2">
          <TrendChart ref="trendChartRef" :history="scoreHistory" chartType="bar" :showWarningLines="true" :professionalMode="false" />
        </div>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div class="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[var(--color-border-light)]">
            <span class="text-sm">📅</span>
            <span class="text-xs font-bold text-[var(--color-text)]">每日訓練</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">次數</span>
              <span class="font-bold text-[var(--color-text)]">{{ dailyStats.totalGames }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">平均</span>
              <span class="font-bold text-[var(--color-score-good)]">{{ dailyStats.averageScore }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">總時長</span>
              <span class="font-bold text-[var(--color-text)]">{{ formatPlayTime(dailyStats.totalPlayTime) }}</span>
            </div>
          </div>
        </div>
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div class="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[var(--color-border-light)]">
            <span class="text-sm">🎮</span>
            <span class="text-xs font-bold text-[var(--color-text)]">自由遊戲</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">次數</span>
              <span class="font-bold text-[var(--color-text)]">{{ freeStats.totalGames }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">平均</span>
              <span class="font-bold text-[var(--color-score-good)]">{{ freeStats.averageScore }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-[var(--color-text-muted)]">總時長</span>
              <span class="font-bold text-[var(--color-text)]">{{ formatPlayTime(freeStats.totalPlayTime) }}</span>
            </div>
          </div>
        </div>
        <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm sm:col-span-2">
          <div class="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-[var(--color-border-light)]">
            <span class="text-sm">🔥</span>
            <span class="text-xs font-bold text-[var(--color-text)]">連續訓練</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-[var(--color-text-muted)]">連續天數</span>
            <span class="font-bold text-[var(--color-text)]">{{ userStreak }}</span>
          </div>
        </div>
      </section>

      <section v-if="latestMiniCogResult" class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm relative overflow-hidden">
        <div class="absolute right-0 top-0 w-24 h-24 bg-[var(--color-bg-soft)] rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-bold flex items-center gap-1.5 text-[var(--color-text)]">
              <span class="w-1 h-3 rounded-full bg-[var(--color-accent-purple)]"></span>
              Mini-Cog
            </h3>
            <span class="text-[10px] bg-[var(--color-surface-alt)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
              {{ formatDateTime(latestMiniCogResult.completedAt).split(' ')[0] }}
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
              <div class="font-bold text-xs mb-0.5 leading-none">{{ getMiniCogInterpretation(latestMiniCogResult).label }}</div>
              <div class="text-[10px] leading-tight opacity-90 truncate">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</div>
            </div>
          </div>
        </div>
        <div v-if="miniCogHistory.length > 1" class="mt-2 pt-2 border-t border-[var(--color-border)]">
          <button @click="onToggleMiniCogHistory" class="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] w-full">
            <span>{{ showMiniCogHistory ? '▼' : '▶' }}</span>
            <span>查看歷史 ({{ miniCogHistory.length }})</span>
          </button>
          <Transition name="expand">
            <div v-if="showMiniCogHistory" class="grid grid-cols-1 gap-1.5 mt-2">
              <div v-for="record in miniCogHistory.slice(1)" :key="record.id" class="flex justify-between p-2 bg-[var(--color-bg-soft)] rounded-lg text-xs border border-[var(--color-border-light)]">
                <span class="text-[var(--color-text-muted)]">{{ formatDateTime(record.completedAt) }}</span>
                <span class="font-bold" :class="getMiniCogScoreClass(record.totalScore)">{{ record.totalScore }} 分</span>
              </div>
            </div>
          </Transition>
        </div>
      </section>
      <section v-else class="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] shadow-sm text-center">
        <div class="text-2xl mb-2">📋</div>
        <p class="text-xs text-[var(--color-text-muted)] mb-2">無 Mini-Cog 記錄</p>
        <router-link to="/assessment" class="btn btn-primary px-4 py-1.5 text-xs shadow-sm">開始評估</router-link>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <h3 class="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text)]">
          <span>📐</span> 關聯分析
        </h3>
        <MiniCogCorrelationChart :mini-cog-results="miniCogHistory" :game-sessions="recentSessions" />
      </section>

      <section v-if="trainingSuggestions.length > 0" class="space-y-3">
        <h3 class="text-sm font-bold px-1 flex items-center gap-1.5 text-[var(--color-text)]">
          <span>💡</span> 智能建議
        </h3>
        <div
          v-for="(suggestion, i) in trainingSuggestions"
          :key="i"
          class="p-3 rounded-xl border-l-[3px] text-xs bg-[var(--color-surface)] shadow-sm"
          :class="suggestion.priority === 'high' ? 'border-[var(--color-danger)]' : (suggestion.priority === 'medium' ? 'border-[var(--color-warning)]' : 'border-[var(--color-success)]')"
        >
          <div class="flex items-center gap-1.5 font-bold mb-1 text-[var(--color-text)]">
            {{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }} {{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}
          </div>
          <p class="text-[var(--color-text-secondary)] leading-relaxed">{{ suggestion.message }}</p>
          <div v-if="suggestion.suggestedGames.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span v-for="g in suggestion.suggestedGames" :key="g" class="text-[10px] px-2 py-1 bg-[var(--color-surface-alt)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">{{ g }}</span>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <h3 class="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text)]">
          <span>🎮</span> 各遊戲表現
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div v-for="game in allGames" :key="game.id" class="p-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">{{ game.icon }}</span>
              <span class="text-xs font-bold text-[var(--color-text)]">{{ game.name }}</span>
            </div>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between">
                <span class="text-[var(--color-text-muted)]">最佳</span>
                <span class="font-bold text-[var(--color-text)]">{{ getBestScore(game.id) || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--color-text-muted)]">平均</span>
                <span class="text-[var(--color-text)]">{{ getAverageScore(game.id) || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <h3 class="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text)]">
          <span>🕐</span> 最近遊戲記錄
        </h3>
        <div v-if="recentSessions.length > 0" class="space-y-2">
          <div v-for="session in recentSessions" :key="session.id" class="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-lg">
            <div class="flex items-center gap-3">
              <span class="text-lg">{{ getGameIcon(session.gameId) }}</span>
              <div>
                <div class="text-xs font-bold text-[var(--color-text)]">{{ getGameName(session.gameId) }}</div>
                <div class="text-[10px] text-[var(--color-text-muted)]">{{ formatDateTime(session.createdAt) }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold" :class="getScoreClass(session.result.score)">{{ session.result.score }} 分</div>
              <span class="text-[10px] text-[var(--color-text-muted)]">{{ DIFFICULTIES[session.difficulty]?.name }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-[var(--color-text-muted)] text-sm">尚無近期記錄</div>
      </section>

      <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <h3 class="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text)]">
          <span>🥗</span> 營養建議
        </h3>
        <div v-if="!nutritionUnlocked" class="text-center py-2">
          <div class="text-xl mb-1">🔒</div>
          <p class="text-xs text-[var(--color-text-muted)] mb-2">再玩 <span class="font-bold text-[var(--color-primary)]">{{ NUTRITION_UNLOCK_REQUIRED_TRAININGS - nutritionUnlockProgress }}</span> 場解鎖</p>
          <div class="w-32 h-1 bg-[var(--color-bg-muted)] rounded-full mx-auto overflow-hidden">
            <div class="h-full bg-[var(--color-success)]" :style="{ width: `${nutritionUnlockPercent}%` }"></div>
          </div>
        </div>
        <div v-else-if="nutritionResult" class="space-y-3">
          <div class="bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 p-3 rounded-lg">
            <div class="flex items-start gap-2">
              <span class="text-lg">⚠️</span>
              <div class="flex-1">
                <p class="text-xs text-[var(--color-text)]">以下建議僅供參考，不構成醫療診斷。</p>
                <button @click="onToggleNutritionDisclaimer" class="text-[10px] text-[var(--color-warning)] underline mt-1">
                  {{ showNutritionDisclaimer ? '收起' : '完整免責聲明' }}
                </button>
                <div v-if="showNutritionDisclaimer" class="mt-2 pt-2 border-t border-[var(--color-warning)]/30 text-[10px] text-[var(--color-text-secondary)] whitespace-pre-wrap">
                  {{ NUTRITION_DISCLAIMER }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="nutritionResult.recommendations.filter(r => r.priority === 'high').length > 0" class="space-y-2">
            <h4 class="text-xs font-bold text-[var(--color-danger)] uppercase tracking-wider flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span> 重點關注</h4>
            <div class="space-y-2">
              <div v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'high')" :key="rec.id" class="p-3 rounded-xl bg-[var(--color-danger-bg)] border-l-4 border-[var(--color-danger)]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-bold text-[var(--color-text)]">{{ rec.supplement.name }}</span>
                  <span v-if="rec.supplement.isPartnerProduct" class="badge badge--warning text-[10px]">合作</span>
                </div>
                <p class="text-xs text-[var(--color-text-secondary)] mb-2">{{ rec.reason }}</p>
                <div class="text-[10px] bg-[var(--color-surface)]/50 p-2 rounded inline-block">建議劑量：{{ rec.supplement.dosageRange }}</div>
              </div>
            </div>
          </div>

          <div class="bg-[var(--color-success-bg)] p-4 rounded-xl border border-[var(--color-success)]/30">
            <h4 class="text-xs font-bold text-[var(--color-success)] uppercase tracking-wider mb-2">一般建議</h4>
            <ul class="grid grid-cols-1 gap-2">
              <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i" class="text-xs text-[var(--color-text-secondary)] flex gap-2">
                <span class="text-[var(--color-success)] font-bold">✓</span> {{ advice }}
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="text-center py-3 text-[var(--color-text-muted)] text-xs">載入中...</div>
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

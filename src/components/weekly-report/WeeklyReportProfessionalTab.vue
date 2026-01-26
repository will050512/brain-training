<script setup lang="ts">
import type { ProfessionalAssessment } from '@/services/professionalScoreCalculator'
import {
  getInterpretationDescription,
  getRecommendedAction
} from '@/services/professionalScoreCalculator'

interface Props {
  assessment: ProfessionalAssessment | null
  sessionsCount: number
}

const props = defineProps<Props>()

function getInterpretationColor(interpretation: string): string {
  switch (interpretation) {
    case 'normal':
      return 'var(--color-success)'
    case 'mild':
    case 'mci':
      return 'var(--color-warning)'
    case 'moderate':
      return 'var(--color-danger)'
    case 'severe':
    case 'dementia':
      return 'var(--color-score-concern)'
    default:
      return 'var(--color-text-muted)'
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <template v-if="props.assessment">
      <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)] overflow-hidden">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-[var(--color-text)]">MMSE 估算分數</h2>
            <p class="text-xs text-[var(--color-text-secondary)] mt-1">簡易智能狀態測驗</p>
          </div>
          <div
            class="text-sm font-bold px-3 py-1 rounded-full border"
            :style="{
              color: getInterpretationColor(props.assessment.mmse.interpretation),
              borderColor: getInterpretationColor(props.assessment.mmse.interpretation),
              backgroundColor: 'var(--color-bg-soft)'
            }"
          >
            {{ getInterpretationDescription('mmse', props.assessment.mmse.interpretation) }}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-6 items-center">
          <div
            class="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center shrink-0"
            :style="{ borderColor: getInterpretationColor(props.assessment.mmse.interpretation) }"
          >
            <span class="text-4xl font-black text-[var(--color-text)]">{{ props.assessment.mmse.total }}</span>
            <span class="text-xs text-[var(--color-text-secondary)] font-medium">/ 30</span>
          </div>

          <div class="w-full grid grid-cols-2 gap-3">
            <div
              v-for="(val, key) in {
                '定向力': [props.assessment.mmse.orientation, 10],
                '登錄': [props.assessment.mmse.registration, 3],
                '注意力': [props.assessment.mmse.attention, 5],
                '回憶': [props.assessment.mmse.recall, 3],
                '語言': [props.assessment.mmse.language, 8],
                '視覺': [props.assessment.mmse.visuospatial, 1]
              }"
              :key="key"
              class="p-2 bg-[var(--color-bg-soft)] rounded-xl flex justify-between items-center"
            >
              <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ key }}</span>
              <span class="text-sm font-bold text-[var(--color-text)]">
                {{ val[0] }}<span class="text-[var(--color-text-muted)] text-xs">/{{ val[1] }}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)] overflow-hidden">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-[var(--color-text)]">MoCA 估算分數</h2>
            <p class="text-xs text-[var(--color-text-secondary)] mt-1">蒙特利爾認知評估</p>
          </div>
          <div
            class="text-sm font-bold px-3 py-1 rounded-full border"
            :style="{
              color: getInterpretationColor(props.assessment.moca.interpretation),
              borderColor: getInterpretationColor(props.assessment.moca.interpretation),
              backgroundColor: 'var(--color-bg-soft)'
            }"
          >
            {{ getInterpretationDescription('moca', props.assessment.moca.interpretation) }}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-6 items-center">
          <div
            class="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center shrink-0"
            :style="{ borderColor: getInterpretationColor(props.assessment.moca.interpretation) }"
          >
            <span class="text-4xl font-black text-[var(--color-text)]">{{ props.assessment.moca.total }}</span>
            <span class="text-xs text-[var(--color-text-secondary)] font-medium">/ 30</span>
          </div>

          <div class="w-full grid grid-cols-2 gap-3">
            <div
              v-for="(val, key) in {
                '視/執行': [props.assessment.moca.visuospatialExecutive, 5],
                '命名': [props.assessment.moca.naming, 3],
                '注意力': [props.assessment.moca.attention, 6],
                '語言': [props.assessment.moca.language, 3],
                '抽象': [props.assessment.moca.abstraction, 2],
                '回憶': [props.assessment.moca.delayedRecall, 5],
                '定向': [props.assessment.moca.orientation, 6]
              }"
              :key="key"
              class="p-2 bg-[var(--color-bg-soft)] rounded-xl flex justify-between items-center"
            >
              <span class="text-xs font-medium text-[var(--color-text-secondary)] truncate mr-2">{{ key }}</span>
              <span class="text-sm font-bold text-[var(--color-text)] shrink-0">
                {{ val[0] }}<span class="text-[var(--color-text-muted)] text-xs">/{{ val[1] }}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-[var(--color-text)]">CASI 估算分數</h2>
        </div>
        <div class="flex flex-col items-center justify-center py-4">
          <div
            class="w-40 h-40 rounded-full border-[10px] flex flex-col items-center justify-center mb-3"
            :style="{ borderColor: getInterpretationColor(props.assessment.casi.interpretation) }"
          >
            <span class="text-5xl font-black text-[var(--color-text)]">{{ props.assessment.casi.total }}</span>
            <span class="text-sm text-[var(--color-text-secondary)] font-medium">/ 100</span>
          </div>
          <div
            class="text-lg font-bold"
            :style="{ color: getInterpretationColor(props.assessment.casi.interpretation) }"
          >
            {{ getInterpretationDescription('casi', props.assessment.casi.interpretation) }}
          </div>
        </div>
      </section>

      <section class="bg-[var(--color-primary-bg)] rounded-2xl p-5 border border-[var(--color-primary)]/20">
        <h2 class="text-lg font-bold text-[var(--color-text)] mb-2 flex items-center gap-2">
          <span>💡</span> 綜合建議
        </h2>
        <p class="text-[var(--color-text)] leading-relaxed">
          {{ getRecommendedAction(props.assessment) }}
        </p>
      </section>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-6xl mb-4 opacity-50">📊</div>
      <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">資料不足</h3>
      <p class="text-[var(--color-text-secondary)] mb-6 max-w-xs">
        需要至少完成 5 次遊戲才能生成專業評估，目前已完成 {{ props.sessionsCount }} 次
      </p>
      <router-link to="/games" class="btn btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
        開始訓練 →
      </router-link>
    </div>
  </div>
</template>

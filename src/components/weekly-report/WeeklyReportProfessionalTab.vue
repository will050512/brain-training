<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { ProfessionalAssessment } from '@/services/professionalScoreCalculator'
import {
  getInterpretationDescription,
  getRecommendedAction
} from '@/services/professionalScoreCalculator'
import WeeklyReportScorePanel from '@/components/weekly-report/ui/WeeklyReportScorePanel.vue'

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

const mmseItems = computed(() => {
  if (!props.assessment) return []
  return [
    { label: '定向力', value: props.assessment.mmse.orientation, max: 10 },
    { label: '登錄', value: props.assessment.mmse.registration, max: 3 },
    { label: '注意力', value: props.assessment.mmse.attention, max: 5 },
    { label: '回憶', value: props.assessment.mmse.recall, max: 3 },
    { label: '語言', value: props.assessment.mmse.language, max: 8 },
    { label: '視覺', value: props.assessment.mmse.visuospatial, max: 1 }
  ]
})

const mocaItems = computed(() => {
  if (!props.assessment) return []
  return [
    { label: '視/執行', value: props.assessment.moca.visuospatialExecutive, max: 5 },
    { label: '命名', value: props.assessment.moca.naming, max: 3 },
    { label: '注意力', value: props.assessment.moca.attention, max: 6 },
    { label: '語言', value: props.assessment.moca.language, max: 3 },
    { label: '抽象', value: props.assessment.moca.abstraction, max: 2 },
    { label: '回憶', value: props.assessment.moca.delayedRecall, max: 5 },
    { label: '定向', value: props.assessment.moca.orientation, max: 6 }
  ]
})

const mmseColor = computed(() => {
  if (!props.assessment) return 'var(--color-text-muted)'
  return getInterpretationColor(props.assessment.mmse.interpretation)
})

const mocaColor = computed(() => {
  if (!props.assessment) return 'var(--color-text-muted)'
  return getInterpretationColor(props.assessment.moca.interpretation)
})

const mmseLabel = computed(() => {
  if (!props.assessment) return ''
  return getInterpretationDescription('mmse', props.assessment.mmse.interpretation)
})

const mocaLabel = computed(() => {
  if (!props.assessment) return ''
  return getInterpretationDescription('moca', props.assessment.moca.interpretation)
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <template v-if="props.assessment">
      <WeeklyReportScorePanel
        title="MMSE 估算分數"
        subtitle="簡易智能狀態測驗"
        :interpretation-label="mmseLabel"
        :interpretation-color="mmseColor"
        :total="props.assessment.mmse.total"
        :total-max="30"
        :items="mmseItems"
      />

      <WeeklyReportScorePanel
        title="MoCA 估算分數"
        subtitle="蒙特利爾認知評估"
        :interpretation-label="mocaLabel"
        :interpretation-color="mocaColor"
        :total="props.assessment.moca.total"
        :total-max="30"
        :items="mocaItems"
      />

      <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
        <div class="flex items-center justify-between">
          <SectionTitle title="CASI 估算分數" spacing="sm" :show-accent="false" />
        </div>
        <div class="flex flex-col items-center justify-center py-4">
          <div
            class="w-40 h-40 rounded-full border-[10px] flex flex-col items-center justify-center mb-3"
            :style="{ borderColor: getInterpretationColor(props.assessment.casi.interpretation) }"
          >
            <span class="text-5xl font-black text-[var(--color-text)]">{{ props.assessment.casi.total }}</span>
            <SubtleLabel text="/ 100" tone="secondary" />
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
        <SectionTitle title="綜合建議" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>💡</span>
          </template>
        </SectionTitle>
        <p class="text-[var(--color-text)] leading-relaxed">
          {{ getRecommendedAction(props.assessment) }}
        </p>
      </section>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-6xl mb-4 opacity-50">📊</div>
      <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">資料不足</h3>
      <SubtleLabel
        :text="`需要至少完成 5 次遊戲才能生成專業評估，目前已完成 ${props.sessionsCount} 次`"
        tone="secondary"
        class="mb-6 max-w-xs block"
      />
      <router-link to="/games" custom v-slot="{ navigate }">
        <BaseButton size="md" class="px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all" @click="navigate">
          開始訓練 →
        </BaseButton>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TrainingReminder {
  shouldRemind: boolean
  message: string
}

interface AssessmentReminder {
  needsAssessment: boolean
  daysSinceLastAssessment: number
  message: string
}

interface Props {
  trainingReminder: TrainingReminder | null
  assessmentReminder: AssessmentReminder | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'dismiss-training'): void
  (e: 'dismiss-assessment'): void
  (e: 'snooze-assessment'): void
}>()
</script>

<template>
  <div v-if="props.trainingReminder || props.assessmentReminder?.needsAssessment" class="space-y-3">
    <h2 class="text-sm font-semibold text-[var(--color-text-muted)]">提醒與通知</h2>

    <div v-if="props.trainingReminder?.shouldRemind">
      <div class="alert alert--info">
        <span class="alert__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path>
            <path d="M13.7 21a2 2 0 01-3.4 0"></path>
          </svg>
        </span>
        <p class="alert__content text-sm">{{ props.trainingReminder.message }}</p>
        <button
          class="alert__action text-xl"
          @click="emit('dismiss-training')"
        >×</button>
      </div>
    </div>

    <div v-if="props.assessmentReminder?.needsAssessment">
      <div
        class="alert"
        :class="props.assessmentReminder.daysSinceLastAssessment >= 60 ? 'alert--danger' : 'alert--warning'"
      >
        <span class="alert__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <path d="M16 3v4M8 3v4M3 11h18"></path>
          </svg>
        </span>
        <div class="alert__content">
          <p class="text-sm font-medium">
            {{ props.assessmentReminder.message }}
          </p>
          <router-link
            to="/assessment"
            class="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            :class="props.assessmentReminder.daysSinceLastAssessment >= 60
              ? 'bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:opacity-90'
              : 'bg-[var(--color-warning)] text-[var(--color-text-inverse)] hover:opacity-90'"
          >
            前往評估
          </router-link>
        </div>
        <button
          class="alert__action text-xl"
          @click="emit('snooze-assessment'); emit('dismiss-assessment')"
        >×</button>
      </div>
    </div>
  </div>
</template>

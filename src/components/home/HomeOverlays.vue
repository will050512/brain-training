<script setup lang="ts">
import WelcomeModal from '@/components/ui/WelcomeModal.vue'
import TrainingGoalSettings from '@/components/ui/TrainingGoalSettings.vue'
import TrainingHistoryModal from '@/components/ui/TrainingHistoryModal.vue'
import GuidedTourModal from '@/components/ui/GuidedTourModal.vue'

type TrainingHistorySession = {
  gameId: string
  score?: number
  duration?: number
  timestamp: string | number
}

interface Props {
  showWelcome: boolean
  showGoalSettings: boolean
  showHistoryModal: boolean
  selectedHistoryDate: string
  selectedDateSessions: TrainingHistorySession[]
  showGuidedTour: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close-welcome'): void
  (e: 'enable-sound'): void
  (e: 'close-goal-settings'): void
  (e: 'close-history'): void
  (e: 'update-guided-tour', value: boolean): void
}>()
</script>

<template>
  <WelcomeModal
    v-if="props.showWelcome"
    @close="emit('close-welcome')"
    @enable-sound="emit('enable-sound')"
  />

  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="props.showGoalSettings"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="emit('close-goal-settings')"
      >
        <div class="bg-[var(--color-surface)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
          <TrainingGoalSettings
            :show-save-button="true"
            @save="emit('close-goal-settings')"
          />
        </div>
      </div>
    </Transition>
  </Teleport>

  <TrainingHistoryModal
    :is-open="props.showHistoryModal"
    :date="props.selectedHistoryDate"
    :sessions="props.selectedDateSessions"
    @close="emit('close-history')"
  />

  <GuidedTourModal
    :model-value="props.showGuidedTour"
    @update:modelValue="emit('update-guided-tour', $event)"
  />
</template>

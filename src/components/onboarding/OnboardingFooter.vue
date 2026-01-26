<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  currentStep: 'welcome' | 'profile' | 'settings' | 'assessment-choice' | 'assessment' | 'complete'
  assessmentChoice: 'mini-cog' | 'quick'
  isLoading: boolean
  onNext: () => void
  onStartTraining: () => void
}>()
</script>

<template>
  <footer class="app-footer">
    <div class="max-w-md mx-auto w-full flex flex-col gap-3">
      <BaseButton
        v-if="currentStep === 'welcome'"
        size="xl"
        full-width
        class="shadow-lg hover-lift"
        @click="onNext"
      >
        開始設定
      </BaseButton>

      <BaseButton
        v-if="currentStep === 'profile' || currentStep === 'settings'"
        size="lg"
        full-width
        class="shadow-md"
        @click="onNext"
      >
        下一步
      </BaseButton>

      <BaseButton
        v-if="currentStep === 'assessment-choice'"
        size="lg"
        full-width
        class="shadow-md"
        @click="onNext"
      >
        {{ assessmentChoice === 'mini-cog' ? '開始 Mini-Cog 評估' : '開始 3 分鐘快評' }}
      </BaseButton>

      <BaseButton
        v-if="currentStep === 'complete'"
        size="xl"
        full-width
        class="shadow-lg hover-lift"
        :disabled="isLoading"
        @click="onStartTraining"
      >
        {{ isLoading ? '載入中...' : '開始訓練' }}
      </BaseButton>
    </div>
  </footer>
</template>

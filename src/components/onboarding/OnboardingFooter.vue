<template>
  <footer class="app-footer">
    <div class="max-w-md mx-auto w-full flex flex-col gap-3">
      <button
        v-if="currentStep === 'welcome'"
        @click="onNext"
        class="btn btn-primary btn-block btn-xl shadow-lg hover-lift"
      >
        開始設定
      </button>

      <button
        v-if="currentStep === 'profile' || currentStep === 'settings'"
        @click="onNext"
        class="btn btn-primary btn-block btn-lg shadow-md"
      >
        下一步
      </button>

      <button
        v-if="currentStep === 'assessment-choice'"
        @click="onNext"
        class="btn btn-primary btn-block btn-lg shadow-md"
      >
        {{ assessmentChoice === 'mini-cog' ? '開始 Mini-Cog 評估' : '開始 3 分鐘快評' }}
      </button>

      <button
        v-if="currentStep === 'complete'"
        @click="onStartTraining"
        class="btn btn-primary btn-block btn-xl shadow-lg hover-lift"
        :disabled="isLoading"
      >
        {{ isLoading ? '載入中...' : '開始訓練' }}
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  currentStep: 'welcome' | 'profile' | 'settings' | 'assessment-choice' | 'assessment' | 'complete'
  assessmentChoice: 'mini-cog' | 'quick'
  isLoading: boolean
  onNext: () => void
  onStartTraining: () => void
}>()
</script>

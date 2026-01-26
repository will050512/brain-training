<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

const props = defineProps<{
  completedSessionsCount: number
  requiredSessions: number
  onGoTraining: () => void
}>()

const progressPercent = computed(() =>
  Math.min((props.completedSessionsCount / props.requiredSessions) * 100, 100)
)
</script>

<template>
  <div class="card p-8 section-stack items-center text-center">
    <div class="text-6xl mb-2 animate-bounce">🔒</div>
    <SectionTitle title="功能尚未解鎖" spacing="sm" :show-accent="false" class="justify-center" />
    <SubtleLabel
      text="為了提供精準的個人化營養建議，我們需要收集更多您的訓練數據。"
      tone="secondary"
      class="text-sm max-w-xs mx-auto block"
    />

    <div class="w-full max-w-xs bg-[var(--color-surface-soft)] rounded-full h-3 overflow-hidden mt-4">
      <div
        class="h-full bg-primary transition-all duration-1000"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>
    <p class="mt-2">
      <SubtleLabel
        :text="`訓練進度：${completedSessionsCount} / ${requiredSessions} 場`"
        weight="bold"
        class="text-primary"
      />
    </p>

    <div class="bg-[var(--color-surface-soft)] p-4 rounded-xl text-left w-full max-w-xs mt-2">
      <SectionTitle title="解鎖後您將獲得：" as="h4" size="sm" spacing="sm" :show-accent="false" />
      <ul class="list-disc pl-5 space-y-1">
        <li>
          <SubtleLabel text="✨ 基於認知表現的精準營養建議" tone="secondary" class="block" />
        </li>
        <li>
          <SubtleLabel text="💊 針對弱項維度的補充方案" tone="secondary" class="block" />
        </li>
        <li>
          <SubtleLabel text="👨‍⚕️ 專業醫師與營養師的建議" tone="secondary" class="block" />
        </li>
      </ul>
    </div>

    <BaseButton size="md" full-width class="max-w-xs mt-4" @click="onGoTraining">
      前往每日訓練
    </BaseButton>
  </div>
</template>

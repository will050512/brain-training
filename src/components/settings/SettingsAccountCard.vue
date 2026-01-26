<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  userName: string
  userAgeLabel: string
  authProviderLabel: string
  birthdayLabel?: string
  onLogout: () => void
}

const props = defineProps<Props>()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">👤</span>
      <h3 class="font-semibold text-[var(--color-text)]">帳號資訊</h3>
    </div>

    <div class="bg-[var(--color-bg-soft)] rounded-xl p-4 mb-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] flex items-center justify-center text-xl font-bold">
        {{ props.userName.charAt(0) || 'U' }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-lg text-[var(--color-text)] truncate">{{ props.userName }}</div>
        <div class="flex items-center gap-2">
          <span class="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">{{ props.userAgeLabel }}</span>
          <span class="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">{{ props.authProviderLabel }}</span>
        </div>
        <SubtleLabel
          v-if="props.birthdayLabel"
          :text="`生日: ${props.birthdayLabel}`"
          tone="muted"
          class="mt-1 block"
        />
      </div>
    </div>

    <BaseButton
      type="button"
      variant="outline"
      size="md"
      full-width
      class="py-2.5 text-sm font-medium border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
      @click="props.onLogout"
    >
      登出 / 切換帳號
    </BaseButton>
  </div>
</template>

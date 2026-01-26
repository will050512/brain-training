<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  transferCode: string
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:transferCode', value: string): void
  (e: 'transfer-login'): void
}>()

const handleTransferLogin = (): void => {
  emit('transfer-login')
}
</script>

<template>
  <div class="card p-4 sm:p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
    <SectionTitle title="其他設備登入" as="h3" size="sm" spacing="sm" :show-accent="false" class="justify-center text-center" />
    <div class="space-y-3">
      <div class="space-y-2">
        <label for="transferCode" class="block">
          <SubtleLabel text="登入碼" tone="secondary" weight="bold" caps />
        </label>
        <input
          id="transferCode"
          :value="props.transferCode"
          type="text"
          class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
          placeholder="貼上登入碼"
          @input="emit('update:transferCode', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <BaseButton
        type="button"
        variant="secondary"
        size="md"
        full-width
        class="py-3 text-base font-bold"
        :disabled="props.isLoading || props.transferCode.trim().length === 0"
        @click="handleTransferLogin"
      >
        使用登入碼登入
      </BaseButton>
      <SubtleLabel
        text="登入碼可讓您在其他設備建立相同帳號；資料同步仍以本機為主。"
        tone="muted"
        class="text-center block"
      />
    </div>
  </div>
</template>
